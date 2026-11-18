from django.conf import settings
from django.utils.decorators import method_decorator
from django_ratelimit.decorators import ratelimit
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.accounts.api.serializers import (
    LoginSerializer,
    RegisterSerializer,
    UserProfileSerializer,
)
from apps.accounts.services import (
    authenticate_user_credentials,
    create_user_account,
    revoke_user_refresh_token,
    rotate_user_refresh_token,
)

REFRESH_COOKIE_NAME = 'taskflow_refresh'
REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60  # 7 days in seconds


def set_refresh_cookie(response: Response, refresh_token: str) -> None:
    """Helper to attach the JWT refresh token securely in an HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_COOKIE_MAX_AGE,
        httponly=True,
        samesite='Lax',
        secure=not settings.DEBUG,
        path='/api/v1/auth/',
    )


def clear_refresh_cookie(response: Response) -> None:
    """Helper to remove the JWT refresh cookie from the browser."""
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path='/api/v1/auth/',
        samesite='Lax',
    )


class RegisterView(APIView):
    """
    POST /api/v1/auth/register/
    Registers a new user, returns in-memory access token, and sets HttpOnly refresh cookie.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=RegisterSerializer,
        responses={
            201: OpenApiResponse(description="User registered successfully"),
            400: OpenApiResponse(description="Validation error"),
        }
    )
    def post(self, request: Request) -> Response:
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = create_user_account(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
            display_name=serializer.validated_data['display_name'],
        )

        response = Response(
            {
                'user': UserProfileSerializer(user).data,
                'access': tokens['access'],
                'message': 'Registration successful.',
            },
            status=status.HTTP_201_CREATED,
        )
        set_refresh_cookie(response, tokens['refresh'])
        return response


class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Rate-limited (5/min per IP) login endpoint. Sets HttpOnly refresh cookie.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(description="Login successful"),
            401: OpenApiResponse(description="Invalid credentials"),
            429: OpenApiResponse(description="Too many requests"),
        }
    )
    @method_decorator(ratelimit(key='ip', rate='30/m', method='POST', block=False))
    def post(self, request: Request) -> Response:
        if getattr(request, 'limited', False):
            return Response(
                {'detail': 'Too many failed login attempts. Please try again in 1 minute.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user, tokens = authenticate_user_credentials(
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )

        response = Response(
            {
                'user': UserProfileSerializer(user).data,
                'access': tokens['access'],
                'message': 'Login successful.',
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, tokens['refresh'])
        return response


class CookieTokenRefreshView(APIView):
    """
    POST /api/v1/auth/refresh/
    Reads refresh token from HttpOnly cookie, rotates it, and issues new token pair.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(description="Tokens rotated successfully"),
            401: OpenApiResponse(description="Invalid or missing refresh token"),
        }
    )
    def post(self, request: Request) -> Response:
        # Prefer cookie; fallback to request payload if provided
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME) or request.data.get('refresh')
        user, new_tokens = rotate_user_refresh_token(refresh_token)

        response = Response(
            {
                'user': UserProfileSerializer(user).data,
                'access': new_tokens['access'],
            },
            status=status.HTTP_200_OK,
        )
        set_refresh_cookie(response, new_tokens['refresh'])
        return response


class LogoutView(APIView):
    """
    POST /api/v1/auth/logout/
    Blacklists the active refresh token and clears the HttpOnly cookie.
    """
    permission_classes = [AllowAny]

    @extend_schema(
        request=None,
        responses={
            200: OpenApiResponse(description="Successfully logged out"),
        }
    )
    def post(self, request: Request) -> Response:
        refresh_token = request.COOKIES.get(REFRESH_COOKIE_NAME) or request.data.get('refresh')
        revoke_user_refresh_token(refresh_token)

        response = Response(
            {'detail': 'Successfully logged out.'},
            status=status.HTTP_200_OK,
        )
        clear_refresh_cookie(response)
        return response


class MeView(APIView):
    """
    GET /api/v1/auth/me/
    Returns the authenticated user's profile.
    """
    permission_classes = [IsAuthenticated]

    @extend_schema(
        responses={
            200: UserProfileSerializer,
            401: OpenApiResponse(description="Authentication credentials were not provided or invalid"),
        }
    )
    def get(self, request: Request) -> Response:
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
