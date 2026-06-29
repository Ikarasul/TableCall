"""
notifications/urls.py
=====================
URL patterns สำหรับ Notifications app
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # GET  /api/notifications/              → list notifications
    # Query params: ?status=pending|handled, ?table_id=<id>, ?limit=<n>
    path('', views.notification_list, name='notification-list'),

    # POST /api/notifications/<id>/handle/  → mark handled (staff only)
    path('<int:notification_id>/handle/', views.handle_notification, name='handle-notification'),
]
