import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


class Notification(models.Model):
    """
    In-app & email notification record with delivery tracking and idempotency.
    Follows TaskFlow Blueprint Section 13 & 24.
    """
    class EventType(models.TextChoices):
        TASK_ASSIGNED = 'TASK_ASSIGNED', 'Task Assigned'
        COMMENT_ADDED = 'COMMENT_ADDED', 'New Comment'
        SPRINT_STARTED = 'SPRINT_STARTED', 'Sprint Started'
        SPRINT_COMPLETED = 'SPRINT_COMPLETED', 'Sprint Completed'
        TASK_OVERDUE = 'TASK_OVERDUE', 'Task Overdue'
        STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'
        WORKSPACE_INVITE = 'WORKSPACE_INVITE', 'Workspace Invitation'

    class EmailStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SENT = 'SENT', 'Sent'
        FAILED = 'FAILED', 'Failed'
        SKIPPED = 'SKIPPED', 'Skipped'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        db_index=True
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='triggered_notifications'
    )
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        db_index=True
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    target_url = models.CharField(max_length=500, blank=True, default='')
    payload = models.JSONField(default=dict, blank=True)

    # In-app delivery / read state
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # Email delivery tracking
    email_sent_at = models.DateTimeField(null=True, blank=True)
    email_status = models.CharField(
        max_length=20,
        choices=EmailStatus.choices,
        default=EmailStatus.PENDING
    )

    # Idempotency key to strictly prevent duplicate alerts / emails on retries
    idempotency_key = models.CharField(max_length=255, unique=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at'], name='notif_recip_created_idx'),
            models.Index(fields=['recipient', 'read_at'], name='notif_recip_read_idx'),
            models.Index(fields=['workspace', '-created_at'], name='notif_ws_created_idx'),
        ]

    def __str__(self):
        return f"{self.event_type} -> {self.recipient.email}: {self.title}"

    @property
    def is_read(self) -> bool:
        return self.read_at is not None

    def mark_read(self):
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at', 'updated_at'])


class NotificationPreference(models.Model):
    """
    Per-user, per-workspace notification preference settings.
    Allows muting specific event types in-app or via email.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences'
    )
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notification_preferences'
    )
    event_type = models.CharField(
        max_length=50,
        choices=Notification.EventType.choices
    )
    in_app_enabled = models.BooleanField(default=True)
    email_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notifications_preference'
        unique_together = [('user', 'workspace', 'event_type')]
        indexes = [
            models.Index(fields=['user', 'workspace'], name='notif_pref_user_ws_idx'),
        ]

    def __str__(self):
        ws_name = self.workspace.name if self.workspace else "Global"
        return f"Pref({self.user.email}, {ws_name}, {self.event_type}): App={self.in_app_enabled}, Email={self.email_enabled}"
