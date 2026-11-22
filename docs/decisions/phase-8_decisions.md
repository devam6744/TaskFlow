# Architecture Decision Records (ADRs) — Phase 8: Real-Time Updates & WebSockets

## ADR 027: Daphne ASGI Server with ProtocolTypeRouter
- **Status:** Accepted
- **Context:** Real-time collaboration (Kanban live drag-and-drop, real-time comments, and instant notifications) requires persistent, bi-directional WebSocket connections. Traditional WSGI servers (Gunicorn, uWSGI) allocate a dedicated thread or process per connection, which exhausts memory and thread pools within a few concurrent connections.
- **Decision:** Integrated Daphne as the ASGI application server and configured Django Channels with `ProtocolTypeRouter` in `config/asgi.py`. Routed HTTP requests to standard `get_asgi_application()` and WebSocket requests to `JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))`.
- **Consequences:** Enables single-process, asynchronous handling of thousands of concurrent idle WebSockets via Python's `asyncio` event loop while preserving complete compatibility with all existing synchronous Django REST Framework endpoints.

---

## ADR 028: Query Parameter JWT Handshake Authentication
- **Status:** Accepted
- **Context:** The W3C browser WebSocket specification does not support custom headers in the `new WebSocket(url)` constructor. Passing `Authorization: Bearer <token>` directly in headers is impossible without third-party polyfills or cookie reliance.
- **Decision:** Implemented custom `JWTAuthMiddleware` in `apps/realtime/middleware.py`. During the initial ASGI HTTP handshake, the middleware parses the query string for `?token=<jwt>`, validates the token against SimpleJWT (`UntypedToken` and `JWTAuthentication`), and binds the resolved user model to `scope['user']`.
- **Consequences:** Securely authenticates WebSocket connections using the existing JWT architecture. Invalid or expired tokens result in `scope['user'] = AnonymousUser`, which the consumer immediately terminates with WebSocket close code `4001` (Unauthorized).

---

## ADR 029: Channel Layer Group Scoping for Workspace Multi-Tenancy
- **Status:** Accepted
- **Context:** In a multi-tenant SaaS application, events occurring in Workspace A (such as task movements or sensitive discussions) must never be visible to members of Workspace B.
- **Decision:** Broadcast channel groups are strictly scoped per workspace: `workspace_{workspace_id}`. In `WorkspaceConsumer.connect()`, the user's active membership in the requested workspace slug is verified via `WorkspaceMember.objects.filter(workspace=workspace, user=user, status=WorkspaceMember.Status.ACTIVE, archived_at__isnull=True)`. Connections from non-members are rejected with close code `4003` (Forbidden). User-targeted events (e.g. notifications) carry a `target_user_id` payload field that the consumer filters before forwarding over the client socket.
- **Consequences:** Guarantees absolute tenant isolation at the WebSocket layer. Cross-tenant snooping or unauthorized group subscription is mathematically and logically prevented.

---

## ADR 030: Resilient Client Reconnect with Exponential Backoff and Heartbeat Keepalive
- **Status:** Accepted
- **Context:** Cloud infrastructure and serverless Redis providers (such as Upstash) aggressively terminate idle TCP sockets after 30 to 60 seconds. Furthermore, when the backend restarts during deployments, hundreds of clients reconnecting simultaneously can trigger a thundering herd collapse.
- **Decision:** Implemented a resilient client engine in `features/realtime/useWebSocket.ts`:
  1. **Exponential Backoff with Jitter:** Reconnect delay scales exponentially ($\min(1000 \times 2^{\text{retryCount}} + \text{random}(0, 1000), 10000)$).
  2. **Heartbeat Keepalive:** 30-second ping/pong cycles between client and server keep intermediate proxies and Upstash Redis sockets alive.
  3. **Decoupled Store Reads:** Store values are read dynamically (`useProjectStore.getState().activeProject`) inside event handlers rather than placed into the React hook dependency array, completely eliminating spurious re-render disconnect/reconnect loops.
  4. **Executive Light-Theme UI Badge:** Integrated `<ConnectionStatus />` navbar badge displaying `Live Sync` (green pulsing), `Reconnecting (n)` (amber spinning), or `REST Mode` (slate fallback).
- **Consequences:** Zero connection flap loops, instant automatic recovery when connectivity restores, and transparent connection state visibility for the user.
