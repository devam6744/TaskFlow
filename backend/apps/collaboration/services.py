import os
import uuid
from typing import Optional, Dict, Any
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError
from django.core.files.uploadedfile import UploadedFile
from apps.collaboration.models import Comment, Attachment, ActivityEvent
from apps.projects.models import WorkItem

ALLOWED_CONTENT_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    'application/zip',
    'application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB limit


def record_activity_event(
    *,
    workspace,
    actor,
    object_type: str,
    object_id: uuid.UUID,
    event_type: str,
    metadata: Optional[Dict[str, Any]] = None
) -> ActivityEvent:
    """
    Records an auditable activity event across work items, sprints, or projects.
    """
    return ActivityEvent.objects.create(
        workspace=workspace,
        actor=actor,
        object_type=object_type,
        object_id=object_id,
        event_type=event_type,
        metadata=metadata or {}
    )


@transaction.atomic
def add_comment(*, work_item: WorkItem, author, body: str) -> Comment:
    """
    Creates a new comment on a work item and emits an activity event.
    """
    cleaned_body = body.strip()
    if not cleaned_body:
        raise ValidationError({'body': 'Comment body cannot be empty.'})

    comment = Comment.objects.create(
        work_item=work_item,
        author=author,
        body=cleaned_body
    )

    record_activity_event(
        workspace=work_item.project.workspace,
        actor=author,
        object_type='WorkItem',
        object_id=work_item.id,
        event_type='COMMENT_ADDED',
        metadata={
            'comment_id': str(comment.id),
            'item_number': work_item.item_number,
            'key_identifier': work_item.key_identifier,
            'preview': cleaned_body[:80] + ('...' if len(cleaned_body) > 80 else '')
        }
    )

    return comment


@transaction.atomic
def update_comment(*, comment: Comment, user, new_body: str) -> Comment:
    """
    Updates the body of an existing comment.
    Allowed only for author or workspace owner/admin.
    """
    if comment.deleted_at is not None:
        raise ValidationError({'detail': 'Cannot edit a deleted comment.'})

    # Permission check: author or workspace admin/owner
    is_author = comment.author_id == user.id
    is_owner = comment.work_item.project.workspace.owner_id == user.id
    is_admin = comment.work_item.project.workspace.members.filter(
        user=user, role__in=['OWNER', 'ADMIN']
    ).exists()

    if not (is_author or is_owner or is_admin):
        raise ValidationError({'detail': 'You do not have permission to edit this comment.'})

    cleaned_body = new_body.strip()
    if not cleaned_body:
        raise ValidationError({'body': 'Comment body cannot be empty.'})

    comment.body = cleaned_body
    comment.save(update_fields=['body', 'updated_at'])
    return comment


@transaction.atomic
def delete_comment(*, comment: Comment, user) -> Comment:
    """
    Soft deletes a comment so thread history and audit integrity are preserved.
    """
    if comment.deleted_at is not None:
        return comment

    is_author = comment.author_id == user.id
    is_owner = comment.work_item.project.workspace.owner_id == user.id
    is_admin = comment.work_item.project.workspace.members.filter(
        user=user, role__in=['OWNER', 'ADMIN']
    ).exists()

    if not (is_author or is_owner or is_admin):
        raise ValidationError({'detail': 'You do not have permission to delete this comment.'})

    comment.deleted_at = timezone.now()
    comment.save(update_fields=['deleted_at', 'updated_at'])

    record_activity_event(
        workspace=comment.work_item.project.workspace,
        actor=user,
        object_type='WorkItem',
        object_id=comment.work_item.id,
        event_type='COMMENT_DELETED',
        metadata={
            'comment_id': str(comment.id),
            'item_number': comment.work_item.item_number,
            'key_identifier': comment.work_item.key_identifier,
        }
    )

    return comment


@transaction.atomic
def upload_attachment(*, work_item: WorkItem, uploader, file_obj: UploadedFile) -> Attachment:
    """
    Validates file size and MIME type, saves to storage, and records an activity event.
    """
    if file_obj.size > MAX_FILE_SIZE_BYTES:
        raise ValidationError({
            'file': f'File exceeds maximum limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB.'
        })

    content_type = getattr(file_obj, 'content_type', 'application/octet-stream')
    # Allow safe extensions as fallback
    ext = os.path.splitext(file_obj.name)[1].lower()
    safe_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.pdf', '.txt', '.csv', '.json', '.zip', '.docx']
    
    if content_type not in ALLOWED_CONTENT_TYPES and ext not in safe_extensions:
        raise ValidationError({
            'file': f"Unsupported file type '{content_type}'. Allowed types: images, PDF, text, CSV, ZIP, DOCX."
        })

    attachment = Attachment.objects.create(
        work_item=work_item,
        uploader=uploader,
        file=file_obj,
        original_filename=file_obj.name,
        content_type=content_type,
        size_bytes=file_obj.size
    )

    record_activity_event(
        workspace=work_item.project.workspace,
        actor=uploader,
        object_type='WorkItem',
        object_id=work_item.id,
        event_type='ATTACHMENT_UPLOADED',
        metadata={
            'attachment_id': str(attachment.id),
            'filename': attachment.original_filename,
            'size_bytes': attachment.size_bytes,
            'item_number': work_item.item_number,
            'key_identifier': work_item.key_identifier,
        }
    )

    return attachment


@transaction.atomic
def delete_attachment(*, attachment: Attachment, user) -> None:
    """
    Deletes an attachment file and its database record.
    """
    is_uploader = attachment.uploader_id == user.id
    is_owner = attachment.work_item.project.workspace.owner_id == user.id
    is_admin = attachment.work_item.project.workspace.members.filter(
        user=user, role__in=['OWNER', 'ADMIN']
    ).exists()

    if not (is_uploader or is_owner or is_admin):
        raise ValidationError({'detail': 'You do not have permission to delete this attachment.'})

    work_item = attachment.work_item
    filename = attachment.original_filename
    
    # Remove file from storage
    if attachment.file:
        attachment.file.delete(save=False)
        
    attachment.delete()

    record_activity_event(
        workspace=work_item.project.workspace,
        actor=user,
        object_type='WorkItem',
        object_id=work_item.id,
        event_type='ATTACHMENT_DELETED',
        metadata={
            'filename': filename,
            'item_number': work_item.item_number,
            'key_identifier': work_item.key_identifier,
        }
    )
