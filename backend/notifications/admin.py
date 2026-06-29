"""
notifications/admin.py
======================
Django Admin สำหรับ Notifications app
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin สำหรับดู/จัดการ Notifications"""
    list_display = [
        'id', 'table_display', 'kind_badge',
        'status_badge', 'created_at',
        'handled_by', 'response_time_display'
    ]
    list_filter = ['status', 'kind', 'created_at', 'table']
    search_fields = ['table__number', 'handled_by__name']
    readonly_fields = [
        'created_at', 'handled_at', 'response_time_seconds',
        'table', 'kind', 'status'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    def table_display(self, obj):
        return f'โต๊ะ {obj.table.number}'
    table_display.short_description = 'โต๊ะ'

    def kind_badge(self, obj):
        color = '#2196F3' if obj.kind == 'call' else '#FF9800'
        label = 'เรียกพนักงาน' if obj.kind == 'call' else 'เรียกเก็บเงิน'
        return format_html(
            '<span style="background:{};color:white;padding:2px 8px;border-radius:4px">{}</span>',
            color, label
        )
    kind_badge.short_description = 'ประเภท'

    def status_badge(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<span style="background:#f44336;color:white;padding:2px 8px;border-radius:4px">⏳ รอ</span>'
            )
        return format_html(
            '<span style="background:#4caf50;color:white;padding:2px 8px;border-radius:4px">✓ จัดการแล้ว</span>'
        )
    status_badge.short_description = 'สถานะ'

    def response_time_display(self, obj):
        seconds = obj.response_time_seconds
        if seconds is None:
            return '-'
        if seconds < 60:
            return f'{seconds}s'
        return f'{seconds // 60}m {seconds % 60}s'
    response_time_display.short_description = 'เวลาตอบสนอง'
