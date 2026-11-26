"""
Production Settings — Phase 10: Release Hardening & Production Deployment
Extends base configuration with strict production security invariants:
  - DEBUG = False
  - Enforced SSL redirect, HSTS preload, secure HttpOnly cookies
  - Dynamic CORS and CSRF trusted origins mapping
  - Optional Sentry exception monitoring with PII scrubbing
"""

import os
from .base import *

# Strict Security Invariants
DEBUG = os.getenv('DJANGO_DEBUG', 'False').lower() in ('true', '1')

SECRET_KEY = os.getenv('DJANGO_SECRET_KEY') or os.getenv('SECRET_KEY', 'django-insecure-taskflow-prod-secret-fallback-set-in-dashboard')

# Allowed Hosts
raw_hosts = os.getenv('DJANGO_ALLOWED_HOSTS', os.getenv('ALLOWED_HOSTS', '*'))
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(',') if h.strip()]
if not ALLOWED_HOSTS or '*' in ALLOWED_HOSTS:
    ALLOWED_HOSTS = ['*']
else:
    ALLOWED_HOSTS.extend(['localhost', '127.0.0.1', '.onrender.com', '.vercel.app'])
    ALLOWED_HOSTS = list(set(ALLOWED_HOSTS))

# HTTPS & Reverse Proxy Settings
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').lower() in ('true', '1')

# Cookie Security (SameSite='None' and Secure=True are required for cross-domain Vercel <-> Render)
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'None'
CSRF_COOKIE_SAMESITE = 'None'

# HTTP Security Headers
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS and CSRF Origins Configuration
cors_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
cors_list = ['http://localhost:5173', 'http://127.0.0.1:5173']
if cors_env:
    cors_list.extend([o.strip().rstrip('/') for o in cors_env.split(',') if o.strip()])
CORS_ALLOWED_ORIGINS = list(set(cors_list))

csrf_env = os.getenv('CSRF_TRUSTED_ORIGINS', '')
csrf_list = [
    'https://*.vercel.app',
    'https://*.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]
if csrf_env:
    csrf_list.extend([o.strip().rstrip('/') for o in csrf_env.split(',') if o.strip()])
csrf_list.extend(CORS_ALLOWED_ORIGINS)
CSRF_TRUSTED_ORIGINS = list(set(csrf_list))

CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https:\/\/.*\.vercel\.app$",
    r"^https:\/\/.*\.onrender\.com$",
    r"^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$",
]
CORS_ALLOW_CREDENTIALS = True

# Production Database Connections (disable persistent connections on Supabase free tier)
CONN_MAX_AGE = int(os.getenv('CONN_MAX_AGE', '0'))

# Sentry Monitoring with PII Scrubbing
SENTRY_DSN = os.getenv('SENTRY_DSN', '')
if SENTRY_DSN:
    try:
        import sentry_sdk
        from sentry_sdk.integrations.django import DjangoIntegration
        from sentry_sdk.integrations.redis import RedisIntegration
        from sentry_sdk.integrations.celery import CeleryIntegration

        sentry_sdk.init(
            dsn=SENTRY_DSN,
            integrations=[
                DjangoIntegration(),
                RedisIntegration(),
                CeleryIntegration(),
            ],
            traces_sample_rate=float(os.getenv('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
            send_default_pii=False,
        )
    except ImportError:
        pass
