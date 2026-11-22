# TaskFlow — SDLC Milestones & Active Task Tracker

## 🏁 Phase 0: Project Setup & Repository Baseline (COMPLETED ✅)
- [x] Check installed developer tools (Python 3.14, Node v24, npm 11, Git 2.53)
- [x] Git repository initialization on `main` branch
- [x] Standard repository documentation (`BLUEPRINT.md`, `README.md`, `AGENTS.md`, `DECISIONS.md`, `CHANGELOG.md`, `TASK.md`)
- [x] Root `.gitignore` and `.env.example`
- [x] Configure `.env` with live Supabase PostgreSQL credentials
- [x] Test live database connectivity from Django ORM (PostgreSQL 17.12 confirmed)
- [x] Connect remote GitHub repository (`https://github.com/devam6744/TaskFlow.git`)
- [x] Push initial baseline commit to GitHub `main`
- [x] Backend Django 5 + DRF skeleton with settings & health check
- [x] Frontend Vite + React 19 + TypeScript baseline with verified build

---

## 🏁 Phase 1 & 2: Custom User Model & Authentication Foundation (COMPLETED ✅)
- [x] Create comprehensive 4-file documentation framework (`docs/learning/`, `docs/decisions/`, `docs/phase-reports/`, `docs/CONTEXT.md`)
- [x] Initialize `apps/accounts` Django modular app structure
- [x] Implement Custom User Model (`AbstractBaseUser` with UUID PK and normalized unique email)
- [x] Enforce Custom User Model in `config/settings/base.py` (`AUTH_USER_MODEL = 'accounts.User'`)
- [x] Create and run initial database migrations on live Supabase PostgreSQL 17 (`accounts_user`, `token_blacklist`)
- [x] Configure SimpleJWT with token rotation and server-side blacklisting
- [x] Implement Service Layer (`apps/accounts/services.py`) with atomic transactions and timing-attack defense
- [x] Implement Auth API endpoints (`apps/accounts/api/views.py`):
  - `POST /api/v1/auth/register/` (201 Created + HttpOnly cookie)
  - `POST /api/v1/auth/login/` (200 OK + IP Rate Limit 5/min + Anti-Enumeration + HttpOnly cookie)
  - `POST /api/v1/auth/refresh/` (200 OK + Token Rotation + Cookie Refresh)
  - `POST /api/v1/auth/logout/` (200 OK + Server-side Blacklisting + Cookie Clearing)
  - `GET /api/v1/auth/me/` (200 OK + Bearer Token Authorization)
- [x] Write backend automated test suite (`apps/accounts/tests/test_auth_api.py`) — 8/8 tests passed
- [x] Verify OpenAPI 3.0 schema generation with `drf-spectacular` (0 errors, 0 warnings)
- [x] Frontend Executive Light Theme Redesign & Landing Page:
  - Separate Public Landing Page (`/`) with Hero, Agile Board Mockup, Feature Matrix, Agile Workflow (`#workflow`), Security (`#security`), and Footer (`#about`)
  - Seamless SPA Unified Auth Card (`AuthPage.tsx`) with in-place tab switching between Sign In and Create Account (no split screen)
  - Dedicated Dashboard (`/dashboard`) guarded by `ProtectedRoute`
  - Logout flow redirects directly to Landing Page (`/`)
  - Manageable User Profile Modal (`ProfileModal.tsx`) for account management & UUID copy
  - Full mobile responsiveness with collapsible hamburger drawer and responsive cards
  - Professional Footer with credits: Devam Mandli (`mandlidevam9@gmail.com`, LinkedIn: `linkedin.com/in/devam-mandli`, GitHub: `devam6744`)
  - CORS & Rate-limit optimizations on backend (supports localhost and 127.0.0.1, relaxed 30/m limit for testing)
  - Zero emojis policy strictly enforced (100% SVG Lucide & Vector icons)
  - Cleaned all diagnostic clutter and removed unwanted external API buttons
  - Production build verified (`npm run build` in 2.05s)

---

## 🏁 Phase 3: Workspace & Multi-Tenancy Isolation (COMPLETED ✅)
- [x] Create modular Django app `apps/workspaces`
- [x] Implement `Workspace`, `WorkspaceMember`, and `WorkspaceInvite` models (UUID PKs, unique slug, role choices: OWNER, ADMIN, MEMBER, VIEWER)
- [x] Enforce composite unique constraint `(workspace, user)` on `WorkspaceMember`
- [x] Apply migrations to live Supabase PostgreSQL 17 (`workspaces.0001_initial`)
- [x] Implement multi-tenancy permission classes (`IsWorkspaceMember`, `IsWorkspaceAdminOrOwner`, `IsWorkspaceOwner`)
- [x] Implement Service layer (`apps/workspaces/services.py`):
  - `create_workspace` (atomic transaction, auto-enrolls creator as OWNER)
  - `invite_member` (cryptographic token generator, SHA-256 token hash storage, 7-day expiration)
  - `accept_invite` (single-use validation, joins workspace with assigned role)
  - `remove_member` (guarantees last active owner cannot be removed)
  - `update_member_role` (anti-self-escalation guard)
  - `archive_workspace` & `unarchive_workspace` (soft-delete lifecycle)
- [x] Implement Query Selectors (`selectors.py`) with `select_related('user')` and `select_related('owner')` to eliminate N+1 queries
- [x] Implement REST API endpoints (`/api/v1/workspaces/` collection, scoped detail, members, invites, and accept)
- [x] Automated test suite (`apps/workspaces/tests/test_workspace_api.py`) — 11/11 tests passing (19/19 full suite passing)
- [x] OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors, 0 warnings)
- [x] Frontend Executive UI & Workspaces:
  - Fixed scroll overlap bug: layout updated to `h-screen overflow-hidden` with fixed elevated `<header>` (`z-30`) and independent scrollable canvas (`overflow-y-auto`)
  - Functional global `Ctrl+K` / `Cmd+K` keyboard shortcut listener and interactive `QuickSearchModal.tsx` command palette
  - Workspace Switcher dropdown in header/sidebar with role badges (`WorkspaceSwitcher.tsx`)
  - Create Workspace Modal with real-time slug preview (`CreateWorkspaceModal.tsx`)
  - Workspace Members Modal with role badges, invite creation form, copyable invite link, and member management (`WorkspaceMembersModal.tsx`)
  - Dedicated `/join?token=...` invitation acceptance page (`JoinWorkspacePage.tsx`)
  - Reactive Zustand workspace store (`stores/workspaceStore.ts`)
  - Verified frontend production build (`npm run build` in 1.61s)
- [x] Comprehensive documentation:
  - `docs/learning/phase-3_workspace_concepts.md` (Multi-Tenancy, RBAC, SHA-256 tokens, N+1 query prevention in clear Hinglish)
  - `docs/decisions/phase-3_decisions.md` (ADRs 006-010)
  - `docs/phase-reports/phase-3_completion.md`

---

## 🏁 Phase 4: Projects & Product Backlog Management (COMPLETED ✅)
- [x] Create modular Django app `apps/projects`
- [x] Implement `Project`, `ProjectMember`, and `WorkItem` models (UUID PKs, workspace FK, slug, key e.g. `TF`, visibility: `WORKSPACE` vs `PRIVATE`, `definition_of_done`)
- [x] Implement `WorkItem` with sequential atomic keys (`item_number` via `select_for_update`), `key_identifier` (e.g. `TF-1`), types (`STORY`, `TASK`, `BUG`, `IMPROVEMENT`), priorities, statuses, and float `backlog_order`
- [x] Apply migrations to live Supabase PostgreSQL 17 (`projects.0001_initial`)
- [x] Implement Fractional Indexing (LexoRank) algorithm in `apps/projects/services.py` for $O(1)$ single-row drag-and-drop reordering: `(prev + next) / 2.0`
- [x] Implement strict Fibonacci Story Point validation (`[1, 2, 3, 5, 8, 13, 21]`)
- [x] Scoped selectors (`selectors.py`) with `select_related('lead', 'created_by')` to eliminate N+1 queries
- [x] Scoped permissions (`permissions.py`) with private project isolation and Workspace Owner universal access
- [x] Implement full REST API endpoints mounted under `/api/v1/workspaces/{workspace_slug}/projects/`:
  - `GET /`, `POST /`, `GET /{slug}/`, `PATCH /{slug}/`, `DELETE /{slug}/`
  - `GET /{slug}/backlog/`, `POST /{slug}/backlog/`
  - `PATCH /{slug}/backlog/{item_number}/`, `DELETE /{slug}/backlog/{item_number}/`
  - `POST /{slug}/backlog/{item_number}/reorder/` (LexoRank endpoint)
- [x] Automated test suite (`apps/projects/tests/test_projects_and_backlog.py`) — 7/7 tests passing (26/26 full suite passing)
- [x] OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors)
- [x] Frontend Executive Light-Theme Backlog UI (`BacklogPage.tsx`):
  - Google Stitch-grade executive light theme (`slate-50` canvas, crisp white cards, `slate-200` borders, `blue-600` accents)
  - Zero Emojis Policy strictly enforced (100% SVG Lucide React icons)
  - Project Switcher and "New Project" modal (`CreateProjectModal.tsx`)
  - Definition of Done (DoD) viewer toggle and project quality banner
  - Agile KPI stats bar (Total items, Story Points sum, Estimated coverage %, Done count)
  - Inline Quick-Create form (`Story`/`Task`/`Bug`/`Improvement`, title input, Fibonacci points selector)
  - Backlog list with mobile & touch-friendly Move Up/Down buttons invoking LexoRank $O(1)$ reordering
  - Work item detail & editing modal (`WorkItemDetailModal.tsx`)
  - Global `Ctrl+K` Command Palette updated to search across projects and backlog items
  - Responsive layout for mobile viewports and touch targets
  - Production build verified (`npm run build` in 1.78s)
- [x] Comprehensive documentation:
  - `docs/learning/phase-4_projects_backlog_concepts.md` (Fibonacci, LexoRank, DoD, sequential keys in Hinglish)
  - `docs/decisions/phase-4_decisions.md` (ADRs 011-014)
  - `docs/phase-reports/phase-4_completion.md`

---

## 🏁 Phase 5: Sprint Lifecycle & Interactive Kanban Board (COMPLETED ✅)
- [x] Implement `Sprint` model (UUID PK, project FK, name e.g. "Sprint 1", sprint_goal, start_date, end_date, actual_started_at, actual_completed_at, status: PLANNING, ACTIVE, COMPLETED, CANCELLED, planned_story_points, completed_story_points)
- [x] Link `WorkItem` to `Sprint` foreign key (`db_column='sprint_id'`)
- [x] Enforce backend invariant: Only one ACTIVE sprint per project at a time via pessimistic row locking (`Project.objects.select_for_update()`)
- [x] Implement Sprint lifecycle service methods in `apps/projects/services.py`:
  - `create_sprint` (name, goal, dates, initial PLANNING state)
  - `start_sprint` (verifies no active sprint, snapshots committed story points, atomically transitions items from BACKLOG to TODO)
  - `complete_sprint` (calculates completed vs incomplete story points, handles explicit rollover of incomplete items to BACKLOG or target sprint)
  - `cancel_sprint` (aborts sprint and rolls incomplete items back to product backlog)
  - `add_work_items_to_sprint` & `remove_work_items_from_sprint`
  - `transition_work_item_status` (atomic status updates: TODO, IN_PROGRESS, IN_REVIEW, DONE)
- [x] Scoped selectors (`apps/projects/selectors.py`) for active sprint, project sprints, and sprint work items
- [x] Sprint & Kanban REST API endpoints mounted under `/api/v1/workspaces/{workspace_slug}/projects/{project_slug}/`:
  - `GET /sprints/`, `POST /sprints/`
  - `GET /sprints/{id}/`, `PATCH /sprints/{id}/`, `DELETE /sprints/{id}/`
  - `POST /sprints/{id}/start/`
  - `POST /sprints/{id}/complete/`
  - `POST /sprints/{id}/cancel/`
  - `POST /sprints/{id}/add-items/`, `POST /sprints/{id}/remove-items/`
  - `GET /board/` (Active sprint board with columns & metrics)
  - `POST /items/{item_number}/transition/` (Move cards across swimlanes)
- [x] Automated test suite (`apps/projects/tests/test_sprints_and_kanban.py`) — 7/7 tests passing (full test suite: 33/33 passing)
- [x] OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors, 0 warnings)
- [x] Frontend Executive Light-Theme Sprint & Kanban UI:
  - Google Stitch-grade executive light theme (`slate-50` canvas, crisp white cards, `slate-200` borders, `blue-600` accents)
  - Strict zero-emoji policy: 100% SVG Lucide React icons
  - `KanbanBoard.tsx`: Real active sprint board with sprint banner (name, goal, days left countdown, velocity progress bar), 4 swimlanes (`To Do`, `In Progress`, `In Review`, `Done`), drag-and-drop card movement, and touch-friendly column shift arrows (`<` and `>`) for mobile viewports
  - `CreateSprintModal.tsx`: Modal for planning new sprint time-boxes
  - `StartSprintModal.tsx`: Modal for locking committed scope and activating sprint
  - `CompleteSprintModal.tsx`: Retrospective completion modal with rollover choice for unfinished items
  - `BacklogPage.tsx`: Integrated Sprint Planning section with "+ Create Sprint" button, sprint cards, and backlog item "Move to Sprint..." selector
  - Verified frontend production build (`npm run build` in 4.79s)
- [x] Comprehensive documentation:
  - `docs/learning/phase-5_sprints_kanban_concepts.md` (Scrum vs Kanban, single active sprint invariant, points freezing, and rollover dilemma in Hinglish)
  - `docs/decisions/phase-5_decisions.md` (ADRs 015-018)
  - `docs/phase-reports/phase-5_completion.md`

---

## 🏁 Phase 6: Collaboration, Discussion Threads, Attachments & Activity Trail (COMPLETED ✅)
- [x] Create modular Django app `apps/collaboration`
- [x] Implement `Comment` model (UUID PK, `work_item` FK, `author` FK, `text`, soft deletion via `deleted_at`)
- [x] Implement `Attachment` model (UUID PK, `work_item` FK, `uploader` FK, secure `file` storage under `media/`, `file_name`, `file_size`, `content_type`, 10MB limit)
- [x] Implement polymorphic `ActivityEvent` model (UUID PK, `workspace` FK, `project` FK, `work_item` FK, `actor` FK, `event_type`, `description`, `metadata` JSONField)
- [x] Implement `WorkItemDependency` model in `apps/projects` (`blocking_item`, `blocked_item`, `dependency_type='BLOCKS'`, unique together constraint)
- [x] Apply migrations to live Supabase PostgreSQL 17 (`projects.0003_workitemdependency`, `collaboration.0001_initial`)
- [x] Implement Service Layer in `apps/collaboration/services.py`:
  - `add_comment`, `update_comment`, `delete_comment` (soft delete with author ownership check)
  - `upload_attachment` (10MB limit validation, MIME detection, activity logging)
  - `delete_attachment` (physical file removal and audit logging)
  - `record_activity_event` (atomic audit trail helper)
- [x] Implement Graph Cycle Detection (DFS) in `apps/projects/services.py` (`check_dependency_cycle`) to prevent deadlock loops
- [x] Connect `record_activity_event` to status transitions and sprint assignments in `apps/projects/services.py`
- [x] Implement Selectors (`apps/collaboration/selectors.py`) with `select_related('author')`, `select_related('uploader')`, `select_related('actor')` to prevent N+1 queries
- [x] Implement DRF Serializers and Views with dual `/items/` and `/work-items/` URL patterns
- [x] Automated test suite (`apps/collaboration/tests/test_collaboration_api.py`) — 8/8 tests passing (full test suite: 41/41 passing)
- [x] OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors, 0 warnings)
- [x] Frontend Executive Light-Theme Collaboration Dual-Pane Modal:
  - Responsive dual-pane layout (`flex flex-col md:flex-row`)
  - Left pane: Item properties, description, DoD acceptance criteria, Fibonacci point selector, and Blocked By dependency manager
  - Right pane: 3 interactive tabs:
    - **Comments Tab**: Real-time discussion thread, author avatar badges, relative timestamps, inline delete, Ctrl+Enter submit
    - **Activity Tab**: Chronological audit trail of comments, attachments, status changes, and sprint assignments
    - **Files Tab**: Drag-and-drop file upload zone (Max 10MB), file badges with icons, download and delete buttons
  - Connected Kanban cards to open collaboration modal on click
  - Interactive SDLC Roadmap badges in dashboard navigation
  - Reactive Zustand collaboration store (`stores/collaborationStore.ts`)
  - Verified frontend production build (`npm run build` in 2.87s)
- [x] Comprehensive documentation:
  - `docs/learning/phase-6_collaboration_concepts.md` (Soft deletion, DAG cycle detection, MIME sniffing protection, audit trails in Hinglish)
  - `docs/decisions/phase-6_decisions.md` (ADRs 019-022)
  - `docs/phase-reports/phase-6_completion.md`

---

## 🏁 Phase 7: Notifications & Background Processing (COMPLETED ✅)
- [x] Integrate Celery 5.x and Upstash Managed Serverless Redis over TLS (`rediss://`)
- [x] Configure Gmail SMTP with automatic whitespace/chunk sanitation for Google App Passwords (`replace(" ", "").strip()`)
- [x] Implement complete Password Reset & Recovery flow:
  - `POST /api/v1/auth/password-reset/` (anti-enumeration 24-hour token generation + Gmail SMTP dispatch)
  - `POST /api/v1/auth/password-reset/confirm/` (HMAC token verification + single-use invalidation)
  - Responsive HTML template `backend/templates/emails/password_reset.html`
  - Frontend in-place "Forgot Password" card and `/reset-password` recovery page
  - Automated unit test suite `apps/accounts/tests/test_password_reset.py` (5/5 tests passing)
- [x] Configure Celery eager execution mode in development (`CELERY_TASK_ALWAYS_EAGER`) for immediate in-process email delivery without separate worker terminal
- [x] Create modular Django app `apps/notifications`
- [x] Implement `Notification` model (UUID PK, recipient FK, actor FK, workspace FK, event_type, title, description, target_url, payload, read_at, email_sent_at, email_status, idempotency_key)
- [x] Implement `NotificationPreference` model (user FK, workspace FK, event_type, in_app_enabled, email_enabled)
- [x] Apply migrations to live Supabase PostgreSQL 17 (`notifications.0001_initial` and `django_celery_beat`)
- [x] Create 5 responsive HTML email templates (`base_email`, `task_assigned`, `sprint_started`, `task_overdue`, `comment_added`, `workspace_invite`)
- [x] Implement Celery tasks in `apps/notifications/tasks.py`:
  - `dispatch_notification_task` (async notification creation with preference checking)
  - `send_email_task` (SMTP delivery with exponential backoff retries)
  - `send_invitation_email_task` (workspace invite delivery)
  - `check_overdue_tasks` (Celery Beat periodic daily cron)
- [x] Implement Service layer (`apps/notifications/services.py`) with deterministic SHA-256 idempotency key deduplication
- [x] Implement Selectors (`apps/notifications/selectors.py`) with `select_related('actor', 'workspace')` to eliminate N+1 queries
- [x] Wire asynchronous notification triggers into:
  - `apps.workspaces.services.invite_member` (workspace invite)
  - `apps.collaboration.services.add_comment` (comment notification to assignee)
  - `apps.projects.services.update_work_item` (task assignment notification)
  - `apps.projects.services.start_sprint` (sprint started notification to members)
- [x] Implement REST API endpoints mounted under `/api/v1/notifications/`:
  - `GET /` (list user notifications in workspace)
  - `GET /unread-count/` (lightweight bell badge count)
  - `POST /{id}/read/` (mark single notification read)
  - `POST /read-all/` (bulk mark all read)
  - `GET /preferences/` & `PATCH /preferences/` (manage in-app and email preferences)
- [x] Automated test suite (`apps/notifications/tests/test_notifications_api.py`) — 9/9 tests passing (full test suite: 50/50 passing)
- [x] OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors, 0 warnings)
- [x] Frontend Executive Light-Theme Notification Center:
  - Google Stitch-grade executive light theme (`slate-50`, crisp white popover, `slate-200` borders, `blue-600` accents)
  - Zero Emojis Policy strictly enforced (100% SVG Lucide React icons)
  - `NotificationBell.tsx`: Interactive bell icon with animated red unread pill badge, 30s polling, relative timestamps, event icons, and "Mark all read" button
  - `NotificationPreferencesModal.tsx`: User modal to toggle In-App and Email alerts per event type
  - Reactive Zustand notification store (`stores/notificationStore.ts`)
  - Verified frontend production build (`npm run build` in 5.77s)
- [x] Comprehensive documentation:
  - `docs/learning/phase-7_notifications_concepts.md` (Upstash Redis TLS, Celery architecture, idempotency keys, Gmail SMTP sanitation in Hinglish)
  - `docs/decisions/phase-7_decisions.md` (ADRs 023-026)
  - `docs/phase-reports/phase-7_completion.md`

---

## 🚀 Active Milestone: Phase 8 — Real-Time Updates & WebSockets (NEXT)
- [ ] Install & configure Django Channels with Upstash Redis Channel Layer (`channels_redis`)
- [ ] Implement ASGI application entrypoint in `backend/config/asgi.py`
- [ ] Implement WebSocket Consumers for Workspaces and Projects (`WorkItemConsumer`, `SprintConsumer`)
- [ ] Implement WebSocket Authentication middleware (JWT Bearer query param or cookie validation)
- [ ] Connect Django Service Layer event signals to Channel Layer group broadcasts
- [ ] Frontend WebSocket connection manager and Zustand store subscription for real-time Kanban board updates (drag-and-drop card sync across active sessions)
- [ ] Real-time notification badge increment via WebSocket without polling

---

## 📅 Upcoming Phases
- **Phase 8: Real-Time Updates & WebSockets**
- **Phase 9: Sprint Analytics, Burndown Charts & Global Search**
- **Phase 10: Release Hardening, Dockerization & Production Deployment**
- **Phase v2: Enterprise AI Copilot & Integrations**
