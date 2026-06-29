"""
config/urls.py
==============
Root URL configuration สำหรับ TableCall Backend
รวม URL จากทุก app
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

urlpatterns = [
    # Django Admin
    path('admin/', admin.site.urls),

    # Staff API
    path('api/v1/staff/', include('staff.urls')),

    # Tables API
    path('api/v1/tables/', include('tables.urls')),

    # Notifications API
    path('api/v1/notifications/', include('notifications.urls')),

    # JWT Token endpoints
    path('api/v1/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/v1/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]

# Serve media files ใน development mode
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
