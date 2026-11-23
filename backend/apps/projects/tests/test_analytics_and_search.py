"""
Test Suite — Phase 9: Sprint Analytics, Burndown Charts & Global Search

Covers:
1. Burndown Dataset Math (Ideal linear line vs Actual remaining story points)
2. Sprint Report & Scope Delta tracking (mid-sprint additions/removals)
3. Historical Velocity Calculation and Trend Analysis
4. Workspace Executive Dashboard Summary Aggregates
5. Global Full-Text Search with multi-tenant workspace isolation & private project filtering
"""

import pytest
from datetime import date, timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.workspaces.models import Workspace, WorkspaceMember
from apps.projects.models import Project, ProjectMember, Sprint, WorkItem, SprintScopeEvent
from apps.projects.analytics import (
    record_daily_sprint_snapshot,
    get_sprint_burndown_data,
    get_sprint_report_metrics,
    get_project_velocity_history,
    get_workspace_dashboard_summary,
)
from apps.projects.search import global_workspace_search

User = get_user_model()


@pytest.fixture
def auth_setup(db):
    user_a = User.objects.create_user(
        email="lead@taskflow.dev",
        password="ValidPassword123!",
        display_name="Dev Lead"
    )
    user_b = User.objects.create_user(
        email="dev@taskflow.dev",
        password="ValidPassword123!",
        display_name="Junior Dev"
    )
    outsider = User.objects.create_user(
        email="outsider@taskflow.dev",
        password="ValidPassword123!",
        display_name="Outsider"
    )

    workspace = Workspace.objects.create(
        name="Analytics Workspace",
        slug="analytics-ws",
        owner=user_a
    )
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=user_a,
        role=WorkspaceMember.Role.OWNER,
        status=WorkspaceMember.Status.ACTIVE
    )
    WorkspaceMember.objects.create(
        workspace=workspace,
        user=user_b,
        role=WorkspaceMember.Role.MEMBER,
        status=WorkspaceMember.Status.ACTIVE
    )

    project = Project.objects.create(
        workspace=workspace,
        name="Alpha Project",
        slug="alpha-project",
        key="ALP",
        visibility=Project.Visibility.WORKSPACE,
        lead=user_a,
        created_by=user_a
    )

    return {
        'user_a': user_a,
        'user_b': user_b,
        'outsider': outsider,
        'workspace': workspace,
        'project': project,
    }


@pytest.mark.django_db
class TestSprintAnalyticsAndBurndown:
    def test_burndown_ideal_and_actual_math(self, auth_setup):
        project = auth_setup['project']
        user = auth_setup['user_a']
        today = timezone.now().date()
        start_date = today - timedelta(days=2)
        end_date = today + timedelta(days=5)

        sprint = Sprint.objects.create(
            project=project,
            name="Sprint 1 - Foundations",
            sprint_goal="Complete auth and analytics",
            start_date=start_date,
            end_date=end_date,
            actual_started_at=timezone.now() - timedelta(days=2),
            status=Sprint.Status.ACTIVE,
            planned_story_points=10,
            created_by=user
        )

        item1 = WorkItem.objects.create(
            project=project,
            item_number=1,
            title="Database Setup",
            sprint=sprint,
            story_points=5,
            status=WorkItem.Status.DONE,
            resolved_at=timezone.now() - timedelta(days=1),
            reporter=user
        )
        item2 = WorkItem.objects.create(
            project=project,
            item_number=2,
            title="API Endpoints",
            sprint=sprint,
            story_points=5,
            status=WorkItem.Status.IN_PROGRESS,
            reporter=user
        )

        burndown = get_sprint_burndown_data(sprint)

        assert burndown['planned_story_points'] == 10
        assert burndown['completed_story_points'] == 5
        assert burndown['remaining_story_points'] == 5
        assert burndown['total_days'] == 7
        assert len(burndown['series']) == 8  # Day 0 through Day 7

        # Day 0 should start with ideal 10
        assert burndown['series'][0]['ideal'] == 10.0
        # Final Day should reach ideal 0
        assert burndown['series'][-1]['ideal'] == 0.0

    def test_sprint_report_metrics_and_scope_delta(self, auth_setup):
        project = auth_setup['project']
        user = auth_setup['user_a']

        sprint = Sprint.objects.create(
            project=project,
            name="Sprint 2 - Core",
            sprint_goal="Scope tracking test",
            status=Sprint.Status.ACTIVE,
            planned_story_points=8,
            created_by=user
        )

        item = WorkItem.objects.create(
            project=project,
            item_number=1,
            title="Scope Creep Item",
            sprint=sprint,
            story_points=3,
            status=WorkItem.Status.TODO,
            reporter=user
        )

        # Record a mid-sprint scope event
        SprintScopeEvent.objects.create(
            sprint=sprint,
            work_item=item,
            event_type=SprintScopeEvent.EventType.ADDED,
            story_points=3,
            created_by=user
        )

        report = get_sprint_report_metrics(sprint)
        assert report['scope_delta']['points_added_mid_sprint'] == 3
        assert report['scope_delta']['net_scope_change'] == 3
        assert report['summary']['planned_story_points'] == 8

    def test_project_velocity_history(self, auth_setup):
        project = auth_setup['project']
        user = auth_setup['user_a']

        now = timezone.now()
        Sprint.objects.create(
            project=project,
            name="Sprint 1",
            status=Sprint.Status.COMPLETED,
            planned_story_points=10,
            completed_story_points=8,
            actual_completed_at=now - timedelta(days=20),
            created_by=user
        )
        Sprint.objects.create(
            project=project,
            name="Sprint 2",
            status=Sprint.Status.COMPLETED,
            planned_story_points=12,
            completed_story_points=12,
            actual_completed_at=now - timedelta(days=6),
            created_by=user
        )

        velocity = get_project_velocity_history(project)
        assert velocity['sprints_analyzed_count'] == 2
        assert velocity['total_completed_points'] == 20
        assert velocity['average_velocity'] == 10.0
        assert len(velocity['sprints']) == 2


@pytest.mark.django_db
class TestWorkspaceDashboardSummaryAndSearch:
    def test_workspace_dashboard_summary(self, auth_setup):
        workspace = auth_setup['workspace']
        project = auth_setup['project']
        user_b = auth_setup['user_b']
        user_a = auth_setup['user_a']

        # Create an assigned task for user_b
        WorkItem.objects.create(
            project=project,
            item_number=10,
            title="Assigned to Dev",
            assignee=user_b,
            reporter=user_a,
            status=WorkItem.Status.IN_PROGRESS,
            due_date=timezone.now().date() - timedelta(days=1)  # Overdue
        )

        summary = get_workspace_dashboard_summary(workspace, user_b)
        assert summary['assigned_to_me_count'] >= 1
        assert summary['overdue_count'] >= 1
        assert summary['assigned_to_me_items'][0]['title'] == "Assigned to Dev"
        assert summary['assigned_to_me_items'][0]['is_overdue'] is True

    def test_global_workspace_search(self, auth_setup):
        workspace = auth_setup['workspace']
        project = auth_setup['project']
        user = auth_setup['user_a']

        WorkItem.objects.create(
            project=project,
            item_number=42,
            title="Implement WebSocket authentication token",
            description="Use query parameter JWT token for Daphne handshake",
            reporter=user,
            status=WorkItem.Status.TODO
        )

        # 1. Search by keyword
        res = global_workspace_search(workspace, user, "WebSocket")
        assert res['total_results'] >= 1
        assert any(i['key_identifier'] == "ALP-42" for i in res['work_items'])

        # 2. Search by key identifier directly
        res_key = global_workspace_search(workspace, user, "ALP-42")
        assert res_key['total_results'] >= 1
        assert res_key['work_items'][0]['key_identifier'] == "ALP-42"

    def test_search_multi_tenant_isolation(self, auth_setup):
        workspace_a = auth_setup['workspace']
        user_a = auth_setup['user_a']

        # Create isolated second workspace
        outsider = auth_setup['outsider']
        workspace_b = Workspace.objects.create(
            name="Confidential Workspace",
            slug="confidential-ws",
            owner=outsider
        )
        WorkspaceMember.objects.create(
            workspace=workspace_b,
            user=outsider,
            role=WorkspaceMember.Role.OWNER,
            status=WorkspaceMember.Status.ACTIVE
        )
        project_b = Project.objects.create(
            workspace=workspace_b,
            name="Secret Project",
            slug="secret-proj",
            key="SEC",
            visibility=Project.Visibility.WORKSPACE,
            lead=outsider,
            created_by=outsider
        )
        WorkItem.objects.create(
            project=project_b,
            item_number=1,
            title="Top Secret Patent Documentation",
            reporter=outsider
        )

        # User in Workspace A searching Workspace A should NEVER see Workspace B items
        res = global_workspace_search(workspace_a, user_a, "Top Secret")
        assert res['total_results'] == 0
        assert len(res['work_items']) == 0

    def test_search_private_project_isolation(self, auth_setup):
        workspace = auth_setup['workspace']
        user_a = auth_setup['user_a']
        user_b = auth_setup['user_b']

        # Create a PRIVATE project where only user_a is member
        private_proj = Project.objects.create(
            workspace=workspace,
            name="Executive Strategy",
            slug="exec-strat",
            key="EXEC",
            visibility=Project.Visibility.PRIVATE,
            lead=user_a,
            created_by=user_a
        )
        WorkItem.objects.create(
            project=private_proj,
            item_number=1,
            title="Confidential Salary Adjustments",
            reporter=user_a
        )

        # User B (regular workspace member not in private project) should NOT see it
        res_user_b = global_workspace_search(workspace, user_b, "Salary")
        assert res_user_b['total_results'] == 0

        # User A (lead/owner) CAN see it
        res_user_a = global_workspace_search(workspace, user_a, "Salary")
        assert res_user_a['total_results'] == 1
        assert res_user_a['work_items'][0]['key_identifier'] == "EXEC-1"


@pytest.mark.django_db
class TestAnalyticsAPIEndpoints:
    def test_burndown_and_velocity_api_endpoints(self, auth_setup):
        client = APIClient()
        user_a = auth_setup['user_a']
        client.force_authenticate(user=user_a)

        workspace = auth_setup['workspace']
        project = auth_setup['project']

        sprint = Sprint.objects.create(
            project=project,
            name="API Test Sprint",
            sprint_goal="Verify API endpoints",
            status=Sprint.Status.ACTIVE,
            planned_story_points=5,
            created_by=user_a
        )

        # Burndown API
        burndown_url = f"/api/v1/workspaces/{workspace.slug}/projects/{project.slug}/sprints/{sprint.id}/burndown/"
        resp = client.get(burndown_url)
        assert resp.status_code == 200
        assert resp.data['sprint_name'] == "API Test Sprint"
        assert 'series' in resp.data

        # Velocity API
        velocity_url = f"/api/v1/workspaces/{workspace.slug}/projects/{project.slug}/velocity/"
        resp_vel = client.get(velocity_url)
        assert resp_vel.status_code == 200
        assert 'average_velocity' in resp_vel.data

        # Dashboard Summary API
        dash_url = f"/api/v1/workspaces/{workspace.slug}/dashboard-summary/"
        resp_dash = client.get(dash_url)
        assert resp_dash.status_code == 200
        assert 'assigned_to_me_count' in resp_dash.data

        # Search API
        search_url = f"/api/v1/workspaces/{workspace.slug}/search/?q=Test"
        resp_search = client.get(search_url)
        assert resp_search.status_code == 200
        assert 'work_items' in resp_search.data
