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
    except Exception as e:
        db_ok = False

    status = "healthy" if db_ok else "unhealthy"
    status_code = 200 if db_ok else 503
    return JsonResponse({
        "status": status,
        "database": "connected" if db_ok else "disconnected",
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

    # OpenAPI Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

