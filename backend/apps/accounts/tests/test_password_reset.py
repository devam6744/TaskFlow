import re
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class PasswordResetAPITests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='alice@taskflow.dev',
            password='InitialPassword123!',
            display_name='Alice Architect'
        )

    def test_password_reset_request_sends_email_with_token(self):
        """Requesting password reset dispatches email with valid token."""
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/v1/auth/password-reset/', {
                'email': 'alice@taskflow.dev'
            })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('detail', response.data)

        # Verify email was dispatched
        self.assertEqual(len(mail.outbox), 1)
        sent_email = mail.outbox[0]
        self.assertEqual(sent_email.to, ['alice@taskflow.dev'])
        self.assertIn('[TaskFlow] Reset your account password', sent_email.subject)
        self.assertIn('/reset-password?uid=', sent_email.body)

    def test_password_reset_anti_enumeration(self):
        """Unknown email returns generic 200 OK without sending email."""
        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.post('/api/v1/auth/password-reset/', {
                'email': 'unknown@nowhere.dev'
            })

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_password_reset_confirm_success(self):
        """Confirming reset updates user password and allows login."""
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post('/api/v1/auth/password-reset/', {
                'email': 'alice@taskflow.dev'
            })

        self.assertEqual(len(mail.outbox), 1)
        body = mail.outbox[0].body
        # Extract uid and token from link
        match = re.search(r'uid=([A-Za-z0-9_-]+)(?:&amp;|&)token=([A-Za-z0-9_-]+)', body)
        self.assertIsNotNone(match, f"Reset link query parameters not found in email body: {body}")
        uid, token = match.group(1), match.group(2)

        # Confirm new password
        confirm_res = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'BrandNewPassword2026!'
        })
        self.assertEqual(confirm_res.status_code, status.HTTP_200_OK)

        # Verify old password fails
        login_old = self.client.post('/api/v1/auth/login/', {
            'email': 'alice@taskflow.dev',
            'password': 'InitialPassword123!'
        })
        self.assertEqual(login_old.status_code, status.HTTP_401_UNAUTHORIZED)

        # Verify new password succeeds
        login_new = self.client.post('/api/v1/auth/login/', {
            'email': 'alice@taskflow.dev',
            'password': 'BrandNewPassword2026!'
        })
        self.assertEqual(login_new.status_code, status.HTTP_200_OK)
        self.assertIn('access', login_new.data)

    def test_password_reset_token_single_use(self):
        """Reset token cannot be used a second time after password is changed."""
        with self.captureOnCommitCallbacks(execute=True):
            self.client.post('/api/v1/auth/password-reset/', {
                'email': 'alice@taskflow.dev'
            })

        body = mail.outbox[0].body
        match = re.search(r'uid=([A-Za-z0-9_-]+)(?:&amp;|&)token=([A-Za-z0-9_-]+)', body)
        uid, token = match.group(1), match.group(2)

        # First use -> succeeds
        res1 = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'FirstNewPassword2026!'
        })
        self.assertEqual(res1.status_code, status.HTTP_200_OK)

        # Second use with same token -> rejected
        res2 = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': uid,
            'token': token,
            'new_password': 'SecondNewPassword2026!'
        })
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)

    def test_password_reset_confirm_invalid_token(self):
        """Invalid token is rejected with 400 Bad Request."""
        response = self.client.post('/api/v1/auth/password-reset/confirm/', {
            'uid': 'invalid-uid',
            'token': 'invalid-token',
            'new_password': 'ValidPassword123!'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
