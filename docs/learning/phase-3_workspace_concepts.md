# Phase 3 Learning Guide — Workspaces, Multi-Tenancy & RBAC Architecture

> **Kiske liye hai:** Yeh document aapko Phase 3 mein implement kiye gaye advanced engineering concepts ko aasan Hinglish bhasha mein samjhane ke liye banaya gaya hai, taaki aap kisi bhi technical interview ya system design round mein confidently bol sakein aur explain kar sakein.

---

## 1. Multi-Tenancy Architecture (Tenancy Kya Hoti Hai?)

### Real-Life Analogy
Maan lo ek bohot badi Commercial Building hai (TaskFlow application).
- Is building ke alag-alag floors par alag-alag companies ke offices hain: ek floor par Netflix ki team hai, ek par Uber ki team hai.
- Dono teams same building, same electricity, same elevator (shared infrastructure) use kar rahi hain.
- Lekin Netflix ka koi employee Uber ke office ke andar bina access card ke nahi jaa sakta, aur na hi Uber ka koi confidential white-board dekh sakta hai.

Software engineering mein is concept ko **Multi-Tenancy** kehte hain.
- Har company/team ek **Tenant** hai (humare system mein: `Workspace`).
- Application ek hi hai, database ek hi hai, lekin har tenant ka data 100% isolated aur secured hota hai.

---

## 2. Multi-Tenancy Design Patterns (Interview Question #1)

Jab interview mein pucha jaye: *"Aapne multi-tenancy kaise implement ki aur alternate options kya the?"*

| Approach | Kaise kaam karta hai | Pros | Cons | Humne kyun choose kiya / nahi kiya? |
|---|---|---|---|---|
| **1. Database per Tenant** | Har workspace ka apna alag PostgreSQL database hota hai | 100% physical isolation | Bohot mehnga, migrations run karna bohot mushkil (1000 tenants = 1000 DBs) | Overkill for startups & medium scale |
| **2. Schema per Tenant** | Ek hi database, lekin har workspace ka alag PostgreSQL schema (`tenant_uber.tasks`, `tenant_netflix.tasks`) | Logical separation, moderate isolation | Django ORM mein dynamic schema switching complex hai | Infrastructure maintenance heavy |
| **3. Row-Level Tenancy (Shared DB + Shared Schema)** | Ek hi DB aur tables, har row mein `workspace_id` foreign key hoti hai | Extremely cost-effective, fast queries, easy migrations, simple scaling | Agar application code mein filter bhool gaye toh data leak ho sakta hai | **Humne yahi choose kiya** + strict DRF permissions & selector scoping se security guarantee ki! |

### Humne Security Guarantee Kaise Di?
Backend mein kabhi bhi client ke bheje hue `workspace_id` par blind trust nahi kiya jaata.
Har endpoint pe:
1. URL slug se workspace fetch hota hai.
2. Database query mein check hota hai: `WorkspaceMember.objects.filter(workspace=ws, user=request.user, status='ACTIVE').exists()`
3. Agar user active member nahi hai, toh turant `403 Forbidden` raise hota hai.
4. User ke workspace list query mein: `Workspace.objects.filter(members__user=request.user, members__status='ACTIVE')` — user sirf wahi rows dekh sakta hai jahan wo member hai!

---

## 3. RBAC (Role-Based Access Control) Hierarchy

### Concept
System mein permission har user ko alag se nahi di jaati, balki **Role** ke basis par di jaati hai.

Humne 4 roles design kiye hain:

```
[OWNER]   Level 4  → Workspace delete/archive kar sakta hai, billing, ownership transfer
   ▲
[ADMIN]   Level 3  → Members invite/remove kar sakta hai, role change kar sakta hai
   ▲
[MEMBER]  Level 2  → Projects, tasks, sprints create aur edit kar sakta hai (Core worker)
   ▲
[VIEWER]  Level 1  → Read-only audit access (Sirf dekh sakta hai, kuch edit nahi kar sakta)
```

### Safety Invariants (Critical Business Rules)
Humare service layer (`services.py`) mein 3 strict security guards hain:
1. **Anti-Self Escalation:** Koi bhi user apna khud ka role modify nahi kar sakta (ek Admin khud ko Owner nahi bana sakta).
2. **Last Owner Protection:** Workspace ka aakhri bacha hua `OWNER` delete ya demote nahi ho sakta. Agar aakhri owner leave karega toh workspace orphan ho jayega. Pehle ownership transfer karni padegi.
3. **Owner-Only Destructive Actions:** Workspace ko soft-archive karna sirf `OWNER` kar sakta hai, `ADMIN` bhi nahi.

---

## 4. Cryptographic Invite Tokens & SHA-256 Hashing

### Problem: Insecure Invites
Agar hum database mein raw invite token store karte hain (jaise `token = "abc123xyz"`):
- Agar database read-replica dump leak ho jaye ya koi unauthorized SQL injection ho, attacker database se saare valid invite tokens copy karke kisi bhi private workspace ko join kar sakta hai!

### Humara Solution: One-Way SHA-256 Token Hashing

```
1. Admin Invites "alex@company.com"
           │
           ▼
2. Python generates 32 random bytes (256-bit entropy):
   raw_token = secrets.token_urlsafe(32)   # e.g. "K9z_mN2PqR7sT5vW..."
           │
           ├─────────────────────────────────────────┐
           ▼                                         ▼
3. Compute SHA-256 Hash                     4. Build Invite URL
   token_hash = sha256(raw_token)              https://taskflow.io/join?token=K9z_mN2Pq...
           │                                         │
           ▼                                         ▼
5. Store in Database:                       6. Sent to user's email only!
   WorkspaceInvite(token_hash=token_hash)      (Database NEVER sees raw_token)
```

Jab user `/join?token=...` par click karta hai:
1. Backend received token ka SHA-256 hash nikaalta hai: `hash = sha256(received_token)`.
2. Database mein `token_hash == hash` lookup karta hai.
3. Token match hone par membership create hoti hai aur invite status turant `ACCEPTED` mark ho jaata hai (single-use constraint).

> **Why SHA-256 and not bcrypt?**
> Bcrypt passwords ke liye hota hai jahan human password chhota aur guessable hota hai (jaise "password123"), isliye bcrypt ko jaan-bujh kar 100ms slow banaya gaya hai brute-force rokne ke liye.
> Lekin humara invite token `secrets.token_urlsafe(32)` hai (256-bit entropy) — isko brute-force karna mathematically impossible hai (universe ki age se zyada time lagega). Isliye fast, cryptographically secure hash like SHA-256 best fit hai!

---

## 5. Database Performance: Indexes & N+1 Query Prevention

### Composite Unique Constraint
`WorkspaceMember` model mein:
```python
class Meta:
    unique_together = [('workspace', 'user')]
```
Database level par guarantee hai ki ek user ek workspace mein 2 baar nahi jud sakta. Application crash ho ya race-condition ho, database duplicate entry reject karega.

### N+1 Query Problem Explained
Agar hum workspace ke 50 members fetch karein:
- Normal Query: `members = WorkspaceMember.objects.filter(workspace=ws)` (1 query)
- Jab loop mein `member.user.email` ya `member.user.display_name` padhein:
  Django har member ke liye alag SQL query chalayega: 50 additional queries!
  Total queries = 1 + 50 = **51 queries (N+1 Problem!)**

### Solution: `select_related('user')`
Humare `selectors.py` mein:
```python
def get_workspace_members(workspace):
    return WorkspaceMember.objects.filter(
        workspace=workspace,
        status=WorkspaceMember.Status.ACTIVE
    ).select_related('user')
```
Django SQL `INNER JOIN` use karke **single query** mein saara data le aata hai. 51 queries ki jagah sirf **1 query**!

---

## 6. Interview Cheatsheet (Quick Recall)

**Q: Workspaces mein URLs ke liye UUID use kiya ya Slug? Aur kyun?**
> **A:** "Humne public URLs ke liye unique `slug` (e.g. `/workspaces/core-engineering/`) use kiya readability aur SEO ke liye, jabki internal primary key aur Foreign Keys ke liye `UUIDv4` use kiya taaki sequential integer IDs expose na hon aur predictable enumeration attack possible na ho."

**Q: Workspace delete karne par historical data ka kya hota hai?**
> **A:** "Humne Soft-Delete pattern use kiya (`archived_at` timestamp). Direct `DELETE` chalane se historical audit logs, sprints, aur velocity analytics corrupt ho sakti hain. `archive()` method sirf `archived_at = timezone.now()` set karta hai aur active lists se exclude karta hai, allowing safe restore anytime."

**Q: Global `Ctrl+K` shortcut kaise implement kiya SPA mein?**
> **A:** "React mein top-level `useEffect` mein `window.addEventListener('keydown', ...)` lagaya jo `(e.ctrlKey || e.metaKey) && e.key === 'k'` detect karta hai, browser ke default URL search ko `e.preventDefault()` se suppress karta hai, aur Quick Search command palette modal render karta hai with keyboard-first arrow navigation."
