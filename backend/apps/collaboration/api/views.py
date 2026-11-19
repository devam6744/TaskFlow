from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, ValidationError, PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from apps.workspaces.models import Workspace
from apps.projects.models import Project, WorkItem, WorkItemDependency
from apps.projects import selectors as project_selectors
from apps.collaboration import services, selectors
from apps.collaboration.models import Comment, Attachment, ActivityEvent
from apps.collaboration.api.serializers import (
    CommentSerializer,
    CommentCreateUpdateSerializer,
    AttachmentSerializer,
    AttachmentUploadSerializer,
    ActivityEventSerializer,
    WorkItemDependencySerializer,
    WorkItemDependencyCreateSerializer,
)


class BaseWorkItemCollaborationView(APIView):
    """Base helper to resolve workspace, project, and work item from URL parameters."""
    permission_classes = [IsAuthenticated]

    def get_workspace(self, workspace_slug: str) -> Workspace:
        workspace = Workspace.objects.filter(slug=workspace_slug).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        self.workspace = workspace
        return workspace

    def get_project(self, workspace: Workspace, project_slug: str) -> Project:
        project = project_selectors.get_project_by_slug(workspace, project_slug, self.request.user)
        if not project:
            raise NotFound(f"Project '{project_slug}' not found or access denied.")
        self.project = project
        return project

    def get_work_item(self, workspace_slug: str, project_slug: str, item_number: int) -> WorkItem:
        workspace = self.get_workspace(workspace_slug)
        project = self.get_project(workspace, project_slug)
        work_item = WorkItem.objects.filter(project=project, item_number=item_number).first()
        if not work_item:
            raise NotFound(f"Work item #{item_number} not found.")
        self.work_item = work_item
        return work_item


class CommentListCreateView(BaseWorkItemCollaborationView):
    """
    GET  /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/comments/ - List active comments.
    POST /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/comments/ - Add a comment.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='List work item comments',
        responses={200: CommentSerializer(many=True)}
    )
    def get(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        comments = selectors.get_work_item_comments(work_item)
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Collaboration'],
        summary='Post a comment on work item',
        request=CommentCreateUpdateSerializer,
        responses={201: CommentSerializer}
    )
    def post(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        serializer = CommentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = services.add_comment(
            work_item=work_item,
            author=request.user,
            body=serializer.validated_data['body']
        )
        return Response(
            CommentSerializer(comment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class CommentDetailView(BaseWorkItemCollaborationView):
    """
    PATCH  /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/comments/{comment_id}/ - Edit comment.
    DELETE /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/comments/{comment_id}/ - Soft delete comment.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='Update a comment',
        request=CommentCreateUpdateSerializer,
        responses={200: CommentSerializer}
    )
    def patch(self, request, workspace_slug: str, project_slug: str, item_number: int, comment_id: str):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        comment = Comment.objects.filter(id=comment_id, work_item=work_item).first()
        if not comment:
            raise NotFound("Comment not found.")

        serializer = CommentCreateUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        updated_comment = services.update_comment(
            comment=comment,
            user=request.user,
            new_body=serializer.validated_data['body']
        )
        return Response(
            CommentSerializer(updated_comment, context={'request': request}).data,
            status=status.HTTP_200_OK
        )

    @extend_schema(
        tags=['Collaboration'],
        summary='Soft delete a comment',
        responses={204: OpenApiResponse(description='Comment deleted successfully')}
    )
    def delete(self, request, workspace_slug: str, project_slug: str, item_number: int, comment_id: str):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        comment = Comment.objects.filter(id=comment_id, work_item=work_item).first()
        if not comment:
            raise NotFound("Comment not found.")

        services.delete_comment(comment=comment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AttachmentListCreateView(BaseWorkItemCollaborationView):
    """
    GET  /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/attachments/ - List attachments.
    POST /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/attachments/ - Upload attachment.
    """
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=['Collaboration'],
        summary='List work item attachments',
        responses={200: AttachmentSerializer(many=True)}
    )
    def get(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        attachments = selectors.get_work_item_attachments(work_item)
        serializer = AttachmentSerializer(attachments, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Collaboration'],
        summary='Upload a file attachment',
        request=AttachmentUploadSerializer,
        responses={201: AttachmentSerializer}
    )
    def post(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        file_obj = request.FILES.get('file')
        if not file_obj:
            raise ValidationError({'file': 'No file provided.'})

        attachment = services.upload_attachment(
            work_item=work_item,
            uploader=request.user,
            file_obj=file_obj
        )
        return Response(
            AttachmentSerializer(attachment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class AttachmentDetailView(BaseWorkItemCollaborationView):
    """
    DELETE /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/attachments/{attachment_id}/ - Delete attachment.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='Delete a file attachment',
        responses={204: OpenApiResponse(description='Attachment deleted successfully')}
    )
    def delete(self, request, workspace_slug: str, project_slug: str, item_number: int, attachment_id: str):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        attachment = Attachment.objects.filter(id=attachment_id, work_item=work_item).first()
        if not attachment:
            raise NotFound("Attachment not found.")

        services.delete_attachment(attachment=attachment, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ActivityEventListView(BaseWorkItemCollaborationView):
    """
    GET /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/activity/ - Get activity audit feed.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='Get work item activity audit history',
        responses={200: ActivityEventSerializer(many=True)}
    )
    def get(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        activity = selectors.get_work_item_activity(work_item)
        serializer = ActivityEventSerializer(activity, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkItemDependencyListCreateView(BaseWorkItemCollaborationView):
    """
    GET  /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/dependencies/ - List dependencies.
    POST /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/dependencies/ - Add blocking dependency.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='List dependencies for work item',
        responses={200: WorkItemDependencySerializer(many=True)}
    )
    def get(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        # Return items that block this work item
        deps = WorkItemDependency.objects.filter(
            blocked_item=work_item
        ).select_related('blocking_item', 'blocked_item')
        serializer = WorkItemDependencySerializer(deps, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        tags=['Collaboration'],
        summary='Add blocking dependency to work item',
        request=WorkItemDependencyCreateSerializer,
        responses={201: WorkItemDependencySerializer}
    )
    def post(self, request, workspace_slug: str, project_slug: str, item_number: int):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        serializer = WorkItemDependencyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        blocking_number = serializer.validated_data['blocking_item_number']
        blocking_item = WorkItem.objects.filter(
            project=self.project,
            item_number=blocking_number
        ).first()

        if not blocking_item:
            raise NotFound(f"Blocking work item #{blocking_number} not found in this project.")

        from apps.projects.services import add_work_item_dependency
        dep = add_work_item_dependency(
            user=request.user,
            project=self.project,
            blocking_item=blocking_item,
            blocked_item=work_item,
            dependency_type=serializer.validated_data.get('dependency_type', 'BLOCKS')
        )
        return Response(
            WorkItemDependencySerializer(dep, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class WorkItemDependencyDetailView(BaseWorkItemCollaborationView):
    """
    DELETE /api/v1/workspaces/{w_slug}/projects/{p_slug}/items/{item_number}/dependencies/{dep_id}/ - Remove dependency.
    """

    @extend_schema(
        tags=['Collaboration'],
        summary='Remove work item dependency',
        responses={204: OpenApiResponse(description='Dependency removed successfully')}
    )
    def delete(self, request, workspace_slug: str, project_slug: str, item_number: int, dep_id: str):
        work_item = self.get_work_item(workspace_slug, project_slug, item_number)
        from apps.projects.services import remove_work_item_dependency
        remove_work_item_dependency(
            user=request.user,
            project=self.project,
            dependency_id=dep_id
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
