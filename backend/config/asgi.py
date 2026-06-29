"""
config/asgi.py
==============
ASGI configuration สำหรับ TableCall
รองรับทั้ง HTTP (Django) และ WebSocket (Channels)
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# ต้อง setup django ก่อน import channels middleware
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator

# import WebSocket URL patterns จาก notifications app
from notifications.routing import websocket_urlpatterns

# Django ASGI application สำหรับ HTTP requests
django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    # HTTP → Django ASGI app ปกติ
    'http': django_asgi_app,

    # WebSocket → ผ่าน AllowedHostsOriginValidator → AuthMiddlewareStack → URLRouter
    # AllowedHostsOriginValidator: ตรวจ Origin header ป้องกัน CSRF บน WS
    # AuthMiddlewareStack: แนบ user จาก session/JWT ให้ consumer
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
