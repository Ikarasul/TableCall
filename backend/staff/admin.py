"""
staff/admin.py
==============
Django Admin configuration สำหรับ Staff app
"""

from django.contrib import admin
from django.contrib.auth.hashers import make_password
from .models import Staff, ShiftLog, StaffDevice


@admin.register(Staff)
class StaffAdmin(admin.ModelAdmin):
    """Admin สำหรับจัดการข้อมูลพนักงาน"""
    list_display = ['code', 'name', 'avatar_emoji', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code', 'name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['code']

    # ฟิลด์สำหรับสร้าง/แก้ไข — ไม่แสดง pin_hash โดยตรง
    fieldsets = [
        ('ข้อมูลพื้นฐาน', {
            'fields': ['code', 'name', 'avatar_emoji', 'is_active']
        }),
        ('การตั้งค่า PIN', {
            'fields': ['new_pin'],
            'description': 'ระบุ PIN ใหม่ถ้าต้องการเปลี่ยน (เว้นว่างถ้าไม่เปลี่ยน)'
        }),
        ('Timestamps', {
            'fields': ['created_at', 'updated_at'],
            'classes': ['collapse'],
        }),
    ]

    def get_fields(self, request, obj=None):
        """เพิ่มฟิลด์ new_pin สำหรับ set PIN ใหม่"""
        fields = super().get_fields(request, obj)
        return fields

    def save_model(self, request, obj, form, change):
        """Hash PIN ใหม่ถ้ามีการระบุ"""
        new_pin = form.data.get('new_pin', '').strip()
        if new_pin:
            obj.set_pin(new_pin)
        elif not change:
            # กำหนด PIN default สำหรับพนักงานใหม่
            obj.set_pin('1234')
        super().save_model(request, obj, form, change)

    def get_form(self, request, obj=None, **kwargs):
        """เพิ่ม field new_pin ใน form"""
        from django import forms
        form = super().get_form(request, obj, **kwargs)

        class StaffAdminForm(form):
            new_pin = forms.CharField(
                required=False,
                max_length=6,
                min_length=4,
                label='PIN ใหม่',
                help_text='ระบุ PIN 4-6 หลัก (เว้นว่างถ้าไม่เปลี่ยน)',
                widget=forms.PasswordInput(render_value=False),
            )

        return StaffAdminForm


@admin.register(ShiftLog)
class ShiftLogAdmin(admin.ModelAdmin):
    """Admin สำหรับดูบันทึกกะงาน"""
    list_display = ['staff', 'clock_in', 'clock_out', 'duration_minutes', 'is_active_shift']
    list_filter = ['staff', 'clock_in']
    search_fields = ['staff__name', 'staff__code']
    readonly_fields = ['clock_in', 'duration_minutes', 'is_active_shift']
    date_hierarchy = 'clock_in'
    ordering = ['-clock_in']

    def is_active_shift(self, obj):
        return obj.is_active_shift
    is_active_shift.boolean = True
    is_active_shift.short_description = 'กะ Active'

    def duration_minutes(self, obj):
        minutes = obj.duration_minutes
        if minutes is None:
            return '-'
        hours, mins = divmod(minutes, 60)
        return f'{hours}h {mins}m'
    duration_minutes.short_description = 'ระยะเวลา'


@admin.register(StaffDevice)
class StaffDeviceAdmin(admin.ModelAdmin):
    """Admin สำหรับดู FCM tokens"""
    list_display = ['staff', 'updated_at']
    search_fields = ['staff__name', 'staff__code']
    readonly_fields = ['updated_at']
