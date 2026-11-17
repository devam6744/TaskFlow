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

## 🚀 Active Milestone: Phase 1 & 2 — Custom User Model & Authentication Foundation (NEXT)
- [ ] Initialize `apps/accounts` Django app
- [ ] Implement Custom User Model (`AbstractBaseUser` with normalized email as unique identifier)
- [ ] Enforce Custom User Model in `config/settings/base.py` (`AUTH_USER_MODEL = 'accounts.User'`)
- [ ] Create initial database migration on Supabase PostgreSQL (MUST be done before any other app migrations)
- [ ] Set up JWT Authentication (SimpleJWT: short-lived access token + HttpOnly refresh cookie)
- [ ] Implement Auth API endpoints:
  - `POST /api/v1/auth/register/`
  - `POST /api/v1/auth/login/`
  - `POST /api/v1/auth/logout/`
  - `POST /api/v1/auth/refresh/`
  - `GET /api/v1/me/`
- [ ] Write backend automated tests for authentication and negative authorization cases
- [ ] Set up frontend TanStack Query + Axios interceptor + Auth Context

---

## 📅 Upcoming Phases
- **Phase 3: Workspace & Multi-Tenancy Isolation**
- **Phase 4: Projects & Product Backlog**
- **Phase 5: Sprint Lifecycle & Kanban Board**
- **Phase 6: Collaboration & Attachments**
- **Phase 7: Notifications & Background Processing**
- **Phase 8: Real-Time Updates**
- **Phase 9: Sprint Reports & Global Search**
- **Phase 10: Release Hardening & Deployment**
- **Phase v2: Enterprise AI & Integrations**
