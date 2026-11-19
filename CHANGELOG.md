# Changelog

All notable changes to the TaskFlow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
