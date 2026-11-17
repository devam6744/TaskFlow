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

## ADR-004: Frontend Baseline — React, TypeScript, Vite & Tailwind
- **Date:** 2026-11-17
- **Status:** Approved
- **Context:** Fast build times, robust typing, accessible component structure.
- **Decision:** Vite + React 18 + TypeScript + TanStack Query + Tailwind CSS + shadcn/ui.
