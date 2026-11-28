import os
import sys
from datetime import timedelta
from pathlib import Path
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
apps_dir = os.path.join(BASE_DIR, 'apps')
if apps_dir not in sys.path:
    sys.path.insert(0, apps_dir)

# Load environment variables from root or backend directory
load_dotenv(BASE_DIR.parent / '.env')
load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'django-insecure-taskflow-default-secret-key-dev-only')
DEBUG = os.getenv('DJANGO_DEBUG', 'True') == 'True'
raw_allowed_hosts = os.getenv('DJANGO_ALLOWED_HOSTS', os.getenv('ALLOWED_HOSTS', '*'))
ALLOWED_HOSTS = [h.strip() for h in raw_allowed_hosts.split(',') if h.strip()]
if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '.onrender.com', '.vercel.app'])
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))

# Application definition
INSTALLED_APPS = [
    # Daphne must be listed before django.contrib.staticfiles for runserver integration
    'daphne',

    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'channels',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'drf_spectacular',
    'django_celery_beat',

    # TaskFlow Modular Apps
    'apps.accounts',
    'apps.workspaces',
    'apps.projects',
    'apps.collaboration',
    'apps.notifications',
    'apps.realtime',
]

# Custom User Model (Mandatory before first migration)
AUTH_USER_MODEL = 'accounts.User'

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'
if not os.getenv('VERCEL'):
    ASGI_APPLICATION = 'config.asgi.application'

# Database Setup (Supports Supabase PostgreSQL or fallback SQLite for local smoke tests / testing)
DATABASE_URL = os.getenv('DATABASE_URL')
IS_TESTING = 'test' in sys.argv or 'pytest' in sys.modules or os.getenv('DJANGO_TEST') == 'True'

if IS_TESTING:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:',
        }
    }
elif DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=int(os.getenv('CONN_MAX_AGE', '0')),
            ssl_require=False,
        )
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Media files (User Attachments)
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB limit
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10 MB limit

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# DRF Spectacular (OpenAPI 3.0 Documentation)
SPECTACULAR_SETTINGS = {
    'TITLE': 'TaskFlow API',
    'DESCRIPTION': 'Enterprise Scrum & Project Management Platform API',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# CORS & CSRF Configuration
raw_cors = os.getenv('CORS_ALLOWED_ORIGINS', '')
cors_list = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000']
if raw_cors:
    # Auto-strip trailing slash and whitespace so https://...vercel.app/ works seamlessly
    cors_list.extend([o.strip().rstrip('/') for o in raw_cors.split(',') if o.strip()])

CORS_ALLOWED_ORIGINS = list(set(cors_list))

raw_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', '')
csrf_list = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://*.vercel.app',
    'https://*.onrender.com',
]
if raw_csrf:
    csrf_list.extend([o.strip().rstrip('/') for o in raw_csrf.split(',') if o.strip()])
csrf_list.extend(CORS_ALLOWED_ORIGINS)
CSRF_TRUSTED_ORIGINS = list(set(csrf_list))

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.vercel\.app$",
    r"^https:\/\/.*\.onrender\.com$",
    r"^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$",
]
CORS_ALLOW_CREDENTIALS = True
FRONTEND_ORIGIN = os.getenv('FRONTEND_ORIGIN', 'http://localhost:5173')

# SimpleJWT Configuration (Token Rotation, Blacklist, Security)
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# Cache Configuration (Used for Rate Limiting)
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'taskflow-default-cache',
    }
}

# Security Headers (Defense in Depth)
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Celery Configuration (Upstash Redis with TLS support)
CELERY_BROKER_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'

# Upstash TLS configuration (rediss://)
if CELERY_BROKER_URL.startswith('rediss://'):
    import ssl
    CELERY_BROKER_USE_SSL = {'ssl_cert_reqs': ssl.CERT_NONE}
    CELERY_REDIS_BACKEND_USE_SSL = {'ssl_cert_reqs': ssl.CERT_NONE}

# Celery Beat Database Scheduler
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Celery Task Execution Mode:
# Default to eager execution in development so that all Celery tasks (emails, notifications, invitations, password resets)
# execute in-process immediately without requiring a standalone celery worker daemon.
# Can be toggled via CELERY_ALWAYS_EAGER=False in .env when running a dedicated Celery worker daemon.
CELERY_TASK_ALWAYS_EAGER = os.getenv('CELERY_ALWAYS_EAGER', 'True').lower() == 'true' or 'test' in sys.argv
CELERY_TASK_EAGER_PROPAGATES = True

# Email Configuration (Gmail SMTP with automatic App Password space sanitizer)
EMAIL_PROVIDER = os.getenv('EMAIL_PROVIDER', 'smtp').lower()

if EMAIL_PROVIDER == 'smtp':
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
    EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
    EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
    EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True') == 'True'
    EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip()
    # Strip spaces automatically so Gmail App Passwords (e.g. "abcd efgh ijkl mnop") work seamlessly
    EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').replace(' ', '').strip()
    DEFAULT_FROM_EMAIL = os.getenv('EMAIL_FROM', EMAIL_HOST_USER or 'noreply@taskflow.dev')
else:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
    DEFAULT_FROM_EMAIL = os.getenv('EMAIL_FROM', 'noreply@taskflow.dev')

# Real-Time Channel Layer (Django Channels + Upstash Redis)
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

if IS_TESTING or not REDIS_URL or REDIS_URL.startswith('redis://localhost'):
    # In-memory channel layer for isolated unit tests and offline testing
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels.layers.InMemoryChannelLayer',
        },
    }
else:
    # Upstash Redis Channel Layer with TLS support and resilient keepalive/retry options
    CHANNEL_LAYERS = {
        'default': {
            'BACKEND': 'channels_redis.core.RedisChannelLayer',
            'CONFIG': {
                'hosts': [
                    {
                        'address': REDIS_URL,
                        'socket_timeout': 30,
                        'socket_connect_timeout': 15,
                        'retry_on_timeout': True,
                        'health_check_interval': 15,
                    }
                ],
            },
        },
    }


