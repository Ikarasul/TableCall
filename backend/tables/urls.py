"""
tables/urls.py
==============
URL patterns สำหรับ Tables app
"""

from django.urls import path
from . import views

app_name = 'tables'

urlpatterns = [
    # GET  /api/tables/                   → รายชื่อโต๊ะทั้งหมด (Floor View)
    path('', views.table_list, name='table-list'),

    # GET  /api/tables/<qr_token>/        → รายละเอียดโต๊ะจาก QR token
    path('<uuid:qr_token>/', views.table_detail, name='table-detail'),

    # POST /api/tables/<qr_token>/notify/ → ลูกค้าเรียกพนักงาน
    path('<uuid:qr_token>/notify/', views.table_notify, name='table-notify'),

    # --- Admin Endpoints ---
    # GET, POST /api/tables/admin/
    path('admin/', views.admin_list_create_tables, name='admin-list-create-tables'),
    
    # PATCH, DELETE /api/tables/admin/<id>/
    path('admin/<int:table_id>/', views.admin_detail_table, name='admin-detail-table'),

    # GET /api/tables/admin/feedback/export/
    path('admin/feedback/export/', views.export_feedback_csv, name='admin-export-feedback'),
    
    # POST /api/tables/<qr_token>/feedback/
    path('<uuid:qr_token>/feedback/', views.submit_feedback, name='submit-feedback'),
]
