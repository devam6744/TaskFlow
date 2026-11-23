"""
Analytics & Metrics Engine — Phase 9: Sprint Analytics, Burndown Charts & Reporting

Core Capabilities:
1. get_sprint_burndown_data:
   - Computes daily Ideal Burn vs Actual Burn time series for active or completed sprints.
   - Combines recorded SprintDailySnapshots with dynamic WorkItem resolution fallback.
2. get_sprint_report_metrics:
   - Planned vs Completed Story Points, Scope Delta (creep), and Type/Assignee breakdowns.
3. get_project_velocity_history:
   - Calculates historical team velocity across past sprints with averages and trends.
4. get_workspace_dashboard_summary:
   - Executive dashboard aggregates: Assigned to Me, Overdue, Blocked, Active Sprint Health.
"""

from datetime import date, timedelta
from typing import Any, Dict, List
from django.utils import timezone
from django.db.models import Sum, Q, Count

from apps.workspaces.models import Workspace
from apps.projects.models import Project, Sprint, WorkItem, SprintDailySnapshot, SprintScopeEvent, WorkItemDependency
from apps.projects.services import has_project_access


def record_daily_sprint_snapshot(sprint: Sprint, snapshot_date: date | None = None) -> SprintDailySnapshot:
    """
    Capture or update a daily snapshot for a sprint.
    Called on sprint activation, completion, or via Celery beat midnight cron.
    """
    if snapshot_date is None:
        snapshot_date = timezone.now().date()

    all_items = sprint.work_items.filter(archived_at__isnull=True)
    total_pts = sum(i.story_points or 0 for i in all_items)

    done_items = all_items.filter(status=WorkItem.Status.DONE)
    completed_pts = sum(i.story_points or 0 for i in done_items)
    remaining_pts = max(0, total_pts - completed_pts)

    snapshot, _ = SprintDailySnapshot.objects.update_or_create(
        sprint=sprint,
        snapshot_date=snapshot_date,
        defaults={
            'total_story_points': total_pts,
            'remaining_story_points': remaining_pts,
            'completed_story_points': completed_pts,
            'remaining_items_count': all_items.exclude(status=WorkItem.Status.DONE).count(),
            'completed_items_count': done_items.count(),
        }
    )
    return snapshot


def get_sprint_burndown_data(sprint: Sprint) -> Dict[str, Any]:
    """
    Generate daily Burndown Chart data points for Recharts / SVG visualization.
    Calculates:
      • Ideal Linear Burn Line (starts at planned_story_points and reaches 0 at end_date)
      • Actual Remaining Points (from snapshots or dynamic item resolution tracking)
      • Pace Status ('AHEAD', 'ON_TRACK', 'BEHIND', 'AT_RISK')
    """
    start = sprint.start_date or (sprint.actual_started_at.date() if sprint.actual_started_at else sprint.created_at.date())
    end = sprint.end_date or (start + timedelta(days=14))
    today = timezone.now().date()

    total_days = max(1, (end - start).days)
    planned_pts = sprint.planned_story_points or sum(i.story_points or 0 for i in sprint.work_items.all())

    # Fetch any existing snapshots
    snapshots_by_date = {
        s.snapshot_date: s for s in sprint.daily_snapshots.all()
    }

    # Fetch all work items in sprint for dynamic fallback
    work_items = list(sprint.work_items.filter(archived_at__isnull=True))
    total_sprint_pts = sum(i.story_points or 0 for i in work_items)

    series: List[Dict[str, Any]] = []

    # Daily burn rate for ideal line
    daily_ideal_burn = planned_pts / total_days if total_days > 0 else planned_pts

    current_actual_pts = None

    for day_index in range(total_days + 1):
        current_date = start + timedelta(days=day_index)
        is_future = current_date > today and sprint.status == Sprint.Status.ACTIVE

        # Calculate Ideal points for this day
        ideal_pts = max(0.0, round(planned_pts - (daily_ideal_burn * day_index), 1))

        # Calculate Actual points
        actual_pts = None
        remaining_items = 0
        completed_items = 0

        if not is_future:
            if current_date in snapshots_by_date:
                snap = snapshots_by_date[current_date]
                actual_pts = snap.remaining_story_points
                remaining_items = snap.remaining_items_count
                completed_items = snap.completed_items_count
            else:
                # Dynamic calculation based on item resolution dates
                resolved_before_day = [
                    item for item in work_items
                    if item.status == WorkItem.Status.DONE
                    and item.resolved_at
                    and item.resolved_at.date() <= current_date
                ]
                completed_pts = sum(i.story_points or 0 for i in resolved_before_day)
                actual_pts = max(0, total_sprint_pts - completed_pts)
                completed_items = len(resolved_before_day)
                remaining_items = max(0, len(work_items) - completed_items)

            current_actual_pts = actual_pts

        series.append({
            'date': current_date.isoformat(),
            'day_label': f"Day {day_index}",
            'display_date': current_date.strftime('%b %d'),
            'ideal': ideal_pts,
            'actual': actual_pts,
            'remaining_points': actual_pts if actual_pts is not None else 0,
            'completed_points': (total_sprint_pts - actual_pts) if actual_pts is not None else 0,
            'remaining_items': remaining_items,
            'completed_items': completed_items,
            'is_today': (current_date == today),
            'is_future': is_future,
        })

    # Determine Pace Status
    pace_status = 'ON_TRACK'
    if current_actual_pts is not None and not is_future:
        # Find today's ideal
        today_ideal = next((s['ideal'] for s in series if s['is_today']), None)
        if today_ideal is not None:
            delta = current_actual_pts - today_ideal
            if delta < -2:
                pace_status = 'AHEAD'
            elif delta > 5:
                pace_status = 'AT_RISK'
            elif delta > 2:
                pace_status = 'BEHIND'
            else:
                pace_status = 'ON_TRACK'

    days_remaining = max(0, (end - today).days) if sprint.status == Sprint.Status.ACTIVE else 0

    done_items_count = sum(1 for i in work_items if i.status == WorkItem.Status.DONE)
    completed_points_now = sum(i.story_points or 0 for i in work_items if i.status == WorkItem.Status.DONE)
    remaining_points_now = max(0, total_sprint_pts - completed_points_now)

    return {
        'sprint_id': str(sprint.id),
        'sprint_name': sprint.name,
        'sprint_goal': sprint.sprint_goal,
        'status': sprint.status,
        'start_date': start.isoformat(),
        'end_date': end.isoformat(),
        'total_days': total_days,
        'days_remaining': days_remaining,
        'planned_story_points': planned_pts,
        'total_story_points': total_sprint_pts,
        'completed_story_points': completed_points_now,
        'remaining_story_points': remaining_points_now,
        'total_items_count': len(work_items),
        'completed_items_count': done_items_count,
        'remaining_items_count': max(0, len(work_items) - done_items_count),
        'completion_percentage': round((completed_points_now / planned_pts * 100), 1) if planned_pts > 0 else 0,
        'pace_status': pace_status,
        'series': series,
    }


def get_sprint_report_metrics(sprint: Sprint) -> Dict[str, Any]:
    """
    Comprehensive sprint performance and retrospective metrics report.
    Includes Planned vs Completed, Scope Delta, and Type/Assignee breakdowns.
    """
    burndown = get_sprint_burndown_data(sprint)
    work_items = list(sprint.work_items.filter(archived_at__isnull=True).select_related('assignee'))

    # Scope Delta: Items added/removed after sprint start
    scope_events = sprint.scope_events.all()
    points_added = sum(e.story_points for e in scope_events if e.event_type == SprintScopeEvent.EventType.ADDED)
    points_removed = sum(e.story_points for e in scope_events if e.event_type == SprintScopeEvent.EventType.REMOVED)
    net_scope_change = points_added - points_removed

    # Type Breakdown
    type_counts: Dict[str, Dict[str, int]] = {}
    for item in work_items:
        t = item.type
        if t not in type_counts:
            type_counts[t] = {'total': 0, 'completed': 0, 'points': 0}
        type_counts[t]['total'] += 1
        type_counts[t]['points'] += (item.story_points or 0)
        if item.status == WorkItem.Status.DONE:
            type_counts[t]['completed'] += 1

    # Member Breakdown
    assignee_stats: Dict[str, Dict[str, Any]] = {}
    for item in work_items:
        key = item.assignee.email if item.assignee else 'Unassigned'
        name = getattr(item.assignee, 'display_name', None) or (item.assignee.email if item.assignee else 'Unassigned')
        if key not in assignee_stats:
            assignee_stats[key] = {
                'name': name,
                'email': key,
                'total_items': 0,
                'completed_items': 0,
                'total_points': 0,
                'completed_points': 0,
            }
        assignee_stats[key]['total_items'] += 1
        assignee_stats[key]['total_points'] += (item.story_points or 0)
        if item.status == WorkItem.Status.DONE:
            assignee_stats[key]['completed_items'] += 1
            assignee_stats[key]['completed_points'] += (item.story_points or 0)

    return {
        'summary': burndown,
        'scope_delta': {
            'points_added_mid_sprint': points_added,
            'points_removed_mid_sprint': points_removed,
            'net_scope_change': net_scope_change,
            'events_count': scope_events.count(),
        },
        'type_breakdown': type_counts,
        'assignee_breakdown': list(assignee_stats.values()),
    }


def get_project_velocity_history(project: Project, limit: int = 10) -> Dict[str, Any]:
    """
    Computes historical velocity for past completed sprints.
    """
    completed_sprints = list(
        Sprint.objects.filter(project=project, status=Sprint.Status.COMPLETED)
        .order_by('-actual_completed_at')[:limit]
    )

    # Reverse to show chronological order
    completed_sprints.reverse()

    sprint_data = []
    total_completed = 0

    for sprint in completed_sprints:
        planned = sprint.planned_story_points
        completed = sprint.completed_story_points
        total_completed += completed
        rate = round((completed / planned * 100), 1) if planned > 0 else 100.0

        sprint_data.append({
            'sprint_id': str(sprint.id),
            'sprint_name': sprint.name,
            'planned_points': planned,
            'completed_points': completed,
            'completion_rate': rate,
            'completed_at': sprint.actual_completed_at.isoformat() if sprint.actual_completed_at else None,
        })

    count = len(sprint_data)
    avg_velocity = round(total_completed / count, 1) if count > 0 else 0.0

    # Trend calculation
    trend = 'STABLE'
    if count >= 3:
        recent_half = sprint_data[count // 2:]
        earlier_half = sprint_data[:count // 2]
        recent_avg = sum(s['completed_points'] for s in recent_half) / len(recent_half)
        earlier_avg = sum(s['completed_points'] for s in earlier_half) / len(earlier_half)
        if recent_avg > earlier_avg * 1.1:
            trend = 'INCREASING'
        elif recent_avg < earlier_avg * 0.9:
            trend = 'DECREASING'

    return {
        'project_id': str(project.id),
        'project_name': project.name,
        'project_key': project.key,
        'average_velocity': avg_velocity,
        'total_completed_points': total_completed,
        'sprints_analyzed_count': count,
        'trend': trend,
        'sprints': sprint_data,
    }


def get_workspace_dashboard_summary(workspace: Workspace, user) -> Dict[str, Any]:
    """
    Top-level executive summary for the workspace dashboard.
    Gathers:
      • Assigned to Me items
      • Overdue items count
      • Blocked items count
      • Active Sprints health across accessible projects
      • Recent Collaboration Activity
    """
    today = timezone.now().date()

    # Accessible projects
    projects = Project.objects.filter(workspace=workspace, status=Project.Status.ACTIVE)
    accessible_projects = [p for p in projects if has_project_access(p, user)]
    project_ids = [p.id for p in accessible_projects]

    # 1. Assigned to Me
    assigned_items = list(
        WorkItem.objects.filter(
            project_id__in=project_ids,
            assignee=user,
            archived_at__isnull=True
        )
        .exclude(status=WorkItem.Status.DONE)
        .select_related('project', 'sprint')
        .order_by('-priority', 'due_date', '-created_at')[:10]
    )

    assigned_to_me_payload = [
        {
            'id': str(i.id),
            'item_number': i.item_number,
            'key_identifier': i.key_identifier,
            'title': i.title,
            'type': i.type,
            'priority': i.priority,
            'status': i.status,
            'story_points': i.story_points,
            'due_date': i.due_date.isoformat() if i.due_date else None,
            'is_overdue': bool(i.due_date and i.due_date < today),
            'project_slug': i.project.slug,
            'project_name': i.project.name,
        }
        for i in assigned_items
    ]

    # 2. Overdue Items Count
    overdue_count = WorkItem.objects.filter(
        project_id__in=project_ids,
        due_date__lt=today,
        archived_at__isnull=True
    ).exclude(status=WorkItem.Status.DONE).count()

    # 3. Blocked Items Count
    blocked_ids = WorkItemDependency.objects.filter(
        blocked_item__project_id__in=project_ids,
        blocking_item__archived_at__isnull=True,
    ).exclude(blocking_item__status=WorkItem.Status.DONE).values_list('blocked_item_id', flat=True).distinct()

    blocked_count = len(blocked_ids)

    # 4. Active Sprints Overview
    active_sprints = Sprint.objects.filter(
        project_id__in=project_ids,
        status=Sprint.Status.ACTIVE
    ).select_related('project')

    active_sprints_payload = []
    for s in active_sprints:
        total_items = s.work_items.filter(archived_at__isnull=True).count()
        done_items = s.work_items.filter(archived_at__isnull=True, status=WorkItem.Status.DONE).count()
        completed_pts = sum(i.story_points or 0 for i in s.work_items.filter(status=WorkItem.Status.DONE))
        planned_pts = s.planned_story_points or 1
        pct = round((completed_pts / planned_pts * 100), 1) if planned_pts > 0 else 0

        end = s.end_date or (s.start_date + timedelta(days=14) if s.start_date else today)
        days_left = max(0, (end - today).days)

        active_sprints_payload.append({
            'id': str(s.id),
            'name': s.name,
            'project_name': s.project.name,
            'project_slug': s.project.slug,
            'planned_points': s.planned_story_points,
            'completed_points': completed_pts,
            'completion_percentage': pct,
            'total_items': total_items,
            'done_items': done_items,
            'days_remaining': days_left,
            'end_date': end.isoformat(),
        })

    # 5. Recent Activity
    try:
        from apps.collaboration.models import ActivityLog
        recent_logs = list(
            ActivityLog.objects.filter(workspace=workspace)
            .select_related('actor')
            .order_by('-created_at')[:8]
        )
        activity_payload = [
            {
                'id': str(log.id),
                'actor_name': getattr(log.actor, 'display_name', None) or (log.actor.email if log.actor else 'System'),
                'event_type': log.event_type,
                'object_type': log.object_type,
                'metadata': log.metadata,
                'created_at': log.created_at.isoformat(),
            }
            for log in recent_logs
        ]
    except Exception:
        activity_payload = []

    return {
        'workspace_slug': workspace.slug,
        'workspace_name': workspace.name,
        'assigned_to_me_count': len(assigned_items),
        'assigned_to_me_items': assigned_to_me_payload,
        'overdue_count': overdue_count,
        'blocked_count': blocked_count,
        'active_sprints': active_sprints_payload,
        'accessible_projects_count': len(accessible_projects),
        'recent_activity': activity_payload,
    }
