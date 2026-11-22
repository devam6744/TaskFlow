# Phase 8: Real-Time Updates & WebSockets — Concept Learning Guide

> **Target Audience:** Developers learning production ASGI architecture, Django Channels, WebSockets vs Polling, Channel Layers with Upstash Redis TLS, JWT WebSocket handshakes, and resilient client reconnection strategies.

---

## 1. WebSockets vs HTTP Polling: Humne WebSockets Kyun Choose Kiya? ⚡

### Real-Time Problem: Jira / Trello me Live Updates Kaise Hote Hain?
TaskFlow ek modern Agile Scrum tool hai. Imagine do developers ek hi sprint me kaam kar rahe hain:
- **Developer A** card `AA-5` ko *IN PROGRESS* se *IN REVIEW* drag karta hai.
- **Developer B** (Project Manager / Reviewer) apne screen par baithe hain.

Agar hum traditional HTTP REST APIs use karte, toh Developer B ko yeh change dekhne ke liye:
1. **Manual Page Refresh (`F5`)** dabana padta, YA
2. **Short Polling:** Har 2-3 second me frontend background me `GET /api/v1/work-items/` request bhejta.

### Polling ki Kharabi (The Polling Trap):
| Metric | Short Polling (Har 2-3s) | WebSockets (Bi-Directional) |
|---|---|---|
| **Server Overhead** | Ek single active user har minute 30 requests bhejta hai. 1,000 users = 30,000 HTTP requests/min, jisme 99% responses empty hote hain (`304 Not Modified`). | Ek baar persistent TCP connection open hota hai. Jab tak koi event na ho, bandwidth = 0 bytes! |
| **HTTP Headers Overhead** | Har HTTP request me Cookies, Auth Headers, User-Agent (~1 KB data) travel karta hai. | Handshake ke baad lightweight frame headers (only 2 to 6 bytes per message)! |
| **Latency** | 2 se 5 seconds ki delay hoti hai jab tak agla poll trigger na ho. | Sub-millisecond (instantaneous push < 50ms)! |
| **Database Load** | Continuous polling Supabase / PostgreSQL par heavy queries execute karta rehta hai. | Database sirf tab query hota hai jab actually koi user action perform ho. |

> [!IMPORTANT]
> **WebSocket Verdict:** WebSockets ek persistent, full-duplex, bi-directional TCP connection establish karte hain. Client aur server dono freely kisi bhi waqt data send kar sakte hain bina naye HTTP connections open kiye.

---

## 2. WSGI vs ASGI: Django Channels Server Architecture 🔌

### Traditional WSGI (Web Server Gateway Interface)
Django traditionally **WSGI** (jaise Gunicorn ya uWSGI) par chalta hai:
- **Synchronous Model:** Ek request aati hai -> Ek worker thread usse pakadta hai -> Database query karta hai -> Response return karta hai -> Thread free hota hai.
- **WebSocket Problem:** Agar hum WSGI par WebSocket kholein, toh woh connection ghanto tak open rahega! Ek single worker thread block ho jayega. Agar aapke paas 4 worker threads hain, toh sirf 4 users connect hone par poora server hang ho jayega.

### Modern ASGI (Asynchronous Server Gateway Interface)
**ASGI** Python asynchronous standard hai jo Python ke `asyncio` event loop par chalta hai:
- **Daphne / Uvicorn Server:** Single process par asynchronous I/O use karke hazaro idle connections ko ek saath hold kar sakta hai bina memory exhaust kiye.
- **Dual Protocol Routing:** ASGI server HTTP aur WebSocket dono protocols ko samajhta hai.

```
                  +----------------------------------------------+
                  |                 Client Browser               |
                  +-----------------------+----------------------+
                                          |
                      HTTP Request        |       WebSocket (ws://)
                           |              |               |
                           v              v               v
                  +----------------------------------------------+
                  |             Daphne (ASGI Server)             |
                  |                Port: 8000                    |
                  +-----------------------+----------------------+
                                          |
                        ProtocolTypeRouter (config/asgi.py)
                                          |
                    +---------------------+---------------------+
                    |                                           |
                    v (http)                                    v (websocket)
     +------------------------------+            +------------------------------+
     |   django.core.asgi.get_asgi  |            |     JWTAuthMiddlewareStack   |
     |   _application()             |            +--------------+---------------+
     +--------------+---------------+                           |
                    |                                           v
     +------------------------------+            +------------------------------+
     | Standard Django REST Views   |            |      WorkspaceConsumer       |
     | (Authentication, CRUD APIs)  |            | (apps/realtime/consumers.py) |
     +------------------------------+            +------------------------------+
```

---

## 3. Upstash Redis Channel Layer: Scalable Pub/Sub 🌐

### Channel Layer Kya Hota Hai?
Agar hamare paas multi-process ya distributed architecture ho (jaise Docker container 1 aur container 2):
- User A container 1 se connected hai.
- User B container 2 se connected hai.
- Jab User A card move karta hai, container 1 ko kaise pata chalega ki container 2 par baithe User B ko message bhejna hai?

Iske liye **Channel Layer** use hota hai — ek shared communication backend (message broker). Django Channels me hum **Redis Channel Layer (`channels_redis`)** use karte hain.

### Upstash Redis Configuration:
TaskFlow me hum Upstash Managed Redis over TLS (`rediss://`) use karte hain:
```python
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [REDIS_URL],
            'capacity': 1500,
            'expiry': 30,
            'socket_timeout': 30,
            'socket_connect_timeout': 15,
            'retry_on_timeout': True,
            'health_check_interval': 15,
        },
    },
}
```

> [!WARNING]
> **Serverless Redis Socket Timeout Issue:**
> Upstash serverless Redis idle TCP connections ko 30-60 seconds baad close kar deta hai. Agar hum `socket_timeout`, `retry_on_timeout: True`, aur `health_check_interval: 15` configure na karein, toh background worker me unhandled `TimeoutError` aa jata hai. Ye parameters connection pool ko healthy aur auto-healing banate hain.

---

## 4. Multi-Tenant WebSocket Authentication: `?token=<jwt>` 🔐

### The Native WebSocket Header Limitation:
Browser ka native `new WebSocket(url)` constructor **custom HTTP headers allow nahi karta!**
Hum HTTP requests ki tarah `Authorization: Bearer <token>` nahi bhej sakte.

### Secure Solution: Query Parameter Handshake
1. **Frontend Connection URL:**
   ```ts
   const wsUrl = `ws://127.0.0.1:8000/ws/workspaces/${activeWorkspace.slug}/?token=${accessToken}`;
   const ws = new WebSocket(wsUrl);
   ```
2. **`JWTAuthMiddleware` Handshake Interception:**
   - Connection accept karne se pehle ASGI middleware query string se `token` extract karta hai.
   - SimpleJWT ke `UntypedToken` aur `JWTAuthentication` se token verify karta hai.
   - Agar token valid hai, toh user object ko `scope['user']` me assign karta hai. Agar invalid ya expired hai, toh `AnonymousUser` assign karta hai.
3. **`WorkspaceConsumer.connect()` Tenant Isolation:**
   - Agar `scope['user'].is_anonymous` hai: Consumer WebSocket close kar deta hai with code `4001` (Unauthorized).
   - Consumer check karta hai ki user is particular `workspace_slug` ka active member hai (`status=WorkspaceMember.Status.ACTIVE` aur `archived_at__isnull=True`).
   - Agar user workspace ka member nahi hai: Consumer close kar deta hai with code `4003` (Forbidden). Cross-tenant data leak impossible hai!
   - Agar authorized hai, connection accept hota hai aur user `workspace_{workspace_id}` ke Channel Group me add ho jata hai.

---

## 5. Database Transaction Integrity: `transaction.on_commit` 🛡️

### The Dreaded "Dirty Read" Race Condition:
Real-time applications me ek common bug hota hai:
1. User card move karta hai.
2. Django view/service function DB transaction start karta hai: `item.save()`.
3. Service turant WebSocket par broadcast message send kar deta hai: `"Card AA-5 moved to DONE"`.
4. Dusre user ka frontend message receive karta hai aur turant server se fresh data fetch karne ki koshish karta hai (`GET /api/v1/work-items/AA-5/`).
5. Lekin pehle user ka DB transaction abhi **commit hi nahi hua tha!**
6. Dusre user ko purana data milta hai, ya crash ho jata hai!

### TaskFlow Bulletproof Solution:
TaskFlow me koi bhi broadcast tab tak nahi hota jab tak database transaction successfully PostgreSQL disk par commit na ho jaye:

```python
# backend/apps/realtime/broadcasts.py
def broadcast_workspace_event(workspace_id, event_type, payload, target_user_id=None):
    def _dispatch():
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"workspace_{workspace_id}",
            {
                "type": "workspace_event",
                "event": {
                    "type": event_type,
                    "payload": payload,
                    "target_user_id": str(target_user_id) if target_user_id else None,
                    "timestamp": timezone.now().isoformat(),
                }
            }
        )
    # Strictly wait for database COMMIT before dispatching!
    transaction.on_commit(_dispatch)
```

---

## 6. Frontend Resilience: Auto-Reconnect, Jitter & Decoupled State 🔄

### Exponential Backoff with Jitter:
Agar server restart ho jaye ya network temporary disconnect ho jaye:
- Agar 500 clients ek hi second me reconnect karne ki koshish karein, toh server par **Thundering Herd** attack ho jayega (server crash ho jayega).
- TaskFlow frontend **Exponential Backoff with Random Jitter** use karta hai:
  $$\text{Delay} = \min(1000 \times 2^{\text{retryCount}} + \text{random}(0, 1000), 10000)$$
  Pehle 1s, fir 2s, fir 4s, fir 8s, up to max 10s.

### Heartbeat Ping/Pong Keepalive:
Internet par firewalls aur proxies 60 seconds idle connection ko silent kill kar dete hain. Client ko pata bhi nahi chalta ki socket dead ho chuka hai.
- TaskFlow ka frontend har **30 seconds** me ek heartbeat message bhejta hai: `{"action": "ping"}`.
- Server consumer turant reply karta hai: `{"type": "pong"}`.
- Agar pong na mile ya connection drop ho, client turant detect karke auto-reconnect trigger kar deta hai.

### Executive UI Connection Status Badge:
Dashboard navbar me Notification Bell ke paas ek subtle connection status pill badge dikhta hai:
- 🟢 **Live Sync:** Green pulsing dot indicating live WebSocket connected and active.
- 🟡 **Reconnecting (n):** Amber spinning icon indicating reconnecting with retry count.
- ⚪ **REST Mode:** Slate fallback indicating standard REST API mode when offline.

---

## 7. Local Multi-Device Real-Time Testing Guide 🧪

Aapko real-time WebSocket sync test karne ke liye deploy karne ki zaroorat nahi hai. Aap local machine par hi 3 tareeqon se 100% test kar sakte hain:

### Tareeqa 1: Split Screen (Normal Browser + Incognito Window) — *Easiest & Fastest*
1. **Left Window (Normal Chrome):**
   - Login as `dev@taskflow.dev` (Owner)
   - Go to Active Sprint Board. Notice green **Live Sync** badge.
2. **Right Window (Incognito Chrome):**
   - Login as `qa@taskflow.dev` or another team member.
   - Open the same Active Sprint Board.
3. **Magic Moment:** Left window me kisi bhi card ko drag karo (e.g. *IN PROGRESS* -> *DONE*). Notice right window me bina kisi refresh ke card instantly move ho jayega!

### Tareeqa 2: Same Wi-Fi Network Par Mobile Phone Se Connect Karna
1. Dono servers local network par bind hain (`0.0.0.0` ya specific IP).
2. Apne computer ka Local IP check karein (e.g. `ipconfig` -> `192.168.1.15`).
3. Mobile browser me kholein: `http://192.168.1.15:5173`.
4. Mobile aur desktop dono par ek hi board kholein aur live sync test karein!

### Tareeqa 3: Free Instant Public Tunnel (Cloudflare Tunnel / ngrok)
Agar aap kisi door baithe dost ke sath test karna chahte hain:
```bash
npx untun@latest tunnel http://localhost:5173
```
Yeh ek instant HTTPS public link generate karta hai jo local Daphne aur Vite servers ko globally accessible bana deta hai.
