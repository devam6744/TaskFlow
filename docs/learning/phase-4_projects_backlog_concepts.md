# TaskFlow Engineering Learning Guide — Phase 4: Projects & Product Backlog

Yeh guide **Phase 4: Projects & Product Backlog Management** ke sabhi core software engineering aur Agile concepts ko simple Hinglish mein explain karti hai. Iska maqsad interviews mein deeply explain karne aur real-world enterprise architecture samajhne ke liye perfect notes provide karna hai.

---

## Table of Contents
1. [Workspace vs Project: Multi-Tenancy Architecture](#1-workspace-vs-project-multi-tenancy-architecture)
2. [Sequential Human-Readable Issue Keys (TF-1, TF-2)](#2-sequential-human-readable-issue-keys-tf-1-tf-2)
3. [Fibonacci Story Points & Why Linear Estimation Fails](#3-fibonacci-story-points--why-linear-estimation-fails)
4. [LexoRank / Fractional Indexing for O(1) Backlog Reordering](#4-lexorank--fractional-indexing-for-o1-backlog-reordering)
5. [Definition of Done (DoD) vs Acceptance Criteria (AC)](#5-definition-of-done-dod-vs-acceptance-criteria-ac)
6. [Top Interview Questions & Answers](#6-top-interview-questions--answers)

---

## 1. Workspace vs Project: Multi-Tenancy Architecture

### Interview Doubt: Workspace aur Project mein kya farak hai?
- **Workspace (Tenant Boundary):**
  - Workspace company ya organization level ka tenant hota hai (e.g. `Acme Corp`, `Devam Tech`).
  - Billing, enterprise membership, workspace-wide roles (OWNER, ADMIN, MEMBER, VIEWER), aur data isolation workspace level par hoti hai.
  - Workspace A ka user Workspace B ka koi bhi data kabhi nahi dekh sakta.
- **Project (Product/Release Boundary):**
  - Ek workspace ke andar multiple projects hote hain (e.g. `iOS App`, `Billing Service`, `Web Frontend`).
  - Har project ka apna issue prefix key hota hai (e.g. `IOS`, `BILL`, `TF`).
  - Projects `WORKSPACE` visible ho sakte hain (sabhi workspace members ke liye) ya `PRIVATE` (sirf explicitly assigned `ProjectMember` records ke liye).

```
Workspace: "Alpha Tech" (Tenant)
  ├── Project 1: "Core Platform" [Key: TF]
  │     ├── WorkItem TF-1 (Story: Redis Caching)
  │     └── WorkItem TF-2 (Bug: Fix JWT expiration)
  └── Project 2: "Mobile App" [Key: MOB]
        ├── WorkItem MOB-1 (Task: Setup React Native)
        └── WorkItem MOB-2 (Story: Biometric Auth)
```

---

## 2. Sequential Human-Readable Issue Keys (TF-1, TF-2)

### The Engineering Challenge:
UUIDs (`e196b978-f2b1-4540-aa64-cf179349e284`) databases ke liye primary keys ke roop mein best hote hain kyunki yeh globally unique hote hain aur collision risk zero hota hai. Lekin human communication (Slack, Git commits, PRs, Daily Standups) mein koi bhi developer UUID use nahi kar sakta. Teams bolti hain: *"Hey Devam, check TF-42!"* ya git commit message likhte hain: `git commit -m "feat(auth): fix token rotation [TF-42]"`.

### The Race Condition Problem:
Agar do users ek hi time par project `TF` mein new issue create karein, to agar hum simply `count = WorkItem.objects.filter(project=p).count() + 1` karein, to concurrent requests mein dono ko `item_number = 5` mil jayega. Database collision ya duplicate key error aayega!

### The Solution: Atomic Locking (`select_for_update`):
```python
with transaction.atomic():
    # Lock the project row until transaction completes
    project = Project.objects.select_for_update().get(id=project_id)
    
    # Calculate next sequence safely
    last_item = WorkItem.objects.filter(project=project).order_by('-item_number').first()
    next_number = (last_item.item_number + 1) if last_item else 1
    
    item = WorkItem.objects.create(
        project=project,
        item_number=next_number,
        title=title,
        ...
    )
```
- Is transaction lock se database row par pessimistic lock lagta hai.
- Second request wait karegi jab tak first transaction commit na ho jaye.
- Result: Sequential numbering hamesha strictly continuous aur race-condition free rehti hai.

---

## 3. Fibonacci Story Points & Why Linear Estimation Fails

### Kyun Linear Scale (1, 2, 3, 4, 5, 6, 7, 8, 9, 10) use nahi hota?
Agile aur Scrum frameworks mein story estimation ke liye Fibonacci sequence use hota hai:
$$\{1, 2, 3, 5, 8, 13, 21\}$$

#### 1. Weber-Fechner Law of Human Perception:
Psychophysics ka rule hai ki jab koi task chota hota hai, to insan easily difference bata sakta hai (1 ghanta vs 2 ghante). Lekin jab task bada hota hai, to uncertainty exponentially grow karti hai.
- Ek developer ko 1 story point aur 2 story point ke beech farak clearly samajh aata hai.
- Lekin 7 ghante aur 8 ghante ke beech farak predict karna bekar guesswork hota hai.
- Isliye Fibonacci sequence scale mein jump karta hai: $1 \to 2 \to 3 \to 5 \to 8 \to 13 \to 21$.

#### 2. Analysis Paralysis Avoidance:
Agar scale linear ho, to sprint planning meetings mein 20 minute is baat par waste ho jaate hain ki *"Yeh task 7 points ka hai ya 8 points ka?"*.
Fibonacci sequence developers ko force karta hai: agar task 5 se bada hai, to direct 8 hoga. Agar 8 se bada hai, to 13 hoga. Agar 13 ya 21 hai, to iska matlab task **too big/epic** hai aur use smaller stories mein split karna padega!

#### Backend Invariant Validation:
Humne `apps/projects/services.py` mein validate kiya:
```python
FIBONACCI_POINTS = {1, 2, 3, 5, 8, 13, 21}

if story_points is not None and story_points not in FIBONACCI_POINTS:
    raise ValidationError({
        "story_points": f"Points must belong to Fibonacci scale {sorted(list(FIBONACCI_POINTS))}."
    })
```

---

## 4. LexoRank / Fractional Indexing for O(1) Backlog Reordering

Jira, Linear, aur TaskFlow jaisi apps mein users backlog items ko drag-and-drop karke unki priority up/down reorder karte hain.

### The Naive $O(N)$ Problem:
Agar backlog items ka order integer column ho (`1, 2, 3, 4, 5, ... 10,000`):
- Agar user 5,000th item ko 1st position par drag kare, to beech ke **4,999 rows** ka order increment karna padega (`order = order + 1`).
- Database mein 5,000 UPDATE queries chalegi!
- High concurrency mein table-level lock lagega aur performance degrade ho jayegi.

### The Fractional Indexing (LexoRank) Solution:
Instead of integers, order ko **Floating Point number** (`FloatField` ya lexicographical string) rakha jata hai.
Jab koi item do existing items ke beech move hota hai:
$$\text{new\_order} = \frac{\text{prev\_order} + \text{next\_order}}{2.0}$$

```
Item A (order = 1000.0)
Item B (order = 2000.0)

Agar user Item C ko Item A aur B ke beech drag kare:
new_order = (1000.0 + 2000.0) / 2.0 = 1500.0

Database Action: Sirf 1 row UPDATE hoti hai! Complexity O(1).
```

Agar item ko absolute top par move karna hai:
$$\text{new\_order} = \text{first\_item.order} / 2.0$$

Agar item ko absolute bottom par move karna hai:
$$\text{new\_order} = \text{last\_item.order} + 1000.0$$

### Normalization Routine:
Floating point precision finite hoti hai (64-bit IEEE 754). Agar ek hi jagah 50 baar items inject kiye jayein, to decimal points bohot close ho sakte hain. Is case mein ek background re-balancing worker simple `order = index * 1000.0` se space re-normalize kar deta hai.

---

## 5. Definition of Done (DoD) vs Acceptance Criteria (AC)

Agile interview mein interviewer 90% yeh sawal zaroor poochta hai:
**"What is the difference between Definition of Done and Acceptance Criteria?"**

| Criteria | Acceptance Criteria (AC) | Definition of Done (DoD) |
|---|---|---|
| **Scope** | Story/Task specific (Micro-level). | Project / Workspace specific (Macro-level). |
| **Owner** | Product Owner / Business Analyst. | Entire Engineering Team & QA. |
| **Example** | *"Given a user with expired password, when they submit, show 401 error."* | *"Unit tests >= 80% coverage, PR reviewed by senior dev, Docker image passes security scan, deployed to staging."* |
| **When Applied** | Sirf us particular user story ke validation ke liye. | Har story, bug fix, ya task ke merge hone se pehle mandatory. |
| **TaskFlow DB Model** | `WorkItem.acceptance_criteria` (TextField) | `Project.definition_of_done` (TextField) |

---

## 6. Top Interview Questions & Answers

### Q1: How do you prevent duplicate sequential keys in high-concurrency environments?
**Ans:** Simply querying `MAX(id)` or `COUNT(*)` suffers from read-modify-write race conditions. In TaskFlow, we wrap item creation inside a PostgreSQL pessimistic transaction lock using `Project.objects.select_for_update().get(id=...)`. This forces concurrent transactions to serialize, guaranteeing guaranteed gapless, unique sequential issue keys (e.g. `TF-1`, `TF-2`).

### Q2: Why did you choose Fractional Indexing over integer rank lists for Backlog sorting?
**Ans:** Integer lists require updating $O(N)$ database rows on every drag-and-drop event whenever an item moves from the bottom to the top. Fractional indexing calculates the midpoint `(prev + next) / 2.0`, requiring only a single $O(1)$ database row update.

### Q3: How do you handle multi-tenant authorization when a workspace has private projects?
**Ans:** Every query goes through a scoped selector `get_user_projects(workspace, user)`. It filters projects where `workspace=workspace` AND (`visibility='WORKSPACE'` OR `created_by=user` OR `members__user=user`). Furthermore, Workspace Owners possess superuser privileges within their workspace to oversee all projects.
