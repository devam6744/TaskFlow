"""
Global Full-Text Search Engine — Phase 9: Scoped Multi-Tenant Search

Capabilities:
• PostgreSQL Full-Text Search with SearchVector / SearchRank (or portable fallback).
• Strict multi-tenancy workspace isolation + private project permission gating.
• Multi-entity aggregation: WorkItems, Sprints, Projects.
• Safe ORM parameterized execution (zero raw SQL string interpolation).
"""

from typing import Any, Dict, List
from django.db import connection
from django.db.models import Q
from apps.workspaces.models import Workspace
from apps.projects.models import Project, Sprint, WorkItem
from apps.projects.services import has_project_access


def global_workspace_search(
    workspace: Workspace,
    user,
    query: str,
    search_type: str = 'all',
    limit: int = 25
) -> Dict[str, Any]:
    """
    Search across work items, sprints, and projects within a single workspace.
    Guarantees strict tenant isolation and respect for private project permissions.
    """
    query = (query or '').strip()
    if not query:
        return {
            'query': '',
            'total_results': 0,
            'work_items': [],
            'sprints': [],
            'projects': [],
        }

    # 1. Filter accessible projects
    all_projects = Project.objects.filter(workspace=workspace, status=Project.Status.ACTIVE)
    accessible_projects = [p for p in all_projects if has_project_access(p, user)]
    project_ids = [p.id for p in accessible_projects]

    results_work_items: List[Dict[str, Any]] = []
    results_sprints: List[Dict[str, Any]] = []
    results_projects: List[Dict[str, Any]] = []

    is_postgres = connection.vendor == 'postgresql'

    # A. Search Work Items
    if search_type in ['all', 'work_item']:
        wi_qs = WorkItem.objects.filter(
            project_id__in=project_ids,
            archived_at__isnull=True
        ).select_related('project', 'assignee', 'sprint')

        # Check if query is looking for key e.g. "TF-5" or numeric "5"
        key_matches = Q()
        if '-' in query:
            parts = query.split('-', 1)
            prefix, num = parts[0].strip().upper(), parts[1].strip()
            if num.isdigit():
                key_matches = Q(project__key=prefix, item_number=int(num))
        elif query.isdigit():
            key_matches = Q(item_number=int(query))

        if is_postgres:
            try:
                from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
                vector = SearchVector('title', weight='A') + SearchVector('description', weight='B')
                search_query = SearchQuery(query)
                wi_search_qs = wi_qs.annotate(
                    rank=SearchRank(vector, search_query)
                ).filter(
                    Q(rank__gte=0.1) | key_matches | Q(title__icontains=query)
                ).order_by('-rank', '-created_at')[:limit]
            except Exception:
                wi_search_qs = wi_qs.filter(
                    key_matches | Q(title__icontains=query) | Q(description__icontains=query)
                ).order_by('-created_at')[:limit]
        else:
            wi_search_qs = wi_qs.filter(
                key_matches | Q(title__icontains=query) | Q(description__icontains=query)
            ).order_by('-created_at')[:limit]

        for item in wi_search_qs:
            results_work_items.append({
                'id': str(item.id),
                'type': 'work_item',
                'item_type': item.type,
                'key_identifier': item.key_identifier,
                'item_number': item.item_number,
                'title': item.title,
                'status': item.status,
                'priority': item.priority,
                'story_points': item.story_points,
                'project_slug': item.project.slug,
                'project_name': item.project.name,
                'assignee_name': getattr(item.assignee, 'display_name', None) or (item.assignee.email if item.assignee else None),
                'sprint_name': item.sprint.name if item.sprint else None,
                'target_url': f"/dashboard/projects/{item.project.slug}/backlog?highlight={item.item_number}",
            })

    # B. Search Sprints
    if search_type in ['all', 'sprint']:
        sprint_qs = Sprint.objects.filter(
            project_id__in=project_ids
        ).filter(
            Q(name__icontains=query) | Q(sprint_goal__icontains=query)
        ).select_related('project')[:limit]

        for sprint in sprint_qs:
            results_sprints.append({
                'id': str(sprint.id),
                'type': 'sprint',
                'name': sprint.name,
                'sprint_goal': sprint.sprint_goal,
                'status': sprint.status,
                'project_slug': sprint.project.slug,
                'project_name': sprint.project.name,
                'planned_points': sprint.planned_story_points,
                'target_url': f"/dashboard/projects/{sprint.project.slug}/active-sprint" if sprint.status == Sprint.Status.ACTIVE else f"/dashboard/projects/{sprint.project.slug}/backlog",
            })

    # C. Search Projects
    if search_type in ['all', 'project']:
        for proj in accessible_projects:
            if (
                query.lower() in proj.name.lower()
                or query.lower() in proj.key.lower()
                or query.lower() in proj.description.lower()
            ):
                results_projects.append({
                    'id': str(proj.id),
                    'type': 'project',
                    'name': proj.name,
                    'key': proj.key,
                    'slug': proj.slug,
                    'description': proj.description,
                    'visibility': proj.visibility,
                    'target_url': f"/dashboard/projects/{proj.slug}/backlog",
                })

    total_count = len(results_work_items) + len(results_sprints) + len(results_projects)

    return {
        'query': query,
        'total_results': total_count,
        'work_items': results_work_items,
        'sprints': results_sprints,
        'projects': results_projects,
    }
