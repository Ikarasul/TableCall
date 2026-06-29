"""
staff/serializers.py
====================
Serializers สำหรับ Staff app
"""

from rest_framework import serializers
from django.utils import timezone
from .models import Staff, ShiftLog, StaffDevice


class StaffSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับแสดงข้อมูลพนักงาน
    ไม่เปิดเผย pin_hash ออกไป
    """
    class Meta:
        model = Staff
        fields = ['id', 'code', 'name', 'avatar_emoji', 'role', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class StaffCreateSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับสร้างพนักงานใหม่
    รับ password (plain text) แล้ว hash ก่อนบันทึก
    """
    password = serializers.CharField(
        write_only=True,
        min_length=4,
        max_length=128,
        help_text='รหัสผ่าน'
    )

    class Meta:
        model = Staff
        fields = ['id', 'code', 'name', 'avatar_emoji', 'role', 'is_active', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        staff = Staff(**validated_data)
        staff.set_password(password)  # hash password
        staff.save()
        return staff


class ShiftLogSerializer(serializers.ModelSerializer):
    """Serializer สำหรับบันทึกกะงาน"""
    duration_minutes = serializers.ReadOnlyField()
    is_active_shift = serializers.ReadOnlyField()
    staff_name = serializers.CharField(source='staff.name', read_only=True)

    class Meta:
        model = ShiftLog
        fields = [
            'id', 'staff', 'staff_name',
            'clock_in', 'clock_out',
            'duration_minutes', 'is_active_shift'
        ]
        read_only_fields = ['id', 'clock_in']


class LoginSerializer(serializers.Serializer):
    """
    Serializer สำหรับ verify Login
    ใช้ใน POST /api/staff/login/
    """
    code = serializers.CharField(
        help_text='รหัสพนักงาน'
    )
    password = serializers.CharField(
        write_only=True,
        help_text='รหัสผ่าน'
    )


class StaffStatsSerializer(serializers.Serializer):
    """
    Serializer สำหรับ stats ของพนักงาน
    ใช้ใน GET /api/staff/me/stats/
    """
    staff_id = serializers.IntegerField()
    staff_name = serializers.CharField()
    shift_start = serializers.DateTimeField(allow_null=True)
    shift_duration_minutes = serializers.IntegerField(allow_null=True)
    handled_count = serializers.IntegerField(help_text='จำนวน notification ที่ handle แล้วในกะนี้')
    pending_count = serializers.IntegerField(help_text='จำนวน notification ที่ยังรอ handle')
    is_clocked_in = serializers.BooleanField()


class DeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer สำหรับ save/update FCM token"""
    class Meta:
        model = StaffDevice
        fields = ['fcm_token', 'updated_at']
        read_only_fields = ['updated_at']
