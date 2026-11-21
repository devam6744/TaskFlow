import logging
from typing import Optional, Dict, Any, List
from django.contrib.auth import get_user_model
from django.db import transaction, IntegrityError
from django.utils import timezone

from apps.notifications.models import Notification, NotificationPreference

User = get_user_model()
logger = logging.getLogger(__name__)


def create_notification(
    recipient_id: str,
    event_type: str,
    title: str,
    actor_id: Optional[str] = None,
    workspace_id: Optional[str] = None,
    description: str = '',
    target_url: str = '',
    payload: Optional[Dict[str, Any]] = None,
    idempotency_key: Optional[str] = None
) -> Optional[Notification]:
    """
    Creates an in-app notification record and dispatches email delivery if allowed by user preferences.
    Idempotent: If an idempotency_key already exists, returns the existing record.
    """
    # 1. Check idempotency first to avoid redundant work
    if idempotency_key:
        existing = Notification.objects.filter(idempotency_key=idempotency_key).first()
        if existing:
            logger.info(f"Notification with idempotency_key '{idempotency_key}' already exists. Skipping duplicate.")
            return existing

    try:
        recipient = User.objects.get(id=recipient_id)
    except User.DoesNotExist:
        logger.warning(f"Notification recipient {recipient_id} does not exist.")
        return None

    # Don't notify the actor of their own actions
    if actor_id and str(recipient.id) == str(actor_id):
        return None

    # 2. Check user notification preferences
    in_app_enabled = True
    email_enabled = True

    pref_qs = NotificationPreference.objects.filter(
        user=recipient,
        event_type=event_type
    )
    if workspace_id:
        # Check workspace specific preference first
        ws_pref = pref_qs.filter(workspace_id=workspace_id).first()
        if ws_pref:
            in_app_enabled = ws_pref.in_app_enabled
            email_enabled = ws_pref.email_enabled
        else:
            # Fall back to global preference
            global_pref = pref_qs.filter(workspace__isnull=True).first()
            if global_pref:
                in_app_enabled = global_pref.in_app_enabled
                email_enabled = global_pref.email_enabled
    else:
        global_pref = pref_qs.filter(workspace__isnull=True).first()
        if global_pref:
            in_app_enabled = global_pref.in_app_enabled
            email_enabled = global_pref.email_enabled

    # If completely muted, return None
    if not in_app_enabled and not email_enabled:
        logger.info(f"Notification {event_type} is muted for user {recipient.email}.")
        return None

    # Auto-generate idempotency key if not provided
    if not idempotency_key:
        idempotency_key = f"{event_type}:{recipient.id}:{timezone.now().timestamp()}"

    email_status = (
        Notification.EmailStatus.PENDING
        if (email_enabled and recipient.email)
        else Notification.EmailStatus.SKIPPED
    )

    try:
        with transaction.atomic():
            notification = Notification.objects.create(
                recipient=recipient,
                actor_id=actor_id,
                workspace_id=workspace_id,
                event_type=event_type,
                title=title,
                description=description,
                target_url=target_url,
                payload=payload or {},
                email_status=email_status,
                idempotency_key=idempotency_key
            )
    except IntegrityError:
        # Race condition on idempotency key
        return Notification.objects.filter(idempotency_key=idempotency_key).first()

    # 3. Queue email task if email delivery is enabled
    if email_enabled and recipient.email:
        from apps.notifications.tasks import send_email_task
        try:
            send_email_task.delay(str(notification.id))
        except Exception as e:
            logger.warning(f"Could not dispatch async email task: {e}. Executing fallback synchronous send.")
            try:
                send_email_task(str(notification.id))
            except Exception as sync_e:
                logger.error(f"Fallback email delivery failed: {sync_e}")

    return notification


def mark_notification_read(notification_id: str, user) -> Optional[Notification]:
    """
    Marks a single notification as read, ensuring tenant ownership.
    """
    notification = Notification.objects.filter(id=notification_id, recipient=user).first()
    if notification:
        notification.mark_read()
    return notification


def mark_all_notifications_read(user, workspace_id: Optional[str] = None) -> int:
    """
    Marks all unread notifications for a user as read.
    """
    qs = Notification.objects.filter(recipient=user, read_at__isnull=True)
    if workspace_id:
        qs = qs.filter(workspace_id=workspace_id)
    return qs.update(read_at=timezone.now(), updated_at=timezone.now())


def get_user_preferences(user, workspace_id: Optional[str] = None) -> List[NotificationPreference]:
    """
    Returns user's notification preferences, populating defaults for any missing event types.
    """
    existing_prefs = {
        p.event_type: p
        for p in NotificationPreference.objects.filter(user=user, workspace_id=workspace_id)
    }

    results = []
    for event_type, _ in Notification.EventType.choices:
        if event_type in existing_prefs:
            results.append(existing_prefs[event_type])
        else:
            # Create default preference
            pref = NotificationPreference.objects.create(
                user=user,
                workspace_id=workspace_id,
                event_type=event_type,
                in_app_enabled=True,
                email_enabled=True
            )
            results.append(pref)

    return results


def update_user_preference(
    user,
    event_type: str,
    workspace_id: Optional[str] = None,
    in_app_enabled: Optional[bool] = None,
    email_enabled: Optional[bool] = None
) -> NotificationPreference:
    """
    Updates or creates a notification preference for a specific event type.
    """
    pref, _ = NotificationPreference.objects.get_or_create(
        user=user,
        workspace_id=workspace_id,
        event_type=event_type,
        defaults={
            'in_app_enabled': in_app_enabled if in_app_enabled is not None else True,
            'email_enabled': email_enabled if email_enabled is not None else True,
        }
    )

    update_fields = ['updated_at']
    if in_app_enabled is not None:
        pref.in_app_enabled = in_app_enabled
        update_fields.append('in_app_enabled')
    if email_enabled is not None:
        pref.email_enabled = email_enabled
        update_fields.append('email_enabled')

    pref.save(update_fields=update_fields)
    return pref
