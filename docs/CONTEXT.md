# TaskFlow — System Architecture & Context Handoff Guide

> **Target Audience:** Any AI model, engineer, or contributor picking up development on this repository.
> **Last Updated:** Phase 6 (Collaboration, Discussion Threads, Attachments & Activity Trail)
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
│   │   ├── workspaces/        # Phase 3: Workspace, Membership, Invites, RBAC
│   │   ├── projects/          # Phase 4 & 5: Project, Sprint, WorkItem, LexoRank, DoD, Kanban, WorkItemDependency
│   │   │   ├── api/           # Serializers, Views (Sprint CRUD, Board, LexoRank), URLs
│   │   │   ├── models.py      # Project, Sprint (Single Active Invariant), WorkItem (Fibonacci, keys), WorkItemDependency
│   │   │   ├── services.py    # select_for_update atomic keys, LexoRank reorder, Sprint lifecycle & rollover, DFS Cycle Detection
│   │   │   ├── selectors.py   # Scoped project, sprint, board & backlog queries
│   │   │   ├── permissions.py # Project-level RBAC & private project isolation
│   │   │   └── tests/         # test_projects_and_backlog (7 tests), test_sprints_and_kanban (7 tests)
│   │   └── collaboration/     # Phase 6: Comments, Attachments, ActivityEvent Audit Trail
│   │       ├── api/           # Serializers, Views (Comments, Attachments, Activity, Dependencies), URLs
│   │       ├── models.py      # Comment (soft-delete), Attachment (10MB limit), ActivityEvent (polymorphic)
│   │       ├── services.py    # add_comment, upload_attachment, soft delete, activity logging
│   │       ├── selectors.py   # select_related scoped querysets
│   │       └── tests/         # test_collaboration_api (8 tests)
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
│   │   │   ├── dashboard/     # DashboardPage, Metrics, KanbanBoard (drag-and-drop & touch arrows), QuickSearch (Ctrl+K)
│   │   │   ├── landing/       # LandingPage, Hero, Features, Workflow, Security
│   │   │   ├── workspaces/    # WorkspaceSwitcher, CreateModal, MembersModal, JoinPage
│   │   │   ├── projects/      # CreateProjectModal
│   │   │   ├── sprints/       # CreateSprintModal, StartSprintModal, CompleteSprintModal
│   │   │   └── backlog/       # BacklogPage (Sprint planning & Backlog LexoRank), WorkItemDetailModal
│   │   ├── lib/
│   │   │   └── api.ts         # Axios client with 401 token refresh interceptor
│   │   ├── stores/
│   │   │   ├── authStore.ts   # Zustand in-memory auth state
│   │   │   ├── workspaceStore.ts # Zustand workspace & member state
│   │   │   ├── projectStore.ts   # Zustand projects & active project state
│   │   │   ├── backlogStore.ts   # Zustand backlog & LexoRank reorder state
│   │   │   ├── sprintStore.ts    # Zustand sprints, active sprint board & card transitions
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
| `GET` | `/api/v1/workspaces/{slug}/projects/` | List projects in workspace | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/` | Create project in workspace | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/` | Project details & DoD | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/backlog/` | Get LexoRank sorted backlog | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/backlog/` | Create work item (atomic seq key) | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/backlog/{num}/reorder/` | LexoRank O(1) fractional reorder | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/sprints/` | List project sprints | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/sprints/` | Create sprint container | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/sprints/{id}/start/` | Start sprint (Single active invariant) | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/sprints/{id}/complete/` | Complete sprint with rollover | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/sprints/{id}/cancel/` | Cancel sprint | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/board/` | Active sprint Kanban board | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/transition/` | Kanban card swimlane transition | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/comments/` | List work item discussion comments | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/comments/` | Post new comment + record activity | Yes (Member) |
| `PATCH` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/comments/{id}/` | Edit comment (author only) | Yes (Author) |
| `DELETE` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/comments/{id}/` | Soft-delete comment | Yes (Author/Admin) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/attachments/` | List file attachments | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/attachments/` | Upload file (multipart, max 10MB) | Yes (Member) |
| `DELETE` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/attachments/{id}/` | Delete attachment | Yes (Uploader/Admin) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/activity/` | Work item chronological audit trail | Yes (Member) |
| `GET` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/dependencies/` | List work item blocker dependencies | Yes (Member) |
| `POST` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/dependencies/` | Add blocker (DFS cycle detected) | Yes (Member) |
| `DELETE` | `/api/v1/workspaces/{slug}/projects/{project_slug}/items/{num}/dependencies/{id}/` | Remove blocker dependency | Yes (Member) |
| `GET` | `/api/docs/` | Swagger OpenAPI UI | No |

---

## 5. Next Planned Work (SDLC Roadmap)
- **Phase 7:** Notifications & Background Processing (In-app alerts, Celery / Redis asynchronous tasks).
- **Phase 8:** Real-Time Updates (WebSockets / Server-Sent Events for instant board card movement).
