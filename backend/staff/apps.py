"""
staff/apps.py
=============
App configuration สำหรับ Staff
"""

from django.apps import AppConfig


class StaffConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'staff'
    verbose_name = 'ระบบพนักงาน'
