import uuid
from django.conf import settings
from django.db import models


class Comment(models.Model):
    """
    Discussion comment attached to a WorkItem.
    Supports soft deletion (deleted_at) to preserve thread history.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_item = models.ForeignKey(
        'projects.WorkItem',
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='work_item_comments'
    )
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'collaboration_comment'
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.work_item} ({self.created_at.strftime('%Y-%m-%d %H:%M')})"

    @property
    def is_deleted(self) -> bool:
        return self.deleted_at is not None


class Attachment(models.Model):
    """
    File attachment linked to a WorkItem.
    Files are stored with sanitized names and verified content types.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    work_item = models.ForeignKey(
        'projects.WorkItem',
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    uploader = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='uploaded_attachments'
    )
    file = models.FileField(upload_to='attachments/%Y/%m/%d/')
    original_filename = models.CharField(max_length=255)
    content_type = models.CharField(max_length=100)
    size_bytes = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collaboration_attachment'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.original_filename} ({self.size_bytes} bytes) on {self.work_item}"


class ActivityEvent(models.Model):
    """
    Chronological activity event audit trail for WorkItems and Sprints.
    Records state transitions, assignment changes, comments, and attachments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        related_name='activity_events'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activity_events'
    )
    object_type = models.CharField(max_length=50)  # e.g., 'WorkItem', 'Sprint'
    object_id = models.UUIDField()
    event_type = models.CharField(max_length=50)  # e.g., 'STATUS_CHANGED', 'COMMENT_ADDED', 'POINTS_ESTIMATED'
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'collaboration_activity_event'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['workspace', '-created_at']),
            models.Index(fields=['object_type', 'object_id', '-created_at']),
        ]

    def __str__(self):
        actor_name = self.actor.display_name if self.actor else "System"
        return f"{actor_name} - {self.event_type} on {self.object_type} {self.object_id}"
