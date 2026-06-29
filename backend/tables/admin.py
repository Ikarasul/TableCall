"""
tables/admin.py
===============
Django Admin สำหรับ Tables app
"""

from django.contrib import admin
from django.utils.html import format_html
from .models import RestaurantTable


@admin.register(RestaurantTable)
class RestaurantTableAdmin(admin.ModelAdmin):
    """Admin สำหรับจัดการโต๊ะอาหาร"""
    list_display = [
        'number', 'seats', 'is_active',
        'pending_count_display', 'qr_token_display', 'created_at'
    ]
    list_filter = ['is_active', 'seats']
    search_fields = ['number']
    readonly_fields = ['qr_token', 'created_at', 'updated_at']
    ordering = ['number']

    fieldsets = [
        ('ข้อมูลโต๊ะ', {
            'fields': ['number', 'seats', 'is_active']
        }),
        ('QR Code', {
            'fields': ['qr_token'],
            'description': 'QR Token จะถูกสร้างอัตโนมัติและไม่สามารถแก้ไขได้'
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def pending_count_display(self, obj):
        count = obj.pending_notifications_count
        if count > 0:
            return format_html('<span style="color: red; font-weight: bold;">{}</span>', count)
        return count
    pending_count_display.short_description = 'Pending'

    def qr_token_display(self, obj):
        token = str(obj.qr_token)
        return format_html('<code style="font-size:10px">{}</code>', token[:8] + '...')
    qr_token_display.short_description = 'QR Token'
