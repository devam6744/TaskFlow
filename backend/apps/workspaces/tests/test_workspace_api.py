"""
Workspace & Multi-Tenancy Isolation Test Suite — Phase 3

Tests verify:
  1. Multi-tenancy isolation (User A cannot access User B's workspace)
  2. RBAC role permissions (Owner, Admin, Member, Viewer)
  3. Invite token generation, SHA-256 validation, and acceptance
  4. Anti-privilege escalation (cannot change own role)
  5. Invariant safety (cannot remove or demote the last active owner)
  6. Soft-delete archive/unarchive lifecycle
"""

import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.workspaces.models import Workspace, WorkspaceMember, WorkspaceInvite
from apps.workspaces import services

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_a():
    return User.objects.create_user(
        email='alice@example.com',
        password='Password123!',
        display_name='Alice Architect'
    )


@pytest.fixture
def user_b():
    return User.objects.create_user(
        email='bob@example.com',
        password='Password123!',
        display_name='Bob Builder'
    )


@pytest.fixture
def user_c():
    return User.objects.create_user(
        email='charlie@example.com',
        password='Password123!',
        display_name='Charlie Contributor'
    )


@pytest.fixture
def workspace_a(user_a):
    return services.create_workspace(
        user=user_a,
        name='Alpha Corp',
        description='Workspace owned by Alice'
    )


@pytest.mark.django_db
class TestWorkspaceCreationAndListing:
    def test_create_workspace_success(self, api_client, user_a):
        api_client.force_authenticate(user=user_a)
        response = api_client.post('/api/v1/workspaces/', {
            'name': 'Cloud Engineering Team',
            'description': 'Main engineering workspace'
        })

        assert response.status_code == status.HTTP_201_CREATED
        data = response.data
        assert data['name'] == 'Cloud Engineering Team'
        assert data['slug'] == 'cloud-engineering-team'
        assert data['current_user_role'] == 'OWNER'
        assert data['members_count'] == 1

        # Verify DB records
        ws = Workspace.objects.get(slug='cloud-engineering-team')
        membership = WorkspaceMember.objects.get(workspace=ws, user=user_a)
        assert membership.role == WorkspaceMember.Role.OWNER
        assert membership.status == WorkspaceMember.Status.ACTIVE

    def test_multi_tenancy_isolation_listing(self, api_client, user_a, user_b, workspace_a):
        """User B must not see User A's workspace in their workspace list."""
        # Create workspace for User B
        ws_b = services.create_workspace(user=user_b, name='Beta Systems')

        # Alice lists workspaces -> sees only Alpha Corp
        api_client.force_authenticate(user=user_a)
        res_a = api_client.get('/api/v1/workspaces/')
        assert res_a.status_code == status.HTTP_200_OK
        slugs_a = [item['slug'] for item in res_a.data]
        assert 'alpha-corp' in slugs_a
        assert 'beta-systems' not in slugs_a

        # Bob lists workspaces -> sees only Beta Systems
        api_client.force_authenticate(user=user_b)
        res_b = api_client.get('/api/v1/workspaces/')
        assert res_b.status_code == status.HTTP_200_OK
        slugs_b = [item['slug'] for item in res_b.data]
        assert 'beta-systems' in slugs_b
        assert 'alpha-corp' not in slugs_b

    def test_unrelated_user_cannot_access_workspace_detail(self, api_client, user_b, workspace_a):
        """User B attempting to access User A's workspace directly must be 403 Forbidden."""
        api_client.force_authenticate(user=user_b)
        response = api_client.get(f'/api/v1/workspaces/{workspace_a.slug}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestWorkspaceInvitations:
    def test_invite_member_flow(self, api_client, user_a, workspace_a):
        api_client.force_authenticate(user=user_a)
        response = api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/invites/', {
            'email': 'bob@example.com',
            'role': 'MEMBER'
        })

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'bob@example.com'
        assert response.data['role'] == 'MEMBER'
        assert 'raw_token' in response.data
        raw_token = response.data['raw_token']

        # Verify DB stored the SHA-256 hash, not the raw token
        invite = WorkspaceInvite.objects.get(workspace=workspace_a, email='bob@example.com')
        assert invite.token_hash == WorkspaceInvite.hash_token(raw_token)
        assert raw_token not in invite.token_hash

    def test_accept_invite_flow(self, api_client, user_a, user_b, workspace_a):
        # Alice invites Bob
        invite, raw_token = services.invite_member(
            workspace=workspace_a,
            inviter=user_a,
            email='bob@example.com',
            role=WorkspaceMember.Role.MEMBER
        )

        # Bob accepts the invitation
        api_client.force_authenticate(user=user_b)
        response = api_client.post('/api/v1/workspaces/invites/accept/', {
            'token': raw_token
        })

        assert response.status_code == status.HTTP_200_OK
        assert response.data['role'] == 'MEMBER'
        assert response.data['workspace']['slug'] == workspace_a.slug

        # Bob is now an active member
        member = WorkspaceMember.objects.get(workspace=workspace_a, user=user_b)
        assert member.role == WorkspaceMember.Role.MEMBER
        assert member.status == WorkspaceMember.Status.ACTIVE

        # Invite status is marked ACCEPTED
        invite.refresh_from_db()
        assert invite.status == WorkspaceInvite.Status.ACCEPTED

    def test_accept_expired_invite_fails(self, api_client, user_a, user_b, workspace_a):
        invite, raw_token = services.invite_member(
            workspace=workspace_a,
            inviter=user_a,
            email='bob@example.com',
            role=WorkspaceMember.Role.MEMBER
        )
        # Force expiry to the past
        invite.expires_at = timezone.now() - timedelta(hours=1)
        invite.save()

        api_client.force_authenticate(user=user_b)
        response = api_client.post('/api/v1/workspaces/invites/accept/', {
            'token': raw_token
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_invite_rejected(self, api_client, user_a, workspace_a):
        api_client.force_authenticate(user=user_a)
        api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/invites/', {
            'email': 'duplicate@example.com',
            'role': 'MEMBER'
        })
        res2 = api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/invites/', {
            'email': 'duplicate@example.com',
            'role': 'MEMBER'
        })
        assert res2.status_code == status.HTTP_400_BAD_REQUEST

    def test_regular_member_cannot_invite(self, api_client, user_a, user_b, workspace_a):
        # Add Bob as a MEMBER
        WorkspaceMember.objects.create(
            workspace=workspace_a,
            user=user_b,
            role=WorkspaceMember.Role.MEMBER,
            status=WorkspaceMember.Status.ACTIVE
        )

        api_client.force_authenticate(user=user_b)
        response = api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/invites/', {
            'email': 'newguy@example.com',
            'role': 'MEMBER'
        })
        assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestWorkspaceRBACAndSafetyInvariants:
    def test_anti_self_escalation(self, api_client, user_a, user_b, workspace_a):
        """User cannot modify their own role."""
        # Add Bob as ADMIN
        WorkspaceMember.objects.create(
            workspace=workspace_a,
            user=user_b,
            role=WorkspaceMember.Role.ADMIN,
            status=WorkspaceMember.Status.ACTIVE
        )

        api_client.force_authenticate(user=user_b)
        response = api_client.patch(
            f'/api/v1/workspaces/{workspace_a.slug}/members/{user_b.id}/',
            {'role': 'OWNER'}
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_cannot_remove_last_active_owner(self, api_client, user_a, workspace_a):
        """Attempting to remove the sole workspace OWNER must be rejected."""
        api_client.force_authenticate(user=user_a)
        response = api_client.delete(f'/api/v1/workspaces/{workspace_a.slug}/members/{user_a.id}/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_owner_can_archive_workspace(self, api_client, user_a, user_b, workspace_a):
        # Bob (non-owner) cannot archive
        WorkspaceMember.objects.create(
            workspace=workspace_a,
            user=user_b,
            role=WorkspaceMember.Role.ADMIN,
            status=WorkspaceMember.Status.ACTIVE
        )
        api_client.force_authenticate(user=user_b)
        res_bob = api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/archive/')
        assert res_bob.status_code == status.HTTP_403_FORBIDDEN

        # Alice (Owner) can archive
        api_client.force_authenticate(user=user_a)
        res_alice = api_client.post(f'/api/v1/workspaces/{workspace_a.slug}/archive/')
        assert res_alice.status_code == status.HTTP_200_OK

        workspace_a.refresh_from_db()
        assert workspace_a.is_archived is True
