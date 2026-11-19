# TaskFlow Engineering Learning Guide — Phase 5: Sprints & Interactive Kanban

Yeh guide **Phase 5: Sprint Lifecycle & Interactive Kanban Board** ke core software engineering aur Agile/Scrum concepts ko simple Hinglish mein explain karti hai. Iska maqsad interviews mein deeply explain karne aur enterprise architecture samajhne ke liye perfect reference provide karna hai.

---

## Table of Contents
1. [Scrum Sprints vs Kanban Flow: The Core Difference](#1-scrum-sprints-vs-kanban-flow-the-core-difference)
2. [The "Single Active Sprint" Invariant & Concurrency Protection](#2-the-single-active-sprint-invariant--concurrency-protection)
3. [Committed Scope Freeze at Sprint Activation](#3-committed-scope-freeze-at-sprint-activation)
4. [The Sprint Rollover Dilemma: What Happens to Incomplete Work?](#4-the-sprint-rollover-dilemma-what-happens-to-incomplete-work)
5. [Mobile-First Kanban Architecture: Drag-and-Drop vs Touch Selectors](#5-mobile-first-kanban-architecture-drag-and-drop-vs-touch-selectors)
6. [Top Interview Questions & Answers](#6-top-interview-questions--answers)

---

## 1. Scrum Sprints vs Kanban Flow: The Core Difference

### Interview Doubt: Scrum aur Kanban mein kya farak hota hai?

| Metric / Dimension | Scrum (Time-Boxed Sprints) | Kanban (Continuous Flow) |
|---|---|---|
| **Cadence (Time)** | Fixed-duration iterations (usually 1 to 2 weeks). | Continuous flow (no predefined start or end date). |
| **Commitment** | Team sprint ke start mein fixed story points commit karti hai. | Team continuously items pull karti hai based on capacity. |
| **Scope Changes** | Sprint ke beech mein scope change discouraged hota hai. | Priorities can change anytime before work starts. |
| **Limiting Factor** | Time-box (End Date of Sprint). | WIP Limits (Work In Progress limit per column). |
| **Metrics** | Sprint Velocity, Burndown Charts. | Lead Time, Cycle Time, Cumulative Flow Diagram. |

**TaskFlow's Hybrid (Scrumban) Approach:**
TaskFlow Scrum aur Kanban ka best combination use karta hai:
- Sprints provide structured time-boxing and goal clarity.
- Interactive Kanban Board provides real-time visualization of work across swimlanes (`To Do` $\to$ `In Progress` $\to$ `In Review` $\to$ `Done`).

---

## 2. The "Single Active Sprint" Invariant & Concurrency Protection

### The Business Invariant:
Scrum methodology ka fundamental rule hai: **Ek team/project ka ek time par sirf EK hi active sprint ho sakta hai.**
Agar ek team do sprints ek saath active kar de, to:
1. Team ka focus divide ho jayega.
2. Sprint Goal unclear ho jayega.
3. Daily standup aur burndown charts corrupt ho jayenge.

### The Concurrency Problem:
Agar do project leads (e.g. Alice aur Bob) ek hi time par do alag browser tabs se "Start Sprint" button click karein, to bina proper locking ke dono requests database mein `status = ACTIVE` update kar sakti hain!

### The Solution: Row-Level Locking (`select_for_update`):
```python
@transaction.atomic
def start_sprint(*, sprint: Sprint, user: User) -> Sprint:
    # 1. Lock the parent project row
    project = Project.objects.select_for_update().get(id=sprint.project_id)
    
    # 2. Invariant check: ensure no other ACTIVE sprint exists
    active_exists = Sprint.objects.filter(
        project=project,
        status=Sprint.Status.ACTIVE
    ).exclude(id=sprint.id).exists()
    
    if active_exists:
        raise ValidationError("Another sprint is already active in this project.")
        
    # 3. Safely transition sprint
    sprint.status = Sprint.Status.ACTIVE
    sprint.save()
```
- PostgreSQL ka row lock guarantee karta hai ki dusri transaction pehli transaction ke commit hone tak wait karegi.
- Second transaction ko immediately `active_exists = True` milega aur request safe error (HTTP 400) ke saath reject ho jayegi.

---

## 3. Committed Scope Freeze at Sprint Activation

Sprint activate hone ke moment par ek critical data snapshot liya jata hai:
$$\text{planned\_story\_points} = \sum_{\text{items} \in \text{sprint}} \text{story\_points}$$

### Why Freeze Points at Activation?
1. **Burndown Baseline:** Burndown chart ko pata hona chahiye ki Day 1 par team ne kitne points commit kiye the (e.g. 26 points).
2. **Scope Creep Detection:** Agar sprint ke beech mein Product Owner 8 points ka naya feature inject karta hai, to TaskFlow compare kar sakta hai:
   $$\text{Current Scope} - \text{Planned Scope} = \text{Scope Creep (+8 pts)}$$
3. **True Velocity Calculation:** Velocity calculate karte waqt planned vs actual completion ka ratio hi team ki estimation accuracy batata hai.

---

## 4. The Sprint Rollover Dilemma: What Happens to Incomplete Work?

Jab Sprint ka End Date aa jata hai aur sprint close hota hai, to 99% teams ke paas kuch tasks adhoore (`IN_PROGRESS` ya `TODO`) reh jaate hain.

### Real-World Question: Unfinished tasks ka kya hota hai?
TaskFlow do industry-standard rollover options provide karta hai:
1. **Move to Product Backlog (Default):**
   - Incomplete items ka `sprint` reference `None` kar diya jata hai aur status `BACKLOG` ban jata hai.
   - Completed items (`status == DONE`) permanently sprint ke saath linked rehte hain taaki historical reports accurate rahein.
2. **Move to Next Planned Sprint:**
   - Incomplete items direct agle planned sprint (e.g. `Sprint 2`) mein transfer ho jaate hain.

```python
# Atomic Rollover Logic
incomplete_items = sprint.work_items.exclude(status=WorkItem.Status.DONE)

if next_sprint_id:
    incomplete_items.update(sprint=target_sprint)
elif rollover_to_backlog:
    incomplete_items.update(sprint=None, status=WorkItem.Status.BACKLOG)
```

---

## 5. Mobile-First Kanban Architecture: Drag-and-Drop vs Touch Selectors

HTML5 Drag and Drop API (`onDragStart`, `onDrop`) desktop browsers (mouse and trackpad) par bohot smooth chalti hai. Lekin mobile touch screens (iOS Safari, Android Chrome) par HTML5 drag-and-drop bohot unreliable aur glitchy hoti hai (accidental page scrolling, missing touch events).

### TaskFlow's Dual-Control Pattern:
1. **Desktop:** Full HTML5 drag-and-drop with hover shadow preview.
2. **Mobile & Touch:** Har card ke upar quick touch buttons (`<` and `>`) aur quick column dropdown selectors hain jo touch screens par 100% reliable single-tap transitions allow karte hain.

---

## 6. Top Interview Questions & Answers

### Q1: How do you enforce business rules like "Only 1 Active Sprint per Project" in a distributed web app?
**Ans:** Frontend checks can be bypassed by concurrent API calls. In TaskFlow, we wrap the `start_sprint` service inside a database transaction and execute `Project.objects.select_for_update().get(id=...)` to acquire a PostgreSQL row lock. We then query for any existing sprint with `status='ACTIVE'`. This serializes concurrent activations, guaranteeing that exactly one sprint can be active at any given moment.

### Q2: What happens to story points when a sprint is completed with unfinished tasks?
**Ans:** Only work items marked as `DONE` contribute to the sprint's `completed_story_points`. Incomplete tasks do not grant partial points. Incomplete tasks are atomically rolled over either back to the product backlog or into the next planned sprint, while the finished tasks remain linked to the closed sprint to preserve accurate velocity and audit metrics.

### Q3: Why do items transition from BACKLOG to TODO when a sprint is started?
**Ans:** In the Product Backlog, work is prioritized wishlist data (`status='BACKLOG'`). Once the team commits to building those items in an active time-box, they enter the active execution pipeline (`status='TODO'`), making them immediately available as cards on the Kanban board.
