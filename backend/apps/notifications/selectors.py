from typing import Optional
from django.db.models import QuerySet
from apps.notifications.models import Notification


def get_user_notifications(
    user,
    workspace_id: Optional[str] = None,
    unread_only: bool = False,
    limit: int = 50
) -> QuerySet[Notification]:
    """
    Retrieves user notifications ordered by newest first.
    Applies select_related on actor and workspace to eliminate N+1 queries.
    """
    qs = Notification.objects.filter(recipient=user).select_related('actor', 'workspace')

    if workspace_id:
        qs = qs.filter(workspace_id=workspace_id)

    if unread_only:
        qs = qs.filter(read_at__isnull=True)

    return qs[:limit]


def get_unread_notification_count(user, workspace_id: Optional[str] = None) -> int:
    """
    Efficiently counts unread notifications for the user badge.
    """
    qs = Notification.objects.filter(recipient=user, read_at__isnull=True)
    if workspace_id:
        qs = qs.filter(workspace_id=workspace_id)
    return qs.count()


def get_notification_detail(notification_id: str, user) -> Optional[Notification]:
    """
    Retrieves single notification with actor and workspace relationships, scoped to user.
    """
    return Notification.objects.filter(
        id=notification_id,
        recipient=user
    ).select_related('actor', 'workspace').first()
