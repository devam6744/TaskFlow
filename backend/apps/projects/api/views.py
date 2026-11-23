"""
Project & Backlog Views — Phase 4: REST API Endpoints
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter
from django.contrib.auth import get_user_model

from apps.workspaces.models import Workspace
from apps.workspaces.permissions import IsWorkspaceMember
from apps.projects.models import Project, ProjectMember, WorkItem, Sprint
from apps.projects import services, selectors
from apps.projects.api.serializers import (
    ProjectSerializer,
    ProjectCreateSerializer,
    ProjectUpdateSerializer,
    ProjectMemberSerializer,
    ProjectMemberAddSerializer,
    WorkItemSerializer,
    WorkItemCreateSerializer,
    WorkItemUpdateSerializer,
    WorkItemReorderSerializer,
    SprintSerializer,
    SprintCreateSerializer,
    SprintStartSerializer,
    SprintCompleteSerializer,
    SprintItemsActionSerializer,
    WorkItemStatusTransitionSerializer,
)

User = get_user_model()


class BaseWorkspaceProjectView(APIView):
    """Base helper to resolve workspace and project from URL parameters."""
    permission_classes = [IsAuthenticated]

    def get_workspace(self, workspace_slug: str) -> Workspace:
        workspace = Workspace.objects.filter(slug=workspace_slug).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        self.workspace = workspace
        return workspace

    def get_project(self, workspace: Workspace, project_slug: str) -> Project:
        project = selectors.get_project_by_slug(workspace, project_slug, self.request.user)
        if not project:
            raise NotFound(f"Project '{project_slug}' not found or access denied.")
        self.project = project
        return project


class ProjectListCreateView(APIView):
    """
    GET  /api/v1/workspaces/{workspace_slug}/projects/ - List all projects user has access to.
    POST /api/v1/workspaces/{workspace_slug}/projects/ - Create a new project.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List accessible projects in workspace",
        responses={200: ProjectSerializer(many=True)},
    )
    def get(self, request, workspace_slug):
        workspace = Workspace.objects.filter(slug=workspace_slug).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")

        projects = selectors.get_workspace_projects(workspace, request.user)
        serializer = ProjectSerializer(projects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create a new project",
        request=ProjectCreateSerializer,
        responses={201: ProjectSerializer},
    )
    def post(self, request, workspace_slug):
        workspace = Workspace.objects.filter(slug=workspace_slug).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")

        serializer = ProjectCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        lead = None
        if data.get('lead_id'):
            lead = User.objects.filter(id=data['lead_id']).first()

        project = services.create_project(
            workspace=workspace,
            user=request.user,
            name=data['name'],
            key=data.get('key'),
            description=data.get('description', ''),
            visibility=data.get('visibility', Project.Visibility.WORKSPACE),
            lead=lead,
            start_date=data.get('start_date'),
            target_date=data.get('target_date'),
            definition_of_done=data.get('definition_of_done', '')
        )

        return Response(ProjectSerializer(project).data, status=status.HTTP_201_CREATED)


class ProjectDetailView(BaseWorkspaceProjectView):
    """
    GET   /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/
    PATCH /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/
    """

    @extend_schema(
        summary="Get project details by slug",
        responses={200: ProjectSerializer},
    )
    def get(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        return Response(ProjectSerializer(project).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update project details",
        request=ProjectUpdateSerializer,
        responses={200: ProjectSerializer},
    )
    def patch(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = ProjectUpdateSerializer(project, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        updated = services.update_project(project, request.user, **serializer.validated_data)
        return Response(ProjectSerializer(updated).data, status=status.HTTP_200_OK)


class ProjectArchiveView(BaseWorkspaceProjectView):
    """Soft-archive a project."""
    @extend_schema(
        summary="Archive project",
        request=None,
        responses={200: OpenApiResponse(description="Project archived")}
    )
    def post(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        services.archive_project(project, request.user)
        return Response({'detail': f"Project '{project.name}' archived."}, status=status.HTTP_200_OK)


class ProjectUnarchiveView(BaseWorkspaceProjectView):
    """Restore an archived project."""
    @extend_schema(
        summary="Unarchive project",
        request=None,
        responses={200: OpenApiResponse(description="Project restored")}
    )
    def post(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        services.unarchive_project(project, request.user)
        return Response({'detail': f"Project '{project.name}' restored."}, status=status.HTTP_200_OK)


class ProjectMemberListCreateView(BaseWorkspaceProjectView):
    """List or add members to a private project."""

    @extend_schema(
        summary="List private project members",
        responses={200: ProjectMemberSerializer(many=True)},
    )
    def get(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        members = ProjectMember.objects.filter(project=project).select_related('user')
        return Response(ProjectMemberSerializer(members, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Add member to private project",
        request=ProjectMemberAddSerializer,
        responses={201: ProjectMemberSerializer},
    )
    def post(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = ProjectMemberAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user = User.objects.filter(email=serializer.validated_data['email']).first()
        if not target_user:
            raise NotFound("User with this email not found.")

        member = services.add_project_member(
            project=project,
            target_user=target_user,
            role=serializer.validated_data['role'],
            requesting_user=request.user
        )
        return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)


class ProjectMemberDetailView(BaseWorkspaceProjectView):
    """Remove a member from a private project."""
    @extend_schema(
        summary="Remove member from private project",
        responses={200: OpenApiResponse(description="Member removed")}
    )
    def delete(self, request, workspace_slug, project_slug, user_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        target_user = User.objects.filter(id=user_id).first()
        if not target_user:
            raise NotFound("Target user not found.")

        services.remove_project_member(project, target_user, request.user)
        return Response({'detail': 'Project member removed.'}, status=status.HTTP_200_OK)


# -------------------------------------------------------------
# Backlog & WorkItem Endpoints
# -------------------------------------------------------------

class BacklogItemListCreateView(BaseWorkspaceProjectView):
    """
    GET  /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/backlog/ - List backlog items.
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/backlog/ - Create backlog work item.
    """

    @extend_schema(
        summary="List prioritized product backlog items",
        responses={200: WorkItemSerializer(many=True)},
    )
    def get(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        backlog_items = selectors.get_project_backlog(project)
        return Response(WorkItemSerializer(backlog_items, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create backlog work item (Story, Task, Bug)",
        request=WorkItemCreateSerializer,
        responses={201: WorkItemSerializer},
    )
    def post(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = WorkItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        assignee = None
        if data.get('assignee_id'):
            assignee = User.objects.filter(id=data['assignee_id']).first()

        item = services.create_work_item(
            project=project,
            user=request.user,
            title=data['title'],
            type=data.get('type', WorkItem.Type.STORY),
            priority=data.get('priority', WorkItem.Priority.MEDIUM),
            description=data.get('description', ''),
            story_points=data.get('story_points'),
            acceptance_criteria=data.get('acceptance_criteria', ''),
            assignee=assignee,
            due_date=data.get('due_date')
        )

        return Response(WorkItemSerializer(item).data, status=status.HTTP_201_CREATED)


class WorkItemDetailView(BaseWorkspaceProjectView):
    """
    GET    /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/work-items/{item_number}/
    PATCH  /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/work-items/{item_number}/
    DELETE /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/work-items/{item_number}/
    """

    def get_work_item(self, project: Project, item_number: int) -> WorkItem:
        item = selectors.get_work_item_by_number(project, item_number)
        if not item:
            raise NotFound(f"Work item '{project.key}-{item_number}' not found.")
        return item

    @extend_schema(
        summary="Get work item detail",
        responses={200: WorkItemSerializer},
    )
    def get(self, request, workspace_slug, project_slug, item_number):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        item = self.get_work_item(project, item_number)
        return Response(WorkItemSerializer(item).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update work item",
        request=WorkItemUpdateSerializer,
        responses={200: WorkItemSerializer},
    )
    def patch(self, request, workspace_slug, project_slug, item_number):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        item = self.get_work_item(project, item_number)

        serializer = WorkItemUpdateSerializer(item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        if 'assignee_id' in validated:
            assignee_id = validated.pop('assignee_id')
            validated['assignee'] = User.objects.filter(id=assignee_id).first() if assignee_id else None

        updated_item = services.update_work_item(item, request.user, **validated)
        return Response(WorkItemSerializer(updated_item).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Delete work item",
        responses={200: OpenApiResponse(description="Work item deleted")}
    )
    def delete(self, request, workspace_slug, project_slug, item_number):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        item = self.get_work_item(project, item_number)
        services.delete_work_item(item, request.user)
        return Response({'detail': 'Work item deleted successfully.'}, status=status.HTTP_200_OK)


class WorkItemReorderView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/work-items/{item_number}/reorder/
    Drag-and-drop fractional reordering.
    """

    @extend_schema(
        summary="Reorder backlog item (drag-and-drop LexoRank)",
        request=WorkItemReorderSerializer,
        responses={200: WorkItemSerializer},
    )
    def post(self, request, workspace_slug, project_slug, item_number):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        item = selectors.get_work_item_by_number(project, item_number)
        if not item:
            raise NotFound(f"Work item '{project.key}-{item_number}' not found.")

        serializer = WorkItemReorderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        reordered = services.reorder_backlog_item(
            work_item=item,
            user=request.user,
            prev_item_id=serializer.validated_data.get('prev_item_id'),
            next_item_id=serializer.validated_data.get('next_item_id')
        )
        return Response(WorkItemSerializer(reordered).data, status=status.HTTP_200_OK)


# -------------------------------------------------------------------------
# Sprint Lifecycle Views — Phase 5: Sprints & Interactive Kanban Board
# -------------------------------------------------------------------------

class SprintListCreateView(BaseWorkspaceProjectView):
    """
    GET  /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/ - List project sprints
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/ - Create a new sprint
    """

    @extend_schema(
        summary="List all sprints in project",
        responses={200: SprintSerializer(many=True)},
    )
    def get(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        sprints = selectors.get_project_sprints(project)
        return Response(SprintSerializer(sprints, many=True).data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create a new sprint",
        request=SprintCreateSerializer,
        responses={201: SprintSerializer},
    )
    def post(self, request, workspace_slug, project_slug):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = SprintCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        sprint = services.create_sprint(
            project=project,
            user=request.user,
            name=data['name'],
            sprint_goal=data.get('sprint_goal', ''),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
        )
        return Response(SprintSerializer(sprint).data, status=status.HTTP_201_CREATED)


class SprintDetailView(BaseWorkspaceProjectView):
    """
    GET   /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/
    PATCH /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/
    """

    def get_sprint(self, project: Project, sprint_id: str) -> Sprint:
        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound(f"Sprint '{sprint_id}' not found.")
        return sprint

    @extend_schema(
        summary="Get sprint details and items",
        responses={200: SprintSerializer},
    )
    def get(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        sprint = self.get_sprint(project, sprint_id)
        items = selectors.get_sprint_work_items(sprint)

        sprint_data = SprintSerializer(sprint).data
        sprint_data['items'] = WorkItemSerializer(items, many=True).data
        return Response(sprint_data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update sprint details",
        request=SprintCreateSerializer,
        responses={200: SprintSerializer},
    )
    def patch(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        sprint = self.get_sprint(project, sprint_id)

        if not services.has_project_write_access(project, request.user):
            raise PermissionDenied("You do not have write permission for this project.")

        for field in ['name', 'sprint_goal', 'start_date', 'end_date']:
            if field in request.data:
                setattr(sprint, field, request.data[field])

        sprint.save()
        return Response(SprintSerializer(sprint).data, status=status.HTTP_200_OK)


class SprintStartView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/start/
    Activates the sprint, enforcing the single ACTIVE sprint invariant.
    """

    @extend_schema(
        summary="Start/Activate a Sprint",
        request=SprintStartSerializer,
        responses={200: SprintSerializer},
    )
    def post(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound("Sprint not found.")

        serializer = SprintStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        started_sprint = services.start_sprint(
            sprint=sprint,
            user=request.user,
            sprint_goal=data.get('sprint_goal'),
            start_date=data.get('start_date'),
            end_date=data.get('end_date'),
        )
        return Response(SprintSerializer(started_sprint).data, status=status.HTTP_200_OK)


class SprintCompleteView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/complete/
    Completes the active sprint and rolls over incomplete work.
    """

    @extend_schema(
        summary="Complete an Active Sprint",
        request=SprintCompleteSerializer,
        responses={200: SprintSerializer},
    )
    def post(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound("Sprint not found.")

        serializer = SprintCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        completed = services.complete_sprint(
            sprint=sprint,
            user=request.user,
            rollover_to_backlog=data.get('rollover_to_backlog', True),
            next_sprint_id=data.get('next_sprint_id'),
        )
        return Response(SprintSerializer(completed).data, status=status.HTTP_200_OK)


class SprintCancelView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/cancel/
    Cancels a sprint and returns all items to the product backlog.
    """

    @extend_schema(
        summary="Cancel a Sprint",
        request=None,
        responses={200: SprintSerializer},
    )
    def post(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound("Sprint not found.")

        cancelled = services.cancel_sprint(sprint=sprint, user=request.user)
        return Response(SprintSerializer(cancelled).data, status=status.HTTP_200_OK)


class SprintAddItemsView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/add-items/
    Adds work items to a sprint.
    """

    @extend_schema(
        summary="Add work items to a sprint",
        request=SprintItemsActionSerializer,
        responses={200: WorkItemSerializer(many=True)},
    )
    def post(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound("Sprint not found.")

        serializer = SprintItemsActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = services.add_work_items_to_sprint(
            sprint=sprint,
            user=request.user,
            item_numbers=serializer.validated_data['item_numbers'],
        )
        return Response(WorkItemSerializer(items, many=True).data, status=status.HTTP_200_OK)


class SprintRemoveItemsView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/remove-items/
    Removes work items from a sprint back to the product backlog.
    """

    @extend_schema(
        summary="Remove work items from a sprint",
        request=SprintItemsActionSerializer,
        responses={200: WorkItemSerializer(many=True)},
    )
    def post(self, request, workspace_slug, project_slug, sprint_id):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = SprintItemsActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        items = services.remove_work_items_from_sprint(
            project=project,
            user=request.user,
            item_numbers=serializer.validated_data['item_numbers'],
        )
        return Response(WorkItemSerializer(items, many=True).data, status=status.HTTP_200_OK)


class ActiveSprintBoardView(BaseWorkspaceProjectView):
    """
    GET /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/board/
    Returns the active sprint data and its work items grouped into swimlane columns.
    """

    @extend_schema(
        summary="Get Active Sprint Kanban Board data",
        responses={200: OpenApiResponse(description="Board data with swimlane columns")},
    )
    def get(self, request, workspace_slug, project_slug):
        from django.utils import timezone

        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        active_sprint = selectors.get_active_sprint(project)

        if not active_sprint:
            return Response({
                'active_sprint': None,
                'days_remaining': 0,
                'columns': {
                    'TODO': [],
                    'IN_PROGRESS': [],
                    'IN_REVIEW': [],
                    'DONE': [],
                }
            }, status=status.HTTP_200_OK)

        items = selectors.get_sprint_work_items(active_sprint)
        serialized_items = WorkItemSerializer(items, many=True).data

        columns = {
            'TODO': [],
            'IN_PROGRESS': [],
            'IN_REVIEW': [],
            'DONE': [],
        }

        for item in serialized_items:
            item_status = item.get('status')
            if item_status in columns:
                columns[item_status].append(item)
            else:
                # Default fallback
                columns['TODO'].append(item)

        days_remaining = 0
        if active_sprint.end_date:
            delta = (active_sprint.end_date - timezone.now().date()).days
            days_remaining = max(0, delta)

        return Response({
            'active_sprint': SprintSerializer(active_sprint).data,
            'days_remaining': days_remaining,
            'columns': columns,
        }, status=status.HTTP_200_OK)


class WorkItemStatusTransitionView(BaseWorkspaceProjectView):
    """
    POST /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/work-items/{item_number}/status/
    Transitions work item status across Kanban columns.
    """

    @extend_schema(
        summary="Transition work item status (Kanban column move)",
        request=WorkItemStatusTransitionSerializer,
        responses={200: WorkItemSerializer},
    )
    def post(self, request, workspace_slug, project_slug, item_number):
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        serializer = WorkItemStatusTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_item = services.transition_work_item_status(
            project=project,
            user=request.user,
            item_number=item_number,
            new_status=serializer.validated_data['status'],
        )
        return Response(WorkItemSerializer(updated_item).data, status=status.HTTP_200_OK)


class SprintBurndownView(BaseWorkspaceProjectView):
    """
    GET /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/burndown/
    Returns Ideal Line vs Actual Line data points for interactive Burndown visualization.
    """

    @extend_schema(
        summary="Get Sprint Burndown Chart dataset",
        responses={200: OpenApiResponse(description="Burndown dataset with Ideal and Actual time series")},
    )
    def get(self, request, workspace_slug, project_slug, sprint_id):
        from apps.projects.analytics import get_sprint_burndown_data
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound(f"Sprint '{sprint_id}' not found.")

        data = get_sprint_burndown_data(sprint)
        return Response(data, status=status.HTTP_200_OK)


class SprintReportView(BaseWorkspaceProjectView):
    """
    GET /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/sprints/{sprint_id}/report/
    Returns Planned vs Completed metrics, Scope Delta, and Type/Assignee breakdowns.
    """

    @extend_schema(
        summary="Get Comprehensive Sprint Performance & Scope Report",
        responses={200: OpenApiResponse(description="Sprint retrospective report metrics")},
    )
    def get(self, request, workspace_slug, project_slug, sprint_id):
        from apps.projects.analytics import get_sprint_report_metrics
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        sprint = Sprint.objects.filter(project=project, id=sprint_id).first()
        if not sprint:
            raise NotFound(f"Sprint '{sprint_id}' not found.")

        data = get_sprint_report_metrics(sprint)
        return Response(data, status=status.HTTP_200_OK)


class ProjectVelocityView(BaseWorkspaceProjectView):
    """
    GET /api/v1/workspaces/{workspace_slug}/projects/{project_slug}/velocity/
    Returns historical velocity metrics across past completed sprints.
    """

    @extend_schema(
        summary="Get Project Velocity History",
        responses={200: OpenApiResponse(description="Historical velocity trend dataset")},
    )
    def get(self, request, workspace_slug, project_slug):
        from apps.projects.analytics import get_project_velocity_history
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)

        limit = int(request.query_params.get('limit', 10))
        data = get_project_velocity_history(project, limit=min(max(limit, 1), 25))
        return Response(data, status=status.HTTP_200_OK)


class WorkspaceDashboardSummaryView(APIView):
    """
    GET /api/v1/workspaces/{workspace_slug}/dashboard-summary/
    Returns executive metrics: Assigned to Me, Overdue, Blocked, Active Sprints, and Recent Activity.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_workspace(self, workspace_slug: str) -> Workspace:
        workspace = Workspace.objects.filter(slug=workspace_slug, archived_at__isnull=True).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        return workspace

    @extend_schema(
        summary="Get Workspace Dashboard Summary",
        responses={200: OpenApiResponse(description="Dashboard summary aggregates")},
    )
    def get(self, request, workspace_slug):
        from apps.projects.analytics import get_workspace_dashboard_summary
        workspace = self.get_workspace(workspace_slug)
        data = get_workspace_dashboard_summary(workspace, request.user)
        return Response(data, status=status.HTTP_200_OK)


class GlobalWorkspaceSearchView(APIView):
    """
    GET /api/v1/workspaces/{workspace_slug}/search/?q=...&type=...
    Full-text search across work items, sprints, and projects with strict tenant scoping.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    def get_workspace(self, workspace_slug: str) -> Workspace:
        workspace = Workspace.objects.filter(slug=workspace_slug, archived_at__isnull=True).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        return workspace

    @extend_schema(
        summary="Global Workspace Full-Text Search",
        parameters=[
            OpenApiParameter('q', str, description="Search term or ticket key"),
            OpenApiParameter('type', str, description="Filter type: all, work_item, sprint, project"),
        ],
        responses={200: OpenApiResponse(description="Scoped search results")},
    )
    def get(self, request, workspace_slug):
        from apps.projects.search import global_workspace_search
        workspace = self.get_workspace(workspace_slug)
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'all').strip().lower()

        data = global_workspace_search(
            workspace=workspace,
            user=request.user,
            query=query,
            search_type=search_type,
            limit=25
        )
        return Response(data, status=status.HTTP_200_OK)


