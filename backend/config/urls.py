from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

def health_check(request):
    db_ok = True
    try:
        connection.ensure_connection()
    except Exception:
        db_ok = False

    redis_ok = True
    try:
        import redis
        redis_url = getattr(settings, 'CELERY_BROKER_URL', '')
        if redis_url:
            r = redis.from_url(redis_url, socket_timeout=2)
            r.ping()
        else:
            redis_ok = False
    except Exception:
        redis_ok = False

    all_healthy = db_ok and redis_ok
    status = "healthy" if all_healthy else "degraded"
    status_code = 200 if db_ok else 503
    return JsonResponse({
        "status": status,
        "database": "connected" if db_ok else "disconnected",
        "redis": "connected" if redis_ok else "disconnected",
        "app": "TaskFlow",
        "version": "1.0.0"
    }, status=status_code)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/health/', health_check, name='health-check'),
    
    # TaskFlow API Endpoints
    path('api/v1/auth/', include('apps.accounts.api.urls', namespace='accounts')),
    path('api/v1/workspaces/', include('apps.workspaces.api.urls', namespace='workspaces')),
    path('api/v1/workspaces/<slug:workspace_slug>/projects/', include('apps.projects.api.urls', namespace='projects')),
    path('api/v1/notifications/', include('apps.notifications.api.urls')),

    # OpenAPI Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

