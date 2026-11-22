"""
Workspace Service Layer — Phase 3: Multi-Tenancy & RBAC

All workspace-level business operations, state transitions, and security checks
are encapsulated here with atomic database transactions.
"""

from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model

from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvite

User = get_user_model()


def get_member_or_none(workspace: Workspace, user) -> WorkspaceMember | None:
    """Helper to retrieve an active membership record for a user in a workspace."""
    if not user.is_authenticated:
        return None
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user,
        status=WorkspaceMember.Status.ACTIVE
    ).first()


@transaction.atomic
def create_workspace(user, name: str, description: str = '', settings_data: dict | None = None) -> Workspace:
    """
    Create a new workspace and automatically assign the creator as the OWNER member.
    Atomic guarantee: If member creation fails, workspace is rolled back.
    """
    name = (name or '').strip()
    if not name:
        raise ValidationError({'name': 'Workspace name is required.'})

    workspace = Workspace.objects.create(
        name=name,
        description=(description or '').strip(),
        owner=user,
        settings_data=settings_data or {}
    )

    # Automatically enroll the owner as an OWNER member
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=user,
        role=WorkspaceMember.Role.OWNER,
        status=WorkspaceMember.Status.ACTIVE
    )

    return workspace


@transaction.atomic
def invite_member(
    workspace: Workspace,
    inviter,
    email: str,
    role: str = WorkspaceMember.Role.MEMBER
) -> tuple[WorkspaceInvite, str]:
    """
    Create a cryptographically secure workspace invitation.
    Returns:
        tuple (WorkspaceInvite instance, raw_token)
        raw_token is returned ONLY here to be sent in the invite link/email.
    """
    # 1. Check inviter permissions (ADMIN or OWNER required)
    inviter_member = get_member_or_none(workspace, inviter)
    if not inviter_member or not inviter_member.has_permission(WorkspaceMember.Role.ADMIN):
        raise PermissionDenied("Only workspace Admins or Owners can invite members.")

    email = email.lower().strip()
    if not email:
        raise ValidationError({'email': 'A valid email address is required.'})

    # Validate role choice
    if role not in WorkspaceMember.Role.values:
        raise ValidationError({'role': f'Invalid role: {role}'})

    # 2. Check if user with this email is already an active member
    if WorkspaceMember.objects.filter(
        workspace=workspace,
        user__email__iexact=email,
        status=WorkspaceMember.Status.ACTIVE
    ).exists():
        raise ValidationError({'email': 'A user with this email is already a member of this workspace.'})

    # 3. Check if there is already an active (unexpired) pending invite
    now = timezone.now()
    existing_invite = WorkspaceInvite.objects.filter(
        workspace=workspace,
        email__iexact=email,
        status=WorkspaceInvite.Status.PENDING,
        expires_at__gt=now
    ).first()
    if existing_invite:
        raise ValidationError({'email': 'A pending invitation has already been sent to this email.'})

    # 4. Generate secure token
    raw_token, token_hash = WorkspaceInvite.generate_token()
    expires_at = now + timedelta(days=7)

    invite = WorkspaceInvite.objects.create(
        workspace=workspace,
        email=email,
        role=role,
        token_hash=token_hash,
        invited_by=inviter,
        status=WorkspaceInvite.Status.PENDING,
        expires_at=expires_at
    )

    # Dispatch asynchronous invitation email via Celery
    try:
        from apps.notifications.tasks import send_invitation_email_task
        transaction.on_commit(lambda: send_invitation_email_task.delay(str(invite.id), raw_token))
    except Exception:
        pass

    return invite, raw_token


@transaction.atomic
def accept_invite(raw_token: str, user) -> WorkspaceMember:
    """
    Accept an invitation using the raw token.
    Validates token, expiry, and creates the WorkspaceMember record atomically.
    """
    token_hash = WorkspaceInvite.hash_token(raw_token.strip())
    invite = WorkspaceInvite.objects.select_related('workspace').filter(token_hash=token_hash).first()

    if not invite:
        raise ValidationError({'detail': 'Invalid or unknown invitation token.'})

    if invite.status == WorkspaceInvite.Status.ACCEPTED:
        raise ValidationError({'detail': 'This invitation has already been accepted.'})

    if invite.status == WorkspaceInvite.Status.REVOKED:
        raise ValidationError({'detail': 'This invitation has been revoked.'})

    if invite.is_expired or invite.status == WorkspaceInvite.Status.EXPIRED:
        invite.status = WorkspaceInvite.Status.EXPIRED
        invite.save(update_fields=['status'])
        raise ValidationError({'detail': 'This invitation has expired.'})

    # Check if user is already a member
    existing_member = WorkspaceMember.objects.filter(
        workspace=invite.workspace,
        user=user
    ).first()

    if existing_member:
        if existing_member.status == WorkspaceMember.Status.ACTIVE:
            invite.status = WorkspaceInvite.Status.ACCEPTED
            invite.save(update_fields=['status'])
            return existing_member
        else:
            # Re-activate suspended membership with the invited role
            existing_member.status = WorkspaceMember.Status.ACTIVE
            existing_member.role = invite.role
            existing_member.save(update_fields=['status', 'role'])
            member = existing_member
    else:
        member = WorkspaceMember.objects.create(
            workspace=invite.workspace,
            user=user,
            role=invite.role,
            status=WorkspaceMember.Status.ACTIVE
        )

    invite.status = WorkspaceInvite.Status.ACCEPTED
    invite.save(update_fields=['status'])
    return member


@transaction.atomic
def revoke_invite(invite_id, requesting_user) -> WorkspaceInvite:
    """Revoke a pending workspace invitation."""
    invite = WorkspaceInvite.objects.select_related('workspace').filter(id=invite_id).first()
    if not invite:
        raise ValidationError({'detail': 'Invitation not found.'})

    requester_member = get_member_or_none(invite.workspace, requesting_user)
    if not requester_member or not requester_member.has_permission(WorkspaceMember.Role.ADMIN):
        raise PermissionDenied("Only workspace Admins or Owners can revoke invitations.")

    if invite.status != WorkspaceInvite.Status.PENDING:
        raise ValidationError({'detail': f'Cannot revoke an invitation with status: {invite.status}'})

    invite.status = WorkspaceInvite.Status.REVOKED
    invite.save(update_fields=['status'])
    return invite


@transaction.atomic
def remove_member(workspace: Workspace, target_user, requesting_user) -> None:
    """
    Remove a member from a workspace.
    Guarantees:
      - Requester must be ADMIN or OWNER.
      - An ADMIN cannot remove an OWNER.
      - The last OWNER cannot be removed (must transfer ownership first).
      - Users can leave (remove themselves) as long as they are not the sole OWNER.
    """
    target_member = WorkspaceMember.objects.filter(workspace=workspace, user=target_user).first()
    if not target_member:
        raise ValidationError({'detail': 'Target user is not a member of this workspace.'})

    requester_member = get_member_or_none(workspace, requesting_user)
    is_self = (target_user.pk == requesting_user.pk)

    if not is_self:
        if not requester_member or not requester_member.has_permission(WorkspaceMember.Role.ADMIN):
            raise PermissionDenied("Only workspace Admins or Owners can remove members.")

        if target_member.role == WorkspaceMember.Role.OWNER and requester_member.role != WorkspaceMember.Role.OWNER:
            raise PermissionDenied("Only an Owner can remove another Owner.")

    # Guard: At least one active owner must remain in the workspace
    if target_member.role == WorkspaceMember.Role.OWNER:
        active_owners_count = WorkspaceMember.objects.filter(
            workspace=workspace,
            role=WorkspaceMember.Role.OWNER,
            status=WorkspaceMember.Status.ACTIVE
        ).exclude(pk=target_member.pk).count()

        if active_owners_count == 0:
            raise ValidationError({
                'detail': 'Cannot remove the last active Owner of the workspace. Please transfer ownership first.'
            })

    target_member.delete()


@transaction.atomic
def update_member_role(workspace: Workspace, target_user, new_role: str, requesting_user) -> WorkspaceMember:
    """
    Change a member's role within a workspace.
    Guarantees:
      - Requester must be ADMIN or OWNER.
      - Users cannot change their own role (prevents self-escalation or accidental self-demotion).
      - Only an OWNER can promote someone to OWNER or demote an OWNER.
      - At least one active OWNER must remain.
    """
    if new_role not in WorkspaceMember.Role.values:
        raise ValidationError({'role': f'Invalid role: {new_role}'})

    requester_member = get_member_or_none(workspace, requesting_user)
    if not requester_member or not requester_member.has_permission(WorkspaceMember.Role.ADMIN):
        raise PermissionDenied("Only workspace Admins or Owners can change member roles.")

    target_member = WorkspaceMember.objects.filter(workspace=workspace, user=target_user).first()
    if not target_member:
        raise ValidationError({'detail': 'Target user is not a member of this workspace.'})

    # Prevent self-escalation / changing own role
    if target_user.pk == requesting_user.pk:
        raise ValidationError({'detail': 'You cannot modify your own role.'})

    # Only OWNER can touch OWNER roles
    if (new_role == WorkspaceMember.Role.OWNER or target_member.role == WorkspaceMember.Role.OWNER) and requester_member.role != WorkspaceMember.Role.OWNER:
        raise PermissionDenied("Only an Owner can promote to or demote from Owner role.")

    # If demoting an OWNER, ensure another active OWNER exists
    if target_member.role == WorkspaceMember.Role.OWNER and new_role != WorkspaceMember.Role.OWNER:
        active_owners_count = WorkspaceMember.objects.filter(
            workspace=workspace,
            role=WorkspaceMember.Role.OWNER,
            status=WorkspaceMember.Status.ACTIVE
        ).exclude(pk=target_member.pk).count()

        if active_owners_count == 0:
            raise ValidationError({
                'detail': 'Cannot demote the last active Owner. Appoint another Owner first.'
            })

    target_member.role = new_role
    target_member.save(update_fields=['role'])
    return target_member


def archive_workspace(workspace: Workspace, requesting_user) -> Workspace:
    """Soft-archive a workspace. Restricted to workspace OWNER."""
    requester_member = get_member_or_none(workspace, requesting_user)
    if not requester_member or requester_member.role != WorkspaceMember.Role.OWNER:
        raise PermissionDenied("Only the workspace Owner can archive the workspace.")

    workspace.archive()
    return workspace


def unarchive_workspace(workspace: Workspace, requesting_user) -> Workspace:
    """Restore an archived workspace. Restricted to workspace OWNER."""
    requester_member = get_member_or_none(workspace, requesting_user)
    if not requester_member or requester_member.role != WorkspaceMember.Role.OWNER:
        raise PermissionDenied("Only the workspace Owner can restore the workspace.")

    workspace.unarchive()
    return workspace
