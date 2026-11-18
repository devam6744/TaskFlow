# TaskFlow — Architecture Decision Records (Phase 1 & 2)

> **Document Type:** ADR (Architecture Decision Record)  
> **Status:** APPROVED & IMPLEMENTED  
> **Date:** 2026-11-18  

---

## ADR 001: Email as Primary Authentication Identifier

### Context
Django's default authentication system mandates a `username` field. For modern collaborative enterprise SaaS (e.g., Jira, Asana, Linear, GitHub), users collaborate using work emails rather than distinct usernames.

### Options Considered
1. **Option A: Keep Django's default User with username + email**
   - *Pros:* Zero custom code needed initially.
   - *Cons:* Users must remember arbitrary usernames. Duplicate emails possible unless patched. Clunky login experience.
2. **Option B: Subclass `AbstractUser` and override `USERNAME_FIELD = 'email'`**
   - *Pros:* Reuses Django's existing profile fields.
   - *Cons:* Leaves useless fields (`first_name`, `last_name`, unused `username`) in the database schema.
3. **Option C: Subclass `AbstractBaseUser` + `PermissionsMixin` (CHOSEN)**
   - *Pros:* Clean database schema with exactly what TaskFlow needs: `id` (UUID), `email` (normalized, unique), `display_name`, `avatar_url`, and audit timestamps.
   - *Cons:* Requires writing a custom `UserManager`.

### Decision
**Adopt Option C (`AbstractBaseUser`).** Implemented before first migration to adhere to Django best practices and eliminate future breaking schema rewrites.

---

## ADR 002: Primary Key Strategy — UUIDv4 vs Auto-Increment Integer

### Context
Relational databases traditionally use 32-bit or 64-bit auto-incrementing integers (`BIGINT`). We needed to decide the PK strategy for `accounts_user` and subsequent domain models.

### Options Considered
1. **Option A: Auto-increment integer (`BigAutoField`)**
   - *Pros:* Smaller storage footprint (8 bytes vs 16 bytes), slightly faster B-Tree indexing.
   - *Cons:* Sequential predictability allows user enumeration and tenant size disclosure.
2. **Option B: UUIDv4 (`UUIDField`) (CHOSEN)**
   - *Pros:* Cryptographically unguessable (122 random bits). Immune to IDOR enumeration. Decentralized generation (distributed workers or clients can generate keys without a central DB lock).
   - *Cons:* 16 bytes storage, slightly higher page fragmentation (negligible for modern PostgreSQL at our anticipated scale).

### Decision
**Adopt Option B (UUIDv4) for User and all primary entities.** Security against enumeration and multi-tenant isolation outweigh minimal storage overhead.

---

## ADR 003: JWT Authentication with Dual-Token Rotation and HttpOnly Cookies

### Context
Single-Page Applications (SPA in React) interacting with REST APIs require an authentication strategy. Traditional session cookies can run into cross-origin issues when API and UI reside on different domains, while standard JWT storage in browser localStorage is vulnerable to XSS.

### Options Considered
1. **Option A: Session-based Auth (Django Sessions)**
   - *Pros:* State managed in DB/Redis, battle-tested.
   - *Cons:* Requires session store lookup on every single request, complex cross-domain CORS cookie setup for mobile/external integrations.
2. **Option B: Pure Stateless JWT in LocalStorage**
   - *Pros:* Trivial to implement.
   - *Cons:* **High security vulnerability.** Any third-party script or XSS flaw can siphon tokens. Impossible to revoke before expiration without custom DB tracking.
3. **Option C: Dual Token with HttpOnly Refresh Cookie + Memory Access Token (CHOSEN)**
   - *Pros:*
     - **Access Token (15m):** Held only in React memory (Zustand). Never touches disk/storage.
     - **Refresh Token (7d):** Stored in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie. Immune to JavaScript XSS access.
     - **Rotation + Blacklisting:** Every refresh issues a new pair and permanently blacklists the old refresh token. Stolen refresh tokens are immediately neutralized upon second use.
   - *Cons:* Requires a token blacklist database table and custom cookie handling views.

### Decision
**Adopt Option C.** Provides enterprise-grade defense-in-depth against both XSS and CSRF while maintaining seamless SPA UX.

---

## ADR 004: Password Hashing Standard

### Context
Secure storage of user credentials against offline credential cracking.

### Options Considered
1. **Option A: Argon2id**
   - *Pros:* Winner of Password Hashing Competition, memory-hard.
   - *Cons:* Requires native C compilation (`argon2-cffi`), which can fail on certain deployment container environments.
2. **Option B: PBKDF2 with SHA256 (CHOSEN)**
   - *Pros:* Native to Django with 870,000 iteration rounds configured by default in Django 5.1. FIPS-compliant, zero external C library dependencies, constant-time validation.
   - *Cons:* Slightly less resistant to custom ASIC/GPU attacks than Argon2, but 870K rounds provides immense resistance.

### Decision
**Adopt Option B (Django's hardened PBKDF2-SHA256).** Zero external dependency risk with industry-standard resistance.

---

## ADR 005: Separation of Concerns — Service Layer Pattern

### Context
Business logic placement in Django REST Framework: Views vs Serializers vs Models vs Services.

### Options Considered
1. **Option A: Logic in Views ("Fat Views")**
   - *Cons:* Un-testable without mock HTTP requests, impossible to reuse in background tasks or CLI scripts.
2. **Option B: Logic in Serializers or Models ("Fat Models")**
   - *Cons:* Mixes data serialization/validation with cross-cutting domain operations (e.g. issuing tokens, sending emails, external calls).
3. **Option C: Dedicated Service Layer (`services.py`) (CHOSEN)**
   - *Pros:*
     - Views only handle HTTP parsing, status codes, and cookies.
     - Serializers only handle input validation and data formatting.
     - `services.py` contains plain Python functions taking primitives/models with `@transaction.atomic`.
     - 100% testable in unit tests without HTTP overhead.

### Decision
**Adopt Option C for all business operations.**
