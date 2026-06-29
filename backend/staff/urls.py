"""
staff/urls.py
=============
URL patterns สำหรับ Staff app
"""

from django.urls import path
from . import views

app_name = 'staff'

urlpatterns = [
    # GET  /api/staff/               → รายชื่อพนักงาน active ทั้งหมด
    path('', views.staff_list, name='staff-list'),

    # POST /api/staff/login/ → เข้าสู่ระบบด้วยรหัสพนักงานและรหัสผ่าน
    path('login/', views.staff_login, name='staff-login'),

    # POST /api/staff/clock-out/     → บันทึกออกงาน
    path('clock-out/', views.clock_out, name='clock-out'),

    # GET  /api/staff/me/stats/      → ดู stats กะปัจจุบัน
    path('me/stats/', views.staff_stats, name='staff-stats'),

    # POST /api/staff/device-token/  → บันทึก FCM token
    path('device-token/', views.save_device_token, name='device-token'),

    # --- Admin Endpoints ---
    # POST /api/staff/admin/         → สร้างพนักงานใหม่
    path('admin/', views.admin_create_staff, name='admin-create-staff'),
    # GET  /api/staff/admin/all/     → ดูพนักงานทั้งหมด
    path('admin/all/', views.admin_list_staff, name='admin-list-staff'),
    # PATCH, DELETE /api/staff/admin/<id>/
    path('admin/<int:staff_id>/', views.admin_detail_staff, name='admin-detail-staff'),
    # GET /api/staff/admin/shift-logs/  → ดูข้อมูลเข้า-ออกงานทั้งหมด
    path('admin/shift-logs/', views.admin_shift_logs, name='admin-shift-logs'),
    # GET /api/staff/admin/shift-logs/export/  → Export CSV
    path('admin/shift-logs/export/', views.export_shift_logs_csv, name='admin-shift-logs-export'),
]

