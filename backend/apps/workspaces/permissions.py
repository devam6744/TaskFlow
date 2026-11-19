"""
Workspace Permissions — Phase 3: RBAC & Tenant Isolation

Permission classes for DRF views that enforce workspace membership and role hierarchy.
"""

from rest_framework.permissions import BasePermission
from apps.workspaces.models import WorkspaceMember


class IsWorkspaceMember(BasePermission):
    """
    Allows access only to active members of the workspace.
    Expects `view.get_workspace()` or `request.workspace` to be available.
    """
    message = "You are not a member of this workspace."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace = getattr(view, 'workspace', None)
        if not workspace and hasattr(view, 'get_workspace'):
            workspace = view.get_workspace()

        if not workspace:
            return True  # Fallback to object-level check

        member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            status=WorkspaceMember.Status.ACTIVE
        ).first()

        if member:
            request.workspace_member = member
            return True
        return False

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj)
        member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=request.user,
            status=WorkspaceMember.Status.ACTIVE
        ).first()

        if member:
            request.workspace_member = member
            return True
        return False


class IsWorkspaceAdminOrOwner(BasePermission):
    """
    Allows access only to workspace ADMIN or OWNER members.
    Used for member management, invites, workspace settings updates.
    """
    message = "Admin or Owner permissions are required for this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace = getattr(view, 'workspace', None)
        if not workspace and hasattr(view, 'get_workspace'):
            workspace = view.get_workspace()

        if not workspace:
            return True

        member = getattr(request, 'workspace_member', None)
        if not member:
            member = WorkspaceMember.objects.filter(
                workspace=workspace,
                user=request.user,
                status=WorkspaceMember.Status.ACTIVE
            ).first()
            request.workspace_member = member

        return bool(member and member.has_permission(WorkspaceMember.Role.ADMIN))


class IsWorkspaceOwner(BasePermission):
    """
    Allows access only to workspace OWNER members.
    Used for destructive operations (archive, delete, ownership transfer).
    """
    message = "Only the workspace Owner has permission to perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        workspace = getattr(view, 'workspace', None)
        if not workspace and hasattr(view, 'get_workspace'):
            workspace = view.get_workspace()

        if not workspace:
            return True

        member = getattr(request, 'workspace_member', None)
        if not member:
            member = WorkspaceMember.objects.filter(
                workspace=workspace,
                user=request.user,
                status=WorkspaceMember.Status.ACTIVE
            ).first()
            request.workspace_member = member

        return bool(member and member.role == WorkspaceMember.Role.OWNER)
