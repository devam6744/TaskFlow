import time
from django.contrib import admin
from django.urls import include, path
from django.http import JsonResponse
from django.db import connection
from django.conf import settings
from django.conf.urls.static import static
from django.utils import timezone
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

def health_check(request):
    """
    Comprehensive Production Health Check:
    Verifies database connection, query execution latency, Redis broker connectivity,
    and returns 200 OK (Healthy/Degraded) or 503 Service Unavailable (Unhealthy).
    """
    start_db = time.time()
    db_ok = True
    db_latency_ms = None
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            cursor.fetchone()
        db_latency_ms = round((time.time() - start_db) * 1000, 2)
    except Exception:
        db_ok = False

    start_redis = time.time()
    redis_ok = True
    redis_latency_ms = None
    try:
        import redis
        redis_url = getattr(settings, 'CELERY_BROKER_URL', '') or getattr(settings, 'REDIS_URL', '')
        if redis_url:
            r = redis.from_url(redis_url, socket_timeout=3)
            r.ping()
            redis_latency_ms = round((time.time() - start_redis) * 1000, 2)
        else:
            redis_ok = False
    except Exception:
        redis_ok = False

    all_healthy = db_ok and redis_ok
    status = "healthy" if all_healthy else ("degraded" if db_ok else "unhealthy")
    status_code = 200 if db_ok else 503

    return JsonResponse({
        "status": status,
        "timestamp": timezone.now().isoformat(),
        "app": "TaskFlow",
        "version": "1.0.0",
        "environment": "production" if not settings.DEBUG else "development",
        "services": {
            "database": {
                "status": "connected" if db_ok else "disconnected",
                "latency_ms": db_latency_ms
            },
            "redis": {
                "status": "connected" if redis_ok else "disconnected",
                "latency_ms": redis_latency_ms
            }
        }
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
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

