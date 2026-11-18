# Changelog

All notable changes to the TaskFlow project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Frontend auth shell & Enterprise UI:
  - Complete redesign with Tailwind CSS v4 and Lucide React icons.
  - Split-screen enterprise `AuthLayout` with ambient gradients and live sprint ticket preview.
  - Interactive password strength meter in `RegisterPage`.
  - Password visibility toggle and 1-click demo login in `LoginPage`.
  - Global `ToastContainer` with animated slide-up alerts.
  - Enterprise `DashboardPage` with agile sidebar, KPI metrics cards, interactive Sprint Kanban board, and 1-click UUID copy.
  - In-memory Zustand auth store (zero secrets in localStorage).
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
