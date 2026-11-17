# TeamPulse — Product, System Design & Engineering Blueprint

**Document type:** Single source of truth for product requirements, system design, architecture, security, implementation and AI coding-agent execution\
**Product:** TeamPulse\
**Version:** 2.0 — Enterprise Edition Blueprint\
**Status:** Approved baseline; update this document when an important decision changes.\
**Last Updated:** 2026-11-17

---

## 0. Instructions for the AI Coding Agent

Treat this document as the primary source of truth for what TeamPulse is and how it should be built.

### Mandatory working rules

1. **Understand before editing.** Inspect the existing repository, identify what already exists, and summarize the current structure before making changes.
2. **Work in small, reviewable phases.** Do not generate the entire application in one pass. Implement one milestone at a time, run its tests, report changed files and explain the result.
3. **Do not invent product features.** If a requirement is unclear, state the assumption and choose the simplest safe implementation. Ask the owner when the decision materially changes product behavior, security, data model or cost.
4. **Keep this document current.** If an approved decision changes, update this blueprint and `DECISIONS.md`. Never silently contradict it.
5. **No fake functionality.** Do not leave buttons that appear to work but do nothing. Use explicit loading, empty, success and error states.
6. **Security is part of every feature.** Never rely on frontend checks alone. Enforce authentication, authorization, workspace isolation and validation on the backend.
7. **Tests are required.** New backend behavior needs tests. Especially test permissions, cross-workspace access, invalid state transitions and important failure paths.
8. **Use migrations.** Every database schema change must have a migration. Do not edit production data manually to compensate for missing migrations.
9. **Secrets stay secret.** Never commit API keys, OAuth secrets, database passwords, signing keys or production environment files. Keep `.env.example` free of real secrets.
10. **No unnecessary complexity.** Start with a modular monolith. Do not introduce microservices, Kubernetes, Kafka or other infrastructure without a demonstrated requirement.
11. **No destructive commands without approval.** Do not reset a database, delete user data, force-push, or overwrite user work without explicit permission.
12. **Verify rather than claim.** Run the available checks and report exactly what passed, failed, or could not be run.
13. **Explain as you build.** For each milestone, briefly explain the concepts used, why they are needed, important trade-offs and how to test the feature manually.
14. **Keep changes scoped.** Do not reformat or rewrite unrelated files. Follow the repository's existing conventions unless there is a documented reason to change them.
15. **Do not claim full production readiness** until the deployment, security, recovery, monitoring and operational checks in this document have actually been completed.

### Required response after every milestone

- What was implemented
- Main files changed and why
- Database/API changes
- Security considerations
- Commands and tests run, with actual results
- Manual verification steps
- Known gaps or risks
- The next smallest recommended task

### Repository working documents

Maintain these files in the repository:

- `README.md` — product overview, features, setup and screenshots/demo.
- `AGENTS.md` — concise coding rules and pointers to this blueprint.
- `TASK.md` — current milestone, checklist and next task.
- `DECISIONS.md` — dated architecture/product decisions and reasons.
- `CHANGELOG.md` — meaningful user-facing changes.
- `.env.example` — variable names and safe placeholders only.
- `BLUEPRINT.md` — this file. The single source of truth.

---

# Part I — Product Definition

## 1. What is TeamPulse?

TeamPulse is a web-based, enterprise-grade team and project management platform focused on Scrum-style software development workflows. It helps teams plan projects, break work into manageable items, organize work into time-boxed sprints, assign responsibility, share updates, surface blockers, and review delivery progress.

It is intended for college project teams, software developers, freelancers, small organizations, and growing engineering teams. It should be simple enough for a small team to adopt while demonstrating strong software engineering practices behind the scenes.

**Version 1 (Core)** delivers the full Scrum workflow. **Version 2 (Enterprise)** adds AI-powered features, advanced analytics, integrations, and enterprise-grade controls.

TeamPulse is **not only a Kanban board**. It connects the workflow from product backlog to sprint planning, daily execution, review and retrospective — with AI assistance and deep analytics on top.

### The problem it solves

Teams often scatter work across chats, spreadsheets and separate task lists. This makes it hard to answer:

- What work is planned for this project?
- What is the goal of the current sprint?
- Who owns each task?
- What is blocked, overdue or awaiting review?
- What changed, and who changed it?
- How much planned work was completed?
- What should the team improve in the next sprint?
- **Is our sprint at risk of failing?** *(AI-powered, v2)*
- **How much effort will this story actually take?** *(AI-powered, v2)*
- **What patterns are slowing our team down?** *(AI analytics, v2)*

TeamPulse provides one shared source of truth for those answers.

### Product value

1. **Clarity:** everyone can see priorities, ownership, status and deadlines.
2. **Coordination:** work and discussions stay connected to the relevant project/task.
3. **Visibility:** teams can identify blockers and sprint progress early.
4. **Accountability without surveillance:** record work events and commitments, not hidden employee monitoring.
5. **Learning:** teams can review delivery patterns and improve their process over time.
6. **Intelligence (v2):** AI surfaces risks, estimates, and improvement opportunities automatically.

## 2. Product goals and non-goals

### Goals for v1 (Core)

- Support multiple users and multiple workspaces.
- Keep each workspace's private data isolated from other workspaces.
- Allow a workspace to manage members, roles and invitations.
- Support projects, a product backlog, sprints and tasks.
- Support sprint planning and a controlled sprint lifecycle.
- Let team members update work, discuss tasks and report blockers.
- Provide notifications and useful progress reports.
- Provide search, filtering and pagination for growing datasets.
- Demonstrate secure API design, automated testing, CI/CD and deployment.

### Goals for v2 (Enterprise/AI)

- **AI Sprint Risk Predictor** — alert teams when sprint overload or failure risk is detected.
- **AI Story Point Estimator** — suggest story points based on historical sprint data and task description.
- **AI Retrospective Assistant** — automatically identify patterns (e.g., recurring bugs, estimate drift).
- **Natural Language Task Creation** — parse plain English into a structured work item.
- **Advanced Analytics** — Cumulative Flow Diagram, Cycle Time, Lead Time, Predictive Delivery.
- **GitHub/GitLab Integration** — link PRs to tasks, auto-update task status on PR merge.
- **Webhook System** — teams can subscribe to workspace events (Zapier-compatible).
- **Time Tracking** — work logs, sprint time vs estimate comparison.
- **Progressive Web App (PWA)** — offline support, push notifications, mobile install.
- **Enterprise SSO** — SAML 2.0 / LDAP for enterprise organizations.
- **Two-Factor Authentication (2FA)** — TOTP enforcement per workspace.
- **Multi-language (i18n)** — Hindi and English at minimum.

### Non-goals for v1

Do not build these as part of the initial release:

- Full Slack/Discord-style chat or video meetings.
- Native Android/iOS applications.
- Payroll, HR, attendance or employee surveillance.
- Complex enterprise billing/subscription management.
- A public marketplace for projects or teams.
- Microservices or Kubernetes.
- A full issue-tracking ecosystem comparable to every feature in Jira/Linear.
- Time tracking unless explicitly approved as a later feature.
- External code execution or CI runners.

These are v2 or later scope. They must not delay the core product.

## 3. Primary users and roles

### Workspace Owner

Creates the workspace, manages workspace settings and members, can transfer ownership, and can archive/delete the workspace subject to clear safeguards.

### Workspace Admin

Manages members and workspace-level settings within the permissions granted by the product. Admins do not automatically gain access to unrelated workspaces.

### Member

Works on projects they can access, manages permitted tasks, comments, reports blockers and collaborates with the team.

### Project responsibility

For v1, project access should be explicit. Workspace membership alone should not automatically mean that every member can access every private project. The product must support project-level membership or an explicitly configured workspace-wide visibility policy. Recommended baseline: projects are visible to workspace members by default, with project-level restrictions supported for private projects.

### Product/Scrum responsibility

A team may designate a person as Product Owner or Scrum Master within project settings for clarity. These are project responsibilities, not automatically privileged security roles. Do not treat a Scrum title as an admin permission.

## 4. Core concepts in plain language

- **Workspace:** a team's private area.
- **Project:** a body of work with a goal and timeline.
- **Product Backlog:** prioritized work that might be done in the future.
- **Backlog Item / User Story:** a piece of desired product value, often written from a user's perspective.
- **Task:** a specific unit of work. A backlog item may have tasks/subtasks when needed.
- **Sprint:** a fixed time-box, usually one to two weeks, during which the team aims to achieve a Sprint Goal.
- **Sprint Backlog:** the selected backlog items and plan for the current sprint.
- **Story Points:** an optional relative estimate of effort/complexity; not hours and not a direct productivity score.
- **Acceptance Criteria:** conditions that must be met for a backlog item to be accepted.
- **Blocker:** an issue preventing progress.
- **Definition of Done:** shared completion criteria configured by the team.
- **Sprint Review:** inspect the outcome/increment with relevant stakeholders.
- **Retrospective:** reflect on how the team worked and choose improvements.
- **Burndown:** remaining estimated work over sprint time.
- **Velocity:** amount of estimated work completed per sprint; use as a planning aid, not an employee performance ranking.
- **Sprint Risk Score (v2 AI):** an AI-computed score (0–100) indicating the likelihood of sprint failure based on scope, velocity, and team load.
- **AI Estimate (v2 AI):** a story-point suggestion generated by the AI module, presented as a recommendation, not an override.

---

# Part II — Functional Requirements and User Journeys

## 5. Main user journey

1. User registers or signs in.
2. User creates a workspace or accepts an invitation.
3. Workspace owner invites team members.
4. Team creates a project and defines its goal and settings.
5. Team adds backlog items, descriptions, priorities and acceptance criteria.
6. **(v2 AI)** Team requests AI story point estimates for backlog items.
7. Team creates a sprint, defines a Sprint Goal and start/end dates.
8. During sprint planning, the team selects backlog items and estimates them if desired.
9. **(v2 AI)** AI Sprint Risk Predictor evaluates the sprint plan and shows a risk score.
10. Sprint starts; its selected work is tracked on a board.
11. Members update task status, add comments, mention teammates and report blockers.
12. TeamPulse records relevant activity and delivers notifications.
13. Dashboard shows progress, overdue work and remaining sprint scope.
14. **(v2)** GitHub PRs linked to tasks update task status automatically.
15. At sprint end, the team reviews completed/incomplete work, records review notes and retrospective actions, then closes the sprint.
16. **(v2 AI)** AI Retrospective Assistant surfaces patterns from the sprint data.
17. Incomplete items are explicitly returned to the backlog or moved into a future sprint; they are not silently marked complete.
18. Reports let the team inspect historical sprint outcomes.
19. **(v2)** Advanced analytics show Cycle Time, CFD, and velocity trends over time.

## 6. Authentication and account

### Required behavior

- Sign up and sign in.
- Sign out and invalidate the relevant session/refresh token.
- Password reset using a verified, expiring flow if password auth is enabled.
- Optional Google OAuth sign-in (v1).
- **(v2)** Two-Factor Authentication (TOTP) — enforced per workspace policy.
- **(v2)** Enterprise SSO via SAML 2.0 / LDAP.
- View/edit safe profile fields.
- Change password or manage linked sign-in methods where supported.
- Handle expired sessions gracefully.
- Do not reveal whether an arbitrary email address is registered in sensitive authentication responses.
- Provide account deletion/export policy before claiming those capabilities.

### Authentication design guidance

Use Django's authentication primitives and a maintained OAuth integration. Use JWT with short-lived access tokens (15 minutes) and refresh tokens stored in HttpOnly, Secure, SameSite=Strict cookies. Do not store long-lived tokens in `localStorage`. Protect cookie-authenticated state-changing requests against CSRF. Configure CORS to allow only approved frontend origins.

Do not implement custom cryptography or invent a token format.

## 7. Workspace, membership and invitation

- Create, rename and archive a workspace.
- Show workspaces the current user belongs to.
- Invite a person by email.
- Invitation has a cryptographically random token, expiry, status and intended workspace/role.
- Store a hash of the invitation token; never log the raw token.
- Accept or revoke an invitation.
- Prevent duplicate active invitations for the same workspace/email.
- Prevent a user from escalating their own role.
- Protect owner transfer and workspace deletion with explicit confirmation.
- When membership is revoked, access should stop immediately on subsequent requests.
- Invitations must not reveal workspace details to unauthorized users.

## 8. Project management

- Create, edit, archive and view projects.
- Store name, description, status, owner/creator, dates and project settings.
- Manage project members where private projects are supported.
- Set project goal, Definition of Done and optional Scrum responsibilities.
- Provide a project overview with backlog, active sprint, members and activity.
- Archive projects without breaking historical sprint reports.
- Use soft deletion/archive for important business entities when recovery/history matters.

## 9. Product backlog and backlog items

Each backlog item should support:

- Title and detailed description.
- Type: Story, Task, Bug or Improvement.
- Priority.
- Status.
- Acceptance criteria.
- Optional story-point estimate.
- **(v2 AI)** AI-suggested story point estimate (displayed alongside manual estimate).
- Reporter/creator and optional assignee.
- Labels.
- Optional due date.
- Ordering/priority within the backlog.
- Comments and activity history.
- Sprint assignment when selected for a sprint.

Use clear distinction between a **backlog item** and a **subtask**. The initial data model represents the primary work item as a WorkItem with an optional parent and optional sprint association, with rules documented and consistently enforced.

## 10. Sprint management

### Sprint fields

- Project
- Name or sequence number
- Sprint Goal
- Planned start date and end date
- Status: Planned, Active, Completed, Cancelled
- Start/finish timestamps
- Planned scope snapshot or auditable scope-change events
- Review notes and retrospective records
- **(v2 AI)** Sprint Risk Score (0–100) and risk factors breakdown

### Sprint rules

- A project can have at most one active sprint in v1.
- End date must be after start date.
- Starting a sprint requires a goal and valid date range.
- Only authorized project members can change sprint scope or lifecycle.
- Starting, completing and cancelling a sprint must use backend validation and atomic database operations.
- Do not silently move work when closing a sprint.
- Incomplete work must be explicitly returned to backlog or moved into another planned sprint.
- Completed sprint history must remain available.
- Editing sprint dates after it has started should be restricted and recorded.
- Prevent duplicate concurrent starts using database constraints/transactions.
- If a sprint is completed, its work and historical metrics must remain queryable.
- Scope changes after sprint start should be recorded so reports can distinguish original plan from later additions/removals.

## 11. Task board and workflow

Recommended default statuses:

- Backlog
- To Do
- In Progress
- In Review
- Done
- Blocked (may be a separate flag rather than a workflow status)

Task features:

- Assign one primary assignee.
- Set priority, estimate, due date and labels.
- Add subtasks.
- Add dependencies such as "blocked by".
- Move cards between valid statuses.
- Drag-and-drop must update the backend and handle failures by reverting the UI or refreshing authoritative data.
- Support filters: assignee, status, priority, label, sprint, due date and type.
- Use optimistic UI only where rollback behavior is implemented.
- A task marked Done should satisfy the project's Definition of Done.

## 12. Collaboration

- Comments attached to work items.
- Edit/delete own comments under documented rules; moderation actions are permission-controlled and audited.
- Mentions using `@username` or an explicit member picker.
- Task activity timeline for important events.
- Attachments with size/type restrictions and private access.
- No full standalone chat in v1.

For attachments, use private object storage and short-lived signed URLs or equivalent controlled access. Validate file size and allowed types, do not trust the browser-provided MIME type alone.

## 13. Notifications and background work

Notification triggers:

- Workspace invitation.
- Task assigned or reassigned.
- Mention in a comment.
- Status change for watched/assigned work.
- Deadline reminder.
- Overdue task.
- Sprint starting/ending.
- Membership or role change when relevant.
- **(v2 AI)** Sprint risk score crosses threshold (e.g., risk > 70).
- **(v2)** GitHub PR linked, merged or review requested on a connected task.

Requirements:

- In-app notification list with read/unread state.
- Mark one/all as read.
- User preferences for non-essential notifications.
- Avoid sending duplicate emails for retried jobs.
- Keep email delivery outside the main request path using Celery.
- Retry transient failures with bounded retries and backoff.
- Do not retry permanent failures indefinitely.
- Scheduled reminders must be idempotent.

## 14. Real-time updates

- Use normal REST APIs as the source of truth.
- WebSockets via Django Channels broadcast task/status/notification updates to authorized workspace/project participants.
- Authenticate the socket connection.
- Check authorization for each subscribed workspace/project.
- Never trust a client-supplied workspace ID as proof of access.
- Avoid leaking events to another tenant.
- Reconnect safely and refresh state after reconnect.
- If WebSockets are unavailable, the core app remains usable through normal API requests.

## 15. Dashboard, reporting and search

### Dashboard

- My assigned open tasks.
- Upcoming and overdue tasks.
- Active sprint summary.
- Project progress.
- Blocked items.
- Recent activity.
- Workload distribution.
- **(v2 AI)** Sprint risk score widget with key risk factors.

### Sprint reports

- Planned versus completed story points, if estimates are used.
- Planned scope compared with final scope.
- Completed and incomplete items.
- Burndown based on consistent rules and recorded estimates.
- Historical velocity as a team planning indicator only.
- Review notes and retrospective actions.
- **(v2 AI)** AI-generated retrospective summary and pattern highlights.

### Advanced analytics (v2)

- **Cumulative Flow Diagram (CFD):** work item count per status over time.
- **Cycle Time:** average time from "In Progress" to "Done" per item type.
- **Lead Time:** average time from creation to "Done".
- **Predictive Delivery:** estimated completion date based on velocity history.
- **Team Capacity vs Load:** planned story points vs historical capacity per sprint.
- Exportable reports as PDF and CSV.

### Search

- Search projects and work items within the user's authorized scope.
- Filter, sort and paginate on the server.
- Do not fetch all records and filter only in the browser.
- Use PostgreSQL full-text search (`SearchVector`) with indexes.
- Escape/parameterize search input through ORM/query APIs; never concatenate raw SQL from user input.

## 16. AI Features — v2 (Full Specification)

> **Important:** AI features are v2 scope. Do not block v1 on them. Design the data model to accommodate them from the start (no schema-breaking changes in v2).

### A. AI Story Point Estimator

**What it does:** When a user creates or edits a backlog item, they can click "Get AI Estimate". The AI analyzes:
- The item's title and description.
- Historical completed work items in the same project (similar titles, actual story points).
- The project's average velocity.

**Output:** A suggested story point value (1, 2, 3, 5, 8, 13) with a brief explanation ("Similar to 'User login form' which was 3 points").

**Implementation:**
- Backend: `POST /api/v2/work-items/{id}/ai-estimate/`
- Use Gemini API (or OpenAI) with a prompt template that includes item description + historical context.
- Store the AI suggestion in `WorkItem.ai_suggested_points` (nullable integer).
- User still manually sets `WorkItem.story_points` — AI is advisory only.
- Log AI calls in `AIRequestLog` model for cost monitoring and debugging.

**Rules:**
- AI estimate is a suggestion. The user must accept or ignore it.
- Never automatically set story points from AI without user confirmation.
- Degrade gracefully if AI API is unavailable (show "AI unavailable" message).
- Rate-limit AI calls per workspace (e.g., 100 calls/day on free tier).

### B. AI Sprint Risk Predictor

**What it does:** When a sprint is in "Planned" or "Active" state, the system computes a Sprint Risk Score (0–100) based on:
- Total story points committed vs team's historical velocity.
- Number of blocked items.
- Percentage of items without assignees.
- Sprint duration vs number of items.
- Days remaining vs remaining points (burn rate).
- Number of unresolved dependencies.

**Output:** A risk score with color coding (0–30: green, 31–60: yellow, 61–100: red) and a list of specific risk factors:
- "Committed 45 points but average velocity is 28."
- "5 items have no assignee."
- "3 blocked items with no unblock date."

**Implementation:**
- Backend service: `sprint_risk_service.calculate_risk(sprint_id)` — pure Python, no AI API needed for v1 of this feature (rule-based calculation).
- v2 upgrade: use Gemini API for natural language risk summary.
- `Sprint.risk_score` field (integer, nullable, updated on scope change and daily via Celery beat).
- `GET /api/v2/sprints/{id}/risk/` returns score, factors, and recommendations.
- Dashboard widget shows risk score badge on active sprint card.

**Rules:**
- Risk score is recalculated on: sprint start, work item added/removed, work item status change, assignee change.
- Never block sprint operations based on risk score — it is advisory only.
- Store risk calculation history in `SprintRiskSnapshot` model for trend analysis.

### C. AI Retrospective Assistant

**What it does:** After sprint completion, an authorized user can click "Generate AI Retrospective Insights". The AI analyzes:
- Items completed vs not completed.
- Blockers reported during the sprint.
- Estimate accuracy (AI suggested vs actual story points).
- Recurring item types (e.g., "30% of items were bugs this sprint vs 10% last sprint").
- Comments mentioning blockers or issues.

**Output:** A structured retrospective summary with:
- What went well (inferred from on-time, low-blocker items).
- What could be improved (inferred from overdue, blocked, or unfinished items).
- Pattern alerts (e.g., "Bug count has increased 3 sprints in a row").
- Suggested action items (optional, user editable).

**Implementation:**
- Backend: `POST /api/v2/sprints/{id}/ai-retrospective/`
- Gather sprint data, build a structured prompt, call Gemini API.
- Store result in `SprintReview.ai_retrospective_text` (text field).
- User can edit/override the AI output before saving.
- Log AI call in `AIRequestLog`.

**Rules:**
- AI retrospective is generated on demand, not automatically.
- It supplements human retrospective discussion, never replaces it.
- Raw AI output is never shown as "TeamPulse's official assessment."
- Label all AI-generated content clearly in the UI with an AI badge.

### D. Natural Language Task Creation

**What it does:** User types in a natural language box: *"Create a bug for the login page where users are getting a 500 error when they click forgot password"*

The AI parses this into:
- Title: "Login page - 500 error on forgot password"
- Type: Bug
- Priority: High (inferred from "500 error")
- Description: (expanded from input)

**Implementation:**
- Backend: `POST /api/v2/projects/{id}/work-items/from-text/`
- Call Gemini API with structured output (JSON mode).
- Return a prefilled work item form — user reviews and submits manually.
- Never auto-create a work item without user confirmation.

### E. AI Request Log Model

Track all AI API calls for cost management and debugging:

```
AIRequestLog:
  - id (UUID)
  - workspace_id (FK)
  - user_id (FK)
  - feature (enum: ESTIMATE, RISK, RETRO, NL_TASK)
  - model_used (string)
  - tokens_used (integer)
  - cost_usd (decimal, estimated)
  - latency_ms (integer)
  - status (SUCCESS, FAILED, RATE_LIMITED)
  - created_at
```

## 17. GitHub/GitLab Integration (v2)

### What it does

Links pull requests and commits to work items. When a PR is merged, the linked task is automatically moved to "In Review" or "Done" based on PR keywords.

### Implementation

- Workspace settings: connect GitHub organization via OAuth app or PAT.
- `GitHubIntegration` model: workspace, access_token (encrypted), organization.
- `WorkItemGitLink` model: work_item, provider, repo, pr_number, pr_url, status.
- Webhook endpoint: `POST /api/v2/webhooks/github/` — receives GitHub webhook events.
- PR body/title keywords: `Closes #TASK-123`, `Fixes TP-456` → auto-link.
- PR merged → task transitions to "In Review" (or "Done" if keyword is "Closes").
- Display linked PRs on work item detail with PR status (open, merged, closed).

### Security

- Validate webhook signature (GitHub HMAC-SHA256 `X-Hub-Signature-256` header).
- Access tokens stored encrypted at rest.
- Never expose integration tokens to frontend.

## 18. Webhook System (v2)

Teams can register webhook URLs to receive TeamPulse events (similar to GitHub webhooks):

- `WorkspaceWebhook` model: workspace, url, secret_hash, events (array), active.
- Supported events: `work_item.created`, `work_item.status_changed`, `sprint.started`, `sprint.completed`, `member.invited`, etc.
- Delivery: Celery task sends HTTP POST to registered URL with HMAC-SHA256 signature.
- Retry up to 3 times with exponential backoff on failure.
- Delivery log per webhook call (status, response code, timestamp).
- Admin UI to view delivery history and redeliver failed events.

## 19. Time Tracking (v2)

- `WorkLog` model: work_item, user, started_at, ended_at, duration_seconds, description.
- Start/stop timer per task (or manual log entry).
- Weekly timesheet view per member.
- Sprint time vs estimate comparison report.
- Billable hours export (CSV) for freelancer use case.
- Time tracking is opt-in per workspace (toggled in workspace settings).

---

# Part III — System Design

## 20. High-level architecture

Recommended initial architecture: **modular monolith**.

```
Browser
  |
  | HTTPS
  v
React + TypeScript + Vite
  |
  | REST/JSON + WebSocket (Django Channels)
  v
Django + Django REST Framework (ASGI via Daphne)
  |
  +-- accounts/          Identity & Authentication
  +-- workspaces/        Workspace, Membership, Invitation
  +-- projects/          Project, ProjectMembership
  +-- workitems/         WorkItem, Label, Dependency
  +-- sprints/           Sprint, SprintReview, RetroAction
  +-- collaboration/     Comment, Attachment, ActivityEvent
  +-- notifications/     Notification, Celery tasks
  +-- reporting/         Reports, Dashboard queries, Analytics
  +-- audit/             AuditEvent
  +-- ai/                AI feature services (v2)
  +-- integrations/      GitHub, Webhooks (v2)
  |
  +-- PostgreSQL (Supabase managed)
  +-- Redis (Celery broker + Django Channels layer)
  +-- Private object storage (Supabase Storage, attachments)
  +-- Celery worker + beat (background jobs, email, reminders)
  +-- Email provider (SendGrid or Resend)
  +-- Gemini API (AI features, v2)
```

A modular monolith means one backend deployment with clearly separated domain modules. It keeps development, deployment and debugging manageable while maintaining boundaries that could support future extraction if justified.

### Why not microservices initially?

- The product and usage level are not yet proven.
- Microservices add networking, deployment, tracing and data consistency overhead.
- Most v1 work is better served by transactions across a single relational database.
- Strong module boundaries and tests provide maintainability without distributed-system complexity.

## 21. Technology stack (Final Decision)

### Frontend

| Library | Purpose |
|---|---|
| React 18 + TypeScript | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| TanStack Query | Server state management |
| Zustand | UI/client state |
| Tailwind CSS | Styling |
| shadcn/ui | Component library (accessible, unstyled base) |
| React Hook Form + Zod | Forms and schema validation |
| @dnd-kit | Accessible drag-and-drop for Kanban |
| Recharts | Charts for reports/analytics |
| Vitest + React Testing Library | Unit/component tests |
| Playwright | End-to-end tests |

### Backend

| Library | Purpose |
|---|---|
| Python 3.12 | Language |
| Django 5.x | Web framework |
| Django REST Framework | API layer |
| SimpleJWT | JWT auth (access + refresh tokens) |
| Django Channels + Daphne | WebSocket / ASGI |
| Celery + Redis | Background jobs and scheduling |
| drf-spectacular | OpenAPI documentation |
| django-axes | Login rate limiting and brute force protection |
| django-ratelimit | Per-endpoint rate limiting |
| Pytest + pytest-django + factory-boy | Testing |
| coverage.py | Test coverage |
| Black + isort + ruff | Code formatting and linting |
| google-generativeai | Gemini API SDK (v2 AI features) |

### Infrastructure and services

| Service | Purpose |
|---|---|
| PostgreSQL 16 (Supabase) | Primary database |
| Redis 7 (Upstash) | Celery broker + Django Channels layer |
| Supabase Storage | Private file attachments + signed URLs |
| SendGrid or Resend | Transactional email |
| Vercel | Frontend static hosting |
| Railway or Render | Backend + Celery worker hosting |
| GitHub Actions | CI/CD (lint, test, build, deploy) |
| Sentry | Error monitoring (backend + frontend) |
| Docker + Docker Compose | Local development environment |
| Gemini API (Google) | AI features (v2) |

## 22. Request lifecycle

For a normal task update:

1. Browser sends HTTPS request with the user's access token.
2. Django authenticates the caller (JWT or session).
3. Serializer validates request shape and field values.
4. Permission/service layer verifies workspace membership, project access and allowed operation.
5. Business rules validate the state transition.
6. A database transaction updates the work item and writes an audit/activity event.
7. Relevant notification/job records are created transactionally where possible.
8. API returns a documented response.
9. Frontend updates the UI; if the request fails, it shows a useful error and restores stale optimistic state.
10. Real-time events notify authorized collaborators after the database transaction commits (via `transaction.on_commit`).

Do not publish a real-time event before the database transaction commits.

## 23. Backend module boundaries

A recommended organization per Django app:

```
apps/<module>/
  ├── api/
  │   ├── views.py        # ViewSets and API controllers
  │   ├── serializers.py  # Input/output serializers
  │   └── urls.py         # URL routing
  ├── services.py         # Business operations and transaction boundaries
  ├── selectors.py        # Reusable read/query logic
  ├── models.py           # Django ORM models
  ├── permissions.py      # Reusable DRF permission classes
  ├── tasks.py            # Celery task definitions
  └── tests/
      ├── test_models.py
      ├── test_services.py
      ├── test_api.py
      └── test_permissions.py
```

---

# Part IV — Initial Data Model

## 24. Entity overview

```
User 1---M Membership M---1 Workspace
Workspace 1---M Invitation
Workspace 1---M Project
Project M---M User (ProjectMembership)
Project 1---M Sprint
Project 1---M WorkItem
Sprint 1---M WorkItem (optional sprint association)
WorkItem 1---M WorkItem (parent/subtask, optional)
WorkItem M---M WorkItem (dependency relation, through WorkItemDependency)
WorkItem 1---M Comment
WorkItem 1---M Attachment
WorkItem 1---M ActivityEvent
User 1---M Notification
Workspace 1---M AuditEvent
Sprint 1---M SprintReview
Sprint 1---M SprintRiskSnapshot (v2)
Workspace 1---M GitHubIntegration (v2)
WorkItem 1---M WorkItemGitLink (v2)
Workspace 1---M WorkspaceWebhook (v2)
WorkItem 1---M WorkLog (v2 time tracking)
Workspace 1---M AIRequestLog (v2)
```

## 25. Suggested model fields

### User

- `id` — UUID, primary key
- `email` — unique, normalized (lowercase)
- `display_name` — string
- `avatar_url` — string, nullable
- `is_active` — boolean
- `created_at`, `updated_at` — timestamps

> Use Django's custom `AbstractBaseUser` from the beginning with email as the username field. Do not switch user model after the first migration.

### Workspace

- `id` — UUID
- `name` — string
- `slug` — unique stable identifier
- `owner` — FK to User
- `settings` — JSONField (small, flexible workspace settings only)
- `created_at`, `updated_at`, `archived_at` — timestamps

### Membership

- `id` — UUID
- `workspace` — FK
- `user` — FK
- `role` — enum: owner, admin, member
- `status` — enum: active, suspended
- `joined_at` — timestamp
- Unique constraint: `(workspace_id, user_id)`

### Invitation

- `id` — UUID
- `workspace` — FK
- `email` — string
- `role` — enum
- `token_hash` — string, unique (store hash, never raw token)
- `invited_by` — FK to User
- `expires_at` — timestamp
- `status` — enum: pending, accepted, revoked, expired
- `created_at` — timestamp

### Project

- `id` — UUID
- `workspace` — FK
- `name`, `description` — strings
- `status` — enum: active, archived
- `visibility` — enum: workspace (default), private
- `created_by` — FK to User
- `start_date`, `target_date` — dates, nullable
- `definition_of_done` — text, nullable
- `settings` — JSONField (Scrum role labels, etc.)
- `created_at`, `updated_at`, `archived_at` — timestamps

### ProjectMembership

- `project` — FK
- `user` — FK
- `role` — string, nullable (project-level role label)
- `created_at` — timestamp
- Unique constraint: `(project_id, user_id)`

### Sprint

- `id` — UUID
- `project` — FK
- `name` — string (e.g., "Sprint 1" or custom name)
- `goal` — text
- `start_date`, `end_date` — dates
- `status` — enum: planned, active, completed, cancelled
- `started_at`, `completed_at` — timestamps, nullable
- `created_by` — FK to User
- `risk_score` — integer 0–100, nullable (v2)
- `created_at`, `updated_at` — timestamps

### WorkItem

- `id` — UUID
- `project` — FK
- `parent` — FK to self, nullable (subtask)
- `sprint` — FK to Sprint, nullable
- `type` — enum: story, task, bug, improvement
- `title` — string (max 500 chars)
- `description` — text, nullable
- `status` — enum: backlog, todo, in_progress, in_review, done, blocked
- `priority` — enum: critical, high, medium, low
- `story_points` — integer, nullable
- `ai_suggested_points` — integer, nullable (v2)
- `reporter` — FK to User
- `assignee` — FK to User, nullable
- `acceptance_criteria` — text, nullable
- `due_date` — date, nullable
- `backlog_order` — integer (for manual ordering)
- `version` — integer (optimistic locking)
- `created_at`, `updated_at`, `archived_at` — timestamps

### WorkItemDependency

- `blocking_item` — FK to WorkItem
- `blocked_item` — FK to WorkItem
- `dependency_type` — enum: blocks (default)
- Unique constraint: `(blocking_item_id, blocked_item_id)`
- Check constraint: `blocking_item_id != blocked_item_id`
- Cycle detection in service logic

### Comment

- `id` — UUID
- `work_item` — FK
- `author` — FK to User
- `body` — text
- `created_at`, `updated_at`, `deleted_at` — timestamps

### Attachment

- `id` — UUID
- `work_item` — FK
- `uploader` — FK to User
- `storage_key` — string (private storage key, never a public URL)
- `original_filename` — string (sanitized for display)
- `content_type` — string (server-verified)
- `size_bytes` — integer
- `created_at` — timestamp

### ActivityEvent

- `id` — UUID
- `workspace` — FK
- `actor` — FK to User, nullable (system events)
- `object_type` — string (e.g., "WorkItem", "Sprint")
- `object_id` — UUID
- `event_type` — string (e.g., "status_changed", "comment_added")
- `metadata` — JSONField (minimal, no sensitive data)
- `created_at` — timestamp

### Notification

- `id` — UUID
- `recipient` — FK to User
- `workspace` — FK, nullable
- `event_type` — string
- `payload` — JSONField (reference to target object, minimal)
- `read_at` — timestamp, nullable
- `email_sent_at` — timestamp, nullable
- `email_status` — string, nullable
- `created_at` — timestamp

### AuditEvent

- `id` — UUID
- `workspace` — FK
- `actor` — FK to User, nullable
- `object_type` — string
- `object_id` — UUID
- `event_type` — string
- `metadata` — JSONField
- `request_id` — string (correlation)
- `created_at` — timestamp

> Never store passwords, tokens, or sensitive secrets in event metadata.

### SprintReview

- `id` — UUID
- `sprint` — FK (one-to-one)
- `review_summary` — text
- `retro_observations` — text
- `ai_retrospective_text` — text, nullable (v2)
- `created_at`, `updated_at` — timestamps

### RetrospectiveAction

- `id` — UUID
- `sprint` — FK
- `description` — text
- `owner` — FK to User, nullable
- `status` — enum: open, done
- `created_at`, `updated_at` — timestamps

### SprintScopeEvent (scope change tracking)

- `id` — UUID
- `sprint` — FK
- `work_item` — FK
- `event_type` — enum: added, removed
- `actor` — FK to User
- `created_at` — timestamp

### AIRequestLog (v2)

- `id` — UUID
- `workspace` — FK
- `user` — FK
- `feature` — enum: estimate, risk, retrospective, nl_task
- `model_used` — string
- `tokens_used` — integer
- `cost_usd` — decimal
- `latency_ms` — integer
- `status` — enum: success, failed, rate_limited
- `created_at` — timestamp

### GitHubIntegration (v2)

- `id` — UUID
- `workspace` — FK
- `provider` — enum: github, gitlab
- `access_token_encrypted` — text
- `organization` — string
- `created_at` — timestamp

### WorkItemGitLink (v2)

- `id` — UUID
- `work_item` — FK
- `provider` — enum: github, gitlab
- `repo` — string
- `pr_number` — integer
- `pr_url` — string
- `pr_status` — enum: open, merged, closed
- `created_at`, `updated_at` — timestamps

### WorkspaceWebhook (v2)

- `id` — UUID
- `workspace` — FK
- `url` — string
- `secret_hash` — string
- `events` — ArrayField
- `active` — boolean
- `created_at` — timestamp

### WorkLog (v2 — Time Tracking)

- `id` — UUID
- `work_item` — FK
- `user` — FK
- `started_at`, `ended_at` — timestamps
- `duration_seconds` — integer
- `description` — text, nullable
- `created_at` — timestamp

## 26. Database constraints and indexing

Evaluate indexes/constraints for:

- Unique membership per workspace/user.
- Unique project membership per project/user.
- Unique invitation token hash.
- Work item lookups by project, status, assignee, sprint and due date.
- Sprint lookups by project and status.
- Notifications by recipient and created/read state.
- Activity history by workspace/object and timestamp.
- Case-normalized email uniqueness.
- Valid date ranges and allowed enum values.
- Referential integrity for workspace/project/sprint relationships.
- Full-text search index on `WorkItem(title, description)` using `SearchVector`.

---

# Part V — API Design

## 27. API conventions

- Prefix v1 endpoints with `/api/v1/`.
- Prefix v2 (AI + integrations) endpoints with `/api/v2/`.
- Use JSON for standard request/response bodies.
- Use consistent naming and documented status codes.
- Validate all request data server-side.
- Paginate collections (default page size: 20, max: 100).
- Support explicit filtering and ordering.
- Return stable error shapes without stack traces or internal secrets.
- Use appropriate HTTP verbs and idempotency for retry-sensitive actions.
- Generate and maintain OpenAPI documentation via drf-spectacular.
- Avoid exposing internal model fields by default.

Standard error shape:

```json
{
  "error": {
    "code": "permission_denied",
    "message": "You do not have permission to perform this action.",
    "request_id": "req_abc123xyz"
  }
}
```

## 28. Endpoint reference

### Authentication and profile

```
POST   /api/v1/auth/register/
POST   /api/v1/auth/login/
POST   /api/v1/auth/logout/
POST   /api/v1/auth/refresh/
POST   /api/v1/auth/password-reset/
POST   /api/v1/auth/password-reset/confirm/
GET    /api/v1/auth/google/           (OAuth redirect)
GET    /api/v1/auth/google/callback/  (OAuth callback)
GET    /api/v1/me/
PATCH  /api/v1/me/
```

### Workspaces and members

```
GET    /api/v1/workspaces/
POST   /api/v1/workspaces/
GET    /api/v1/workspaces/{workspace_id}/
PATCH  /api/v1/workspaces/{workspace_id}/
POST   /api/v1/workspaces/{workspace_id}/archive/
GET    /api/v1/workspaces/{workspace_id}/members/
PATCH  /api/v1/workspaces/{workspace_id}/members/{membership_id}/
DELETE /api/v1/workspaces/{workspace_id}/members/{membership_id}/
POST   /api/v1/workspaces/{workspace_id}/invitations/
POST   /api/v1/invitations/{token}/accept/
POST   /api/v1/invitations/{invitation_id}/revoke/
```

### Projects

```
GET    /api/v1/workspaces/{workspace_id}/projects/
POST   /api/v1/workspaces/{workspace_id}/projects/
GET    /api/v1/projects/{project_id}/
PATCH  /api/v1/projects/{project_id}/
POST   /api/v1/projects/{project_id}/archive/
GET    /api/v1/projects/{project_id}/members/
PATCH  /api/v1/projects/{project_id}/members/
```

### Work items

```
GET    /api/v1/projects/{project_id}/work-items/
POST   /api/v1/projects/{project_id}/work-items/
GET    /api/v1/work-items/{work_item_id}/
PATCH  /api/v1/work-items/{work_item_id}/
POST   /api/v1/work-items/{work_item_id}/transition/
POST   /api/v1/work-items/{work_item_id}/comments/
GET    /api/v1/work-items/{work_item_id}/activity/
POST   /api/v1/work-items/{work_item_id}/attachments/
GET    /api/v1/work-items/{work_item_id}/attachments/{attachment_id}/download/
POST   /api/v1/work-items/{work_item_id}/dependencies/
DELETE /api/v1/work-items/{work_item_id}/dependencies/{dependency_id}/
POST   /api/v1/projects/{project_id}/work-items/reorder/
```

### Sprints

```
GET    /api/v1/projects/{project_id}/sprints/
POST   /api/v1/projects/{project_id}/sprints/
GET    /api/v1/sprints/{sprint_id}/
PATCH  /api/v1/sprints/{sprint_id}/
POST   /api/v1/sprints/{sprint_id}/start/
POST   /api/v1/sprints/{sprint_id}/complete/
POST   /api/v1/sprints/{sprint_id}/cancel/
GET    /api/v1/sprints/{sprint_id}/report/
POST   /api/v1/sprints/{sprint_id}/retrospective-actions/
PATCH  /api/v1/sprints/{sprint_id}/retrospective-actions/{action_id}/
```

### Notifications, search and reports

```
GET    /api/v1/notifications/
POST   /api/v1/notifications/{notification_id}/read/
POST   /api/v1/notifications/read-all/
GET    /api/v1/search/?q=&scope=workspace&type=work_item
GET    /api/v1/projects/{project_id}/reports/overview/
GET    /api/v1/projects/{project_id}/reports/sprints/
GET    /api/v1/projects/{project_id}/reports/velocity/
GET    /api/v1/health/
```

### v2 AI endpoints

```
POST   /api/v2/work-items/{id}/ai-estimate/
GET    /api/v2/sprints/{id}/risk/
POST   /api/v2/sprints/{id}/ai-retrospective/
POST   /api/v2/projects/{id}/work-items/from-text/
GET    /api/v2/projects/{id}/reports/analytics/
GET    /api/v2/projects/{id}/reports/cycle-time/
GET    /api/v2/projects/{id}/reports/cfd/
```

### v2 integration endpoints

```
GET    /api/v2/workspaces/{id}/integrations/github/
POST   /api/v2/workspaces/{id}/integrations/github/connect/
DELETE /api/v2/workspaces/{id}/integrations/github/
POST   /api/v2/webhooks/github/           (inbound GitHub webhook)
GET    /api/v2/workspaces/{id}/webhooks/
POST   /api/v2/workspaces/{id}/webhooks/
DELETE /api/v2/workspaces/{id}/webhooks/{webhook_id}/
GET    /api/v2/work-items/{id}/git-links/
POST   /api/v2/work-items/{id}/git-links/
```

---

# Part VI — Security Requirements

## 29. Security principles

1. Deny by default.
2. Enforce authorization on the server for every protected object.
3. Treat all client input as untrusted.
4. Keep secrets and credentials out of source control and logs.
5. Use maintained security libraries rather than custom cryptography.
6. Minimize stored personal data.
7. Record important administrative/security events.
8. Make safe behavior the default.
9. Test negative cases, not just successful flows.
10. Reassess security before public launch.

## 30. Authentication and session security

- Use Django's established password hashing (PBKDF2 — do not change).
- Enforce minimum password length (8 characters) and common password check.
- Apply rate limits: login (5/minute/IP), register (10/hour/IP), reset (3/hour/IP).
- Avoid account enumeration in authentication responses.
- Access tokens: short-lived (15 minutes), stored in memory on frontend.
- Refresh tokens: 7 days, stored in HttpOnly Secure SameSite=Strict cookie.
- Configure CSRF protection for all cookie-authenticated state-changing requests.
- Configure CORS: explicit allowlist, never wildcard with credentials.
- Do not put tokens in URLs or logs.
- Rotate refresh token on use (token rotation).
- Blacklist refresh tokens on logout using SimpleJWT's token blacklist.

## 31. Authorization and multi-tenant isolation

This is one of the most important parts of TeamPulse.

- Every workspace-scoped request must verify current membership and required role.
- Every project/task/sprint request must verify access through the owning workspace/project.
- Never trust a `workspace_id`, `project_id`, `user_id`, role or owner field supplied by the client without checking it.
- Querysets must be scoped to resources the current user can access before fetching or mutating.
- Do not expose one workspace's records through list, detail, search, report, notification, attachment or WebSocket endpoints.
- Users must not change their own role or assign themselves elevated privileges.
- Project-level restrictions must be applied consistently to reports, search, comments, files and real-time events.
- Return a consistent 404 or 403 policy for inaccessible resources.
- **Test two or more users in different workspaces and attempt cross-tenant access for every major resource type.**
- Revoking membership must remove access on subsequent requests and live WebSocket subscriptions.

## 32. Input validation and injection protection

- Use DRF serializers for all incoming API data.
- Use Django ORM or parameterized queries; never interpolate untrusted input into SQL.
- Render user-provided descriptions/comments as safely sanitized Markdown; prevent stored XSS.
- Validate URL schemes and external links if links are supported.
- Limit request body size (20MB max) and field lengths.
- Validate file size (max 10MB per attachment) and allowed content types: pdf, png, jpg, gif, zip, txt, md, docx.
- Do not trust client-provided filename or MIME type; verify server-side.
- Normalize emails and identifiers consistently.
- Enforce allowed state transitions and date ranges server-side.

## 33. Rate limiting and abuse controls

| Endpoint | Limit |
|---|---|
| POST `/auth/login/` | 5 per minute per IP |
| POST `/auth/register/` | 10 per hour per IP |
| POST `/auth/password-reset/` | 3 per hour per IP |
| POST `/workspaces/{id}/invitations/` | 20 per hour per workspace |
| POST `/work-items/{id}/comments/` | 60 per hour per user |
| GET `/search/` | 30 per minute per user |
| POST `/v2/*/ai-*` | 100 per day per workspace |

Return `429 Too Many Requests` with `Retry-After` header. Use Redis-backed counters for distributed deployments.

## 34. File upload security

- Private storage by default (no public bucket access).
- Enforce maximum size (10MB) and allowed content types server-side.
- Do not trust client-provided filename or MIME type.
- Sanitize displayed filenames.
- Use short-lived signed URLs (15 minutes) for downloads after permission check.
- Avoid executing or rendering uploaded HTML/SVG inline on the application origin.
- Log access failures without leaking private storage paths.

## 35. Audit, privacy and data retention

- Record: role changes, membership removal, ownership transfer, project archive, sprint lifecycle, workspace deletion, AI feature usage.
- Keep audit logs read-only to normal members.
- Do not log passwords, session tokens, OAuth codes, or private attachment URLs.
- Document how archived/deleted records are retained and removed.
- Minimize personal data stored. Provide a clear privacy statement before public launch.

## 36. Security verification checklist

Before public release, test:

- [ ] Anonymous access to every protected endpoint → 401.
- [ ] User A attempting to access User B's workspace data → 403 or 404.
- [ ] Workspace A user attempting to access Workspace B resources → 403 or 404.
- [ ] Member attempting an admin-only action → 403.
- [ ] User attempting to set their own role → 403.
- [ ] Expired, revoked, reused and malformed invitation tokens → 400.
- [ ] Expired/revoked authentication credentials → 401.
- [ ] CSRF attack on cookie-authenticated endpoint → 403.
- [ ] CORS from an unapproved origin → blocked.
- [ ] Stored XSS in comments/project descriptions → sanitized.
- [ ] SQL injection in search/filter fields → no effect.
- [ ] Oversized/invalid file uploads → 400.
- [ ] Unauthorized file downloads → 403.
- [ ] Rate-limit behavior → 429.
- [ ] Concurrent sprint start requests → only one succeeds.
- [ ] WebSocket events do not cross workspace boundaries.
- [ ] AI endpoints respect workspace rate limits.
- [ ] GitHub webhook with invalid signature → 400.
- [ ] Secret scanning passes (no hardcoded keys).
- [ ] Dependency vulnerability check passes (`pip-audit`, `npm audit`).

---

# Part VII — Reliability, Performance and Observability

## 37. Error handling

- Return stable machine-readable error codes.
- Show user-friendly frontend messages.
- Keep stack traces server-side only.
- Attach a request/correlation ID to logs and error responses.
- Handle database/network/provider failures without corrupting state.
- Do not report an operation as successful until the backend confirms it.

## 38. Transactions and concurrency

Use database transactions for operations that change multiple related records:

- Starting/completing a sprint and recording its event (use `select_for_update`).
- Accepting an invitation and creating membership.
- Removing membership and recording an audit event.
- Updating work item state and creating an activity record.
- Creating notification records tied to a business event.
- Sprint risk score update on scope change.

## 39. Performance

- Paginate lists (default 20 items, max 100).
- Filter/sort on the backend.
- Use `select_related`/`prefetch_related` to avoid N+1 queries.
- Use `EXPLAIN ANALYZE` to verify query plans on realistic data.
- Add indexes based on measured access patterns (see Section 26).
- Use Celery for email and slow non-critical work.
- Cache expensive AI response results with a short TTL (e.g., sprint risk score: 5 minutes).
- Set reasonable API timeouts and upload limits.

## 40. Observability

- Structured application logs with timestamps and request IDs.
- Sentry for error monitoring (backend + frontend, scrub PII).
- `GET /api/v1/health/` endpoint that checks DB + Redis connectivity.
- Celery task monitoring (track failures, retries, queue depth).
- AI request logging via `AIRequestLog` model (cost and latency tracking).
- Alert on: 5xx error rate spike, Celery queue backup, DB connection saturation.

---

# Part VIII — Frontend Experience and Accessibility

## 41. Main screens

1. Sign up / sign in / password recovery.
2. Workspace selector and workspace creation.
3. Main dashboard (with AI risk widget in v2).
4. Project list and project overview.
5. Product backlog (with AI estimate button in v2).
6. Sprint planning screen (with AI risk preview in v2).
7. Active sprint board (Kanban, drag-and-drop).
8. Work-item detail drawer/page (with AI estimate, git links in v2).
9. Sprint report, review and retrospective (with AI insights in v2).
10. Team members and invitations.
11. Notifications.
12. Search and saved views.
13. Profile and workspace settings.
14. Audit history for authorized roles.
15. **(v2)** Advanced analytics dashboard (CFD, Cycle Time, Velocity).
16. **(v2)** Integration settings (GitHub connect, Webhooks).
17. **(v2)** AI usage dashboard (token usage, cost per workspace).

## 42. UX requirements

- Responsive layout for desktop, tablet and mobile widths.
- Clear loading, empty, success, validation and error states for every action.
- Accessible labels, keyboard navigation and visible focus indicators.
- Kanban drag-and-drop must have a keyboard-accessible alternative.
- Confirm destructive/high-impact actions with a dialog.
- Warn about unsaved changes before navigation.
- Avoid unnecessary full-page reloads.
- Provide clear feedback when a network request fails.
- Do not rely on color alone to communicate priority/status (use icons + text).
- Respect reduced-motion preferences (`prefers-reduced-motion`).
- Use consistent date/time/timezone behavior.
- **AI features:** label all AI-generated content with an AI badge. Never present AI output as authoritative fact. Always allow the user to dismiss or override.
- Do not expose UI controls to unauthorized users as the only security measure.

---

# Part IX — Testing Strategy

## 43. Testing layers

### Unit tests

Test isolated business rules: sprint date validation, transition rules, permission helpers, report calculations, AI estimate parsing, sprint risk calculation.

### API integration tests

Test endpoints with a real test database and authenticated users. Verify validation, response codes, transactions and data ownership.

### Security/authorization tests

Create users in separate workspaces and test cross-tenant access for every major resource group. Include negative tests for role escalation and revoked memberships.

### Frontend tests

Test forms, task state rendering, filters, error handling, permissions-based UI, optimistic-update rollback, and AI feature UI states.

### End-to-end tests (Playwright)

Cover the critical path:
1. Register/login.
2. Create workspace.
3. Invite/join a member.
4. Create project and backlog item.
5. Create/start sprint.
6. Move task through workflow.
7. Comment and receive notification.
8. Complete sprint and view report.
9. Verify a different workspace cannot access those records.
10. **(v2)** Request AI estimate and verify UI shows suggestion.
11. **(v2)** View sprint risk score on planning screen.

### CI checks

- Formatting/linting (ruff, black, ESLint, Prettier).
- Static type checks (mypy, TypeScript).
- Backend tests (pytest with coverage ≥ 80%).
- Frontend tests (Vitest).
- E2E tests (Playwright on staging).
- Dependency/security checks (`pip-audit`, `npm audit`).
- Migration consistency check (`--check` flag).
- Secret scanning (gitleaks).

## 44. Definition of Done for a feature

A feature is not done until:

- Its acceptance criteria are satisfied.
- Backend validation and authorization are implemented.
- Tests cover success, invalid input and permission failures.
- Migrations are included if the schema changed.
- Loading/error/empty UI states exist.
- API documentation is updated.
- No secrets or sensitive data are exposed.
- Relevant lint/type/test/build checks pass.
- Manual verification steps are documented.
- Known limitations are recorded.

---

# Part X — Development and Delivery Roadmap

## 45. Phase overview and timeline

| Phase | Name | Duration | Exit Criteria |
|---|---|---|---|
| 0 | Repository & Decision Setup | 1 week | Repo documented, stack locked, local env runnable |
| 1 | Project Foundation | 1 week | Health endpoint live, CI green, local dev working |
| 2 | Authentication & Account | 1.5 weeks | Protected APIs reject anonymous, token lifecycle tested |
| 3 | Workspace & Membership | 1.5 weeks | Cross-tenant isolation verified, invitation flow working |
| 4 | Projects & Backlog | 2 weeks | Backlog CRUD with pagination/filter and permission tests |
| 5 | Sprint Lifecycle & Task Board | 2 weeks | Atomic sprint transitions, Kanban board, incomplete-item handling |
| 6 | Collaboration & Attachments | 1.5 weeks | Comments, mentions, attachments, activity timeline |
| 7 | Notifications & Background Jobs | 1.5 weeks | Idempotent Celery jobs, in-app + email notifications |
| 8 | Real-time (WebSocket) | 1.5 weeks | Authorized live updates, cross-tenant isolation |
| 9 | Reports, Search & Dashboard | 1.5 weeks | Burndown, velocity, permission-scoped search |
| 10 | Release Hardening | 2 weeks | Full security checklist, staging deploy, monitoring |
| **v2** | **AI Features** | 3 weeks | Story estimator, risk predictor, retro assistant, NL task |
| **v2** | **GitHub Integration** | 2 weeks | PR linking, webhook, auto status update |
| **v2** | **Advanced Analytics** | 2 weeks | CFD, Cycle Time, Lead Time, predictive delivery |

---

## Phase 0 — Repository & Decision Setup

**Deliverables:**
- [ ] Git repository initialized with branch protection rules.
- [ ] `README.md`, `AGENTS.md`, `TASK.md`, `DECISIONS.md`, `CHANGELOG.md` created.
- [ ] `BLUEPRINT.md` (this file) committed to repository root.
- [ ] `.env.example` with all required variable names, no real values.
- [ ] Stack decisions finalized and documented in `DECISIONS.md`.
- [ ] ER diagram reviewed and approved.
- [ ] API contracts templated for auth + workspace endpoints.
- [ ] `docker-compose.yml` for local PostgreSQL + Redis.
- [ ] GitHub Actions CI skeleton.

**Exit criteria:** A new developer can read `README.md`, understand the product and architecture, and understand how to set up local environment.

---

## Phase 1 — Project Foundation

**Deliverables:**
- [ ] `django-admin startproject config .` inside `backend/`.
- [ ] Django apps created (all 9 — see architecture section).
- [ ] PostgreSQL connected via `DATABASE_URL` (dev uses Docker Compose).
- [ ] Settings split: `base.py`, `development.py`, `test.py`, `production.py`.
- [ ] `GET /api/v1/health/` returns `{"status": "ok", "db": "ok", "redis": "ok"}`.
- [ ] Black + isort + ruff configured and passing.
- [ ] Pytest + pytest-django configured; first smoke test passing.
- [ ] `npm create vite@latest frontend -- --template react-ts` initialized.
- [ ] Tailwind CSS + shadcn/ui configured.
- [ ] React Router v6 configured with placeholder routes.
- [ ] TanStack Query `QueryClient` provider set up.
- [ ] Axios instance with base URL and interceptors.
- [ ] ESLint + Prettier configured and passing.
- [ ] Vitest configured; first frontend smoke test passing.
- [ ] GitHub Actions CI: lint + backend test + frontend build — all green.

**Exit criteria:** `docker-compose up` starts everything. Health endpoint returns 200. CI passes.

---

## Phase 2 — Authentication & Account

**Deliverables:**
- [ ] **Custom User Model** — `AbstractBaseUser` with email as username. This migration must be the first migration. Do not use Django's default user model.
- [ ] `POST /api/v1/auth/register/` — validate email, hash password, return access token + set refresh cookie.
- [ ] `POST /api/v1/auth/login/` — return access token + set HttpOnly refresh cookie.
- [ ] `POST /api/v1/auth/logout/` — blacklist refresh token, clear cookie.
- [ ] `POST /api/v1/auth/refresh/` — validate refresh cookie, return new access token.
- [ ] `POST /api/v1/auth/password-reset/` + `/confirm/` — expiring secure token (store hash).
- [ ] Google OAuth integration (optional — document in DECISIONS.md if deferred).
- [ ] `GET/PATCH /api/v1/me/` — profile view/update.
- [ ] Rate limits on all auth endpoints.
- [ ] CORS config: only frontend origin allowed with credentials.
- [ ] CSRF protection for cookie-authenticated routes.
- [ ] Authentication tests: register, login, logout, expired token, wrong password, rate limit hit.
- [ ] Login page, register page, password reset pages.
- [ ] Auth context with Zustand; Axios interceptor for token refresh.
- [ ] Protected route component (redirect to login if unauthenticated).

**Exit criteria:** Protected APIs reject unauthenticated requests with 401. Token refresh cycle documented and tested.

---

## Phase 3 — Workspace & Membership

> **This phase has the highest security importance.** Multi-tenant isolation is the backbone of TeamPulse.

**Deliverables:**
- [ ] `Workspace`, `Membership`, `Invitation` models with all fields and constraints.
- [ ] Permission helpers: `is_workspace_member()`, `is_workspace_admin()`, `is_workspace_owner()`.
- [ ] Workspace-scoped querysets — every query must filter by membership before returning data.
- [ ] API: Create, list, get, update workspace.
- [ ] API: List, update, remove members (role change with self-escalation prevention).
- [ ] API: Send invitation (rate limited, email queued), accept invitation, revoke invitation.
- [ ] Invitation: 32-byte cryptographically secure token (store SHA-256 hash), 7-day expiry.
- [ ] Invitation acceptance: atomic (create membership + mark invitation accepted in one transaction).
- [ ] Email placeholder for invitation (send via Celery in Phase 7; log to console in this phase).
- [ ] Cross-tenant negative tests:
  - [ ] User A cannot GET Workspace B's details → 403 or 404.
  - [ ] User A cannot list Workspace B's members → 403 or 404.
  - [ ] User A cannot create a project in Workspace B → 403.
  - [ ] Member cannot change their own role → 403.
  - [ ] Expired invitation rejected → 400.
  - [ ] Revoked member's next request rejected → 403.
- [ ] Workspace selector / switcher UI.
- [ ] Create workspace modal with slug suggestion.
- [ ] Members page: list, role badge, remove member with confirmation dialog.
- [ ] Invite by email modal with pending invitation list.
- [ ] Invitation accept page (token read from URL path, never logged).

**Exit criteria:** All cross-tenant negative tests pass. Invitation flow works end-to-end.

---

## Phase 4 — Projects & Backlog

**Deliverables:**
- [ ] `Project`, `ProjectMembership`, `WorkItem`, `Label`, `WorkItemDependency` models.
- [ ] Project visibility logic: workspace-visible (default) vs private.
- [ ] API: Project CRUD, archive, member management.
- [ ] API: WorkItem CRUD with all fields, paginated/filtered list.
- [ ] API: WorkItem transition endpoint (status change with backend validation).
- [ ] API: Backlog reorder endpoint (bulk order update).
- [ ] API: WorkItem dependency add/remove (with cycle detection).
- [ ] Server-side search + filter: by status, priority, assignee, sprint, type, label, due date.
- [ ] Pagination: cursor-based or offset (document choice; cursor recommended for large datasets).
- [ ] Permission tests: unauthorized users cannot read/write items from other projects.
- [ ] Project list page and project overview page.
- [ ] Work item creation modal with all fields.
- [ ] Backlog page: list with filters, priority indicators, drag-to-reorder.
- [ ] Work item detail drawer (slide-out from right).
- [ ] Labels management (create, assign, filter by).

**Exit criteria:** Authorized users can manage a project's backlog. Pagination, filters, and dependency cycles all tested.

---

## Phase 5 — Sprint Lifecycle & Task Board

**Deliverables:**
- [ ] `Sprint`, `SprintScopeEvent`, `SprintRiskSnapshot` models.
- [ ] Sprint service (`sprint_service.py`):
  - `start_sprint(sprint_id, actor)` — atomic, uses `select_for_update`, validates one-active-sprint rule.
  - `complete_sprint(sprint_id, actor, incomplete_item_resolution)` — handle incomplete items explicitly.
  - `cancel_sprint(sprint_id, actor)` — atomic, record cancellation audit event.
- [ ] API: Sprint CRUD, start, complete, cancel, scope endpoint.
- [ ] SprintScopeEvent created when items are added/removed after sprint start.
- [ ] Concurrency test: two simultaneous `start` requests → only one succeeds, second gets 409.
- [ ] Sprint planning page: drag backlog items into sprint, set sprint goal.
- [ ] Sprint start confirmation dialog (shows risk summary in v2).
- [ ] **Kanban Board** with `@dnd-kit`:
  - 5 columns: To Do, In Progress, In Review, Done, Blocked.
  - Drag card → `POST /transition/` → optimistic update → rollback on failure.
  - Keyboard alternative: status dropdown on card.
  - Filters: assignee, label, priority, type.
- [ ] Sprint complete dialog: show incomplete items, let user choose: return to backlog or move to sprint.
- [ ] Sprint history list page.

**Exit criteria:** Invalid sprint transitions rejected. Concurrency test passes. Incomplete items explicitly handled.

---

## Phase 6 — Collaboration & Attachments

**Deliverables:**
- [ ] `Comment`, `Attachment`, `ActivityEvent` models.
- [ ] Comment CRUD: create, edit own, soft-delete own. Admin can remove any.
- [ ] `@mention` parsing service: extract `@username` from comment body → return mention list → trigger notifications in Phase 7.
- [ ] ActivityEvent created for: status change, assignee change, comment added, attachment added, sprint assigned/removed.
- [ ] Attachment upload: validate type + size server-side → store in Supabase Storage → store `storage_key` only.
- [ ] Attachment download: re-generate 15-minute signed URL after permission check → return redirect or URL.
- [ ] Security tests:
  - [ ] User from different workspace cannot read comments → 403.
  - [ ] User cannot download attachment from inaccessible project → 403.
  - [ ] XSS in comment body is sanitized → no `<script>` execution.
- [ ] Comment thread component on work item detail.
- [ ] Simple Markdown preview for comment body.
- [ ] @mention picker dropdown (shows workspace members).
- [ ] Activity timeline component on work item detail.
- [ ] File attachment area: drag/drop + button upload, attachment list with download link.

**Exit criteria:** Collaboration data follows same workspace/project permission rules as parent object.

---

## Phase 7 — Notifications & Background Jobs

**Deliverables:**
- [ ] Celery + Redis set up. Celery worker and Celery beat configured.
- [ ] `Notification` model with delivery tracking fields.
- [ ] Notification triggers (via `transaction.on_commit` → Celery task):
  - Task assigned → notify assignee.
  - @mentioned in comment → notify mentioned user.
  - Sprint starting → notify project members.
  - Invitation sent → email via Celery (real email, not console).
  - Overdue task → daily Celery beat job (`check_overdue_tasks`).
- [ ] Idempotency: Celery tasks accept a unique `idempotency_key`; duplicate job skipped.
- [ ] Retry policy: max 3 retries, exponential backoff (60s, 120s, 240s). Permanent failure → mark `FAILED`, do not retry.
- [ ] Email templates: HTML + plain text for invitation and notification emails.
- [ ] `NotificationPreference` model: user can mute non-essential notification types per workspace.
- [ ] API: list notifications, mark read, mark all read.
- [ ] In-app notification bell with unread count badge.
- [ ] Notification dropdown list (last 20 unread).
- [ ] Notification settings page.

**Exit criteria:** Retrying a Celery job does not create duplicate emails. Notifications appear for correct triggers.

---

## Phase 8 — Real-time Collaboration

**Deliverables:**
- [ ] Django Channels installed; `asgi.py` configured with `AuthMiddlewareStack`.
- [ ] Redis channel layer configured.
- [ ] `WorkspaceConsumer`:
  - Authenticate on `websocket_connect` — validate JWT from query param `?token=`.
  - Join group: `workspace_{workspace_id}`.
  - On disconnect: leave group.
  - Broadcast events: `task_updated`, `comment_added`, `notification_created`.
- [ ] All broadcasts fired via `transaction.on_commit` callback.
- [ ] WebSocket client hook: `useWebSocket(workspaceId)` with auto-reconnect (exponential backoff).
- [ ] On reconnect: fetch latest data via REST (invalidate TanStack Query cache).
- [ ] **Isolation test:** Workspace A's WebSocket events do NOT arrive at Workspace B's clients.
- [ ] REST fallback: app remains fully functional without WebSocket connection.
- [ ] Connection status indicator in header (connected / reconnecting / offline).

**Exit criteria:** Only authorized users receive events. App usable without WebSockets. Isolation test passes.

---

## Phase 9 — Reports, Search & Dashboard

**Deliverables:**
- [ ] Dashboard API: assigned tasks, overdue items, active sprint summary, project progress, blocked count, recent activity.
- [ ] Sprint Report API:
  - Planned vs completed story points (with documented calculation).
  - Burndown: remaining points by day (snapshot-based, stored at day start by Celery beat).
  - Velocity: completed points per sprint for last 10 sprints.
  - Scope delta: items/points added or removed after sprint start (from `SprintScopeEvent`).
  - Review notes + retrospective actions.
- [ ] Search API: PostgreSQL full-text `SearchVector` on `title + description`. Permission-scoped. Paginated.
- [ ] Run `EXPLAIN ANALYZE` on critical queries; add missing indexes.
- [ ] Detect and fix N+1 queries (`django-debug-toolbar` or logging middleware in dev).
- [ ] Dashboard page with all widgets.
- [ ] Sprint report page with Recharts: burndown line chart, planned vs completed bar chart, velocity trend.
- [ ] Global search bar (CMD+K / Ctrl+K shortcut).
- [ ] Search results page with type filters.
- [ ] Velocity chart on project overview.

**Exit criteria:** Report calculations tested and documented. All data is permission-scoped. No N+1 queries on main paths.

---

## Phase 10 — Release Hardening

**Deliverables:**
- [ ] Run all 20 security checklist items (Section 36) and document results.
- [ ] `pip-audit` — zero high-severity vulnerabilities.
- [ ] `npm audit` — zero high-severity vulnerabilities.
- [ ] `gitleaks` scan — zero secrets found.
- [ ] Sentry integrated: backend (`sentry_sdk`) + frontend (`@sentry/react`). PII scrubbed.
- [ ] `GET /api/v1/health/` checks DB + Redis and returns structured status.
- [ ] Production Docker config: `Dockerfile` for backend (Daphne), `Dockerfile.celery` for worker.
- [ ] Vercel frontend deployment: `vercel.json`, build command, env vars documented.
- [ ] Railway/Render backend deployment: documented steps, env vars documented.
- [ ] Database backup verification: Supabase automated backups confirmed and documented.
- [ ] OpenAPI docs at `/api/docs/` (drf-spectacular Swagger UI).
- [ ] `README.md` with: product purpose, architecture diagram, setup guide, demo data script, known limitations.
- [ ] Load test critical paths with k6 or locust; document results and any limits.
- [ ] Full E2E test suite run on staging — all tests pass.
- [ ] `CHANGELOG.md` v1.0 entry completed.

**Exit criteria:** No known critical security issues. All critical flows verified on staging. Deployment documented.

---

## Phase v2-A — AI Features

> Start this phase only after Phase 10 is complete and v1 is stable.

**Deliverables:**
- [ ] `AIRequestLog` model and migration.
- [ ] Gemini API SDK integrated (`google-generativeai`).
- [ ] `ai_service.py` with: `get_story_estimate()`, `get_sprint_risk_summary()`, `generate_retrospective()`, `parse_natural_language_task()`.
- [ ] Sprint risk calculation service (rule-based, no AI API needed for core score).
- [ ] `WorkItem.ai_suggested_points` field added (nullable, migration).
- [ ] `Sprint.risk_score` and `SprintRiskSnapshot` model.
- [ ] Celery beat job: recalculate risk scores for all active sprints every hour.
- [ ] v2 API endpoints (see Section 28).
- [ ] AI estimate button on work item detail — shows suggestion with explanation.
- [ ] Sprint risk badge on sprint planning screen and dashboard.
- [ ] AI retrospective generation button on sprint review page.
- [ ] Natural language task creation modal.
- [ ] AI usage dashboard for workspace admins.
- [ ] All AI content labeled with AI badge in UI.
- [ ] AI feature tests: mock API calls, test graceful degradation when API unavailable.

**Exit criteria:** AI features degrade gracefully when Gemini API is unavailable. AI output never shown without user confirmation. Rate limits enforced.

---

## Phase v2-B — GitHub Integration

**Deliverables:**
- [ ] `GitHubIntegration` and `WorkItemGitLink` models.
- [ ] GitHub OAuth app setup instructions documented in `docs/integrations.md`.
- [ ] GitHub webhook endpoint with HMAC-SHA256 signature validation.
- [ ] PR-to-task linking via keywords in PR title/body.
- [ ] PR status display on work item detail.
- [ ] Auto-task-status update on PR merge.
- [ ] Integration settings page in workspace settings.

**Exit criteria:** GitHub webhook signature validation enforced. PRs correctly linked and status updated.

---

# Part XI — Deployment and Operations

## 46. Environments and secrets

Use separate local, test/staging and production configurations.

Required environment variables:

```
# Django
DJANGO_SECRET_KEY=
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=api.teampulse.app

# Database
DATABASE_URL=postgresql://user:pass@host:5432/teampulse

# Frontend
FRONTEND_ORIGIN=https://teampulse.app
CORS_ALLOWED_ORIGINS=https://teampulse.app
CSRF_TRUSTED_ORIGINS=https://teampulse.app

# Auth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=

# Email
EMAIL_PROVIDER=sendgrid
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=noreply@teampulse.app

# Storage
SUPABASE_URL=
SUPABASE_SERVICE_KEY=        # Backend only. NEVER expose to frontend.
STORAGE_BUCKET=teampulse-attachments

# Redis
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=

# AI (v2)
GEMINI_API_KEY=              # Backend only. NEVER expose to frontend.
AI_RATE_LIMIT_PER_WORKSPACE_PER_DAY=100
```

Frontend variables are **public** if embedded in the Vite build. Never put server secrets in `VITE_*` variables.

## 47. Deployment baseline

```
Production Traffic
        │
        ▼
   Vercel CDN (Frontend — React static build)
        │
        ▼ API calls + WebSocket upgrade
   Railway / Render (Backend)
   ├── Web: Daphne ASGI (Django + Channels), 2 replicas
   ├── Worker: Celery worker process
   └── Beat: Celery beat scheduler (1 instance only)
        │
        ├─────────────────────────┐
        ▼                         ▼
   Supabase PostgreSQL         Upstash Redis
   (managed, daily backups)    (Celery broker +
                                Channels layer)
        │
        ▼
   Supabase Storage
   (private bucket, signed URLs)
        │
        ▼
   SendGrid / Resend
   (transactional email)
```

## 48. Release process

1. Create a branch for a scoped change.
2. Implement code, tests and migration if needed.
3. Run lint, type checks, tests and build locally/CI.
4. Review authorization and data migration impact.
5. Merge only when CI checks pass and code review is done.
6. Deploy to staging; run smoke tests and E2E tests.
7. Apply production migrations using documented procedure.
8. Deploy to production and verify health endpoint + critical flows.
9. Monitor Sentry for errors in the 30 minutes after deploy.
10. Have a rollback plan documented before every significant deploy.

---

# Part XII — Project Structure

## 49. Repository layout

```
teampulse/
├── frontend/
│   ├── src/
│   │   ├── app/                  # AppShell, providers, router
│   │   ├── components/           # Shared UI: Button, Modal, Badge, etc.
│   │   ├── features/
│   │   │   ├── auth/             # Login, Register, Reset pages + store
│   │   │   ├── workspaces/       # Workspace selector, settings, members
│   │   │   ├── projects/         # Project list, overview, settings
│   │   │   ├── backlog/          # Backlog page, filters, item card
│   │   │   ├── sprints/          # Sprint planning, board, history, report
│   │   │   ├── work-items/       # Item detail drawer, comments, attachments
│   │   │   ├── collaboration/    # Activity timeline, mention picker
│   │   │   ├── notifications/    # Bell, dropdown, settings page
│   │   │   ├── reports/          # Dashboard, sprint report, analytics (v2)
│   │   │   └── ai/               # AI estimate, risk badge, retro UI (v2)
│   │   ├── lib/
│   │   │   ├── api.ts            # Axios instance + interceptors
│   │   │   ├── queryClient.ts    # TanStack Query client
│   │   │   └── utils.ts
│   │   ├── routes/               # React Router route definitions
│   │   ├── stores/               # Zustand stores (auth, ui)
│   │   └── types/                # TypeScript interfaces and enums
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/                  # Playwright tests
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── .env.example
│
├── backend/
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   ├── test.py
│   │   │   └── production.py
│   │   ├── urls.py               # Root URL conf (includes each app's urls)
│   │   ├── asgi.py               # Django Channels ASGI config
│   │   └── celery.py             # Celery app config
│   ├── apps/
│   │   ├── accounts/             # CustomUser, auth views, JWT
│   │   │   ├── api/
│   │   │   ├── models.py
│   │   │   ├── services.py
│   │   │   ├── tasks.py
│   │   │   └── tests/
│   │   ├── workspaces/           # Workspace, Membership, Invitation
│   │   ├── projects/             # Project, ProjectMembership
│   │   ├── workitems/            # WorkItem, Label, Dependency, ActivityEvent
│   │   ├── sprints/              # Sprint, SprintReview, RetroAction, ScopeEvent
│   │   ├── collaboration/        # Comment, Attachment
│   │   ├── notifications/        # Notification, Celery tasks, email templates
│   │   ├── reporting/            # Dashboard, sprint report, velocity queries
│   │   ├── audit/                # AuditEvent
│   │   ├── ai/                   # AI services, AIRequestLog (v2)
│   │   └── integrations/         # GitHub, Webhooks (v2)
│   ├── manage.py
│   ├── pyproject.toml
│   ├── Dockerfile
│   ├── Dockerfile.celery
│   └── .env.example
│
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contracts.md
│   ├── security.md
│   ├── deployment.md
│   └── integrations.md           # GitHub integration setup (v2)
│
├── .github/
│   └── workflows/
│       ├── backend-ci.yml        # lint + test + migration check
│       └── frontend-ci.yml       # lint + build + e2e
│
├── docker-compose.yml            # PostgreSQL + Redis for local dev
├── BLUEPRINT.md                  # THIS FILE. Single source of truth.
├── README.md
├── AGENTS.md
├── TASK.md
├── DECISIONS.md
└── CHANGELOG.md
```

---

# Part XIII — Product Acceptance Criteria

## 50. Core release acceptance checklist

### Identity and access

- [ ] Users can authenticate and safely end a session.
- [ ] Protected APIs reject unauthenticated requests with 401.
- [ ] Workspace roles are enforced by backend permissions.
- [ ] Membership revocation removes access on the next request.
- [ ] Cross-workspace access tests pass for every major resource type.

### Project and backlog

- [ ] Authorized users can create/manage projects and work items.
- [ ] Lists support server-side pagination and filtering.
- [ ] Work items cannot reference a sprint from a different project.
- [ ] Project and task history remains coherent after archive operations.

### Sprint

- [ ] Only one active sprint per project.
- [ ] Invalid date ranges and transitions are rejected.
- [ ] Starting/completing a sprint is transactional.
- [ ] Concurrent sprint start → only one succeeds.
- [ ] Scope changes are recorded.
- [ ] Incomplete items handled explicitly at sprint close.
- [ ] Historical sprint reports remain available.

### Collaboration

- [ ] Only authorized users can comment, read activity and access attachments.
- [ ] Mentions and notifications target the correct users.
- [ ] Repeated background jobs do not create duplicate business effects.
- [ ] Real-time events cannot cross workspace boundaries.

### AI features (v2)

- [ ] AI estimates display as suggestions, not authoritative values.
- [ ] Sprint risk score updates on scope change.
- [ ] AI features degrade gracefully when API is unavailable.
- [ ] All AI-generated content labeled with AI badge.
- [ ] AI request log tracks tokens and cost.

### Engineering and release

- [ ] Automated tests run in CI and all pass.
- [ ] Production secrets are not committed.
- [ ] Migrations and environment setup are documented.
- [ ] Error handling and request IDs are implemented.
- [ ] Deployment, smoke tests, backups and recovery expectations are documented.
- [ ] README explains product purpose, architecture, setup and known limitations.

---

# Part XIV — Key Decisions and Trade-offs

## 51. Decision register

| Decision | Baseline | Reason |
|---|---|---|
| Product focus | Scrum-oriented team/project management + AI (v2) | Clear product identity with competitive differentiation |
| Architecture | Modular monolith | Strong boundaries without microservice overhead |
| Frontend | React + TypeScript + Vite + Tailwind + shadcn/ui | Modern, typed, accessible, well-maintained ecosystem |
| Backend | Django + DRF | Mature ORM, auth ecosystem, rapid development |
| Database | PostgreSQL (Supabase) | Relational integrity, full-text search, transactions |
| Auth tokens | JWT (SimpleJWT) — access in memory, refresh in HttpOnly cookie | Security-first; no localStorage for refresh tokens |
| Real-time | Django Channels + Redis; added after REST is stable | App remains usable if WebSocket fails |
| Background jobs | Celery + Redis | Reliable async email and notifications |
| AI provider | Google Gemini API | Cost-effective, high quality, integrated with Google ecosystem |
| AI scope | v2 only — advisory features, never autonomous | Product value must not depend on AI for core workflow |
| GitHub integration | v2 — optional per workspace | Extends value without blocking v1 |
| Time tracking | v2 — opt-in per workspace | Avoid scope creep before core product works |
| Microservices | Not in scope | Unnecessary complexity at this stage |
| Hosting | Vercel (frontend) + Railway/Render (backend) + Supabase (DB) | Managed, reduced operational burden |

Any change to these decisions must be recorded in `DECISIONS.md` with: reason, impact, migration implications, and date.

---

# Part XV — First Development Tasks

## 52. Do these in order

1. Inspect the repository — confirm it is empty or note what exists.
2. Create/update all repository working documents (`README.md`, `AGENTS.md`, `TASK.md`, `DECISIONS.md`, `CHANGELOG.md`).
3. Confirm the stack and select exact library versions. Document in `DECISIONS.md`.
4. Set up `docker-compose.yml` for local PostgreSQL 16 + Redis 7.
5. Initialize Django project and all apps. Confirm the **custom user model is set before the first migration**.
6. Initialize frontend with Vite + React + TypeScript. Install and configure Tailwind + shadcn/ui.
7. Implement the health endpoint and confirm it returns `{"status": "ok"}`.
8. Set up GitHub Actions CI: lint + test + build.
9. Build authentication and confirm protected APIs reject anonymous requests.
10. Build workspace isolation before any other feature.
11. Build one complete vertical slice: create workspace → create project → create work item → update it with permission checks and tests.
12. Continue phase by phase as documented above.

### Do not start with

- Generating all UI pages with mock data.
- Building all database models in one giant unreviewed change.
- Adding WebSockets before the REST workflow is stable.
- Adding AI features before v1 core is complete.
- Adding complex infrastructure before there is a concrete need.
- Declaring a feature complete without tests and manual verification.

---

## Final product summary

TeamPulse is a Scrum-oriented collaboration platform enhanced with AI-powered insights. It helps teams move from a product backlog to sprint planning, execution, review and continuous improvement.

**Version 1 (Core):** Project/task management, Kanban board, sprint lifecycle, collaboration, notifications, real-time updates, and delivery reports with strong workspace isolation and reliable backend rules.

**Version 2 (Enterprise/AI):** AI Story Point Estimator, Sprint Risk Predictor, AI Retrospective Assistant, Natural Language Task Creation, GitHub/GitLab Integration, Advanced Analytics (CFD, Cycle Time, Velocity), Webhook System, Time Tracking, and PWA support.

The engineering goal is to build a maintainable, secure, testable, and intelligent full-stack product — not merely a dashboard. The development process should be incremental, documented and verifiable. This document is the primary source of truth; refine exact API payloads, ER relationships, role permissions and acceptance criteria before implementing each phase.

---

*Document version: 2.0 · Status: Approved · Owner: TeamPulse Engineering*
