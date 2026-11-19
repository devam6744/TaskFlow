# Phase 6: Collaboration, Discussion Threads, Attachments & Activity Trail — Concept Learning Guide

> **Target Audience:** Anyone preparing for technical interviews, understanding enterprise collaboration architectures, or learning how production Jira/Linear/Slack-style workflows are built.

---

## 1. Work Item Discussion Threads & The Soft Deletion Pattern 💬

### Why can't we just `DELETE FROM collaboration_comment WHERE id = ...`?
In consumer apps (like WhatsApp or Instagram), when a user deletes a message, it might simply vanish. But in **Enterprise B2B SaaS** (Jira, Linear, GitHub, TaskFlow), hard-deleting comments is a serious problem:
1. **Thread Disruption:** If Developer A asks *"Did you verify the database connection pool?"* and Developer B answers *"Yes, approved"*, hard deleting Developer A's comment leaves Developer B's reply hanging without context.
2. **Compliance & Audit Trails (SOC 2, ISO 27001):** Enterprise auditors require proof of who approved a change, who reported a security flaw, and when.
3. **Accidental Deletions:** Users make mistakes. If data is hard-deleted from PostgreSQL, restoring one comment requires restoring an entire database backup!

### How Soft Deletion Works:
- Instead of deleting the row, we add a `deleted_at` timestamp:
  ```python
  class Comment(models.Model):
      body = models.TextField()
      created_at = models.DateTimeField(auto_now_add=True)
      updated_at = models.DateTimeField(auto_now=True)
      deleted_at = models.DateTimeField(null=True, blank=True)
  ```
- **When user clicks Delete:**
  ```python
  comment.deleted_at = timezone.now()
  comment.save(update_fields=['deleted_at', 'updated_at'])
  ```
- **In Selectors/Queries:**
  ```python
  Comment.objects.filter(work_item=work_item, deleted_at__isnull=True)
  ```
  The row remains safely in PostgreSQL for audits, but disappears cleanly from the active UI!

---

## 2. Event-Driven Activity Audit Logging 📜

Har enterprise system me sabse important sawal hota hai:
> *"Iss ticket ka status kisne badla? Aur kab badla?"*

Agar hum sirf `WorkItem.status = 'DONE'` update karenge, toh database me sirf latest status store hoga — pehle kya tha, kisne kab change kiya, uska koi record nahi bachega.

### Polymorphic Activity Schema (`ActivityEvent`):
TaskFlow uses a **Generic Activity Logger**:
```python
class ActivityEvent(models.Model):
    workspace = models.ForeignKey(Workspace, on_delete=models.CASCADE)
    actor = models.ForeignKey(User, null=True, on_delete=models.SET_NULL)
    object_type = models.CharField(max_length=50) # 'WorkItem', 'Sprint', 'Project'
    object_id = models.UUIDField()
    event_type = models.CharField(max_length=50) # 'STATUS_CHANGED', 'COMMENT_ADDED', 'SPRINT_ASSIGNED'
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
```

Jab bhi work item ka status change hota hai:
```python
record_activity_event(
    workspace=project.workspace,
    actor=request.user,
    object_type='WorkItem',
    object_id=item.id,
    event_type='STATUS_CHANGED',
    metadata={
        'old_status': 'TODO',
        'new_status': 'IN_PROGRESS',
        'key_identifier': 'TF-2'
    }
)
```
Frontend is data ko read karke ek sundar visual vertical timeline render karta hai!

---

## 3. Secure File Attachments & MIME Type Defense 📎

### The Vulnerability: Fake File Extensions
Ek attacker malicious script file (`malicious.php` ya `exploit.exe`) ko rename karke `image.png` bana sakta hai. Agar backend sirf file name ka extension check karega, toh malicious executable server par upload ho jayega!

### Defense in Depth:
1. **Server-side Size Validation:**
   ```python
   if file_obj.size > 10 * 1024 * 1024: # 10 MB
       raise ValidationError("File exceeds 10 MB limit.")
   ```
2. **MIME Type Whitelist:**
   Only safe document and image formats are permitted (`image/png`, `application/pdf`, `text/plain`, `application/zip`).
3. **Private Storage Pathing:**
   Files are stored with isolated date paths (`attachments/%Y/%m/%d/`) avoiding directory traversal (`../../`).

---

## 4. Directed Acyclic Graphs (DAG) & Dependency Cycle Detection 🔄

### The Circular Dependency Problem:
- Maan lijiye:
  - **Task A (Frontend):** *"Blocked by Task B"* (Backend API banana hai).
  - Agar koi galti se **Task B** par set kar de: *"Blocked by Task A"*!
- Yeh ek **Deadlock** ban gaya!
  - Frontend bolega: *"Pehle Backend banao tab main shuru karunga."*
  - Backend bolega: *"Pehle Frontend banao tab main shuru karunga."*
  - Dono tasks hamesha ke liye block ho jayenge!

### The Solution: Depth-First Search (DFS) Cycle Detection Algorithm
Jab bhi koi dependency add karta hai (`blocking_item blocks target_item`):
1. Hum check karte hain: **Kya `target_item` already kisi chain ke through `blocking_item` ko block kar raha hai?**
   ```
   target_item ➔ [item C] ➔ [item D] ➔ blocking_item ?
   ```
2. Hum standard Graph Traversal (Queue/Stack) use karte hain:
   ```python
   def check_dependency_cycle(blocking_item_id, target_blocked_id) -> bool:
       visited = set()
       queue = [target_blocked_id]
       
       while queue:
           current_id = queue.pop(0)
           if current_id == blocking_item_id:
               return True # Cycle detected!
           if current_id in visited:
               continue
           visited.add(current_id)
           # Get all items blocked by current_id
           blocked_ids = WorkItemDependency.objects.filter(
               blocking_item_id=current_id
           ).values_list('blocked_item_id', flat=True)
           for b_id in blocked_ids:
               if b_id not in visited:
                   queue.append(b_id)
       return False
   ```
3. Agar cycle milti hai, toh API turant **400 Bad Request: "Circular dependency detected"** return karti hai!

---

## 5. Summary Checklist for Interviews

1. **Collaboration Model:** Scoped to WorkItem, linked to author and workspace.
2. **Soft Delete:** Preserves historical context and audit trail (`deleted_at`).
3. **Activity Logging:** Structured JSON metadata allows recording any arbitrary domain event without changing database schema.
4. **File Safety:** 10MB limit + strict server-side content-type inspection.
5. **Cycle Detection:** DFS graph traversal guarantees a Directed Acyclic Graph (DAG) for agile task management.
