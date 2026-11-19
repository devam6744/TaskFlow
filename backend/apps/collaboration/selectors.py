from django.db.models import QuerySet
from apps.collaboration.models import Comment, Attachment, ActivityEvent
from apps.projects.models import WorkItem


def get_work_item_comments(work_item: WorkItem) -> QuerySet[Comment]:
    """
    Returns active (non-deleted) comments for a work item ordered chronologically.
    Uses select_related('author') to eliminate N+1 queries.
    """
    return (
        Comment.objects.filter(work_item=work_item, deleted_at__isnull=True)
        .select_related('author')
        .order_by('created_at')
    )


def get_work_item_attachments(work_item: WorkItem) -> QuerySet[Attachment]:
    """
    Returns all attachments uploaded to a work item, ordered newest first.
    Uses select_related('uploader') to avoid N+1 queries.
    """
    return (
        Attachment.objects.filter(work_item=work_item)
        .select_related('uploader')
        .order_by('-created_at')
    )


def get_work_item_activity(work_item: WorkItem) -> QuerySet[ActivityEvent]:
    """
    Returns all activity audit events for a specific work item.
    Uses select_related('actor') to eliminate N+1 queries.
    """
    return (
        ActivityEvent.objects.filter(object_type='WorkItem', object_id=work_item.id)
        .select_related('actor')
        .order_by('-created_at')
    )
