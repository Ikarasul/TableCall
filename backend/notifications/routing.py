"""
notifications/routing.py
========================
WebSocket URL patterns สำหรับ Notifications app
import ใน config/asgi.py → URLRouter
"""

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    # ws://host/ws/notifications/?token=<jwt>
    path('ws/notifications/', consumers.NotificationConsumer.as_asgi()),
]
