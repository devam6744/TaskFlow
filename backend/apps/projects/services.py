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
    Sprint,
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

    old_assignee_id = work_item.assignee_id

    for field, value in fields.items():
        if hasattr(work_item, field) and field not in ['id', 'project', 'item_number', 'reporter', 'created_at']:
            setattr(work_item, field, value)

    work_item.save()

    # Trigger TASK_ASSIGNED notification if assignee was set or updated
    new_assignee = work_item.assignee
    if new_assignee and (new_assignee.id != old_assignee_id) and (new_assignee.id != user.id):
        try:
            from apps.notifications.tasks import dispatch_notification_task
            actor_name = getattr(user, 'display_name', user.email)
            transaction.on_commit(lambda: dispatch_notification_task.delay(
                recipient_id=str(new_assignee.id),
                actor_id=str(user.id),
                workspace_id=str(work_item.project.workspace_id) if work_item.project.workspace_id else None,
                event_type='TASK_ASSIGNED',
                title=f"Assigned to {work_item.key_identifier}: {work_item.title}",
                description=f"{actor_name} assigned this work item to you in {work_item.project.name}.",
                target_url=f"/dashboard",
                payload={
                    'item_key': work_item.key_identifier,
                    'item_title': work_item.title,
                    'item_priority': work_item.priority,
                    'project_name': work_item.project.name,
                },
                idempotency_key=f"TASK_ASSIGNED:{work_item.id}:{new_assignee.id}:{timezone.now().strftime('%Y-%m-%d-%H%M')}"
            ))
        except Exception:
            pass

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


# -------------------------------------------------------------------------
# Sprint Lifecycle Services — Phase 5: Sprints & Interactive Kanban
# -------------------------------------------------------------------------

@transaction.atomic
def create_sprint(
    *,
    project: Project,
    user,
    name: str,
    sprint_goal: str = '',
    start_date=None,
    end_date=None
) -> Sprint:
    """Create a new sprint in PLANNING status."""
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    if not name or not name.strip():
        raise ValidationError({"name": "Sprint name is required."})

    if start_date and end_date and end_date <= start_date:
        raise ValidationError({"end_date": "End date must be strictly after start date."})

    sprint = Sprint.objects.create(
        project=project,
        name=name.strip(),
        sprint_goal=sprint_goal.strip() if sprint_goal else '',
        start_date=start_date,
        end_date=end_date,
        status=Sprint.Status.PLANNING,
        created_by=user,
    )
    return sprint


@transaction.atomic
def start_sprint(
    *,
    sprint: Sprint,
    user,
    sprint_goal: str | None = None,
    start_date=None,
    end_date=None
) -> Sprint:
    """
    Start an existing sprint.
    Enforces the single ACTIVE sprint invariant via row-level pessimistic locking on Project.
    """
    if not has_project_write_access(sprint.project, user):
        raise PermissionDenied("You do not have permission to start a sprint in this project.")

    if sprint.status != Sprint.Status.PLANNING:
        raise ValidationError(f"Only sprints in PLANNING status can be started. Current status is {sprint.status}.")

    # Pessimistic locking on project to prevent concurrent starts
    project = Project.objects.select_for_update().get(id=sprint.project_id)

    # Invariant: No other ACTIVE sprint in this project
    active_exists = Sprint.objects.filter(
        project=project,
        status=Sprint.Status.ACTIVE
    ).exclude(id=sprint.id).exists()

    if active_exists:
        raise ValidationError("Another sprint is already active in this project. Complete it before starting a new sprint.")

    if sprint_goal is not None:
        sprint.sprint_goal = sprint_goal.strip()
    if start_date is not None:
        sprint.start_date = start_date
    if end_date is not None:
        sprint.end_date = end_date

    if not sprint.sprint_goal or not sprint.sprint_goal.strip():
        raise ValidationError({"sprint_goal": "A Sprint Goal is required to start the sprint."})

    if sprint.start_date and sprint.end_date and sprint.end_date <= sprint.start_date:
        raise ValidationError({"end_date": "End date must be strictly after start date."})

    # Calculate committed planned story points
    planned_points = sum(
        item.story_points or 0 for item in sprint.work_items.all()
    )

    sprint.status = Sprint.Status.ACTIVE
    sprint.actual_started_at = timezone.now()
    sprint.planned_story_points = planned_points
    sprint.save()

    # Move items currently in BACKLOG to TODO for active sprint execution
    sprint.work_items.filter(status=WorkItem.Status.BACKLOG).update(status=WorkItem.Status.TODO)

    # Notify project members of sprint activation
    try:
        from apps.notifications.tasks import dispatch_notification_task
        member_user_ids = list(sprint.project.members.exclude(user=user).values_list('user_id', flat=True))
        for m_id in member_user_ids:
            transaction.on_commit(lambda member_id=m_id: dispatch_notification_task.delay(
                recipient_id=str(member_id),
                actor_id=str(user.id),
                workspace_id=str(sprint.project.workspace_id) if sprint.project.workspace_id else None,
                event_type='SPRINT_STARTED',
                title=f"Sprint Started: {sprint.name}",
                description=f"{sprint.name} is now ACTIVE with goal: \"{sprint.sprint_goal}\"",
                target_url=f"/dashboard",
                payload={
                    'sprint_name': sprint.name,
                    'sprint_goal': sprint.sprint_goal,
                    'planned_points': sprint.planned_story_points,
                    'total_items': sprint.work_items.count(),
                    'project_name': sprint.project.name,
                },
                idempotency_key=f"SPRINT_STARTED:{sprint.id}:{member_id}"
            ))
    except Exception:
        pass

    return sprint


@transaction.atomic
def complete_sprint(
    *,
    sprint: Sprint,
    user,
    rollover_to_backlog: bool = True,
    next_sprint_id: str | None = None
) -> Sprint:
    """
    Complete an ACTIVE sprint.
    Records completed points and handles rollover of incomplete items.
    """
    if not has_project_write_access(sprint.project, user):
        raise PermissionDenied("You do not have permission to complete this sprint.")

    if sprint.status != Sprint.Status.ACTIVE:
        raise ValidationError(f"Only ACTIVE sprints can be completed. Current status is {sprint.status}.")

    # Tally completed story points
    completed_points = sum(
        item.story_points or 0 for item in sprint.work_items.filter(status=WorkItem.Status.DONE)
    )

    # Handle incomplete work items (anything not DONE)
    incomplete_items = sprint.work_items.exclude(status=WorkItem.Status.DONE)

    if next_sprint_id:
        target_sprint = Sprint.objects.filter(
            project=sprint.project,
            id=next_sprint_id,
            status=Sprint.Status.PLANNING
        ).first()
        if not target_sprint:
            raise ValidationError("Target sprint for rollover must be in PLANNING status within the same project.")
        incomplete_items.update(sprint=target_sprint)
    elif rollover_to_backlog:
        incomplete_items.update(sprint=None, status=WorkItem.Status.BACKLOG)

    sprint.status = Sprint.Status.COMPLETED
    sprint.completed_story_points = completed_points
    sprint.actual_completed_at = timezone.now()
    sprint.save()
    return sprint


@transaction.atomic
def cancel_sprint(*, sprint: Sprint, user) -> Sprint:
    """Cancel a sprint and return all its items to the backlog."""
    if not has_project_write_access(sprint.project, user):
        raise PermissionDenied("You do not have permission to cancel this sprint.")

    if sprint.status in [Sprint.Status.COMPLETED, Sprint.Status.CANCELLED]:
        raise ValidationError(f"Sprint cannot be cancelled from status {sprint.status}.")

    # Revert all items to backlog
    sprint.work_items.all().update(sprint=None)
    sprint.status = Sprint.Status.CANCELLED
    sprint.save()
    return sprint


@transaction.atomic
def add_work_items_to_sprint(
    *,
    sprint: Sprint,
    user,
    item_numbers: list[int]
) -> list[WorkItem]:
    """Assign backlog items to a sprint."""
    if not has_project_write_access(sprint.project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    if sprint.status not in [Sprint.Status.PLANNING, Sprint.Status.ACTIVE]:
        raise ValidationError("Items can only be added to sprints in PLANNING or ACTIVE status.")

    items = list(WorkItem.objects.filter(project=sprint.project, item_number__in=item_numbers))
    for item in items:
        item.sprint = sprint
        if sprint.status == Sprint.Status.ACTIVE and item.status == WorkItem.Status.BACKLOG:
            item.status = WorkItem.Status.TODO
        item.save()

        # Emit sprint assignment activity
        try:
            from apps.collaboration.services import record_activity_event
            record_activity_event(
                workspace=sprint.project.workspace,
                actor=user,
                object_type='WorkItem',
                object_id=item.id,
                event_type='SPRINT_ASSIGNED',
                metadata={
                    'sprint_id': str(sprint.id),
                    'sprint_name': sprint.name,
                    'item_number': item.item_number,
                    'key_identifier': item.key_identifier,
                }
            )
        except Exception:
            pass

    return items


@transaction.atomic
def remove_work_items_from_sprint(
    *,
    project: Project,
    user,
    item_numbers: list[int]
) -> list[WorkItem]:
    """Remove items from sprint and return them to the product backlog."""
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    items = list(WorkItem.objects.filter(project=project, item_number__in=item_numbers))
    for item in items:
        item.sprint = None
        if item.status == WorkItem.Status.TODO:
            item.status = WorkItem.Status.BACKLOG
        item.save()

    return items


@transaction.atomic
def transition_work_item_status(
    *,
    project: Project,
    user,
    item_number: int,
    new_status: str
) -> WorkItem:
    """Move a work item between Kanban columns (TODO -> IN_PROGRESS -> IN_REVIEW -> DONE)."""
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    if new_status not in WorkItem.Status.values:
        raise ValidationError({"status": f"Invalid status: {new_status}. Must be one of {WorkItem.Status.values}"})

    item = WorkItem.objects.filter(project=project, item_number=item_number).first()
    if not item:
        raise ValidationError("Work item not found.")

    old_status = item.status
    if old_status != new_status:
        item.status = new_status
        item.save(update_fields=['status', 'updated_at'])

        try:
            from apps.collaboration.services import record_activity_event
            record_activity_event(
                workspace=project.workspace,
                actor=user,
                object_type='WorkItem',
                object_id=item.id,
                event_type='STATUS_CHANGED',
                metadata={
                    'old_status': old_status,
                    'new_status': new_status,
                    'item_number': item.item_number,
                    'key_identifier': item.key_identifier,
                }
            )
        except Exception:
            pass

    return item


def check_dependency_cycle(blocking_item_id, target_blocked_id) -> bool:
    """
    Checks if making blocking_item block target_blocked would create a circular dependency.
    Traverses: target_blocked -> ... -> blocking_item
    """
    from apps.projects.models import WorkItemDependency
    visited = set()
    queue = [target_blocked_id]

    while queue:
        current_id = queue.pop(0)
        if current_id == blocking_item_id:
            return True
        if current_id in visited:
            continue
        visited.add(current_id)
        blocked_ids = WorkItemDependency.objects.filter(
            blocking_item_id=current_id
        ).values_list('blocked_item_id', flat=True)
        for b_id in blocked_ids:
            if b_id not in visited:
                queue.append(b_id)

    return False


@transaction.atomic
def add_work_item_dependency(
    *,
    user,
    project: Project,
    blocking_item: WorkItem,
    blocked_item: WorkItem,
    dependency_type: str = 'BLOCKS'
):
    """
    Adds a dependency relationship (blocking_item blocks blocked_item).
    Enforces cycle detection so circular blockers are rejected.
    """
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    if blocking_item.id == blocked_item.id:
        raise ValidationError({'detail': 'A work item cannot block itself.'})

    if blocking_item.project_id != blocked_item.project_id:
        raise ValidationError({'detail': 'Dependencies can only be created between items in the same project.'})

    from apps.projects.models import WorkItemDependency
    existing = WorkItemDependency.objects.filter(
        blocking_item=blocking_item, blocked_item=blocked_item
    ).first()
    if existing:
        return existing

    # Cycle Detection: Does blocked_item already block blocking_item?
    if check_dependency_cycle(blocking_item.id, blocked_item.id):
        raise ValidationError({'detail': 'Circular dependency detected: This item is already blocked by the target item.'})

    dep = WorkItemDependency.objects.create(
        blocking_item=blocking_item,
        blocked_item=blocked_item,
        dependency_type=dependency_type
    )

    try:
        from apps.collaboration.services import record_activity_event
        record_activity_event(
            workspace=project.workspace,
            actor=user,
            object_type='WorkItem',
            object_id=blocked_item.id,
            event_type='DEPENDENCY_ADDED',
            metadata={
                'dependency_id': str(dep.id),
                'blocking_key': blocking_item.key_identifier,
                'blocked_key': blocked_item.key_identifier,
                'blocking_title': blocking_item.title,
            }
        )
    except Exception:
        pass

    return dep


@transaction.atomic
def remove_work_item_dependency(*, user, project: Project, dependency_id: str):
    """Removes a dependency relationship."""
    if not has_project_write_access(project, user):
        raise PermissionDenied("You do not have write permission for this project.")

    from apps.projects.models import WorkItemDependency
    dep = WorkItemDependency.objects.filter(id=dependency_id).first()
    if not dep:
        raise ValidationError({'detail': 'Dependency not found.'})

    dep.delete()

