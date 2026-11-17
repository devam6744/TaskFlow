# TaskFlow — AI Coding Rules & Operational Guidelines

## Working Principles

1. **Blueprint as Source of Truth:** Refer to `BLUEPRINT.md` for all domain rules, model schemas, and endpoint design. Never contradict it.
2. **Step-by-Step SDLC:** Complete work in reviewable milestones. Follow the checklist in `TASK.md`.
3. **Multi-Tenancy Isolation:** Always enforce workspace and project permissions on the backend. Never trust client-supplied tenant identifiers alone.
4. **Backend Invariants:** Status transitions (Sprint, WorkItem) must be validated in services with atomic database transactions.
5. **No Secrets in Repo:** Environment secrets belong only in local `.env` files. Keep `.env.example` safe and clean.
6. **Migrations are Mandatory:** Every schema modification must be accompanied by a clean migration.
7. **Document as you Build:** Update `TASK.md` and `CHANGELOG.md` upon completing any milestone.
