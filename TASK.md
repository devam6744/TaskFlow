# TaskFlow — SDLC Milestones & Active Task Tracker

## 🏁 Phase 0: Project Setup & Repository Baseline (IN PROGRESS)
- [x] Check installed developer tools (Python, Node, Git, Docker)
- [x] Git repository initialization
- [x] Standard repository documentation (`README.md`, `AGENTS.md`, `DECISIONS.md`, `CHANGELOG.md`, `TASK.md`)
- [x] Root `.gitignore` and `.env.example`
- [ ] Connect remote GitHub repository
- [ ] Connect Supabase PostgreSQL database
- [ ] Backend skeleton initialization (Django 5 + DRF structure)
- [ ] Frontend skeleton initialization (Vite + React + TypeScript + Tailwind)

---

## 📅 Upcoming Phases

- **Phase 1: Project Foundation & Health Verification**
  - Django base/dev/prod settings, database connection test, `/api/v1/health/` endpoint
  - Frontend router, layout shell, base API client
- **Phase 2: Authentication & Account Management**
  - Custom User model (Email-based identity)
  - JWT auth (Access in body, Refresh in HttpOnly cookie)
  - Protected API guards & Login/Register UI
- **Phase 3: Workspace & Multi-Tenancy Isolation**
  - Workspace, Membership, Roles (Owner, Admin, Member)
  - Cryptographic invitation tokens & acceptance
  - Cross-tenant negative isolation tests
- **Phase 4: Projects & Product Backlog**
  - Project management with workspace visibility
  - Work items (Stories, Tasks, Bugs) with priorities, estimates, acceptance criteria
- **Phase 5: Sprint Lifecycle & Kanban Board**
  - Atomic sprint transitions (`select_for_update`), drag-and-drop board
- **Phase 6: Collaboration & Attachments**
  - Comments, @mentions, activity timeline, secure signed-URL attachments
- **Phase 7: Notifications & Background Processing**
  - Celery worker, async notification dispatch, email delivery
- **Phase 8: Real-Time Updates**
  - Django Channels WebSocket layer
- **Phase 9: Sprint Reports & Global Search**
  - Burndown charts, velocity tracking, full-text search
- **Phase 10: Release Hardening & Deployment**
  - Security audit, Sentry, CI/CD pipeline, Vercel/Railway deployment
- **Phase v2: Enterprise AI & Integrations**
  - Story point estimation, sprint risk predictor, GitHub integration
