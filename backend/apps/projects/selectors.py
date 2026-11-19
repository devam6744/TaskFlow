"""
Project & Backlog Query Selectors — Phase 4

Encapsulates all project and work item queries with select_related to prevent N+1 query bottlenecks.
"""

from django.db.models import QuerySet, Q
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, WorkItem, ProjectMember, Sprint


def get_workspace_projects(workspace: Workspace, user, include_archived: bool = False) -> QuerySet[Project]:
    """
    List all projects in the workspace visible to the user:
      - All WORKSPACE visibility projects.
      - PRIVATE projects where user is a ProjectMember OR user is Workspace Owner.
    """
    if not user.is_authenticated:
        return Project.objects.none()

    ws_member = WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user,
        status=WorkspaceMember.Status.ACTIVE
    ).first()

    if not ws_member:
        return Project.objects.none()

    qs = Project.objects.filter(workspace=workspace).select_related('lead', 'created_by')

    if not include_archived:
        qs = qs.filter(archived_at__isnull=True)

    # Workspace OWNER sees all projects
    if ws_member.role == WorkspaceMember.Role.OWNER:
        return qs.distinct()

    # Otherwise: visible if WORKSPACE visibility OR user has ProjectMember record
    return qs.filter(
        Q(visibility=Project.Visibility.WORKSPACE) |
        Q(memberships__user=user)
    ).distinct()


def get_project_by_slug(workspace: Workspace, slug: str, user=None) -> Project | None:
    """Retrieve project by slug within a workspace."""
    project = Project.objects.filter(
        workspace=workspace,
        slug=slug
    ).select_related('lead', 'created_by', 'workspace').first()

    if not project:
        return None

    if user and user.is_authenticated:
        from apps.projects.services import has_project_access
        if not has_project_access(project, user):
            return None

    return project


def get_project_backlog(project: Project) -> QuerySet[WorkItem]:
    """
    Retrieve all unassigned Product Backlog work items ordered by backlog_order ASC.
    Uses select_related to eliminate N+1 queries for assignee and reporter details.
    """
    return WorkItem.objects.filter(
        project=project,
        sprint_id__isnull=True,
        archived_at__isnull=True
    ).select_related('assignee', 'reporter').order_by('backlog_order', '-created_at')


def get_work_item_by_number(project: Project, item_number: int) -> WorkItem | None:
    """Retrieve work item by its sequential number (e.g. TF-101)."""
    return WorkItem.objects.filter(
        project=project,
        item_number=item_number
    ).select_related('assignee', 'reporter', 'project').first()


def get_project_sprints(project: Project) -> QuerySet[Sprint]:
    """Retrieve all sprints in a project ordered by state and start date."""
    return Sprint.objects.filter(project=project).select_related('created_by').prefetch_related('work_items')


def get_active_sprint(project: Project) -> Sprint | None:
    """Retrieve the single active sprint for the project, if one exists."""
    return Sprint.objects.filter(
        project=project,
        status=Sprint.Status.ACTIVE
    ).select_related('created_by').first()


def get_sprint_work_items(sprint: Sprint) -> QuerySet[WorkItem]:
    """Retrieve all work items assigned to a sprint."""
    return WorkItem.objects.filter(
        sprint=sprint,
        archived_at__isnull=True
    ).select_related('assignee', 'reporter').order_by('backlog_order', '-created_at')
