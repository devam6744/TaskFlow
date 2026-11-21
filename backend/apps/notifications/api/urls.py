from django.urls import path
from apps.notifications.api.views import (
    NotificationListView,
    NotificationUnreadCountView,
    NotificationMarkReadView,
    NotificationReadAllView,
    NotificationPreferenceView
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('unread-count/', NotificationUnreadCountView.as_view(), name='notification-unread-count'),
    path('<uuid:notification_id>/read/', NotificationMarkReadView.as_view(), name='notification-mark-read'),
    path('read-all/', NotificationReadAllView.as_view(), name='notification-read-all'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification-preferences'),
]
