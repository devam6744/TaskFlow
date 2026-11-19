# Architecture Decision Records (ADRs) — Phase 6: Collaboration & Activity

## ADR 019: Dedicated Modular App for Collaboration (`apps.collaboration`)
- **Status:** Accepted
- **Context:** `BLUEPRINT.md` Part III Section 20 designates `collaboration/` as a distinct domain module containing `Comment`, `Attachment`, and `ActivityEvent`. We needed to decide whether to bundle comments inside `apps.projects` or create an independent modular app.
- **Decision:** Created `backend/apps/collaboration/` as a standalone Django app.
- **Consequences:** Keeps work item discussion, attachments, and event auditing decoupled from project sprint/backlog calculations. Sprints and backlog can evolve independently of media storage and activity logs.

---

## ADR 020: Soft Deletion Strategy for Comments (`deleted_at`)
- **Status:** Accepted
- **Context:** When a team member removes a comment, hard deleting the row breaks conversation context and violates enterprise audit trail requirements (SOC 2).
- **Decision:** Implemented soft deletion via `deleted_at = models.DateTimeField(null=True, blank=True)`. Selectors automatically filter `deleted_at__isnull=True`.
- **Consequences:** Deleted comments disappear from the discussion view, but their database record and associated activity audit events remain intact for compliance.

---

## ADR 021: Depth-First Search (DFS) Cycle Detection for Task Dependencies
- **Status:** Accepted
- **Context:** Work items can block other work items. Without validation, circular dependencies (A blocks B, B blocks C, C blocks A) create unbreakable deadlocks in agile workflows.
- **Decision:** Implemented iterative BFS/DFS cycle detection in `apps.projects.services.check_dependency_cycle` executed inside an atomic transaction before any `WorkItemDependency` is created.
- **Consequences:** Guarantees that the project dependency graph is always a Directed Acyclic Graph (DAG). Any circular attempt is rejected with HTTP 400 Bad Request.

---

## ADR 022: Generic Polymorphic Activity Audit Event Schema
- **Status:** Accepted
- **Context:** The system needs to audit events across multiple entity types (`WorkItem`, `Sprint`, `Project`, etc.) without creating separate activity tables for each entity.
- **Decision:** Designed `ActivityEvent` with `workspace_id`, `actor_id`, `object_type` (string), `object_id` (UUID), `event_type` (string), and `metadata` (JSONField).
- **Consequences:** Highly flexible and future-proof. Any new milestone (e.g. notifications, webhooks) can log domain events using `record_activity_event()` with zero database schema modifications.
