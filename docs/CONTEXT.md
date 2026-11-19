# TaskFlow — System Architecture & Context Handoff Guide

> **Target Audience:** Any AI model, engineer, or contributor picking up development on this repository.
> **Last Updated:** Phase 3 (Workspaces & Multi-Tenancy Isolation)
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
| **Multi-Tenancy** | Row-Level Workspace Scoping + RBAC | Owner, Admin, Member, Viewer roles |
| **Frontend Framework** | React 19 + TypeScript | Vite 8 + React 19 |
| **State & Data Fetching** | Zustand + TanStack React Query | v5 |
| **Documentation** | drf-spectacular (OpenAPI 3.0 / Swagger) | `/api/docs/` |

---

## 3. Directory Layout

```
TaskFlow/
├── backend/
│   ├── apps/
│   │   ├── accounts/          # Phase 1 & 2: CustomUser, Auth Views, JWT, Services
│   │   └── workspaces/        # Phase 3: Workspace, Membership, Invites, RBAC
│   │       ├── api/           # Serializers, Views, URLs
│   │       ├── models.py      # Workspace, WorkspaceMember, WorkspaceInvite
│   │       ├── services.py    # Atomic transactions, invite tokens, safety guards
│   │       ├── selectors.py   # Scoped queries, select_related N+1 prevention
│   │       ├── permissions.py # DRF RBAC permission classes
│   │       └── tests/         # 11 tenant isolation & RBAC tests
│   ├── config/
│   │   ├── settings/
│   │   │   └── base.py        # Django config, DB url, SimpleJWT, CORS
│   │   ├── urls.py            # Root URL routing + Swagger docs
│   │   └── wsgi.py
│   └── manage.py
├── frontend/
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/          # Unified AuthPage, ProtectedRoute
│   │   │   ├── dashboard/     # DashboardPage, Metrics, Kanban, QuickSearch (Ctrl+K)
│   │   │   ├── landing/       # LandingPage, Hero, Features, Workflow, Security
│   │   │   └── workspaces/    # WorkspaceSwitcher, CreateModal, MembersModal, JoinPage
│   │   ├── lib/
│   │   │   └── api.ts         # Axios client with 401 token refresh interceptor
│   │   ├── stores/
│   │   │   ├── authStore.ts   # Zustand in-memory auth state
│   │   │   ├── workspaceStore.ts # Zustand workspace & member state
│   │   │   └── toastStore.ts  # Notification toasts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── docs/
│   ├── learning/              # Educational deep-dives in clear Hinglish
│   ├── decisions/             # Architecture Decision Records (ADRs)
│   ├── phase-reports/         # Step-by-step milestone delivery records
│   └── CONTEXT.md             # Master context handoff
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
| `POST` | `/api/v1/auth/login/` | Authenticate + set HttpOnly refresh cookie | No (Rate-limited) |
| `POST` | `/api/v1/auth/logout/` | Blacklist refresh token + clear cookie | Yes |
| `POST` | `/api/v1/auth/refresh/` | Rotate refresh token from cookie → new tokens | No (Cookie required) |
| `GET` | `/api/v1/auth/me/` | Current authenticated user profile | Yes (Bearer token) |
| `GET` | `/api/v1/workspaces/` | List user's active workspaces | Yes |
| `POST` | `/api/v1/workspaces/` | Create workspace (creator becomes OWNER) | Yes |
| `GET` | `/api/v1/workspaces/{slug}/` | Workspace details | Yes (Member) |
| `PATCH` | `/api/v1/workspaces/{slug}/` | Update workspace name/description | Yes (Admin/Owner) |
| `POST` | `/api/v1/workspaces/{slug}/archive/` | Soft-archive workspace | Yes (Owner only) |
| `POST` | `/api/v1/workspaces/{slug}/unarchive/` | Restore archived workspace | Yes (Owner only) |
| `GET` | `/api/v1/workspaces/{slug}/members/` | List active workspace members | Yes (Member) |
| `PATCH` | `/api/v1/workspaces/{slug}/members/{id}/` | Update member role (RBAC) | Yes (Admin/Owner) |
| `DELETE` | `/api/v1/workspaces/{slug}/members/{id}/` | Remove member (last owner protected) | Yes (Admin/Owner) |
| `GET` | `/api/v1/workspaces/{slug}/invites/` | List workspace invitations | Yes (Admin/Owner) |
| `POST` | `/api/v1/workspaces/{slug}/invites/` | Generate secure invitation | Yes (Admin/Owner) |
| `DELETE` | `/api/v1/workspaces/{slug}/invites/{id}/` | Revoke invitation | Yes (Admin/Owner) |
| `POST` | `/api/v1/workspaces/invites/accept/` | Accept invitation token | Yes |
| `GET` | `/api/docs/` | Swagger OpenAPI UI | No |

---

## 5. Next Planned Work (SDLC Roadmap)
- **Phase 4:** Projects & Product Backlog (Project entity, project membership, backlog items, user stories, acceptance criteria).
- **Phase 5:** Sprint Lifecycle & Kanban Board (Sprint state machine, burndown, drag-and-drop board).
