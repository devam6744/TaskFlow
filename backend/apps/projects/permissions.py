"""
Project & Backlog Permissions — Phase 4
"""

from rest_framework.permissions import BasePermission
from apps.projects import services


class HasProjectAccess(BasePermission):
    """
    Verifies that the user has permission to view the project:
      1. Workspace member.
      2. If project is PRIVATE, must be in ProjectMember or be Workspace Owner.
    """
    message = "You do not have access to this project."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        project = getattr(view, 'project', None)
        if not project and hasattr(view, 'get_project'):
            project = view.get_project()

        if not project:
            return True

        return services.has_project_access(project, request.user)

    def has_object_permission(self, request, view, obj):
        project = getattr(obj, 'project', obj)
        return services.has_project_access(project, request.user)


class CanManageProject(BasePermission):
    """Restricted to Project Admin or Workspace Admin/Owner."""
    message = "Project Admin or Workspace Admin permissions are required."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        project = getattr(view, 'project', None)
        if not project and hasattr(view, 'get_project'):
            project = view.get_project()

        if not project:
            return True

        ws_member = services.get_workspace_member_or_none(project.workspace, request.user)
        if not ws_member:
            return False

        from apps.workspaces.models import WorkspaceMember
        if ws_member.has_permission(WorkspaceMember.Role.ADMIN):
            return True

        from apps.projects.models import ProjectMember
        return ProjectMember.objects.filter(
            project=project,
            user=request.user,
            role=ProjectMember.Role.ADMIN
        ).exists()


class CanWriteWorkItem(BasePermission):
    """Write permission for creating, updating, and reordering work items."""
    message = "You do not have write permissions for this project."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        project = getattr(view, 'project', None)
        if not project and hasattr(view, 'get_project'):
            project = view.get_project()

        if not project:
            return True

        return services.has_project_write_access(project, request.user)
