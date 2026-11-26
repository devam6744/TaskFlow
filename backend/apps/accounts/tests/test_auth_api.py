import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture(autouse=True)
def clear_cache_between_tests():
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        email='testuser@taskflow.dev',
        password='StrongPassword123!',
        display_name='Test Developer'
    )


@pytest.mark.django_db
class TestAuthenticationFlow:
    """Enterprise test suite verifying complete authentication lifecycle."""

    def test_register_success(self, api_client):
        url = reverse('accounts:register')
        payload = {
            'email': 'newuser@taskflow.dev',
            'display_name': 'New Dev',
            'password': 'SecurePassword123!',
        }
        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert 'access' in response.data
        assert response.data['user']['email'] == 'newuser@taskflow.dev'
        assert response.data['user']['display_name'] == 'New Dev'

        # Verify refresh cookie was set
        assert 'taskflow_refresh' in response.cookies
        cookie = response.cookies['taskflow_refresh']
        assert cookie['httponly'] is True
        assert cookie['samesite'] in ('Lax', 'None')

        # Verify user persisted in database
        assert User.objects.filter(email='newuser@taskflow.dev').exists()

    def test_register_duplicate_email_fails(self, api_client, test_user):
        url = reverse('accounts:register')
        payload = {
            'email': 'testuser@taskflow.dev',
            'display_name': 'Imposter',
            'password': 'AnotherPassword123!',
        }
        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'email' in response.data

    def test_register_weak_password_fails(self, api_client):
        url = reverse('accounts:register')
        payload = {
            'email': 'shortpass@taskflow.dev',
            'display_name': 'Short Pass',
            'password': '123',
        }
        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'password' in response.data

    def test_login_success(self, api_client, test_user):
        url = reverse('accounts:login')
        payload = {
            'email': 'testuser@taskflow.dev',
            'password': 'StrongPassword123!',
        }
        response = api_client.post(url, payload, format='json')

        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert response.data['user']['email'] == test_user.email
        assert 'taskflow_refresh' in response.cookies

    def test_login_anti_enumeration(self, api_client, test_user):
        url = reverse('accounts:login')

        # Case 1: Wrong password for real user
        resp_wrong_pass = api_client.post(
            url,
            {'email': 'testuser@taskflow.dev', 'password': 'WrongPassword999!'},
            format='json'
        )

        # Case 2: Non-existent email
        resp_wrong_email = api_client.post(
            url,
            {'email': 'ghost@taskflow.dev', 'password': 'RandomPassword123!'},
            format='json'
        )

        # Both must return 401 with exact same message to prevent enumeration
        assert resp_wrong_pass.status_code == status.HTTP_401_UNAUTHORIZED
        assert resp_wrong_email.status_code == status.HTTP_401_UNAUTHORIZED
        assert resp_wrong_pass.data['detail'] == resp_wrong_email.data['detail']

    def test_me_endpoint_requires_auth(self, api_client, test_user):
        url = reverse('accounts:me')

        # Without token -> 401
        unauth_response = api_client.get(url)
        assert unauth_response.status_code == status.HTTP_401_UNAUTHORIZED

        # With Bearer token -> 200
        login_resp = api_client.post(
            reverse('accounts:login'),
            {'email': 'testuser@taskflow.dev', 'password': 'StrongPassword123!'},
            format='json'
        )
        access_token = login_resp.data['access']

        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        auth_response = api_client.get(url)

        assert auth_response.status_code == status.HTTP_200_OK
        assert auth_response.data['id'] == str(test_user.id)
        assert auth_response.data['email'] == test_user.email

    def test_token_refresh_and_rotation(self, api_client, test_user):
        # 1. Login to get initial refresh cookie
        login_resp = api_client.post(
            reverse('accounts:login'),
            {'email': 'testuser@taskflow.dev', 'password': 'StrongPassword123!'},
            format='json'
        )
        initial_refresh_cookie = login_resp.cookies['taskflow_refresh'].value

        # 2. Call refresh endpoint using cookie
        api_client.cookies['taskflow_refresh'] = initial_refresh_cookie
        refresh_resp = api_client.post(reverse('accounts:refresh'))

        assert refresh_resp.status_code == status.HTTP_200_OK
        assert 'access' in refresh_resp.data
        new_refresh_cookie = refresh_resp.cookies['taskflow_refresh'].value

        # Token rotation: new cookie must differ from the old one
        assert new_refresh_cookie != initial_refresh_cookie

        # 3. Old refresh token must be blacklisted (reuse attempt should fail)
        api_client.cookies['taskflow_refresh'] = initial_refresh_cookie
        reuse_resp = api_client.post(reverse('accounts:refresh'))
        assert reuse_resp.status_code == status.HTTP_401_UNAUTHORIZED

    def test_logout_revokes_token(self, api_client, test_user):
        # 1. Login
        login_resp = api_client.post(
            reverse('accounts:login'),
            {'email': 'testuser@taskflow.dev', 'password': 'StrongPassword123!'},
            format='json'
        )
        refresh_token = login_resp.cookies['taskflow_refresh'].value

        # 2. Logout
        api_client.cookies['taskflow_refresh'] = refresh_token
        logout_resp = api_client.post(reverse('accounts:logout'))

        assert logout_resp.status_code == status.HTTP_200_OK
        # Cookie cleared
        assert logout_resp.cookies['taskflow_refresh'].value == ''

        # 3. Attempting to refresh with the revoked token must fail
        api_client.cookies['taskflow_refresh'] = refresh_token
        fail_resp = api_client.post(reverse('accounts:refresh'))
        assert fail_resp.status_code == status.HTTP_401_UNAUTHORIZED
