"""
Workspace Views — Phase 3: REST API Endpoints with Strict Multi-Tenancy Isolation
"""

from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound, PermissionDenied
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiParameter

from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvite
from apps.workspaces import services, selectors
from apps.workspaces.permissions import IsWorkspaceMember, IsWorkspaceAdminOrOwner, IsWorkspaceOwner
from apps.workspaces.api.serializers import (
    WorkspaceSerializer,
    WorkspaceCreateSerializer,
    WorkspaceUpdateSerializer,
    WorkspaceMemberSerializer,
    WorkspaceMemberRoleUpdateSerializer,
    WorkspaceInviteCreateSerializer,
    WorkspaceInviteSerializer,
    AcceptInviteSerializer,
)


class BaseWorkspaceScopedView(APIView):
    """Base class that resolves and caches the workspace instance from the URL slug."""
    permission_classes = [IsAuthenticated]

    def get_workspace(self, slug: str) -> Workspace:
        workspace = Workspace.objects.filter(slug=slug).select_related('owner').first()
        if not workspace:
            raise NotFound(detail=f"Workspace with slug '{slug}' not found.")
        self.workspace = workspace
        return workspace

    def check_member_access(self, workspace: Workspace, user) -> WorkspaceMember:
        member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user,
            status=WorkspaceMember.Status.ACTIVE
        ).first()
        if not member:
            raise PermissionDenied("You do not have access to this workspace.")
        return member


class WorkspaceListCreateView(APIView):
    """
    GET  /api/v1/workspaces/       - List all workspaces the authenticated user belongs to.
    POST /api/v1/workspaces/       - Create a new workspace (user becomes OWNER).
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List user's active workspaces",
        responses={200: WorkspaceSerializer(many=True)},
    )
    def get(self, request):
        workspaces = selectors.get_user_workspaces(request.user)
        serializer = WorkspaceSerializer(workspaces, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Create a new workspace",
        request=WorkspaceCreateSerializer,
        responses={201: WorkspaceSerializer},
    )
    def post(self, request):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        workspace = services.create_workspace(
            user=request.user,
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', '')
        )

        output_serializer = WorkspaceSerializer(workspace, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class WorkspaceDetailView(BaseWorkspaceScopedView):
    """
    GET   /api/v1/workspaces/{slug}/  - Retrieve workspace details.
    PATCH /api/v1/workspaces/{slug}/  - Update workspace name, description, or settings.
    """

    @extend_schema(
        summary="Get workspace details by slug",
        responses={200: WorkspaceSerializer, 403: OpenApiResponse(description="Not a member"), 404: OpenApiResponse(description="Not found")},
    )
    def get(self, request, slug):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        serializer = WorkspaceSerializer(workspace, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update workspace details (Admin/Owner only)",
        request=WorkspaceUpdateSerializer,
        responses={200: WorkspaceSerializer},
    )
    def patch(self, request, slug):
        workspace = self.get_workspace(slug)
        member = self.check_member_access(workspace, request.user)

        if not member.has_permission(WorkspaceMember.Role.ADMIN):
            raise PermissionDenied("Only workspace Admins or Owners can update workspace details.")

        serializer = WorkspaceUpdateSerializer(workspace, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        output_serializer = WorkspaceSerializer(workspace, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class WorkspaceArchiveView(BaseWorkspaceScopedView):
    """
    POST /api/v1/workspaces/{slug}/archive/   - Soft-archive workspace (Owner only).
    POST /api/v1/workspaces/{slug}/unarchive/ - Restore archived workspace (Owner only).
    """

    @extend_schema(
        summary="Archive workspace (Owner only)",
        request=None,
        responses={200: OpenApiResponse(description="Workspace archived")}
    )
    def post(self, request, slug):
        workspace = self.get_workspace(slug)
        services.archive_workspace(workspace, request.user)
        return Response({'detail': f"Workspace '{workspace.name}' has been archived."}, status=status.HTTP_200_OK)


class WorkspaceUnarchiveView(BaseWorkspaceScopedView):
    """Restore an archived workspace."""
    @extend_schema(
        summary="Unarchive workspace (Owner only)",
        request=None,
        responses={200: OpenApiResponse(description="Workspace restored")}
    )
    def post(self, request, slug):
        workspace = self.get_workspace(slug)
        services.unarchive_workspace(workspace, request.user)
        return Response({'detail': f"Workspace '{workspace.name}' has been restored."}, status=status.HTTP_200_OK)


class WorkspaceMembersView(BaseWorkspaceScopedView):
    """
    GET /api/v1/workspaces/{slug}/members/ - List all active members of the workspace.
    """

    @extend_schema(
        summary="List all active members of the workspace",
        responses={200: WorkspaceMemberSerializer(many=True)},
    )
    def get(self, request, slug):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        members = selectors.get_workspace_members(workspace)
        serializer = WorkspaceMemberSerializer(members, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class WorkspaceMemberDetailView(BaseWorkspaceScopedView):
    """
    DELETE /api/v1/workspaces/{slug}/members/{user_id}/ - Remove member from workspace.
    PATCH  /api/v1/workspaces/{slug}/members/{user_id}/ - Change member role.
    """

    @extend_schema(
        summary="Remove member from workspace (Admin/Owner only)",
        responses={200: OpenApiResponse(description="Member removed successfully")}
    )
    def delete(self, request, slug, user_id):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        target_user = User.objects.filter(pk=user_id).first()
        if not target_user:
            raise NotFound("Target user not found.")

        services.remove_member(workspace, target_user, request.user)
        return Response({'detail': 'Member removed successfully.'}, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update member role (Admin/Owner only)",
        request=WorkspaceMemberRoleUpdateSerializer,
        responses={200: WorkspaceMemberSerializer},
    )
    def patch(self, request, slug, user_id):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        serializer = WorkspaceMemberRoleUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from django.contrib.auth import get_user_model
        User = get_user_model()
        target_user = User.objects.filter(pk=user_id).first()
        if not target_user:
            raise NotFound("Target user not found.")

        updated_member = services.update_member_role(
            workspace=workspace,
            target_user=target_user,
            new_role=serializer.validated_data['role'],
            requesting_user=request.user
        )

        return Response(WorkspaceMemberSerializer(updated_member).data, status=status.HTTP_200_OK)


class WorkspaceInviteListCreateView(BaseWorkspaceScopedView):
    """
    GET  /api/v1/workspaces/{slug}/invites/ - List all invitations for this workspace.
    POST /api/v1/workspaces/{slug}/invites/ - Send an invitation by email.
    """

    @extend_schema(
        summary="List all workspace invitations (Admin/Owner only)",
        responses={200: WorkspaceInviteSerializer(many=True)},
    )
    def get(self, request, slug):
        workspace = self.get_workspace(slug)
        member = self.check_member_access(workspace, request.user)
        if not member.has_permission(WorkspaceMember.Role.ADMIN):
            raise PermissionDenied("Only workspace Admins or Owners can view invitations.")

        invites = selectors.get_workspace_invites(workspace)
        serializer = WorkspaceInviteSerializer(invites, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Invite a user to the workspace by email (Admin/Owner only)",
        request=WorkspaceInviteCreateSerializer,
        responses={201: OpenApiResponse(description="Invite created, returns invite details and raw_token")},
    )
    def post(self, request, slug):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        serializer = WorkspaceInviteCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invite, raw_token = services.invite_member(
            workspace=workspace,
            inviter=request.user,
            email=serializer.validated_data['email'],
            role=serializer.validated_data.get('role', WorkspaceMember.Role.MEMBER)
        )

        data = WorkspaceInviteSerializer(invite).data
        data['raw_token'] = raw_token  # Return token once so caller can build the invite link
        return Response(data, status=status.HTTP_201_CREATED)


class WorkspaceInviteRevokeView(BaseWorkspaceScopedView):
    """
    DELETE /api/v1/workspaces/{slug}/invites/{invite_id}/ - Revoke an invitation.
    """

    @extend_schema(
        summary="Revoke an invitation (Admin/Owner only)",
        responses={200: OpenApiResponse(description="Invite revoked")}
    )
    def delete(self, request, slug, invite_id):
        workspace = self.get_workspace(slug)
        self.check_member_access(workspace, request.user)

        services.revoke_invite(invite_id, request.user)
        return Response({'detail': 'Invitation revoked successfully.'}, status=status.HTTP_200_OK)


class AcceptInviteView(APIView):
    """
    POST /api/v1/workspaces/invites/accept/ - Accept an invitation using the raw token.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Accept an invitation token to join a workspace",
        request=AcceptInviteSerializer,
        responses={200: WorkspaceMemberSerializer},
    )
    def post(self, request):
        serializer = AcceptInviteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        member = services.accept_invite(
            raw_token=serializer.validated_data['token'],
            user=request.user
        )

        return Response(
            {
                'detail': f"Successfully joined workspace '{member.workspace.name}'.",
                'workspace': {
                    'id': str(member.workspace.id),
                    'name': member.workspace.name,
                    'slug': member.workspace.slug,
                },
                'role': member.role,
            },
            status=status.HTTP_200_OK
        )


class WorkspaceDashboardSummaryProxyView(APIView):
    """
    GET /api/v1/workspaces/{workspace_slug}/dashboard-summary/
    Delegates to projects analytics engine for executive overview data.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    @extend_schema(
        summary="Get Workspace Dashboard Summary",
        responses={200: OpenApiResponse(description="Dashboard summary aggregates")},
    )
    def get(self, request, workspace_slug):
        from apps.workspaces.models import Workspace
        from apps.projects.analytics import get_workspace_dashboard_summary
        workspace = Workspace.objects.filter(slug=workspace_slug, archived_at__isnull=True).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        self.check_object_permissions(request, workspace)
        data = get_workspace_dashboard_summary(workspace, request.user)
        return Response(data, status=status.HTTP_200_OK)


class WorkspaceSearchProxyView(APIView):
    """
    GET /api/v1/workspaces/{workspace_slug}/search/?q=...&type=...
    Delegates to projects full-text search engine.
    """
    permission_classes = [IsAuthenticated, IsWorkspaceMember]

    @extend_schema(
        summary="Global Workspace Full-Text Search",
        parameters=[
            OpenApiParameter('q', str, description="Search term or ticket key"),
            OpenApiParameter('type', str, description="Filter type: all, work_item, sprint, project"),
        ],
        responses={200: OpenApiResponse(description="Scoped search results")},
    )
    def get(self, request, workspace_slug):
        from apps.workspaces.models import Workspace
        from apps.projects.search import global_workspace_search
        workspace = Workspace.objects.filter(slug=workspace_slug, archived_at__isnull=True).first()
        if not workspace:
            raise NotFound(f"Workspace '{workspace_slug}' not found.")
        self.check_object_permissions(request, workspace)
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

