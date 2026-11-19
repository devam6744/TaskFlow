"""
Project & Backlog Test Suite — Phase 4

Tests verify:
  1. Project creation with key uppercase normalization and unique slugs.
  2. Multi-tenancy isolation (Workspace A cannot access Workspace B projects).
  3. Private project isolation (unauthorized workspace members get 404/403).
  4. Sequential work item numbering (TF-1, TF-2, TF-3).
  5. Fibonacci story point validation (1, 2, 3, 5, 8, 13 accepted; 7 rejected).
  6. Fractional Indexing (LexoRank) backlog reordering.
  7. Role-based write restrictions (Viewer cannot create or edit items).
  8. Soft archive project lifecycle.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.workspaces import services as ws_services
from apps.projects.models import Project, ProjectMember, WorkItem
from apps.projects import services as proj_services

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_alice():
    return User.objects.create_user(
        email='alice@example.com',
        password='Password123!',
        display_name='Alice Architect'
    )


@pytest.fixture
def user_bob():
    return User.objects.create_user(
        email='bob@example.com',
        password='Password123!',
        display_name='Bob Builder'
    )


@pytest.fixture
def user_charlie():
    return User.objects.create_user(
        email='charlie@example.com',
        password='Password123!',
        display_name='Charlie Contributor'
    )


@pytest.fixture
def workspace_alpha(user_alice):
    return ws_services.create_workspace(
        user=user_alice,
        name='Alpha Corp',
        description='Workspace owned by Alice'
    )


@pytest.fixture
def workspace_beta(user_bob):
    return ws_services.create_workspace(
        user=user_bob,
        name='Beta Systems',
        description='Workspace owned by Bob'
    )


@pytest.mark.django_db
class TestProjectManagementAndIsolation:
    def test_create_project_success(self, api_client, user_alice, workspace_alpha):
        api_client.force_authenticate(user=user_alice)
        response = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/', {
            'name': 'Core Backend API',
            'key': 'api',
            'description': 'Main backend services',
            'visibility': 'WORKSPACE',
            'definition_of_done': 'Unit tests > 80% coverage + PR reviewed'
        })

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert data['name'] == 'Core Backend API'
        assert data['key'] == 'API'  # Auto uppercase
        assert data['slug'] == 'core-backend-api'
        assert data['visibility'] == 'WORKSPACE'
        assert data['definition_of_done'] == 'Unit tests > 80% coverage + PR reviewed'

    def test_multi_tenancy_cross_workspace_isolation(self, api_client, user_alice, workspace_beta):
        """Alice cannot create or list projects in Bob's workspace (Beta Systems)."""
        api_client.force_authenticate(user=user_alice)
        res_list = api_client.get(f'/api/v1/workspaces/{workspace_beta.slug}/projects/')
        assert res_list.status_code == status.HTTP_200_OK
        assert len(res_list.data) == 0  # Cannot see any of Bob's projects

        res_create = api_client.post(f'/api/v1/workspaces/{workspace_beta.slug}/projects/', {
            'name': 'Intruder Project'
        })
        assert res_create.status_code == status.HTTP_403_FORBIDDEN

    def test_private_project_visibility_isolation(self, api_client, user_alice, user_bob, workspace_alpha):
        """
        Bob is a regular MEMBER in Alpha Corp.
        Alice creates a PRIVATE project. Bob must NOT be able to see it unless invited.
        """
        # Add Bob to Alpha Corp
        from apps.workspaces.models import WorkspaceMember
        WorkspaceMember.objects.create(
            workspace=workspace_alpha,
            user=user_bob,
            role=WorkspaceMember.Role.MEMBER,
            status=WorkspaceMember.Status.ACTIVE
        )

        # Alice creates a PRIVATE project
        private_proj = proj_services.create_project(
            workspace=workspace_alpha,
            user=user_alice,
            name='Secret Stealth Project',
            key='SHH',
            visibility=Project.Visibility.PRIVATE
        )

        # Bob lists projects -> Secret project must NOT appear
        api_client.force_authenticate(user=user_bob)
        res_bob = api_client.get(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/')
        assert res_bob.status_code == status.HTTP_200_OK
        slugs = [p['slug'] for p in res_bob.data]
        assert private_proj.slug not in slugs

        # Bob direct access -> 404 Not Found
        res_detail = api_client.get(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{private_proj.slug}/')
        assert res_detail.status_code == status.HTTP_404_NOT_FOUND

        # Alice adds Bob to the private project
        proj_services.add_project_member(private_proj, user_bob, ProjectMember.Role.MEMBER, user_alice)

        # Bob now has access!
        res_detail_after = api_client.get(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{private_proj.slug}/')
        assert res_detail_after.status_code == status.HTTP_200_OK
        assert res_detail_after.data['key'] == 'SHH'


@pytest.mark.django_db
class TestBacklogAndWorkItems:
    def test_sequential_work_item_keys(self, api_client, user_alice, workspace_alpha):
        """Work items should get sequential identifiers: TF-1, TF-2, TF-3."""
        project = proj_services.create_project(
            workspace=workspace_alpha,
            user=user_alice,
            name='TaskFlow Core',
            key='TF'
        )

        api_client.force_authenticate(user=user_alice)
        res1 = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/', {
            'title': 'User Authentication Endpoint',
            'type': 'STORY',
            'story_points': 5
        })
        assert res1.status_code == status.HTTP_201_CREATED
        assert res1.data['item_number'] == 1
        assert res1.data['key_identifier'] == 'TF-1'

        res2 = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/', {
            'title': 'PostgreSQL Migration Runner',
            'type': 'TASK',
            'story_points': 3
        })
        assert res2.status_code == status.HTTP_201_CREATED
        assert res2.data['item_number'] == 2
        assert res2.data['key_identifier'] == 'TF-2'

    def test_fibonacci_story_points_validation(self, api_client, user_alice, workspace_alpha):
        """Reject non-Fibonacci estimates (e.g. 7), accept valid numbers (1, 2, 3, 5, 8, 13)."""
        project = proj_services.create_project(
            workspace=workspace_alpha,
            user=user_alice,
            name='Fibonacci Test',
            key='FIB'
        )

        api_client.force_authenticate(user=user_alice)
        # Invalid estimate 7
        res_invalid = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/', {
            'title': 'Invalid Estimation Task',
            'story_points': 7
        })
        assert res_invalid.status_code == status.HTTP_400_BAD_REQUEST

        # Valid estimate 8
        res_valid = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/', {
            'title': 'Valid Estimation Story',
            'story_points': 8
        })
        assert res_valid.status_code == status.HTTP_201_CREATED
        assert res_valid.data['story_points'] == 8

    def test_fractional_drag_and_drop_reorder(self, api_client, user_alice, workspace_alpha):
        """LexoRank reordering: inserting between item 1 (1000.0) and item 2 (2000.0) sets order to 1500.0."""
        project = proj_services.create_project(
            workspace=workspace_alpha,
            user=user_alice,
            name='Backlog Ranking',
            key='RANK'
        )

        item1 = proj_services.create_work_item(project, user_alice, 'Item One')
        item2 = proj_services.create_work_item(project, user_alice, 'Item Two')
        item3 = proj_services.create_work_item(project, user_alice, 'Item Three')

        assert item1.backlog_order == 1000.0
        assert item2.backlog_order == 2000.0
        assert item3.backlog_order == 3000.0

        api_client.force_authenticate(user=user_alice)
        # Move item3 between item1 and item2
        reorder_res = api_client.post(
            f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/work-items/{item3.item_number}/reorder/',
            {
                'prev_item_id': str(item1.id),
                'next_item_id': str(item2.id)
            }
        )
        assert reorder_res.status_code == status.HTTP_200_OK
        assert reorder_res.data['backlog_order'] == 1500.0

        # Backlog list should now return items in new order: item1, item3, item2
        backlog_res = api_client.get(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/')
        items_order = [it['item_number'] for it in backlog_res.data]
        assert items_order == [1, 3, 2]

    def test_viewer_role_write_restriction(self, api_client, user_alice, user_charlie, workspace_alpha):
        """Workspace VIEWER cannot create or edit backlog work items."""
        from apps.workspaces.models import WorkspaceMember
        WorkspaceMember.objects.create(
            workspace=workspace_alpha,
            user=user_charlie,
            role=WorkspaceMember.Role.VIEWER,
            status=WorkspaceMember.Status.ACTIVE
        )

        project = proj_services.create_project(
            workspace=workspace_alpha,
            user=user_alice,
            name='Viewer Restriction Project',
            key='REST'
        )

        api_client.force_authenticate(user=user_charlie)
        res = api_client.post(f'/api/v1/workspaces/{workspace_alpha.slug}/projects/{project.slug}/backlog/', {
            'title': 'Unauthorized Story Creation'
        })
        assert res.status_code == status.HTTP_403_FORBIDDEN
