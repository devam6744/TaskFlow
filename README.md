# TaskFlow — Enterprise Scrum & Project Management Platform

**TaskFlow** is an enterprise-grade, Scrum-oriented team collaboration and project management platform. It streamlines the entire workflow from product backlog planning, time-boxed sprint execution, Kanban boards, role-based workspace isolation to reporting and AI-assisted insights.

---

## 🚀 Key Highlights

- **Multi-Tenant Architecture:** Complete workspace and project isolation with strict role-based access control (RBAC).
- **Full Scrum Lifecycle:** Product backlog, sprint planning, atomic sprint transitions, burndown & velocity metrics.
- **Modern Tech Stack:** 
  - **Backend:** Django 5, Django REST Framework, SimpleJWT, Celery, Redis, Django Channels.
  - **Database:** Supabase Managed PostgreSQL.
  - **Frontend:** React 18, TypeScript, Vite, TanStack Query, Zustand, Tailwind CSS, shadcn/ui, @dnd-kit.
- **Enterprise Ready:** Modular monolith architecture, audited activity logs, zero data leakage across workspaces.
- **AI Assisted (v2):** Story point estimation, sprint risk prediction, and retrospective analysis powered by Google Gemini API.

---

## 📁 Repository Structure

```
taskflow/
├── backend/            # Django 5 + DRF Modular Backend
├── frontend/           # React + TypeScript + Vite Client
├── docs/               # System Architecture & API Contracts
├── .env.example        # Environment variable template
├── BLUEPRINT.md        # Single Source of Truth & Engineering Master Plan
├── AGENTS.md           # Instructions for AI & Collaborators
├── DECISIONS.md        # Architecture Decision Records (ADR)
├── TASK.md             # Active Phase Checklist & Progress
└── CHANGELOG.md        # Meaningful release notes
```

---

## 🛠️ Quick Local Setup

### 1. Prerequisites
- Python 3.12+ (or 3.14)
- Node.js 18+ (Node v24 & npm 11 verified)
- Git
- Supabase Project (PostgreSQL URI)

### 2. Environment Setup
Copy `.env.example` to `.env` and fill in your Supabase connection string:
```bash
cp .env.example .env
```

### 3. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### 4. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 Documentation

- See [BLUEPRINT.md](BLUEPRINT.md) for detailed requirements, domain models, and API specifications.
- See [TASK.md](TASK.md) for live SDLC milestone progress.
