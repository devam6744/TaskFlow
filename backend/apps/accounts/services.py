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
