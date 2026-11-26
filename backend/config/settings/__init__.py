import os

if 'production' in os.getenv('DJANGO_SETTINGS_MODULE', '') or os.getenv('RENDER') == 'true':
    from .production import *
else:
    from .base import *
