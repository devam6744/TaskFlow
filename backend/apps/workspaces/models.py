"""
Workspace Models — Phase 3: Multi-Tenancy Foundation

Three models:
  1. Workspace      — the top-level container (a team's private area)
  2. WorkspaceMember — join table with RBAC roles (OWNER, ADMIN, MEMBER, VIEWER)
  3. WorkspaceInvite — secure token-based email invitations (SHA-256 token hash)

Engineering highlights:
  • UUID PKs across all entities for unguessable IDs
  • Unique slug for URL routing (/workspaces/my-team/)
  • Role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
  • Invite token stored as SHA-256 hash — raw token returned once only
  • archived_at pattern (soft delete) for audit safety
  • Composite unique constraint on (workspace, user)
  • Explicit DB indexes on slug, token_hash, and member lookup
"""

import uuid
import hashlib
import secrets
import re
from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_slug(name: str) -> str:
    """Convert a workspace name into a URL-safe slug, e.g. 'My Team' -> 'my-team'."""
    slug = name.lower().strip()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug or 'workspace'


class Workspace(models.Model):
    """
    The fundamental multi-tenancy unit in TaskFlow.
    Every resource (project, sprint, work item) belongs to exactly one workspace.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, help_text="Human-readable workspace name")
    slug = models.SlugField(
        max_length=120,
        unique=True,
        db_index=True,
        help_text="URL-safe unique identifier, auto-generated from name"
    )
    description = models.TextField(blank=True, default='')
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='owned_workspaces',
        help_text="Workspace owner (cannot be deleted without transferring or archiving)"
    )

    settings_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Flexible workspace settings (timezone, sprint defaults, etc.)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    archived_at = models.DateTimeField(
        null=True, blank=True,
        help_text="Soft-delete: set timestamp to archive; null means active"
    )

    class Meta:
        db_table = 'workspaces_workspace'
        ordering = ['-created_at']
        verbose_name = 'Workspace'
        verbose_name_plural = 'Workspaces'

    def __str__(self) -> str:
        return f'{self.name} ({self.slug})'

    @property
    def is_archived(self) -> bool:
        return self.archived_at is not None

    def archive(self):
        """Soft-archive the workspace without permanent data deletion."""
        self.archived_at = timezone.now()
        self.save(update_fields=['archived_at', 'updated_at'])

    def unarchive(self):
        """Restore an archived workspace."""
        self.archived_at = None
        self.save(update_fields=['archived_at', 'updated_at'])

    def save(self, *args, **kwargs):
        """Auto-generate a unique slug from name if not provided."""
        if not self.slug:
            base_slug = generate_slug(self.name)
            slug = base_slug
            counter = 1
            while Workspace.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base_slug}-{counter}'
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class WorkspaceMember(models.Model):
    """
    RBAC membership record linking a user to a workspace with a specific role.

    Role hierarchy:
      OWNER  (4) -> Full control, transfer ownership, delete/archive workspace
      ADMIN  (3) -> Manage members, settings; cannot delete workspace
      MEMBER (2) -> Work on projects, tasks, sprints; cannot manage members
      VIEWER (1) -> Read-only access; cannot modify any resources
    """

    class Role(models.TextChoices):
        OWNER = 'OWNER', 'Owner'
        ADMIN = 'ADMIN', 'Admin'
        MEMBER = 'MEMBER', 'Member'
        VIEWER = 'VIEWER', 'Viewer'

    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', 'Active'
        SUSPENDED = 'SUSPENDED', 'Suspended'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='members',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workspace_memberships',
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.MEMBER,
        db_index=True,
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ACTIVE,
    )
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspaces_member'
        unique_together = [('workspace', 'user')]
        indexes = [
            models.Index(fields=['workspace', 'user'], name='ws_member_ws_user_idx'),
            models.Index(fields=['user', 'status'], name='ws_member_user_status_idx'),
        ]
        ordering = ['joined_at']
        verbose_name = 'Workspace Member'
        verbose_name_plural = 'Workspace Members'

    def __str__(self) -> str:
        return f'{self.user.email} -> {self.workspace.slug} [{self.role}]'

    @property
    def is_active(self) -> bool:
        return self.status == self.Status.ACTIVE

    def has_permission(self, minimum_role: str) -> bool:
        """Check if this member's role meets or exceeds the required threshold."""
        role_weight = {
            self.Role.OWNER: 4,
            self.Role.ADMIN: 3,
            self.Role.MEMBER: 2,
            self.Role.VIEWER: 1,
        }
        return role_weight.get(self.role, 0) >= role_weight.get(minimum_role, 999)


class WorkspaceInvite(models.Model):
    """
    Secure token-based email invitation to join a workspace.

    Security Architecture:
      • The RAW token is a 32-byte URL-safe string generated via secrets.token_urlsafe
      • Only the SHA-256 HASH of the token is stored in the database
      • The raw token is delivered via invite URL once; never logged or saved in DB
      • If the database is dumped or leaked, the hash cannot be reversed to join
      • Invites expire at `expires_at` (default: 7 days) and are single-use
    """

    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        ACCEPTED = 'ACCEPTED', 'Accepted'
        REVOKED = 'REVOKED', 'Revoked'
        EXPIRED = 'EXPIRED', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name='invites',
    )
    email = models.EmailField(
        max_length=255,
        help_text="Email address of the invited user"
    )
    role = models.CharField(
        max_length=10,
        choices=WorkspaceMember.Role.choices,
        default=WorkspaceMember.Role.MEMBER,
        help_text="Role granted upon accepting the invite"
    )
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="SHA-256 hash of the raw invitation token"
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='sent_workspace_invites',
    )
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    expires_at = models.DateTimeField(help_text="Expiry timestamp")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'workspaces_invite'
        indexes = [
            models.Index(fields=['workspace', 'email', 'status'], name='ws_inv_ws_email_status_idx'),
        ]
        ordering = ['-created_at']
        verbose_name = 'Workspace Invite'
        verbose_name_plural = 'Workspace Invites'

    def __str__(self) -> str:
        return f'Invite: {self.email} -> {self.workspace.slug} [{self.status}]'

    @property
    def is_expired(self) -> bool:
        return timezone.now() > self.expires_at

    @property
    def is_valid(self) -> bool:
        return self.status == self.Status.PENDING and not self.is_expired

    @staticmethod
    def hash_token(raw_token: str) -> str:
        """Compute the SHA-256 hash of the raw token string."""
        return hashlib.sha256(raw_token.encode('utf-8')).hexdigest()

    @classmethod
    def generate_token(cls) -> tuple[str, str]:
        """
        Generate a cryptographically secure token.
        Returns:
            tuple (raw_token, token_hash)
            raw_token -> send in email/invitation URL
            token_hash -> store in DB
        """
        raw_token = secrets.token_urlsafe(32)
        token_hash = cls.hash_token(raw_token)
        return raw_token, token_hash
