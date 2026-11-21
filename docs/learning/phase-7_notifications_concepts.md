# Phase 7: Notifications & Background Processing — Concept Learning Guide

> **Target Audience:** Developers learning production background job processing, message queues, Celery architecture, Upstash Redis TLS, and transactional email deliverability.

---

## 1. Redis: Kya Hai, Kis Type Ka Data Store Karta Hai, Aur Yeh Zaroori Kyun Hai? ⚡

### Redis Kya Hai?
**Redis (Remote Dictionary Server)** ek ultra-fast, in-memory **Key-Value Data Store** hai.
- Normal databases (jaise PostgreSQL ya MySQL) data ko **Hard Disk / SSD** par likhte hain. Har read/write me disk I/O hota hai jisme milliseconds lagte hain.
- Redis apna saara data server ki **RAM (Memory)** me rakhta hai. Is wajah se Redis ke operations **sub-millisecond (microseconds)** me complete hote hain!

### Redis me kis type ka data store hota hai?
| Data Type in Redis | TaskFlow meiska Use Case | Example |
|---|---|---|
| **Queues / Lists (`LPUSH`, `RPOP`)** | Celery Task Message Queue | `['send_email_task:42', 'dispatch_notification:89']` |
| **Strings & Hashes** | User Session Caching & Rate Limiting | `rate_limit:user_123:req_count -> 15` |
| **Key-Value with Expiration (TTL)** | Temporary Idempotency & OTPs | `idempotency:e4f8a... -> 'PROCESSING' (TTL: 60s)` |
| **Pub/Sub (Publish/Subscribe)** | Real-Time WebSocket channels (Phase 8) | Instant broadcast of events across distributed server instances |

> [!NOTE]
> **Permanent Data vs Transient Data:**
> PostgreSQL me hum permanent relational data rakhte hain (Users, Workspaces, Projects, Sprints, WorkItems, Comments).
> Redis me hum **transient (temporary/fast-moving)** data rakhte hain jo memory me rehta hai aur fast dispatch ke liye use hota hai. Agar Redis restart ho jaye, toh persistent data PostgreSQL me safely stored rehta hai.

### Upstash Redis Free Tier Details:
- **Upstash** ek Serverless Redis provider hai.
- **Kya yeh bilkul free hai?** **Haan!** Upstash ka Free Tier 100% free hai:
  - **Daily Limit:** 10,000 commands/requests per day.
  - **Storage:** Up to 256 MB data in memory.
  - **No Credit Card Required:** Free tier start karne ke liye koi payment info nahi deni hoti.
  - **Multi-Zone TLS Encryption:** Production-ready `rediss://` TLS encryption by default.
  - Development aur staging environments ke liye 10,000 commands daily bohot zyada hote hain (ek notification dispatch me 2-3 commands lagte hain, jisse aap daily 3,000+ tasks free me test kar sakte hain).

---

## 2. Celery & Asynchronous Task Processing Architecture 🔄

### Web Request vs Background Task (The Latency Bottleneck):
Jab koi user TaskFlow me kisi ticket par comment karta hai ya task assign karta hai:
1. Agar Django synchronous request me email bhejne lage:
   - SMTP server se connect karo (1-2 seconds)
   - TLS handshake karo (0.5 seconds)
   - Email template render karke transmit karo (1-2 seconds)
   - **Total Wait Time:** User ka browser 4-5 seconds tak freeze rahega!
2. Agar network down hua ya Gmail temporary error de, toh user ka HTTP request fail ho jayega!

### Celery Solution: Producer-Broker-Consumer Model

```
+-----------------------------------------------------------+
| 1. PRODUCER (Django Web Server)                          |
| - User assigns task                                       |
| - Saves to PostgreSQL                                     |
| - Sends lightweight JSON message to Redis:                |
|   send_email_task.delay(notification_id)                   |
| - Instantly returns HTTP 200 OK (50ms!)                   |
+-----------------------------+-----------------------------+
                              | (Ultra-fast push < 5ms)
                              v
+-----------------------------------------------------------+
| 2. MESSAGE BROKER (Upstash Redis via TLS)                 |
| - Holds FIFO Queue of pending background jobs             |
| - Safe storage in memory until worker picks it up         |
+-----------------------------+-----------------------------+
                              | (Worker fetches job)
                              v
+-----------------------------------------------------------+
| 3. CONSUMER / WORKER (Celery Daemon Process)              |
| - Independent background process                          |
| - Pulls task from Redis queue                             |
| - Connects to Gmail SMTP, sends email                     |
| - Retries automatically if network fails (Exponential      |
|   Backoff: 2s, 4s, 8s)                                    |
+-----------------------------------------------------------+
```

---

## 3. Database Integrity: `transaction.on_commit()` Pattern 🛡️

Ek common **Production Bug** jo 90% developers face karte hain:
```python
# ❌ INCORRECT (Race Condition Bug!):
with transaction.atomic():
    item.assignee = new_user
    item.save()
    # Celery task yahan trigger ho gaya:
    dispatch_notification_task.delay(item.id)
    # Database commit abhi tak NAHI hua hai!
```
**Kyun fail hota hai?**
Celery worker itna fast hota hai ki wo microsecond me Redis se job uthakar PostgreSQL query karta hai: `WorkItem.objects.get(id=item.id)`. Lekin Django ka database transaction abhi tak commit nahi hua! Result: `WorkItem.DoesNotExist` Exception!

```python
# ✅ CORRECT (Production Gold Standard):
with transaction.atomic():
    item.assignee = new_user
    item.save()
    
    # Task tabhi fire hoga jab PostgreSQL me transaction 100% commit ho chuka ho:
    transaction.on_commit(
        lambda: dispatch_notification_task.delay(notification.id)
    )
```

---

## 4. Gmail SMTP Setup & Google App Password Whitespace Sanitation 📧

### Google App Password Format:
Google Security 2-Step Verification ke baad jab aap App Password generate karte hain, toh Google use readability ke liye **4-character chunks with spaces** me display karta hai:
```
abcd efgh ijkl mnop
```
Agar koi user is text ko directly copy karke `.env` file me paste kar de, toh spaces ki wajah se SMTP authentication fail ho jata hai (`535 5.7.8 Username and Password not accepted`).

### TaskFlow Automated Sanitation:
`backend/config/settings/base.py` me automatic cleaning logic implement kiya gaya hai:
```python
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').replace(' ', '').strip()
```
Chahe aap `.env` me spaces ke saath paste karein ya bina space ke, TaskFlow automatically spaces remove karke sanitized 16-character string SMTP server ko bhejta hai!

---

## 5. Deduplication & Idempotency Key Pattern 🔑

### The Duplicate Notification Problem:
Agar network glitch ki wajah se Celery worker ek task ko retry kare, ya user galti se double-click kare, toh user ko 2 bar email ya 2 bar notification nahi aana chahiye.

### How TaskFlow Prevents Duplicates:
Har notification ke liye ek deterministic **Idempotency Key** calculate ki jaati hai:
```python
raw_key = f"{recipient.id}:{event_type}:{workspace.id}:{object_id}"
idempotency_key = hashlib.sha256(raw_key.encode('utf-8')).hexdigest()
```
Agar same event ka notification already database me exist karta hai:
```python
existing = Notification.objects.filter(idempotency_key=idempotency_key).first()
if existing:
    return existing # Silently return, do not create duplicate or re-email!
```
Daily Overdue Cron ke case me date stamp add kiya jata hai:
`raw_key = f"{assignee.id}:TASK_OVERDUE:{item.id}:{date.today().isoformat()}"`
Isse har overdue task ka notification din me sirf **ek bar** hi generate hota hai.

---

## 6. Celery Beat: Automated Scheduled Cron Jobs ⏰

Phase 7 me `django_celery_beat` ko database-backed periodic scheduler ke roop me register kiya gaya hai:
```python
CELERY_BEAT_SCHEDULE = {
    'check-overdue-tasks-daily': {
        'task': 'apps.notifications.tasks.check_overdue_tasks',
        'schedule': crontab(hour=0, minute=0), # Every midnight UTC
    },
}
```
Yeh background task har raat 12:00 baje run hota hai, un sabhi tasks ko identify karta hai jinki `due_date < today` aur `status != DONE`, aur unke assignees ko automatic alert bhejta hai.
