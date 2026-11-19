# TaskFlow — Agile & Scrum Masterclass & System Architecture Guide

> **Target Audience:** Anyone using, explaining, or presenting TaskFlow to clients, teammates, or interviewers without prior Agile experience.

---

## 1. Real-World Analogy: The 5-Star Restaurant Kitchen 🍳

Agar aapko kisi ko samjhana ho ki TaskFlow kaise kaam karta hai aur Scrum kya hai, toh yeh **Restaurant Kitchen** ka example dijiye:

```
[ Customer Wishes / All Recipes ]  -->  PRODUCT BACKLOG (All ideas, tasks, bugs)
                   ↓
     [ Daily Morning Kitchen Meeting ]  -->  SPRINT PLANNING (Select what we can cook)
                   ↓
      [ Today's Order Board / 2-Week Box ]  -->  ACTIVE SPRINT (Committed work)
                   ↓
 [ In Kitchen: Prep → Cooking → Tasting → Served ]  -->  KANBAN BOARD (To Do → In Progress → In Review → Done)
```

### Key Concepts in Plain Words:

| Concept | Restaurant Analogy | TaskFlow Me Kya Hota Hai? |
|---|---|---|
| **Product Backlog** | Restaurant ki 500 dishes ki Master Menu Book & Grocery List | Sabhi future features, ideas, aur bug reports ka centralized store. Yahan 100+ tasks pade ho sakte hain. |
| **Sprint (Time-box)** | 2-hafte ka fixed time-period (e.g. 14 Days) | Team decide karti hai ki agle 14 dino me hum kitna kaam complete karke live deploy karenge. |
| **Sprint Goal** | "Iss 2 hafte me Italian Menu launch karna hai" | Ek clear mission statement (e.g., "Deliver core authentication and interactive board"). |
| **Sprint Backlog** | Wo 15 dishes jo aaj ke lunch rush ke liye chuni gayi hain | Backlog se chun kar Sprint me move kiye gaye committed work items. |
| **Story Points (Fibonacci: 1, 2, 3, 5, 8, 13)** | Recipe kitni mushkil hai (1 = Omelette, 8 = Biryani) | Kaam ka complexity weight. Hours nahi hote, relative effort hota hai. |
| **Kanban Board** | Kitchen order tickets board (`To Cook` → `Cooking` → `Plated` → `Served`) | Active Sprint ke cards ko visually right side move karte hain (`To Do` → `In Progress` → `In Review` → `Done`). |
| **Definition of Done (DoD)** | Chef ka standard: Garam hona chahiye, garnish hona chahiye | Checklists: Code review approved, unit tests passing, deployed. |

---

## 2. Why don't new tasks immediately go to the Active Sprint? 🛑
*(The "Scope Creep" Rule)*

Aapne dekha hoga: Jab aap naya task create karte hain, toh wo seedha Active Sprint Board par nahi jata, balki **Product Backlog** me banta hai. Fir aap use dropdown se "Move to Sprint..." karte hain.

### Kyun?
- Agar ek chef 4-course meal bana raha hai, aur table se koi har 5 minute me aakar bole: *"Bhai ek pizza bhi add kardo, ek burger bhi bana do"*, toh kitchen crash ho jayegi aur main dinner kabhi time par deliver nahi hoga!
- Software engineering me ise **"Scope Creep" (Scope badhna)** bolte hain.
- **Scrum Rule:** Ek baar Sprint start ho gaya, toh team ki commitment freeze ho jati hai. 
  - Naya task hamesha pehle **Product Backlog** me banta hai.
  - Agar wo sach me itna urgent hai ki abhi karna zaroori hai, toh Lead/Manager use jaanbujhkar **"Move to Sprint"** karega. Isse velocity metrics me dikhega ki beech sprint me naya scope add hua tha!

---

## 3. How to Present / Demo TaskFlow in 2 Minutes 🎤
*(Dusro ko dikhane ka exact sequence)*

1. **Step 1: Sign In & Workspace:**
   - Sign in karein. Dikhaayein ki **Workspace Switcher** se aap multi-tenant teams (e.g. `Core Engineering`) switch kar sakte hain.
2. **Step 2: Projects & Product Backlog:**
   - Left sidebar se **"Projects & Backlog"** kholein.
   - Dikhaayein ki yahan project ke saare items **LexoRank priority** me arranged hain.
   - Ek naya Task create karein Fibonacci points (`3 pts` ya `5 pts`) ke saath.
3. **Step 3: Sprint Planning:**
   - Upar **"Create Sprint"** click karein (e.g. `Sprint 2 - Payment Gateway`).
   - Backlog ke item ke dropdown se use `Sprint 2` me assign karein.
4. **Step 4: Start Sprint:**
   - Sprint card par **"Start Sprint"** click karein, Sprint Goal enter karein aur activate karein.
   - *Technical highlight:* Backend me **pessimistic locking (`select_for_update`)** laga hai taaki ek samay par sirf 1 active sprint chale.
5. **Step 5: Active Sprint Kanban Board:**
   - Left sidebar se **"Active Sprint Board"** par switch karein.
   - Cards ko drag karke ya mobile touch arrows (`<` aur `>`) se `To Do` → `In Progress` → `Done` move karke dikhaayein.
   - Progress bar update hote hue dikhaayein.

---

## 4. Multi-Tenancy Doubt: Separate DB vs Partitioning 🏢

### Question: "Kya har organization ko separate DB milta hai, ya database partitioning karenge?"

### 3 Industry Architectures:

```
Option 1: Database-per-tenant (Separate DB)
[Tenant A] ---> [Database A]
[Tenant B] ---> [Database B]
(Expensive, slow migrations, used ONLY for military/healthcare)

Option 2: Schema-per-tenant
[Tenant A] ---> [Postgres Schema A] \
[Tenant B] ---> [Postgres Schema B]  --> Same Database

Option 3: Shared DB with Row-Level Isolation (TaskFlow's Architecture — Linear/Slack/Notion standard)
[Tenant A] \
[Tenant B]  --> [Single Postgres DB] (Filtered by workspace_id + PostgreSQL RLS)
```

### TaskFlow me humne kya use kiya hai aur kyun?
1. **Row-Level Shared Isolation:**
   - Humara backend har table (`projects_workitem`, `projects_sprint`, `workspaces_workspace`) me `workspace_id` foreign key rakhta hai.
   - Backend service layer aur DRF permission classes (`IsWorkspaceMember`) ensure karte hain ki koi bhi user doosre workspace ka data dekh ya edit na kar sake.
   - **PostgreSQL 17 Row-Level Security (RLS)** is also configured on Supabase.
2. **Database Partitioning kab karte hain?**
   - Jab aapke paas **50 Lakh (5 Million+) tasks** ho jayein, tab PostgreSQL me hum `PARTITION BY LIST (workspace_id)` lagate hain.
   - Partitioning me application code nahi badalta! PostgreSQL internally ek badi table ko chhote physical chunks me store karta hai taaki query speed ultra-fast rahe.
   - TaskFlow ka schema 100% partitioning-ready hai kyunki har entity scoped hai!

---

## 5. Phase 0 to 5 Audit Ledger (Did we miss anything?) 📋

| Phase | Blueprint Scope | Implementation Status | Any Missing Items? |
|---|---|---|---|
| **Phase 0** | Baseline repo, Git, Node, Python, Django 5, Supabase DB, .env, Health check | **100% Completed** ✅ | None |
| **Phase 1 & 2** | Custom User UUID PK, SimpleJWT, HttpOnly cookie, IP rate limiting, Anti-enumeration, Profile modal | **100% Completed** ✅ | Google OAuth & Email Reset are deferred to Phase 7/v2 by design in Blueprint |
| **Phase 3** | Workspace model, Roles (OWNER/ADMIN/MEMBER/VIEWER), Cryptographic Invites, `/join?token=...`, Layout fixed scroll, Ctrl+K Quick Search | **100% Completed** ✅ | None |
| **Phase 4** | Projects (Key TF, visibility, DoD), WorkItem (atomic sequential keys, Fibonacci points), LexoRank O(1) drag reorder, Backlog UI | **100% Completed** ✅ | Subtasks & Task dependencies connect with Phase 6 comments/activities |
| **Phase 5** | Sprint model, Single Active Sprint pessimistic locking, Scope freeze, Rollover logic, 4-swimlane Kanban board, touch arrows, Sprint modals | **100% Completed** ✅ | Burndown charts are explicitly in Phase 9 (Reports) |

**Conclusion:** Phase 0 se 5 tak koi bhi feature miss nahi hua hai. Jo features abhi nahi dikh rahe hain (jaise Comments, Attachments, Burndown Charts, Notifications) wo aage aane wale phases (Phase 6 se Phase 9) ke liye planned hain.
