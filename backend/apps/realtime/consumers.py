import logging
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class WorkspaceConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer scoped to a specific Workspace.
    Enforces multi-tenancy isolation: only active members of the workspace
    can connect and receive real-time broadcasts.
    """

    async def connect(self):
        user = self.scope.get("user")

        # 1. Reject unauthenticated handshakes
        if not user or not user.is_authenticated:
            logger.warning("WebSocket connection rejected: Unauthenticated user.")
            await self.close(code=4001)  # 4001 Unauthorized
            return

        # 2. Extract workspace slug from URL route
        workspace_slug = self.scope.get("url_route", {}).get("kwargs", {}).get("workspace_slug")
        if not workspace_slug:
            logger.warning("WebSocket connection rejected: Missing workspace slug.")
            await self.close(code=4000)  # Bad Request
            return

        # 3. Check workspace membership (Tenant Isolation)
        workspace, is_member = await self._get_workspace_and_check_membership(user, workspace_slug)
        if not workspace or not is_member:
            logger.warning(
                f"WebSocket connection rejected: User {user.id} is not an active member "
                f"of workspace '{workspace_slug}'."
            )
            await self.close(code=4003)  # 4003 Forbidden
            return

        self.workspace_id = str(workspace.id)
        self.workspace_slug = workspace.slug
        self.workspace_group_name = f"workspace_{workspace.id}"

        # 4. Join channel layer group
        await self.channel_layer.group_add(
            self.workspace_group_name,
            self.channel_name
        )

        # 5. Accept connection
        await self.accept()
        logger.info(
            f"WebSocket connected: User {user.email} -> Group {self.workspace_group_name}"
        )

        # 6. Send handshake confirmation
        await self.send_json({
            "type": "connection_established",
            "workspace_id": self.workspace_id,
            "workspace_slug": self.workspace_slug,
        })

    async def disconnect(self, close_code):
        if hasattr(self, "workspace_group_name"):
            await self.channel_layer.group_discard(
                self.workspace_group_name,
                self.channel_name
            )
            logger.info(
                f"WebSocket disconnected from {self.workspace_group_name} with code {close_code}"
            )

    async def receive_json(self, content, **kwargs):
        """
        Handle incoming client messages (e.g. heartbeat ping/pong).
        """
        msg_type = content.get("type")
        if msg_type == "ping":
            await self.send_json({
                "type": "pong",
                "timestamp": content.get("timestamp")
            })

    async def workspace_event(self, event):
        """
        Handler for messages broadcast to the workspace group via channel_layer.group_send.
        Supports optional targeted filtering (target_user_id).
        """
        target_user_id = event.get("target_user_id")
        user = self.scope.get("user")

        # If this event is targeted to a specific user (e.g. direct notification), filter accordingly
        if target_user_id and user and str(user.id) != str(target_user_id):
            return

        await self.send_json({
            "type": event.get("event_type"),
            "payload": event.get("payload", {}),
            "timestamp": event.get("timestamp"),
        })

    @database_sync_to_async
    def _get_workspace_and_check_membership(self, user, workspace_slug: str):
        from apps.workspaces.models import Workspace, WorkspaceMember
        try:
            workspace = Workspace.objects.get(slug=workspace_slug, archived_at__isnull=True)
        except Workspace.DoesNotExist:
            return None, False

        is_member = WorkspaceMember.objects.filter(
            workspace=workspace,
            user=user,
            status=WorkspaceMember.Status.ACTIVE
        ).exists()

        return workspace, is_member
