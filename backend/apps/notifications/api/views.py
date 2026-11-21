from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.notifications.selectors import (
    get_user_notifications,
    get_unread_notification_count,
    get_notification_detail
)
from apps.notifications.services import (
    mark_notification_read,
    mark_all_notifications_read,
    get_user_preferences,
    update_user_preference
)
from apps.notifications.api.serializers import (
    NotificationSerializer,
    UnreadCountSerializer,
    NotificationPreferenceSerializer,
    NotificationPreferenceUpdateSerializer,
    NotificationReadAllSerializer
)


class NotificationListView(APIView):
    """
    List current user's notifications.
    Supports filtering by unread status and workspace.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="List user notifications",
        parameters=[
            OpenApiParameter('unread_only', bool, description='Filter to unread notifications only'),
            OpenApiParameter('workspace_id', str, description='Filter to a specific workspace ID'),
            OpenApiParameter('limit', int, description='Limit number of notifications returned (default 50)'),
        ],
        responses={200: NotificationSerializer(many=True)}
    )
    def get(self, request):
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        workspace_id = request.query_params.get('workspace_id')
        try:
            limit = int(request.query_params.get('limit', 50))
        except ValueError:
            limit = 50

        notifications = get_user_notifications(
            user=request.user,
            workspace_id=workspace_id,
            unread_only=unread_only,
            limit=limit
        )
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationUnreadCountView(APIView):
    """
    Returns the count of unread notifications for badge rendering.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get unread notification count",
        parameters=[
            OpenApiParameter('workspace_id', str, description='Optional workspace ID filter'),
        ],
        responses={200: UnreadCountSerializer}
    )
    def get(self, request):
        workspace_id = request.query_params.get('workspace_id')
        count = get_unread_notification_count(user=request.user, workspace_id=workspace_id)
        return Response({'unread_count': count}, status=status.HTTP_200_OK)


class NotificationMarkReadView(APIView):
    """
    Marks a single notification as read.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark notification as read",
        request=None,
        responses={200: NotificationSerializer, 404: dict}
    )
    def post(self, request, notification_id):
        notification = mark_notification_read(notification_id=notification_id, user=request.user)
        if not notification:
            return Response(
                {'detail': 'Notification not found or access denied.'},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = NotificationSerializer(notification)
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationReadAllView(APIView):
    """
    Marks all notifications for current user as read.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Mark all notifications as read",
        request=NotificationReadAllSerializer,
        parameters=[
            OpenApiParameter('workspace_id', str, description='Optional workspace ID filter'),
        ],
        responses={200: dict}
    )
    def post(self, request):
        workspace_id = request.data.get('workspace_id') or request.query_params.get('workspace_id')
        updated_count = mark_all_notifications_read(user=request.user, workspace_id=workspace_id)
        return Response(
            {'detail': f'{updated_count} notifications marked as read.', 'marked_read_count': updated_count},
            status=status.HTTP_200_OK
        )


class NotificationPreferenceView(APIView):
    """
    Retrieve and update user's notification preferences.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        summary="Get user notification preferences",
        parameters=[
            OpenApiParameter('workspace_id', str, description='Optional workspace ID filter'),
        ],
        responses={200: NotificationPreferenceSerializer(many=True)}
    )
    def get(self, request):
        workspace_id = request.query_params.get('workspace_id')
        prefs = get_user_preferences(user=request.user, workspace_id=workspace_id)
        serializer = NotificationPreferenceSerializer(prefs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @extend_schema(
        summary="Update notification preference",
        request=NotificationPreferenceUpdateSerializer,
        responses={200: NotificationPreferenceSerializer}
    )
    def patch(self, request):
        serializer = NotificationPreferenceUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        pref = update_user_preference(
            user=request.user,
            event_type=data['event_type'],
            workspace_id=data.get('workspace_id'),
            in_app_enabled=data.get('in_app_enabled'),
            email_enabled=data.get('email_enabled')
        )
        return Response(NotificationPreferenceSerializer(pref).data, status=status.HTTP_200_OK)
