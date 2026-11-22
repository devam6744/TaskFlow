from typing import Any
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import AuthenticationFailed, ValidationError
from rest_framework_simplejwt.tokens import RefreshToken, TokenError

User = get_user_model()


def issue_user_tokens(user: Any) -> dict[str, str]:
    """Issue JWT access and refresh token pair with custom claims for a given user."""
    refresh = RefreshToken.for_user(user)
    # Add claims into access token payload for fast frontend client display without extra network calls
    refresh['email'] = user.email
    refresh['display_name'] = user.display_name

    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


@transaction.atomic
def create_user_account(email: str, password: str, display_name: str) -> tuple[Any, dict[str, str]]:
    """
    Service to register a new user in an atomic transaction.
    Raises ValidationError if email is already taken.
    """
    normalized_email = email.strip().lower()
    if User.objects.filter(email=normalized_email).exists():
        raise ValidationError({'email': 'A user with this email address already exists.'})

    user = User.objects.create_user(
        email=normalized_email,
        password=password,
        display_name=display_name.strip()
    )

    tokens = issue_user_tokens(user)
    return user, tokens


def authenticate_user_credentials(email: str, password: str) -> tuple[Any, dict[str, str]]:
    """
    Service to authenticate a user with anti-enumeration protection.
    Returns (user, tokens) if valid, or raises AuthenticationFailed with a generic message.
    """
    generic_error = 'Invalid email or password.'
    normalized_email = email.strip().lower()

    try:
        user = User.objects.get(email=normalized_email)
    except User.DoesNotExist:
        # Run a dummy password check to defend against timing side-channel attacks
        User().check_password(password)
        raise AuthenticationFailed(generic_error)

    if not user.check_password(password):
        raise AuthenticationFailed(generic_error)

    if not user.is_active:
        raise AuthenticationFailed('This user account has been deactivated.')

    # Update last_login timestamp
    user.last_login = timezone.now()
    user.save(update_fields=['last_login'])

    tokens = issue_user_tokens(user)
    return user, tokens


def rotate_user_refresh_token(raw_refresh_token: str) -> tuple[Any, dict[str, str]]:
    """
    Takes an existing refresh token, validates it, blacklists it, and produces
    a fresh (access, refresh) token pair.
    """
    if not raw_refresh_token:
        raise AuthenticationFailed('Refresh token cookie is missing.')

    try:
        token = RefreshToken(raw_refresh_token)
        user_id = token.payload.get('user_id')
        user = User.objects.get(id=user_id, is_active=True)
        
        # Blacklist the old refresh token
        token.blacklist()

        # Issue fresh pair
        new_tokens = issue_user_tokens(user)
        return user, new_tokens
    except (TokenError, User.DoesNotExist) as e:
        raise AuthenticationFailed(f'Invalid or expired refresh token: {str(e)}')


def revoke_user_refresh_token(raw_refresh_token: str | None) -> bool:
    """
    Blacklists a refresh token upon logout.
    Idempotent: returns True even if already expired or absent.
    """
    if not raw_refresh_token:
        return True

    try:
        token = RefreshToken(raw_refresh_token)
        token.blacklist()
    except TokenError:
        pass
    return True


def request_password_reset(email: str) -> None:
    """
    Initiates a password reset request.
    Anti-enumeration defense: Always returns silently without leaking whether the email exists.
    If the user exists and is active, sends a secure reset link with a 24-hour token via Gmail SMTP.
    """
    from django.conf import settings
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_encode
    from django.utils.encoding import force_bytes

    normalized_email = email.strip().lower()
    user = User.objects.filter(email=normalized_email, is_active=True).first()
    if not user:
        return

    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)

    frontend_url = getattr(settings, 'FRONTEND_ORIGIN', 'http://localhost:5173').split(',')[0].strip()
    reset_url = f"{frontend_url}/reset-password?uid={uidb64}&token={token}"

    from apps.notifications.tasks import send_password_reset_email_task
    transaction.on_commit(lambda: send_password_reset_email_task.delay(str(user.id), reset_url))


@transaction.atomic
def confirm_password_reset(uidb64: str, token: str, new_password: str) -> None:
    """
    Validates the password reset token and updates the user's password.
    Raises ValidationError if the token or UID is invalid or expired.
    """
    from django.contrib.auth.tokens import default_token_generator
    from django.utils.http import urlsafe_base64_decode
    from django.utils.encoding import force_str

    if not new_password or len(new_password) < 8:
        raise ValidationError({'new_password': 'Password must be at least 8 characters long.'})

    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid, is_active=True)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValidationError({'token': 'Invalid or expired password reset link.'})

    if not default_token_generator.check_token(user, token):
        raise ValidationError({'token': 'This password reset link is invalid or has expired.'})

    user.set_password(new_password)
    user.save(update_fields=['password', 'updated_at'])

