import logging
from urllib.parse import parse_qs
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.settings import api_settings

logger = logging.getLogger(__name__)
User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_string: str):
    """
    Validates a SimpleJWT access token and returns the corresponding active User.
    Returns AnonymousUser if the token is invalid, expired, or the user is inactive.
    """
    try:
        token = AccessToken(token_string)
        user_id = token.get(api_settings.USER_ID_CLAIM)
        if not user_id:
            return AnonymousUser()
        user = User.objects.get(id=user_id)
        if not user.is_active:
            return AnonymousUser()
        return user
    except (InvalidToken, TokenError, User.DoesNotExist, Exception) as exc:
        logger.debug(f"JWT WebSocket authentication failed: {exc}")
        return AnonymousUser()


class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom Channels middleware that authenticates WebSocket connections
    using a JWT token passed in the query string:
    ws://example.com/ws/workspaces/{slug}/?token=<JWT_ACCESS_TOKEN>
    """

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "websocket":
            query_string = scope.get("query_string", b"").decode("utf-8")
            query_params = parse_qs(query_string)
            token = query_params.get("token", [None])[0]

            if token:
                scope["user"] = await get_user_from_token(token)
            else:
                scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper for JWTAuthMiddleware."""
    return JWTAuthMiddleware(inner)
