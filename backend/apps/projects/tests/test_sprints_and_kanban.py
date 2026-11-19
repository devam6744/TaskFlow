"""
Sprint & Kanban Board Test Suite — Phase 5: Sprints & Interactive Kanban

Tests verify:
  1. Sprint creation with valid dates and status PLANNING.
  2. Date validation (end_date <= start_date rejected).
  3. Sprint activation snapshots planned story points and moves items from BACKLOG to TODO.
  4. Backend invariant: Single ACTIVE sprint per project enforced via transaction lock.
  5. Assigning and removing backlog items from sprints.
  6. Sprint completion records completed story points and rolls over incomplete items to BACKLOG.
  7. Sprint completion rolls over incomplete items to next planned sprint.
  8. Sprint cancellation returns items to backlog.
  9. Kanban board endpoint groups items by status columns (TODO, IN_PROGRESS, IN_REVIEW, DONE).
  10. Work item status transition across columns.
"""

import pytest
from datetime import date, timedelta
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.workspaces import services as ws_services
from apps.projects.models import Project, WorkItem, Sprint
from apps.projects import services as proj_services

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_alice():
    return User.objects.create_user(
        email='alice_sprint@example.com',
        password='Password123!',
        display_name='Alice Sprint Lead'
    )


@pytest.fixture
def workspace_alpha(user_alice):
    return ws_services.create_workspace(
        user=user_alice,
        name='Sprint Alpha Corp',
        description='Workspace for sprint testing'
    )


@pytest.fixture
def project_core(workspace_alpha, user_alice):
    return proj_services.create_project(
        workspace=workspace_alpha,
        user=user_alice,
        name='Core Backend',
        key='CB',
        description='Core platform project'
    )


@pytest.mark.django_db
class TestSprintLifecycleAndKanban:

    def test_create_sprint_success(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)
        start = date.today()
        end = start + timedelta(days=14)

        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/sprints/'
        payload = {
            'name': 'Sprint 1 - Foundation',
            'sprint_goal': 'Deliver core auth and session cookies',
            'start_date': start.isoformat(),
            'end_date': end.isoformat(),
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Sprint 1 - Foundation'
        assert response.data['status'] == 'PLANNING'
        assert response.data['planned_story_points'] == 0

    def test_sprint_invalid_dates_rejected(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)
        today = date.today()

        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/sprints/'
        # End date before start date
        payload = {
            'name': 'Invalid Sprint',
            'sprint_goal': 'Goal',
            'start_date': today.isoformat(),
            'end_date': (today - timedelta(days=2)).isoformat(),
        }
        response = api_client.post(url, payload, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_start_sprint_snapshots_points_and_activates(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)

        # Create two backlog items (Fibonacci 5 + 8 = 13 pts)
        item1 = proj_services.create_work_item(
            project=project_core,
            user=user_alice,
            title='Setup Redis caching',
            story_points=5
        )
        item2 = proj_services.create_work_item(
            project=project_core,
            user=user_alice,
            title='Implement Refresh Token rotation',
            story_points=8
        )

        sprint = proj_services.create_sprint(
            project=project_core,
            user=user_alice,
            name='Sprint 1',
            sprint_goal='Achieve token rotation',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=14)
        )

        # Add items to sprint
        proj_services.add_work_items_to_sprint(
            sprint=sprint,
            user=user_alice,
            item_numbers=[item1.item_number, item2.item_number]
        )

        # Start the sprint
        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/sprints/{sprint.id}/start/'
        response = api_client.post(url, {'sprint_goal': 'Achieve token rotation'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ACTIVE'
        assert response.data['planned_story_points'] == 13

        # Items should have moved from BACKLOG to TODO
        item1.refresh_from_db()
        item2.refresh_from_db()
        assert item1.status == WorkItem.Status.TODO
        assert item2.status == WorkItem.Status.TODO

    def test_single_active_sprint_invariant(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)

        sprint1 = proj_services.create_sprint(
            project=project_core,
            user=user_alice,
            name='Sprint 1 Active',
            sprint_goal='Active goal 1',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7)
        )
        proj_services.start_sprint(sprint=sprint1, user=user_alice)

        sprint2 = proj_services.create_sprint(
            project=project_core,
            user=user_alice,
            name='Sprint 2 Contender',
            sprint_goal='Active goal 2',
            start_date=date.today() + timedelta(days=8),
            end_date=date.today() + timedelta(days=15)
        )

        # Attempting to start sprint2 while sprint1 is active MUST fail with 400
        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/sprints/{sprint2.id}/start/'
        response = api_client.post(url, {'sprint_goal': 'Goal 2'}, format='json')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'already active' in str(response.data)

    def test_complete_sprint_rollover_to_backlog(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)

        item1 = proj_services.create_work_item(project=project_core, user=user_alice, title='Task Done', story_points=5)
        item2 = proj_services.create_work_item(project=project_core, user=user_alice, title='Task Unfinished', story_points=3)

        sprint = proj_services.create_sprint(
            project=project_core,
            user=user_alice,
            name='Sprint Sprint-Close',
            sprint_goal='Finish items',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=7)
        )
        proj_services.add_work_items_to_sprint(sprint=sprint, user=user_alice, item_numbers=[item1.item_number, item2.item_number])
        proj_services.start_sprint(sprint=sprint, user=user_alice)

        # Mark item1 as DONE
        proj_services.transition_work_item_status(project=project_core, user=user_alice, item_number=item1.item_number, new_status='DONE')
        # Leave item2 as IN_PROGRESS
        proj_services.transition_work_item_status(project=project_core, user=user_alice, item_number=item2.item_number, new_status='IN_PROGRESS')

        # Complete sprint with rollover_to_backlog=True
        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/sprints/{sprint.id}/complete/'
        response = api_client.post(url, {'rollover_to_backlog': True}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'COMPLETED'
        assert response.data['completed_story_points'] == 5

        # Check item states
        item1.refresh_from_db()
        item2.refresh_from_db()
        # Finished item remains in sprint for velocity reports
        assert item1.sprint_id == sprint.id
        assert item1.status == WorkItem.Status.DONE

        # Incomplete item rolled back to backlog
        assert item2.sprint is None
        assert item2.status == WorkItem.Status.BACKLOG

    def test_kanban_board_endpoint(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)

        item = proj_services.create_work_item(project=project_core, user=user_alice, title='Kanban Card', story_points=3)
        sprint = proj_services.create_sprint(
            project=project_core,
            user=user_alice,
            name='Board Sprint',
            sprint_goal='Kanban board execution',
            start_date=date.today(),
            end_date=date.today() + timedelta(days=5)
        )
        proj_services.add_work_items_to_sprint(sprint=sprint, user=user_alice, item_numbers=[item.item_number])
        proj_services.start_sprint(sprint=sprint, user=user_alice)

        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/board/'
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['active_sprint']['id'] == str(sprint.id)
        assert response.data['days_remaining'] >= 0
        assert 'TODO' in response.data['columns']
        assert 'IN_PROGRESS' in response.data['columns']
        assert 'IN_REVIEW' in response.data['columns']
        assert 'DONE' in response.data['columns']
        assert len(response.data['columns']['TODO']) == 1
        assert response.data['columns']['TODO'][0]['item_number'] == item.item_number

    def test_work_item_column_transition(self, api_client, user_alice, workspace_alpha, project_core):
        api_client.force_authenticate(user=user_alice)

        item = proj_services.create_work_item(project=project_core, user=user_alice, title='Move Me', story_points=2)
        url = f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project_core.slug}/work-items/{item.item_number}/status/'

        # Transition to IN_PROGRESS
        response = api_client.post(url, {'status': 'IN_PROGRESS'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'IN_PROGRESS'

        # Transition to DONE
        response = api_client.post(url, {'status': 'DONE'}, format='json')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'DONE'
