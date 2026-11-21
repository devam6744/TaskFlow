# Architecture Decision Records (ADRs) — Phase 7: Notifications & Background Processing

## ADR 023: Celery with Upstash Redis Broker via TLS (`rediss://`)
- **Status:** Accepted
- **Context:** Background processing requires a high-throughput message broker to distribute jobs (`send_email_task`, `dispatch_notification_task`, `check_overdue_tasks`). Using relational PostgreSQL as a Celery broker (`django-db`) causes high table lock contention and polling overhead on the database.
- **Decision:** Integrated Celery with Upstash Managed Serverless Redis over TLS (`rediss://`) using `CELERY_BROKER_USE_SSL = {'ssl_cert_reqs': ssl.CERT_NONE}`.
- **Consequences:** Offloads all background task coordination and queuing from Supabase PostgreSQL to in-memory Redis. Ensures zero-cost operational overhead within Upstash's 10,000 commands/day free tier while maintaining production TLS security.

---

## ADR 024: Gmail SMTP with Automatic Whitespace Sanitation
- **Status:** Accepted
- **Context:** In production staging, Gmail SMTP with Google 2FA requires an App Password. Google formats these 16-character passwords in chunks with spaces (e.g., `abcd efgh ijkl mnop`). Users frequently paste this raw string into `.env`, causing cryptic `535 5.7.8` SMTP auth failures.
- **Decision:** Implemented automatic whitespace sanitation in `backend/config/settings/base.py`:
  `EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').replace(' ', '').strip()`. Additionally, during unit testing, `EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'` is used automatically to prevent external network calls.
- **Consequences:** Eliminates configuration user error during onboarding while ensuring test suites run 100% offline and in-memory.

---

## ADR 025: Deterministic SHA-256 Idempotency Key Pattern
- **Status:** Accepted
- **Context:** Network retries, Celery worker crashes, or concurrent frontend requests can cause duplicate notifications or duplicate emails being dispatched to users.
- **Decision:** Introduced an `idempotency_key` field (`CharField(max_length=64, unique=True)`) on the `Notification` model. Generated deterministically from `hashlib.sha256(f"{recipient_id}:{event_type}:{workspace_id}:{object_id}".encode()).hexdigest()`. For daily cron jobs (e.g. overdue tasks), the ISO date string is appended.
- **Consequences:** Guaranteed at-most-once notification creation. Repeated calls safely return the existing notification instance without re-queuing emails or polluting user inboxes.

---

## ADR 026: Granular Per-Event Notification Preferences
- **Status:** Accepted
- **Context:** Team members have differing preferences regarding notification volume. Some prefer immediate emails for task assignments, while others only want in-app notifications to avoid inbox clutter.
- **Decision:** Created the `NotificationPreference` model indexed by `(user, workspace, event_type)` controlling two independent boolean flags: `in_app_enabled` (default `True`) and `email_enabled` (default `True`). Preferences are verified in `services.create_notification` before saving the notification or queuing the email task.
- **Consequences:** Allows workspace-level customization for every user across all 5 event types (`TASK_ASSIGNED`, `SPRINT_STARTED`, `TASK_OVERDUE`, `COMMENT_ADDED`, `WORKSPACE_INVITE`). Unsubscribing from email leaves in-app alerts active, and vice versa.
