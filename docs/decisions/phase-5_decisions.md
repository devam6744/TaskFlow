# Architecture Decision Records (ADRs) — Phase 5

## ADR-015: Single Active Sprint Invariant per Project

- **Status:** Accepted
- **Context:**
  In Scrum, teams must maintain single-pointed focus on one time-box and Sprint Goal. Concurrent active sprints create fragmented accountability, invalid burndown lines, and inaccurate velocity estimates.
- **Decision:**
  Enforce at the service layer that a project may have at most one `ACTIVE` sprint. To prevent race conditions from concurrent user clicks, `start_sprint` locks the parent `Project` row using PostgreSQL `select_for_update()`, checks for active sprints, and rejects attempts to activate a second sprint with HTTP 400.
- **Consequences:**
  - Guarantees data consistency across distributed environments.
  - Ensures clean velocity metrics for Sprint Reports (Phase 9).
  - Minimal lock duration (under 5ms).

---

## ADR-016: Explicit Rollover State Machine for Incomplete Work Items

- **Status:** Accepted
- **Context:**
  When a sprint finishes, items not in `DONE` status cannot simply be deleted or left in an archived active state.
- **Decision:**
  The `complete_sprint` service requires an explicit rollover strategy:
  1. Default: Incomplete items return to `sprint=None` and `status=BACKLOG`.
  2. Alternative: Incomplete items move directly to another `PLANNING` sprint within the same project.
  Completed items (`status=DONE`) remain associated with the completed sprint forever.
- **Consequences:**
  - Zero work item loss when sprints end.
  - Preserves velocity calculation integrity (`completed_story_points` records only genuinely finished work).

---

## ADR-017: Committed Planned Points Freezing at Sprint Activation

- **Status:** Accepted
- **Context:**
  Agile teams measure estimation accuracy by comparing originally committed scope vs delivered scope.
- **Decision:**
  When `start_sprint` executes, the system computes the sum of story points across all assigned work items and freezes it into `sprint.planned_story_points`. Later scope additions or removals after activation can be audited to detect Scope Creep.
- **Consequences:**
  - Establishes a reliable baseline for burndown velocity curves.
  - Enables scope change auditing.

---

## ADR-018: Dual-Mode Kanban Transition (Drag-and-Drop + Touch Buttons)

- **Status:** Accepted
- **Context:**
  HTML5 Drag and Drop is standard on desktop browsers but suffers from high failure rates on touch screens (accidental scrolling, gesture collisions).
- **Decision:**
  The TaskFlow Kanban board implements dual control mechanisms:
  1. Desktop: Full HTML5 drag-and-drop (`draggable`, `onDragStart`, `onDrop`).
  2. Mobile & Touch: Dedicated chevron arrow buttons (`<` and `>`) on each card allowing one-tap column transitions (`TODO` $\to$ `IN_PROGRESS` $\to$ `IN_REVIEW` $\to$ `DONE`).
- **Consequences:**
  - 100% accessible and responsive across mobile, tablet, and desktop viewports.
  - Zero external heavy drag-and-drop npm libraries required.
