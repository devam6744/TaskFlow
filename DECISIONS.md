# Architecture Decision Record (ADR) — TaskFlow

## ADR-001: Project Renaming to TaskFlow
- **Date:** 2026-11-17
- **Status:** Approved
- **Context:** Project renamed from TeamPulse to TaskFlow to better reflect enterprise workflow and agile lifecycle execution.
- **Decision:** All documentation, codebase references, apps, and configs use "TaskFlow".

## ADR-002: Modular Monolith Architecture
- **Date:** 2026-11-17
- **Status:** Approved
- **Context:** Deciding backend architecture for enterprise scalability and maintainability.
- **Decision:** Build as a Django modular monolith (separate app boundaries: accounts, workspaces, projects, workitems, sprints, collaboration, notifications, reporting, audit, ai). Microservices are explicitly out of initial scope.

## ADR-003: Database Engine — Supabase Managed PostgreSQL
- **Date:** 2026-11-17
- **Status:** Approved
- **Context:** Primary database selection for relational integrity, JSONB support, and managed reliability.
- **Decision:** Use Supabase Managed PostgreSQL via standard Django ORM with `dj-database-url` or `psycopg`. Backend enforces application logic and multi-tenancy.

## ADR-005: Custom User Model & Email Identity
- **Date:** 2026-11-18
- **Status:** Approved & Implemented
- **Context:** Deciding user primary identity and model extension strategy before initial migration.
- **Decision:** Subclass `AbstractBaseUser` + `PermissionsMixin` with UUIDv4 primary keys and normalized email. Full details in [phase-1-2_decisions.md](file:///c:/Users/maushmi/Desktop/DAJNGO/teampluse/docs/decisions/phase-1-2_decisions.md).

## ADR-006: Dual-Token JWT with HttpOnly Refresh Cookie
- **Date:** 2026-11-18
- **Status:** Approved & Implemented
- **Context:** Token storage and revocation mechanism for SPA.
- **Decision:** 15-minute access token in memory (Zustand) + 7-day refresh token in HttpOnly cookie with rotation and database blacklisting. Defends against both XSS and CSRF. Full details in [phase-1-2_decisions.md](file:///c:/Users/maushmi/Desktop/DAJNGO/teampluse/docs/decisions/phase-1-2_decisions.md).

