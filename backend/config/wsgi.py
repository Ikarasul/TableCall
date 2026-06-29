"""
config/wsgi.py
==============
WSGI config สำหรับ TableCall (ใช้เป็น fallback, production ใช้ ASGI/Daphne)
"""

import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

application = get_wsgi_application()
