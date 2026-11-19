"""
Project & Backlog Service Layer — Phase 4: Business Logic & Invariants

Encapsulates all project creation, private access management, and backlog work item
operations with atomic database transactions.
"""

from django.db import transaction, models
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import (
    Project,
    ProjectMember,
    WorkItem,
    FIBONACCI_STORY_POINTS,
)

User = get_user_model()


def get_workspace_member_or_none(workspace: Workspace, user) -> WorkspaceMember | None:
    """Helper to retrieve an active workspace membership record for a user."""
    if not user.is_authenticated:
        return None
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        user=user,
        status=WorkspaceMember.Status.ACTIVE
    ).first()


def has_project_access(project: Project, user) -> bool:
    """
    Check if a user has access to a project:
      1. Must be an active member of the project's workspace.
      2. If project is WORKSPACE visibility -> Allowed.
      3. If project is PRIVATE visibility -> User must be in ProjectMember OR Workspace Owner.
    """
    ws_member = get_workspace_member_or_none(project.workspace, user)
    if not ws_member:
        return False

    # Workspace OWNER always has universal override access across all projects
    if ws_member.role == WorkspaceMember.Role.OWNER:
        return True

    if project.visibility == Project.Visibility.WORKSPACE:
        return True

    # For PRIVATE projects, check project-specific membership
    return ProjectMember.objects.filter(project=project, user=user).exists()


def has_project_write_access(project: Project, user) -> bool:
    """
    Check if a user can create or edit work items in a project:
      - Workspace VIEWER has read-only access and cannot write.
      - In private project, user cannot have ProjectMember.Role.VIEWER.
    """
    ws_member = get_workspace_member_or_none(project.workspace, user)
    if not ws_member:
        return False

    if ws_member.role == WorkspaceMember.Role.OWNER:
        return True

    if ws_member.role == WorkspaceMember.Role.VIEWER:
        return False

    if project.visibility == Project.Visibility.WORKSPACE:
        return True

    proj_member = ProjectMember.objects.filter(project=project, user=user).first()
    if not proj_member:
        return False

    return proj_member.role in [ProjectMember.Role.ADMIN, ProjectMember.Role.MEMBER]


@transaction.atomic
def create_project(
    workspace: Workspace,
    user,
    name: str,
    key: str | None = None,
    description: str = '',
    visibility: str = Project.Visibility.WORKSPACE,
    lead=None,
    start_date=None,
    target_date=None,
    definition_of_done: str = '',
    settings: dict | None = None
) -> Project:
    """
    Create a new Project within a Workspace.
    If PRIVATE, automatically adds the creator as ProjectMember with ADMIN role.
    """
    ws_member = get_workspace_member_or_none(workspace, user)
    if not ws_member:
        raise PermissionDenied("You must be an active workspace member to create projects.")

    if ws_member.role == WorkspaceMember.Role.VIEWER:
        raise PermissionDenied("Viewers cannot create projects.")

    name = (name or '').strip()
    if not name:
        raise ValidationError({'name': 'Project name is required.'})

    if visibility not in Project.Visibility.values:
        raise ValidationError({'visibility': f'Invalid visibility: {visibility}'})

    project = Project.objects.create(
        workspace=workspace,
        name=name,
        key=(key or '').strip().upper(),
        description=(description or '').strip(),
        visibility=visibility,
        created_by=user,
        lead=lead,
        start_date=start_date,
        target_date=target_date,
        definition_of_done=(definition_of_done or '').strip(),
        settings=settings or {}
    )

    # For private projects, enroll the creator as Project Admin
    if visibility == Project.Visibility.PRIVATE:
        ProjectMember.objects.create(
            project=project,
            user=user,
            role=ProjectMember.Role.ADMIN
        )

    return project


@transaction.atomic
def update_project(project: Project, user, **fields) -> Project:
    """Update project details (restricted to Project Admin or Workspace Admin/Owner)."""
    ws_member = get_workspace_member_or_none(project.workspace, user)
    if not ws_member:
        raise PermissionDenied("You are not a member of this workspace.")

    is_ws_admin = ws_member.has_permission(WorkspaceMember.Role.ADMIN)
    is_proj_admin = ProjectMember.objects.filter(
        project=project,
        user=user,
        role=ProjectMember.Role.ADMIN
    ).exists()

    if not (is_ws_admin or is_proj_admin):
        raise PermissionDenied("Only Project Admins or Workspace Admins can edit project settings.")

    for field, value in fields.items():
        if hasattr(project, field) and field not in ['id', 'workspace', 'created_by', 'created_at']:
            setattr(project, field, value)

    project.save()
    return project


def archive_project(project: Project, user) -> Project:
    """Soft-archive a project."""
    ws_member = get_workspace_member_or_none(project.workspace, user)
    if not ws_member or not ws_member.has_permission(WorkspaceMember.Role.ADMIN):
        raise PermissionDenied("Only workspace Admins or Owners can archive projects.")

    project.archive()
    return project


def unarchive_project(project: Project, user) -> Project:
    """Restore an archived project."""
    ws_member = get_workspace_member_or_none(project.workspace, user)
    if not ws_member or not ws_member.has_permission(WorkspaceMember.Role.ADMIN):
        raise PermissionDenied("Only workspace Admins or Owners can restore projects.")

    project.unarchive()
    return project


@transaction.atomic
def add_project_member(project: Project, target_user, role: str, requesting_user) -> ProjectMember:
    """Grant private project access to a workspace member."""
    if project.visibility != Project.Visibility.PRIVATE:
        raise ValidationError({'detail': 'Members can only be explicitly assigned to private projects.'})

    ws_member = get_workspace_member_or_none(project.workspace, requesting_user)
    is_ws_admin = ws_member and ws_member.has_permission(WorkspaceMember.Role.ADMIN)
    is_proj_admin = ProjectMember.objects.filter(
        project=project,
        user=requesting_user,
        role=ProjectMember.Role.ADMIN
    ).exists()

    if not (is_ws_admin or is_proj_admin):
        raise PermissionDenied("Only Project Admins or Workspace Admins can add project members.")

    # Target must belong to the workspace
    if not get_workspace_member_or_none(project.workspace, target_user):
        raise ValidationError({'detail': 'User must be a member of the workspace before joining this project.'})

    if role not in ProjectMember.Role.values:
        raise ValidationError({'role': f'Invalid role: {role}'})

    member, created = ProjectMember.objects.get_or_create(
        project=project,
        user=target_user,
        defaults={'role': role}
    )
    if not created:
        member.role = role
        member.save(update_fields=['role'])

    return member


@transaction.atomic
def remove_project_member(project: Project, target_user, requesting_user) -> None:
    """Remove a member from a private project."""
    ws_member = get_workspace_member_or_none(project.workspace, requesting_user)
    is_ws_admin = ws_member and ws_member.has_permission(WorkspaceMember.Role.ADMIN)
    is_proj_admin = ProjectMember.objects.filter(
        project=project,
        user=requesting_user,
        role=ProjectMember.Role.ADMIN
    ).exists()

    if not (is_ws_admin or is_proj_admin or requesting_user.pk == target_user.pk):
        raise PermissionDenied("Permission denied.")

    ProjectMember.objects.filter(project=project, user=target_user).delete()


@transaction.atomic
def create_work_item(
    project: Project,
    user,
    title: str,
    type: str = WorkItem.Type.STORY,
    priority: str = WorkItem.Priority.MEDIUM,
    description: str = '',
    story_points: int | None = None,
    acceptance_criteria: str = '',
    assignee=None,
    due_date=None,
    sprint_id=None
) -> WorkItem:
    """
    Create a new WorkItem in the project backlog.
    Atomic guarantee: Computes next sequential item_number (TF-101) and backlog_order.
    """
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write access to this project.")

    title = (title or '').strip()
    if not title:
        raise ValidationError({'title': 'Work item title is required.'})

    if type not in WorkItem.Type.values:
        raise ValidationError({'type': f'Invalid type: {type}'})

    if priority not in WorkItem.Priority.values:
        raise ValidationError({'priority': f'Invalid priority: {priority}'})

    if story_points is not None and story_points not in FIBONACCI_STORY_POINTS:
        raise ValidationError({
            'story_points': f'Story points must be one of {FIBONACCI_STORY_POINTS}.'
        })

    # Sequential item_number per project (atomic)
    max_num = WorkItem.objects.filter(project=project).aggregate(m=models.Max('item_number'))['m'] or 0
    item_number = max_num + 1

    # Fractional Indexing: append to end of backlog
    max_order = WorkItem.objects.filter(project=project).aggregate(m=models.Max('backlog_order'))['m'] or 0.0
    backlog_order = max_order + 1000.0

    work_item = WorkItem.objects.create(
        project=project,
        item_number=item_number,
        title=title,
        description=(description or '').strip(),
        type=type,
        priority=priority,
        status=WorkItem.Status.BACKLOG,
        story_points=story_points,
        acceptance_criteria=(acceptance_criteria or '').strip(),
        reporter=user,
        assignee=assignee,
        due_date=due_date,
        backlog_order=backlog_order,
        sprint_id=sprint_id
    )

    return work_item


@transaction.atomic
def update_work_item(work_item: WorkItem, user, **fields) -> WorkItem:
    """Update work item attributes with permission check and Fibonacci validation."""
    if not has_project_write_access(work_item.project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    if 'story_points' in fields and fields['story_points'] is not None:
        if fields['story_points'] not in FIBONACCI_STORY_POINTS:
            raise ValidationError({
                'story_points': f'Story points must be one of {FIBONACCI_STORY_POINTS}.'
            })

    for field, value in fields.items():
        if hasattr(work_item, field) and field not in ['id', 'project', 'item_number', 'reporter', 'created_at']:
            setattr(work_item, field, value)

    work_item.save()
    return work_item


@transaction.atomic
def reorder_backlog_item(
    work_item: WorkItem,
    user,
    prev_item_id: str | None = None,
    next_item_id: str | None = None
) -> WorkItem:
    """
    Fractional Indexing (LexoRank style) algorithm for O(1) drag-and-drop reordering.
    Computes midpoint between prev and next backlog_order values.
    """
    if not has_project_write_access(work_item.project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    prev_order = None
    next_order = None

    if prev_item_id:
        prev_item = WorkItem.objects.filter(project=work_item.project, id=prev_item_id).first()
        if prev_item:
            prev_order = prev_item.backlog_order

    if next_item_id:
        next_item = WorkItem.objects.filter(project=work_item.project, id=next_item_id).first()
        if next_item:
            next_order = next_item.backlog_order

    if prev_order is not None and next_order is not None:
        new_order = (prev_order + next_order) / 2.0
    elif prev_order is not None:
        # Moved to bottom
        new_order = prev_order + 1000.0
    elif next_order is not None:
        # Moved to top
        new_order = next_order / 2.0
    else:
        new_order = 1000.0

    work_item.backlog_order = new_order
    work_item.save(update_fields=['backlog_order', 'updated_at'])
    return work_item


def delete_work_item(work_item: WorkItem, user) -> None:
    """Soft delete or delete a work item."""
    if not has_project_write_access(work_item.project, user):
        raise PermissionDenied("You do not have permission to delete this work item.")

    work_item.delete()
