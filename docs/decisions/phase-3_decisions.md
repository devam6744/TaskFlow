# Architecture Decision Records (ADRs) — Phase 3: Workspaces & Multi-Tenancy

## ADR 006: Multi-Tenancy Architecture Pattern (Row-Level Tenancy with Workspace Scoping)

### Context
TaskFlow requires multi-tenant isolation where teams work in separate workspaces. We needed to choose how tenant isolation is structured at the database layer.

### Options Considered
1. **Database-per-Tenant:** A separate PostgreSQL database for each workspace.
2. **Schema-per-Tenant:** A shared database with separate PostgreSQL schemas (`tenant_1`, `tenant_2`).
3. **Row-Level Shared Tenancy (Chosen):** A single database and unified tables where every tenant-scoped table has a `workspace_id` foreign key, enforced via application selectors and DRF permissions.

### Decision
We chose **Option 3: Row-Level Shared Tenancy**.
- Operational simplicity: single migration command across the whole platform.
- Cost efficiency: works seamlessly on managed PostgreSQL (Supabase) without multi-database connection pooling overhead.
- Scalability: easily supports thousands of workspaces without connection exhaustion.
- Enforced with non-negotiable selector functions and DRF permission classes (`IsWorkspaceMember`) preventing accidental cross-tenant queries.

---

## ADR 007: Invitation Token Security — SHA-256 Storage vs Plaintext vs Bcrypt

### Context
When inviting new members by email, a secret token is generated. How should this token be stored and validated?

### Options Considered
1. **Plaintext token in DB:** Storing `token = "abc..."` in database column.
   - *Risk:* If DB is dumped, all invitations can be hijacked.
2. **Bcrypt hashing:** Using bcrypt password hasher.
   - *Downside:* Bcrypt adds 100-200ms hashing latency per validation, which is designed for low-entropy human passwords, not high-entropy tokens.
3. **One-way SHA-256 Hash Storage (Chosen):**
   - We generate 32 random URL-safe bytes (`secrets.token_urlsafe(32)`) giving 256 bits of cryptographic entropy.
   - We compute `token_hash = sha256(raw_token)` and store **only** `token_hash` in the database.
   - Raw token is delivered once in the invitation URL.

### Decision
We chose **Option 3**. It offers zero-compromise security against DB leaks with sub-millisecond O(1) indexed lookup performance.

---

## ADR 008: Role Hierarchy — TextChoices Enum vs Dynamic Permissions Table

### Context
We needed to model user permissions inside workspaces.

### Options Considered
1. **Dynamic Permission Matrix:** Many-to-Many table with individual capabilities (`can_create_project`, `can_invite`, `can_delete_sprint`).
2. **Fixed 4-Tier Enum Hierarchy (Chosen):** `OWNER (4) > ADMIN (3) > MEMBER (2) > VIEWER (1)`.

### Decision
We chose **Option 2**.
- Predictable, auditable, and standard across modern Agile tools (Linear, GitHub, Jira).
- Reduces database joins on every API request.
- Easy to upgrade to custom roles in Enterprise v2 without breaking Phase 3 data structures.

---

## ADR 009: Soft Deletion via `archived_at` vs Hard DELETE

### Context
When a user deletes or archives a workspace, how should the database handle it?

### Options Considered
1. **Hard DELETE (`CASCADE`):** Permanently removes all workspace, project, sprint, and task rows.
   - *Risk:* Accidental deletion destroys audit history, analytics, and work items permanently.
2. **Soft Deletion with `archived_at` timestamp (Chosen):**
   - Workspace record has `archived_at = DateTimeField(null=True)`.
   - Default selectors filter `archived_at__isnull=True`.
   - Unarchive endpoint allows instant recovery.

### Decision
We chose **Option 2**. Ensures complete audit resilience and zero accidental data loss.

---

## ADR 010: Slug vs UUID in Public Workspace URLs

### Context
How should workspace URLs be structured for frontend and API consumers?

### Decision
- **UUIDv4** is used for internal Primary Keys and Foreign Keys (eliminates integer ID enumeration attacks).
- **Slug** (e.g. `/workspaces/core-engineering/`) is used in public URLs for human readability, clean UX, and professional enterprise presentation.
- Slugs are auto-generated from the workspace name with collision avoidance (`core-engineering-1`).
