import logging
from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
from django.utils.html import strip_tags

logger = logging.getLogger(__name__)


@shared_task(name='apps.notifications.tasks.dispatch_notification_task')
def dispatch_notification_task(
    recipient_id: str,
    event_type: str,
    title: str,
    actor_id: str = None,
    workspace_id: str = None,
    description: str = '',
    target_url: str = '',
    payload: dict = None,
    idempotency_key: str = None
):
    """
    Asynchronous task to create an in-app notification and conditionally trigger email delivery.
    """
    from apps.notifications.services import create_notification
    try:
        notification = create_notification(
            recipient_id=recipient_id,
            actor_id=actor_id,
            workspace_id=workspace_id,
            event_type=event_type,
            title=title,
            description=description,
            target_url=target_url,
            payload=payload or {},
            idempotency_key=idempotency_key
        )
        return str(notification.id) if notification else None
    except Exception as exc:
        logger.error(f"Error in dispatch_notification_task: {exc}", exc_info=True)
        raise exc


@shared_task(
    bind=True,
    name='apps.notifications.tasks.send_email_task',
    max_retries=3,
    default_retry_delay=60
)
def send_email_task(self, notification_id: str):
    """
    Asynchronous task to render and deliver transactional emails with bounded retries.
    Retry policy: 3 retries with exponential backoff (60s, 120s, 240s).
    """
    from apps.notifications.models import Notification

    try:
        notification = Notification.objects.select_related(
            'recipient', 'actor', 'workspace'
        ).get(id=notification_id)
    except Notification.DoesNotExist:
        logger.warning(f"Notification {notification_id} not found for email delivery.")
        return False

    if notification.email_status == Notification.EmailStatus.SENT:
        logger.info(f"Notification {notification_id} email already sent. Skipping duplicate.")
        return True

    recipient_email = notification.recipient.email
    if not recipient_email:
        notification.email_status = Notification.EmailStatus.SKIPPED
        notification.save(update_fields=['email_status'])
        return False

    # Choose template based on event_type
    template_map = {
        Notification.EventType.TASK_ASSIGNED: 'emails/task_assigned.html',
        Notification.EventType.SPRINT_STARTED: 'emails/sprint_started.html',
        Notification.EventType.TASK_OVERDUE: 'emails/task_overdue.html',
        Notification.EventType.COMMENT_ADDED: 'emails/comment_added.html',
        Notification.EventType.WORKSPACE_INVITE: 'emails/workspace_invite.html',
    }

    template_name = template_map.get(notification.event_type, 'emails/base_email.html')

    context = {
        'recipient': notification.recipient,
        'actor': notification.actor,
        'workspace': notification.workspace,
        'workspace_name': notification.workspace.name if notification.workspace else 'TaskFlow',
        'title': notification.title,
        'description': notification.description,
        'action_url': notification.target_url or 'http://localhost:5173/dashboard',
        **(notification.payload or {})
    }

    try:
        html_message = render_to_string(template_name, context)
        plain_message = strip_tags(html_message)

        send_mail(
            subject=f"[TaskFlow] {notification.title}",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            html_message=html_message,
            fail_silently=False
        )

        notification.email_sent_at = timezone.now()
        notification.email_status = Notification.EmailStatus.SENT
        notification.save(update_fields=['email_sent_at', 'email_status', 'updated_at'])
        logger.info(f"Delivered notification email to {recipient_email} for event {notification.event_type}")
        return True

    except Exception as exc:
        logger.error(f"Failed to send email for notification {notification_id}: {exc}")
        # Check if max retries exceeded
        if self.request.retries >= self.max_retries:
            notification.email_status = Notification.EmailStatus.FAILED
            notification.save(update_fields=['email_status', 'updated_at'])
            return False

        # Exponential backoff countdown: 60 * 2^retries
        countdown = 60 * (2 ** self.request.retries)
        raise self.retry(exc=exc, countdown=countdown)


@shared_task(name='apps.notifications.tasks.send_invitation_email_task')
def send_invitation_email_task(invite_id: str, raw_token: str = ''):
    """
    Delivers workspace invitation email to a newly invited email address.
    """
    from apps.workspaces.models import WorkspaceInvite
    try:
        invite = WorkspaceInvite.objects.select_related('workspace', 'invited_by').get(id=invite_id)
        if not invite.is_valid:
            return False

        frontend_url = getattr(settings, 'FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0].strip()
        token_param = raw_token if raw_token else getattr(invite, 'token_hash', '')
        accept_url = f"{frontend_url}/join?token={token_param}"

        context = {
            'workspace_name': invite.workspace.name,
            'actor': invite.invited_by,
            'role': invite.role,
            'action_url': accept_url,
        }

        html_message = render_to_string('emails/workspace_invite.html', context)
        plain_message = (
            f"Hello,\n\n"
            f"You have been invited by {invite.invited_by.display_name if invite.invited_by else 'an administrator'} "
            f"to join the {invite.workspace.name} workspace on TaskFlow as a {invite.role}.\n\n"
            f"Click the link below to accept the invitation (valid for 7 days):\n"
            f"{accept_url}\n\n"
            f"If you weren't expecting this invitation, you can safely ignore this email.\n\n"
            f"Best regards,\nTaskFlow Team"
        )

        send_mail(
            subject=f"Invitation to join {invite.workspace.name} on TaskFlow",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Workspace invitation email dispatched to {invite.email}")
        return True
    except Exception as exc:
        logger.error(f"Error sending invitation email {invite_id}: {exc}", exc_info=True)
        return False


@shared_task(name='apps.notifications.tasks.send_password_reset_email_task')
def send_password_reset_email_task(user_id: str, reset_url: str):
    """
    Delivers transactional password reset email with secure one-time link.
    """
    from django.contrib.auth import get_user_model
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id, is_active=True)
        context = {
            'user': user,
            'action_url': reset_url,
        }

        html_message = render_to_string('emails/password_reset.html', context)
        plain_message = (
            f"Hello {user.display_name or 'there'},\n\n"
            f"We received a request to reset the password for your TaskFlow account ({user.email}).\n\n"
            f"Click the link below to set up a new password (valid for 24 hours):\n"
            f"{reset_url}\n\n"
            f"If you did not request a password reset, you can safely ignore this email.\n\n"
            f"Best regards,\nTaskFlow Engineering Team"
        )

        send_mail(
            subject="[TaskFlow] Reset your account password",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False
        )
        logger.info(f"Password reset email dispatched to {user.email}")
        return True
    except Exception as exc:
        logger.error(f"Error sending password reset email to user {user_id}: {exc}", exc_info=True)
        return False


@shared_task(name='apps.notifications.tasks.check_overdue_tasks')
def check_overdue_tasks():
    """
    Daily Celery Beat cron task.
    Identifies work items where due_date < today and status != 'DONE',
    and generates an idempotent TASK_OVERDUE notification for the assignee.
    """
    from apps.projects.models import WorkItem
    from apps.notifications.services import create_notification
    from apps.notifications.models import Notification

    today = timezone.now().date()
    overdue_items = WorkItem.objects.filter(
        due_date__lt=today
    ).exclude(
        status=WorkItem.Status.DONE
    ).select_related(
        'assignee', 'project', 'project__workspace'
    )

    created_count = 0
    for item in overdue_items:
        if not item.assignee:
            continue

        idempotency_key = f"TASK_OVERDUE:{item.id}:{today.isoformat()}"
        if Notification.objects.filter(idempotency_key=idempotency_key).exists():
            continue

        frontend_url = getattr(settings, 'FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0].strip()
        target_url = f"{frontend_url}/dashboard"

        notif = create_notification(
            recipient_id=str(item.assignee.id),
            event_type=Notification.EventType.TASK_OVERDUE,
            title=f"Task Overdue: {item.key_identifier} ({item.title})",
            description=f"Due date was {item.due_date}. Please update status or reschedule.",
            target_url=target_url,
            workspace_id=str(item.project.workspace.id) if item.project.workspace else None,
            payload={
                'item_key': item.key_identifier,
                'item_title': item.title,
                'item_status': item.status,
                'due_date': str(item.due_date),
                'project_name': item.project.name,
            },
            idempotency_key=idempotency_key
        )
        if notif:
            created_count += 1

    logger.info(f"check_overdue_tasks completed: {created_count} notifications created.")
    return created_count
