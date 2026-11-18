# TaskFlow — System Architecture & Context Handoff Guide

> **Target Audience:** Any AI model, engineer, or contributor picking up development on this repository.
> **Last Updated:** Phase 1 & 2 (Custom User Model & Authentication)
> **Single Source of Truth:** Refer to [BLUEPRINT.md](file:///c:/Users/maushmi/Desktop/DAJNGO/teampluse/BLUEPRINT.md) for full architectural specs.

---

## 1. Project Mission & Overview
**TaskFlow** is an enterprise-grade Agile Project Management & Scrum system (comparable to Jira / Linear / Asana) designed with a clean **Modular Monolith** backend (Django 5 + Django REST Framework + PostgreSQL) and a responsive, high-performance Single Page Application (React 19 + TypeScript + Vite + Tailwind CSS).

---

## 2. Active Tech Stack

| Layer | Technology | Version / Configuration |
|---|---|---|
| **Language & Runtime** | Python (Backend) / Node.js (Frontend) | Python 3.14 / Node 24 |
| **Backend Framework** | Django + Django REST Framework | Django 5.1 / DRF 3.15 |
| **Database** | PostgreSQL (Supabase Hosted) | PostgreSQL 17.12 |
| **Auth & Security** | SimpleJWT + HttpOnly Cookies + Blacklist | Access (15m) + Refresh (7d) with rotation |
| **Frontend Framework** | React 19 + TypeScript | Vite 8 + React 19 |
| **State & Data Fetching** | Zustand + TanStack React Query | v5 |
| **Documentation** | drf-spectacular (OpenAPI 3.0 / Swagger) | `/api/docs/` |

---

## 3. Directory Layout

```
TaskFlow/
├── backend/
│   ├── apps/
│   │   └── accounts/          # Phase 1 & 2: CustomUser, Auth Views, JWT, Services
│   │       ├── api/           # Serializers, Views, URLs
│   │       ├── models.py      # CustomUser (UUID PK, Email unique)
│   │       ├── services.py    # Atomic user creation, login, token issue/revoke
│   │       └── tests/         # Pytest auth test suite
│   ├── config/
│   │   ├── settings/
│   │   │   └── base.py        # Django config, DB url, SimpleJWT, CORS, ratelimit
│   │   ├── urls.py            # Root URL routing + Swagger docs
│   │   └── wsgi.py
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   └── auth/          # LoginPage, RegisterPage, ProtectedRoute
│   │   ├── lib/
│   │   │   └── api.ts         # Axios client with 401 token refresh interceptor
│   │   ├── stores/
│   │   │   └── authStore.ts   # Zustand in-memory auth state
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docs/
│   ├── learning/              # Educational deep-dives in clear language
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── phase-reports/         # Step-by-step milestone delivery records
│   └── CONTEXT.md             # This file
├── BLUEPRINT.md               # Master system blueprint (Source of Truth)
├── TASK.md                    # Active SDLC progress checklist
└── CHANGELOG.md               # Version log
```

---

## 4. Current Implemented Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health/` | Service & Supabase DB health check | No |
| `POST` | `/api/v1/auth/register/` | Register user + issue JWT tokens | No |
| `POST` | `/api/v1/auth/login/` | Authenticate + set HttpOnly refresh cookie | No (Rate-limited: 5/min) |
| `POST` | `/api/v1/auth/logout/` | Blacklist refresh token + clear cookie | Yes |
| `POST` | `/api/v1/auth/refresh/` | Rotate refresh token from cookie → new tokens | No (Cookie required) |
| `GET` | `/api/v1/auth/me/` | Current authenticated user profile | Yes (Bearer token) |
| `GET` | `/api/docs/` | Swagger OpenAPI UI | No |

---

## 5. Next Planned Work (SDLC Roadmap)
- **Phase 3:** Workspaces & Multi-Tenancy (Workspace, WorkspaceMember, RBAC permissions, Workspace isolation).
- **Phase 4:** Projects & Workflows (Project entity, custom workflows, task status states).
- **Phase 5:** WorkItems & Sprints (Hierarchical tasks, sprint lifecycle, state machine).
