# Architecture Decision Records (ADRs) — Phase 4

## ADR-011: Project Scoping and Sequential Key Strategy

- **Status:** Accepted
- **Context:**
  Users need readable issue keys (e.g., `TF-1`, `TF-2`) for commit messages, PRs, and team standups, while ensuring database rows remain indexed by high-entropy UUIDs. In high concurrency, simultaneous issue creation can lead to duplicate sequence numbers if calculated without synchronization.
- **Decision:**
  1. We assign each Project a unique uppercase identifier `key` (e.g. `TF`, `ENG`).
  2. Sequential numbering (`item_number`) is generated inside an atomic transaction using PostgreSQL row-level pessimistic locking (`select_for_update`) on the parent `Project` row.
  3. The composite `key_identifier` is computed as `{project.key}-{item_number}`.
- **Consequences:**
  - Prevents race conditions during simultaneous issue creation.
  - Guarantees gapless human-readable keys.
  - Project lock duration is minimal (under 5ms) because work item creation is lightweight.

---

## ADR-012: Fractional Indexing (LexoRank) for O(1) Backlog Reordering

- **Status:** Accepted
- **Context:**
  Product backlog prioritization in Agile allows product owners to drag and drop items to higher or lower priority. If priority is stored as consecutive integers (`1, 2, 3, ...`), moving an item from index 500 to index 1 requires an $O(N)$ bulk update of 499 rows.
- **Decision:**
  We adopt Fractional Indexing using 64-bit floating-point numbers (`Float` / `Double Precision` in PostgreSQL).
  - New item default order: `(max_existing_order + 1000.0)`
  - Moving between two items: `(prev_order + next_order) / 2.0`
  - Moving to top: `first_item_order / 2.0`
  - Moving to bottom: `last_item_order + 1000.0`
- **Consequences:**
  - Every reorder operation executes in $O(1)$ time with exactly 1 row updated.
  - Zero lock contention across the rest of the backlog items.
  - Re-indexing maintenance can be scheduled periodically if precision approaches IEEE 754 limits.

---

## ADR-013: Strict Fibonacci Validation for Story Point Estimation

- **Status:** Accepted
- **Context:**
  Agile teams often suffer from estimation debates when arbitrary integer points (e.g. 4, 7, 9) are entered. Standard Scrum methodology leverages the Fibonacci series ($1, 2, 3, 5, 8, 13, 21$) reflecting the non-linear growth of uncertainty.
- **Decision:**
  The `WorkItemService` enforces that `story_points` must either be `None` (unestimated) or one of `[1, 2, 3, 5, 8, 13, 21]`. Any other value raises a `ValidationError` (HTTP 400).
- **Consequences:**
  - Enforces Agile discipline across all client interfaces.
  - Eliminates subjective precision arguments during sprint planning.
  - Makes velocity reporting predictable and standardized.

---

## ADR-014: Definition of Done (DoD) as Project-Level Entity

- **Status:** Accepted
- **Context:**
  Agile maturity requires teams to have a clear, agreed-upon "Definition of Done" (unit tests passing, peer review, documentation, deployment) separate from individual story acceptance criteria.
- **Decision:**
  1. We added `definition_of_done` as a dedicated markdown field on the `Project` model.
  2. The UI provides a dedicated collapsible card and quick viewer for team members to inspect the project's DoD at any time during story creation or backlog grooming.
- **Consequences:**
  - Serves as the team's shared quality contract.
  - Distinguishes macro quality guidelines from micro user story acceptance criteria.
