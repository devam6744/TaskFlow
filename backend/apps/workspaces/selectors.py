"""
Workspace Selectors — Phase 3: Query Optimization & N+1 Prevention

Encapsulates all workspace-related read operations with select_related / prefetch_related
to prevent N+1 query bottlenecks.
"""

from django.db.models import QuerySet
from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvite


def get_user_workspaces(user, include_archived: bool = False) -> QuerySet[Workspace]:
    """
    Retrieve all workspaces in which the given user has an ACTIVE membership.
    Prevents cross-tenant data leakage by strictly scoping to user memberships.
    """
    if not user.is_authenticated:
        return Workspace.objects.none()

    qs = Workspace.objects.filter(
        members__user=user,
        members__status=WorkspaceMember.Status.ACTIVE
    ).select_related('owner')

    if not include_archived:
        qs = qs.filter(archived_at__isnull=True)

    return qs.distinct()


def get_workspace_by_slug(slug: str, user=None) -> Workspace | None:
    """
    Retrieve a workspace by its unique slug.
    If a user is provided, validates that the user is an active member.
    """
    try:
        ws = Workspace.objects.select_related('owner').get(slug=slug)
    except Workspace.DoesNotExist:
        return None

    if user and user.is_authenticated:
        is_member = WorkspaceMember.objects.filter(
            workspace=ws,
            user=user,
            status=WorkspaceMember.Status.ACTIVE
        ).exists()
        if not is_member:
            return None

    return ws


def get_workspace_members(workspace: Workspace) -> QuerySet[WorkspaceMember]:
    """
    List all active members of a workspace.
    Uses select_related('user') to eliminate N+1 queries when accessing member user details.
    """
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        status=WorkspaceMember.Status.ACTIVE
    ).select_related('user').order_by('role', 'joined_at')


def get_workspace_invites(workspace: Workspace) -> QuerySet[WorkspaceInvite]:
    """
    List all pending/recent invitations for a workspace.
    Uses select_related('invited_by') to avoid N+1 queries.
    """
    return WorkspaceInvite.objects.filter(
        workspace=workspace
    ).select_related('invited_by').order_by('-created_at')
