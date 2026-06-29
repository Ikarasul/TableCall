"""
notifications/serializers.py
============================
Serializers สำหรับ Notifications app
"""

from rest_framework import serializers
from .models import Notification
from staff.serializers import StaffSerializer


class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer หลักสำหรับ Notification
    รวมข้อมูลโต๊ะและพนักงานที่ handle
    """
    table_id = serializers.IntegerField(source='table.id', read_only=True)
    table_number = serializers.CharField(source='table.number', read_only=True)
    table_seats = serializers.IntegerField(source='table.seats', read_only=True)
    type = serializers.SerializerMethodField()
    kind_display = serializers.CharField(source='get_kind_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    handled_by_name = serializers.CharField(
        source='handled_by.name',
        read_only=True,
        allow_null=True
    )
    response_time_seconds = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'kind',
            'table_id',
            'table_number',
            'table_seats',
            'type',
            'kind_display',
            'status',
            'status_display',
            'created_at',
            'handled_by',
            'handled_by_name',
            'handled_at',
            'response_time_seconds',
        ]
        read_only_fields = [
            'id', 'kind', 'created_at', 'handled_at',
            'table_id', 'table_number', 'table_seats',
            'type', 'kind_display', 'status_display',
            'handled_by_name', 'response_time_seconds',
        ]

    def get_type(self, obj):
        return 'call_staff' if obj.kind == 'call' else 'request_bill'



class NotificationHandleSerializer(serializers.Serializer):
    """
    Serializer สำหรับ POST /api/notifications/<id>/handle/
    ดึง staff_id จาก JWT token ไม่ต้องส่งใน body
    แต่รองรับ optional staff_id override (สำหรับ admin)
    """
    staff_id = serializers.IntegerField(
        required=False,
        help_text='Optional: override staff จาก token (admin only)'
    )
