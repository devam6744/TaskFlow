import logging
from datetime import datetime, timezone
from uuid import UUID
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

logger = logging.getLogger(__name__)


def broadcast_workspace_event(
    workspace_id: UUID | str,
    event_type: str,
    payload: dict,
    target_user_id: UUID | str | None = None
):
    """
    Safely dispatches a real-time event to the workspace channel layer group.
    
    Guarantees:
    1. Transaction Integrity: Uses transaction.on_commit() so no message is sent
       if the database transaction rolls back.
    2. Non-blocking: Errors in WebSocket delivery never cause business logic or DB
       transactions to fail.
    3. Multi-Tenant Scoped: Dispatched strictly to `workspace_{workspace_id}`.
    """
    message = {
        "type": "workspace_event",
        "event_type": event_type,
        "payload": payload,
        "target_user_id": str(target_user_id) if target_user_id else None,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    def _send():
        try:
            channel_layer = get_channel_layer()
            if channel_layer:
                async_to_sync(channel_layer.group_send)(
                    f"workspace_{workspace_id}",
                    message
                )
                logger.debug(
                    f"Dispatched realtime event '{event_type}' to workspace_{workspace_id}"
                )
        except Exception as exc:
            logger.warning(
                f"Failed to broadcast realtime event '{event_type}' to workspace_{workspace_id}: {exc}"
            )

    transaction.on_commit(_send)
