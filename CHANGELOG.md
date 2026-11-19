# Changelog

All notable changes to the TaskFlow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-11-19 - Phase 6: Collaboration, Discussion Threads, Attachments & Activity Trail
### Added
- Enterprise Collaboration modular app: `apps.collaboration`.
- Data models:
  - `Comment`: Soft-delete discussion model (`deleted_at`), UUID PK, `work_item` FK, `author` FK, `text`, timestamps.
  - `Attachment`: 10MB upload model, UUID PK, `work_item` FK, `uploader` FK, `file`, `file_name`, `file_size`, `content_type`.
  - `ActivityEvent`: Polymorphic audit log, UUID PK, `workspace` FK, `project` FK, `work_item` FK, `actor` FK, `event_type`, `description`, `metadata` JSONField.
  - `WorkItemDependency`: Directed graph dependency model in `apps.projects` (`blocking_item`, `blocked_item`, `dependency_type='BLOCKS'`).
- Applied database migrations to live Supabase PostgreSQL 17:
  - `apps/projects/migrations/0003_workitemdependency.py`
  - `apps/collaboration/migrations/0001_initial.py`
- Service Layer (`apps.collaboration.services` & `apps.projects.services`):
  - `add_comment`: Discussion posting with automatic audit trail recording.
  - `update_comment`: Author ownership enforcement and edit tracking.
  - `delete_comment`: Non-destructive soft deletion (`deleted_at = timezone.now()`) preserving audit log history.
  - `upload_attachment`: 10MB file limit validation and file metadata persistence.
  - `delete_attachment`: Physical file deletion and activity logging.
  - `check_dependency_cycle`: Depth-First Search (DFS) graph cycle detector to prevent circular dependencies (deadlocks).
  - `add_work_item_dependency` & `remove_work_item_dependency`: Validated dependency management.
  - `record_activity_event`: Centralized polymorphic audit log generator connected to status transitions, sprint assignments, comments, and attachments.
- Query Selectors (`apps.collaboration.selectors`): Scoped with `select_related('author')`, `select_related('uploader')`, `select_related('actor')` to prevent N+1 queries.
- REST API Endpoints mounted under `/api/v1/workspaces/{workspace_slug}/projects/{project_slug}/`:
  - `GET /items/{item_number}/comments/` & `POST /items/{item_number}/comments/`
  - `PATCH /items/{item_number}/comments/{id}/` & `DELETE /items/{item_number}/comments/{id}/`
  - `GET /items/{item_number}/attachments/` & `POST /items/{item_number}/attachments/` (Multipart file upload)
  - `DELETE /items/{item_number}/attachments/{id}/`
  - `GET /items/{item_number}/activity/` (Full audit timeline)
  - `GET /items/{item_number}/dependencies/` & `POST /items/{item_number}/dependencies/`
  - `DELETE /items/{item_number}/dependencies/{id}/`
- Automated Unit Tests (`apps/collaboration/tests/test_collaboration_api.py`): 8/8 tests passing (Full suite: 41/41 passing).
- OpenAPI 3.0: Validated with `drf-spectacular` (0 errors, 0 warnings).
- Frontend Executive Dual-Pane Collaboration Modal:
  - Responsive dual-pane layout (`flex flex-col md:flex-row`) optimized for all viewports.
  - Left pane: Item properties, description, DoD acceptance criteria, Fibonacci point selector, and Blocked By dependency manager.
  - Right pane: 3 interactive tabs:
    - **Comments Tab**: Real-time discussion thread, author avatar badges, relative timestamps, inline delete, Ctrl+Enter submit.
    - **Activity Tab**: Chronological audit trail of comments, attachments, status changes, and sprint assignments.
    - **Files Tab**: Drag-and-drop file upload zone (Max 10MB), file badges with icons, download and delete buttons.
  - Connected Kanban cards to open collaboration modal on click.
  - Interactive SDLC Roadmap badges in dashboard navigation.
  - Reactive Zustand collaboration store (`stores/collaborationStore.ts`).
  - Verified production build (`npm run build` in 2.87s).
- Comprehensive Phase 6 documentation:
  - `docs/learning/phase-6_collaboration_concepts.md` (Soft deletion, DAG cycle detection, MIME sniffing protection, audit trails in Hinglish).
  - `docs/decisions/phase-6_decisions.md` (ADRs 019-022).
  - `docs/phase-reports/phase-6_completion.md`.

## [0.5.0] - 2026-11-19 - Phase 5: Sprint Lifecycle & Interactive Kanban Board
### Added
- Enterprise Sprint Lifecycle data model: `Sprint` in `apps.projects`:
  - `Sprint`: UUID PK, project FK, name (e.g. `Sprint 1`), sprint goal, start date, end date, actual start/completion timestamps, status (`PLANNING`, `ACTIVE`, `COMPLETED`, `CANCELLED`), planned story points (frozen baseline), and completed story points.
  - Linked `WorkItem` with foreign key `sprint` (`db_column='sprint_id'`).
- Applied migration `0002_remove_workitem_sprint_id_sprint_workitem_sprint_and_more` to live Supabase PostgreSQL 17.
- Service Layer (`apps.projects.services`):
  - `create_sprint`: Validates sprint time-box and initial `PLANNING` status.
  - `start_sprint`: Pessimistic locking on project row (`select_for_update`) to strictly enforce the Single Active Sprint Invariant across concurrent requests. Snapshots planned story points to freeze baseline velocity and transitions all assigned backlog items to `TODO`.
  - `complete_sprint`: Calculates final velocity, checks unfinished tickets, and executes explicit rollover to either the Product Backlog or a designated future planned sprint.
  - `cancel_sprint`: Aborts active sprint and safely cascades incomplete items back to the backlog.
  - `add_work_items_to_sprint` & `remove_work_items_from_sprint`: Batch assignment service.
  - `transition_work_item_status`: Atomic state transitions across Kanban swimlanes (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`) with automatic timestamp tracking.
- Scoped selectors (`apps.projects.selectors`) with `select_related('sprint', 'assignee')` to eliminate N+1 queries during Kanban board rendering.
- REST API endpoints mounted under `/api/v1/workspaces/{workspace_slug}/projects/{project_slug}/`:
  - `GET /sprints/` & `POST /sprints/` (Sprint collection & creation)
  - `GET /sprints/{id}/`, `PATCH /sprints/{id}/`, `DELETE /sprints/{id}/`
  - `POST /sprints/{id}/start/` (Sprint activation)
  - `POST /sprints/{id}/complete/` (Sprint completion with rollover)
  - `POST /sprints/{id}/cancel/` (Sprint cancellation)
  - `POST /sprints/{id}/add-items/` & `POST /sprints/{id}/remove-items/`
  - `GET /board/` (Active sprint board with column card groupings & velocity metrics)
  - `POST /items/{item_number}/transition/` (Single-click card status movement)
- Automated unit test suite (`apps.projects.tests.test_sprints_and_kanban.py`) — 7/7 tests passing (full test suite: 33/33 passing in 89.57s).
- Validated OpenAPI 3.0 schema generation with `drf-spectacular` (0 errors, 0 warnings).
- Frontend Executive UI & Interactive Kanban Board:
  - Google Stitch-grade executive light theme (`slate-50` background, crisp white cards, `slate-200` borders, `blue-600` accents).
  - Strict zero-emoji policy: 100% SVG Lucide React icons.
  - `KanbanBoard.tsx`: Live active sprint board with sprint banner (name, goal, days left countdown, velocity progress bar), 4 swimlanes (`To Do`, `In Progress`, `In Review`, `Done`), drag-and-drop card movement, and touch-friendly column shift arrows (`<` and `>`) for mobile viewports.
  - `CreateSprintModal.tsx`: Time-box sprint planning modal.
  - `StartSprintModal.tsx`: Scope commitment and sprint activation modal.
  - `CompleteSprintModal.tsx`: Retrospective completion modal with rollover choice for unfinished items.
  - `BacklogPage.tsx`: Integrated Sprint Planning section with "+ Create Sprint" button, sprint cards, and backlog item "Move to Sprint..." selector.
  - Verified frontend production build (`npm run build` in 4.79s).
- Comprehensive Phase 5 documentation:
  - `docs/learning/phase-5_sprints_kanban_concepts.md` (Scrum vs Kanban, single active sprint invariant, points freezing, and rollover dilemma in Hinglish).
  - `docs/decisions/phase-5_decisions.md` (ADRs 015-018).
  - `docs/phase-reports/phase-5_completion.md`.

## [0.4.0] - 2026-11-19 - Phase 4: Projects & Product Backlog Management
### Added
- Enterprise Projects modular app: `apps.projects`.
- Data models:
  - `Project`: UUID PK, workspace FK, name, slug, uppercase key prefix (e.g. `TF`), visibility (`WORKSPACE`, `PRIVATE`), `lead`, `created_by`, `definition_of_done`, `is_archived`.
  - `ProjectMember`: UUID PK, project FK, user FK, granular project roles (`LEAD`, `MEMBER`, `VIEWER`), unique together `(project, user)`.
  - `WorkItem`: UUID PK, project FK, strictly sequential `item_number` (generated atomically via `select_for_update`), computed `key_identifier` (e.g. `TF-1`), type (`STORY`, `TASK`, `BUG`, `IMPROVEMENT`), priority (`URGENT`, `HIGH`, `MEDIUM`, `LOW`), status (`BACKLOG`, `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`), `story_points` (Fibonacci validated), `acceptance_criteria`, `backlog_order` (float for LexoRank).
- Database migration `projects.0001_initial` applied to Supabase PostgreSQL 17.
- Service layer (`apps.projects.services`):
  - `create_project`: Atomic transaction, key uppercase formatting, workspace association.
  - `create_work_item`: Pessimistic locking (`select_for_update`) to prevent race conditions in sequential numbering.
  - `reorder_backlog_item`: Fractional Indexing (LexoRank) midpoint calculation `(prev_order + next_order) / 2.0` achieving single-row $O(1)$ reordering.
  - `validate_fibonacci_points`: Strict Fibonacci sequence enforcement (`1, 2, 3, 5, 8, 13, 21`).
- Scoped selectors (`apps.projects.selectors`) with `select_related('lead', 'created_by')` to eliminate N+1 queries.
- Multi-tenant permission classes (`ProjectPermission`) enforcing workspace membership and private project boundaries.
- REST API endpoints mounted under `/api/v1/workspaces/{workspace_slug}/projects/`:
  - `GET /` & `POST /` (projects collection)
  - `GET /{slug}/`, `PATCH /{slug}/`, `DELETE /{slug}/` (project details & soft archive)
  - `GET /{slug}/backlog/`, `POST /{slug}/backlog/` (backlog collection)
  - `PATCH /{slug}/backlog/{item_number}/`, `DELETE /{slug}/backlog/{item_number}/` (item updates & deletion)
  - `POST /{slug}/backlog/{item_number}/reorder/` (LexoRank fractional indexing reorder)
- Comprehensive automated test suite (`apps.projects.tests.test_projects_and_backlog.py`) — 7/7 tests passing (full test suite: 26/26 passing).
- OpenAPI 3.0 schema generation verified with `drf-spectacular` (0 errors).
- Frontend Executive UI & Product Backlog:
  - Google Stitch-grade executive light theme (`slate-50` background, crisp white cards, `slate-200` borders, `blue-600` accents).
  - Strict zero-emoji policy: 100% SVG Lucide React icons.
  - `BacklogPage.tsx`: Agile backlog view, project switcher, Definition of Done (DoD) viewer toggle, Agile KPI stats bar (items, story points, estimated coverage %, done count), inline quick-create form, and touch-friendly Move Up/Down buttons for mobile.
  - `CreateProjectModal.tsx`: Real-time key suggestion preview, visibility toggle, and DoD editor.
  - `WorkItemDetailModal.tsx`: Comprehensive modal for viewing and editing work item details, Fibonacci story points, and acceptance criteria.
  - `QuickSearchModal.tsx`: Updated `Ctrl+K` palette to search across workspaces, projects, and backlog items.
  - `DashboardPage.tsx`: Integrated Projects & Backlog into navigation sidebar and main content canvas.
  - Verified frontend production build (`npm run build` in 1.78s).
- Phase 4 documentation:
  - `docs/learning/phase-4_projects_backlog_concepts.md` (Fibonacci, LexoRank, DoD, sequential keys in Hinglish).
  - `docs/decisions/phase-4_decisions.md` (ADRs 011-014).
  - `docs/phase-reports/phase-4_completion.md`.

## [0.3.0] - 2026-11-19 - Phase 3: Workspaces & Multi-Tenancy Isolation
### Added
- Enterprise Multi-Tenancy modular app: `apps.workspaces`.
- Data models:
  - `Workspace`: UUID PK, name, unique URL slug, owner FK, JSONField settings, `archived_at` soft-delete timestamp.
  - `WorkspaceMember`: UUID PK, workspace FK, user FK, RBAC role choices (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), unique together `(workspace, user)`.
  - `WorkspaceInvite`: UUID PK, email, role, SHA-256 token hash storage, 7-day expiration.
- Database migration `workspaces.0001_initial` applied to Supabase PostgreSQL 17.
- Service layer (`apps.workspaces.services`):
  - `create_workspace` (atomic transaction, auto-assigns creator as OWNER).
  - `invite_member` (cryptographic token generator, SHA-256 hash storage).
  - `accept_invite` (single-use validation, atomic join).
  - `remove_member` (last active owner protection).
  - `update_member_role` (anti-self-escalation guard).
  - `archive_workspace` & `unarchive_workspace` (soft-delete lifecycle).
- Optimized selectors with `select_related('user')` and `select_related('owner')` to eliminate N+1 queries.
- Granular DRF RBAC permission classes (`IsWorkspaceMember`, `IsWorkspaceAdminOrOwner`, `IsWorkspaceOwner`).
- 12 REST API endpoints under `/api/v1/workspaces/`.
- Automated test suite with 11 tests verifying multi-tenancy isolation and RBAC constraints (full test suite: 19/19 passing).
- Frontend Executive UI & Workspaces features:
  - Fixed scroll overlap bug: container structured as `h-screen overflow-hidden` with fixed elevated `<header>` (`z-30`) and scrollable `<main>` area (`overflow-y-auto`). Header never gets overlapped during scroll.
  - Working global `Ctrl+K` / `Cmd+K` keyboard shortcut and command palette `QuickSearchModal.tsx`.
  - Workspace Switcher dropdown in header and sidebar with role badges (`WorkspaceSwitcher.tsx`).
  - Workspace Creation Modal with real-time slug preview (`CreateWorkspaceModal.tsx`).
  - Workspace Members Modal with role badges, invite creation form, copyable invite link, and member management (`WorkspaceMembersModal.tsx`).
  - Dedicated `/join?token=...` invitation acceptance page (`JoinWorkspacePage.tsx`).
  - Reactive Zustand workspace store (`stores/workspaceStore.ts`).
  - Verified frontend production build (`npm run build` in 1.61s).
- Comprehensive Phase 3 documentation:
  - `docs/learning/phase-3_workspace_concepts.md` (Multi-Tenancy, RBAC, SHA-256 tokens, N+1 prevention in clear Hinglish).
  - `docs/decisions/phase-3_decisions.md` (ADRs 006-010).
  - `docs/phase-reports/phase-3_completion.md`.

## [0.2.0] - 2026-11-18 - Phase 1 & 2: Custom User Model & Authentication
### Added
- Enterprise `CustomUser` model inheriting `AbstractBaseUser` and `PermissionsMixin` with UUIDv4 primary keys and normalized email.
- Initial PostgreSQL migration on Supabase creating `accounts_user` table.
- SimpleJWT integration with dual-token strategy: 15-minute access token and 7-day refresh token.
- Automatic token rotation and server-side blacklisting (`rest_framework_simplejwt.token_blacklist`).
- HttpOnly, SameSite=Lax cookie storage for refresh tokens to defend against XSS.
- Service layer (`apps.accounts.services`) implementing atomic transactions, constant-time authentication, and token revocation.
- Endpoints:
  - `POST /api/v1/auth/register/`
  - `POST /api/v1/auth/login/` (with 5 req/min IP rate limiting via `django-ratelimit`)
  - `POST /api/v1/auth/refresh/`
  - `POST /api/v1/auth/logout/`
  - `GET /api/v1/auth/me/`
- Full test suite (`apps/accounts/tests/test_auth_api.py`) with 8 passing automated test cases.
- Validated OpenAPI 3.0 documentation via `drf-spectacular`.
- Frontend Executive Light Theme & Landing Page Overhaul:
  - Separate Public Landing Page (`/`) with Hero, Agile Board preview, Feature Matrix, Agile Sprint Lifecycle (`#workflow`), Enterprise Security (`#security`), and Footer (`#about`).
  - Seamless SPA Unified Auth (`AuthPage.tsx`) with in-place tab switching between Sign In and Create Account (removed split screen).
  - Fixed logout redirection to send user directly to Landing Page (`/`).
  - Dedicated Agile Command Center Dashboard (`/dashboard`) guarded by `ProtectedRoute`.
  - Manageable User Profile Modal (`ProfileModal.tsx`) for account name updates and UUID copy.
  - Full mobile responsiveness with collapsible hamburger drawer and responsive cards across all device breakpoints.
  - Professional Footer with credits: Devam Mandli (`mandlidevam9@gmail.com`, LinkedIn: `https://linkedin.com/in/devam-mandli`, GitHub: `https://github.com/devam6744`).
  - Strict zero-emoji policy: 100% professional SVG vector icons.
  - Backend CORS & Rate-Limiting optimizations (added 127.0.0.1 to allowed origins and increased limit to 30/m for smooth testing).
- 4-file documentation architecture:
  - `docs/learning/phase-1-2_auth_concepts.md`
  - `docs/decisions/phase-1-2_decisions.md`
  - `docs/phase-reports/phase-1-2_completion.md`
  - `docs/CONTEXT.md`

## [0.1.0] - 2026-11-18 - Phase 0 Setup
### Added
- Git repository initialized.
- Core architecture & SDLC documentation (`BLUEPRINT.md`, `README.md`, `AGENTS.md`, `DECISIONS.md`, `TASK.md`, `CHANGELOG.md`).
- Environment variable specifications in `.env.example`.
- Gitignore covering Python, Django, Node, and environment files.
- Project officially named **TaskFlow**.
