import pytest
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import RefreshToken

from config.asgi import application
from apps.accounts.models import User
from apps.workspaces.models import Workspace, WorkspaceMember
from apps.realtime.broadcasts import broadcast_workspace_event

# Async wrapper for broadcast helper in async test functions
async_broadcast_event = database_sync_to_async(broadcast_workspace_event)


@database_sync_to_async
def create_user_workspace_and_token(email: str, ws_name: str, ws_slug: str):
    user = User.objects.create(
        email=email,
        display_name=email.split('@')[0],
        is_active=True
    )
    workspace = Workspace.objects.create(
        name=ws_name,
        slug=ws_slug,
        owner=user
    )
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=user,
        role=WorkspaceMember.Role.OWNER,
        status=WorkspaceMember.Status.ACTIVE
    )
    token = str(RefreshToken.for_user(user).access_token)
    return user, workspace, token


@database_sync_to_async
def create_workspace_only(ws_name: str, ws_slug: str):
    owner = User.objects.create(
        email=f"owner_{ws_slug}@test.com",
        display_name="Owner",
        is_active=True
    )
    return Workspace.objects.create(name=ws_name, slug=ws_slug, owner=owner)


@database_sync_to_async
def create_outsider_user_and_token(email: str):
    user = User.objects.create(email=email, display_name="Outsider", is_active=True)
    token = str(RefreshToken.for_user(user).access_token)
    return user, token


@database_sync_to_async
def add_member_to_workspace(workspace, email: str):
    user = User.objects.create(email=email, display_name="Member", is_active=True)
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=user,
        role=WorkspaceMember.Role.MEMBER,
        status=WorkspaceMember.Status.ACTIVE
    )
    token = str(RefreshToken.for_user(user).access_token)
    return user, token


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
class TestWebSocketRealtime:
    """
    Test suite for WebSocket authentication, multi-tenancy isolation,
    cross-tenant event boundaries, and real-time broadcasts.
    """

    async def test_authenticated_member_connect_and_ping_pong(self):
        user, workspace, token = await create_user_workspace_and_token(
            "ws_user1@taskflow.dev", "WS Test Org", "ws-test-org"
        )

        communicator = WebsocketCommunicator(
            application,
            f"/ws/workspaces/{workspace.slug}/?token={token}"
        )
        connected, subprotocol = await communicator.connect()
        assert connected is True, "Authenticated workspace member must be able to connect."

        # Receive connection_established event
        init_event = await communicator.receive_json_from()
        assert init_event["type"] == "connection_established"
        assert init_event["workspace_slug"] == workspace.slug
        assert init_event["workspace_id"] == str(workspace.id)

        # Test heartbeat ping-pong
        await communicator.send_json_to({"type": "ping", "timestamp": 123456})
        pong_event = await communicator.receive_json_from()
        assert pong_event["type"] == "pong"
        assert pong_event["timestamp"] == 123456

        await communicator.disconnect()

    async def test_unauthenticated_connection_rejected(self):
        workspace = await create_workspace_only("Public Org", "public-org")

        # Connect with invalid token
        communicator = WebsocketCommunicator(
            application,
            f"/ws/workspaces/{workspace.slug}/?token=bad_invalid_token"
        )
        connected, close_code = await communicator.connect()
        assert connected is False, "Unauthenticated connection must be rejected."
        assert close_code == 4001, "Expected close code 4001 (Unauthorized)."
        await communicator.disconnect()

    async def test_non_member_forbidden(self):
        owner, workspace, owner_token = await create_user_workspace_and_token(
            "owner_ws@taskflow.dev", "Private Space", "private-space"
        )
        outsider, outsider_token = await create_outsider_user_and_token("outsider_ws@taskflow.dev")

        # Outsider attempts to connect to private workspace
        communicator = WebsocketCommunicator(
            application,
            f"/ws/workspaces/{workspace.slug}/?token={outsider_token}"
        )
        connected, close_code = await communicator.connect()
        assert connected is False, "Non-members must NOT be able to connect to private workspaces."
        assert close_code == 4003, "Expected close code 4003 (Forbidden / Multi-Tenant Guard)."
        await communicator.disconnect()

    async def test_cross_tenant_isolation(self):
        """
        Verify that real-time events broadcast in Workspace A NEVER leak
        to clients connected to Workspace B.
        """
        user_a, ws_a, token_a = await create_user_workspace_and_token("user_a@org-a.com", "Org A", "org-a")
        user_b, ws_b, token_b = await create_user_workspace_and_token("user_b@org-b.com", "Org B", "org-b")

        client_a = WebsocketCommunicator(application, f"/ws/workspaces/{ws_a.slug}/?token={token_a}")
        client_b = WebsocketCommunicator(application, f"/ws/workspaces/{ws_b.slug}/?token={token_b}")

        conn_a, _ = await client_a.connect()
        conn_b, _ = await client_b.connect()
        assert conn_a is True and conn_b is True

        # Consume initial connection_established messages
        await client_a.receive_json_from()
        await client_b.receive_json_from()

        # Broadcast event ONLY to Workspace A
        await async_broadcast_event(
            workspace_id=ws_a.id,
            event_type="work_item_updated",
            payload={"item_number": 1, "title": "Secret Feature in Org A", "status": "IN_PROGRESS"}
        )

        # Client A MUST receive the event
        received_by_a = await client_a.receive_json_from()
        assert received_by_a["type"] == "work_item_updated"
        assert received_by_a["payload"]["title"] == "Secret Feature in Org A"

        # Client B MUST receive NOTHING (Tenant Isolation Guarantee)
        received_by_b = await client_b.receive_nothing(timeout=0.5)
        assert received_by_b is True, "Client B must NOT receive any events from Workspace A!"

        await client_a.disconnect()
        await client_b.disconnect()

    async def test_targeted_notification_delivery(self):
        """
        Verify that when an event is targeted to a specific recipient,
        other members in the same workspace do not receive it.
        """
        user_1, ws, token_1 = await create_user_workspace_and_token("dev1@company.com", "Company", "company")
        user_2, token_2 = await add_member_to_workspace(ws, "dev2@company.com")

        client_1 = WebsocketCommunicator(application, f"/ws/workspaces/{ws.slug}/?token={token_1}")
        client_2 = WebsocketCommunicator(application, f"/ws/workspaces/{ws.slug}/?token={token_2}")

        conn_1, _ = await client_1.connect()
        conn_2, _ = await client_2.connect()
        assert conn_1 is True and conn_2 is True

        # Consume initial handshake messages
        await client_1.receive_json_from()
        await client_2.receive_json_from()

        # Broadcast notification targeted specifically to user_2
        await async_broadcast_event(
            workspace_id=ws.id,
            event_type="notification_created",
            payload={"title": "Private Alert for Dev 2"},
            target_user_id=user_2.id
        )

        # Client 2 MUST receive the notification
        received_by_2 = await client_2.receive_json_from()
        assert received_by_2["type"] == "notification_created"
        assert received_by_2["payload"]["title"] == "Private Alert for Dev 2"

        # Client 1 MUST receive NOTHING
        received_by_1 = await client_1.receive_nothing(timeout=0.5)
        assert received_by_1 is True, "Client 1 must NOT receive a notification targeted to Dev 2."

        await client_1.disconnect()
        await client_2.disconnect()
