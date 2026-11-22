"""
ASGI config for TaskFlow project.

It exposes the ASGI callable as a module-level variable named ``application``.
Routes standard HTTP traffic to Django ASGI, and WebSocket traffic to
the Channels URL router wrapped in JWTAuthMiddlewareStack.
"""

import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialize Django ASGI application early to ensure the AppRegistry
# is populated before importing code that may import ORM models.
django_asgi_app = get_asgi_application()

from channels.routing import ProtocolTypeRouter, URLRouter  # noqa: E402
from apps.realtime.middleware import JWTAuthMiddlewareStack  # noqa: E402
from apps.realtime.routing import websocket_urlpatterns  # noqa: E402

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(websocket_urlpatterns)
    ),
})
