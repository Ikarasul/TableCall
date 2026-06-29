"""
tables/serializers.py
=====================
Serializers สำหรับ Tables app
"""

from rest_framework import serializers
from .models import RestaurantTable


class TableSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับโต๊ะอาหาร
    รวม pending_notifications_count สำหรับ Floor View
    """
    pending_count = serializers.IntegerField(source='pending_notifications_count', read_only=True)
    table_number = serializers.CharField(source='number', read_only=True)
    qr_token = serializers.UUIDField(read_only=True)
    status = serializers.SerializerMethodField()

    class Meta:
        model = RestaurantTable
        fields = [
            'id',
            'table_number',
            'seats',
            'qr_token',
            'is_active',
            'status',
            'pending_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'qr_token', 'created_at', 'updated_at']

    def get_status(self, obj):
        # ถ้ารับ list ของ tables ที่ prefetch_related('notifications') มาแล้ว
        # ควรกรองจาก memory เพื่อไม่ให้เกิด N+1 query
        pending = [n for n in obj.notifications.all() if n.status == 'pending']
        if any(n.kind == 'bill' for n in pending):
            return 'bill'
        if any(n.kind == 'call' for n in pending):
            return 'calling'
        return 'idle'


class TableDetailSerializer(TableSerializer):
    """
    Serializer แสดงรายละเอียดโต๊ะเพิ่มเติม
    ใช้สำหรับ GET /api/tables/<qr_token>/
    """
    recent_notifications = serializers.SerializerMethodField()

    class Meta(TableSerializer.Meta):
        fields = TableSerializer.Meta.fields + ['recent_notifications']

    def get_recent_notifications(self, obj):
        """แสดง notification ล่าสุด 5 รายการของโต๊ะนี้"""
        from notifications.serializers import NotificationSerializer
        recent = obj.notifications.select_related('handled_by').order_by('-created_at')[:5]
        return NotificationSerializer(recent, many=True).data


class NotifyRequestSerializer(serializers.Serializer):
    """
    Serializer สำหรับ request body ของ POST /api/tables/<qr_token>/notify/
    """
    KIND_CHOICES = [
        ('call', 'เรียกพนักงาน'),
        ('bill', 'เรียกเก็บเงิน'),
    ]
    kind = serializers.ChoiceField(
        choices=KIND_CHOICES,
        help_text='ประเภทการแจ้งเตือน: call หรือ bill'
    )


class AdminTableSerializer(serializers.ModelSerializer):
    """
    Serializer สำหรับ Admin จัดการโต๊ะ (CRUD)
    """
    class Meta:
        model = RestaurantTable
        fields = [
            'id',
            'number',
            'seats',
            'qr_token',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'qr_token', 'created_at', 'updated_at']

from .models import CustomerFeedback

class CustomerFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerFeedback
        fields = ['rating', 'suggestions']
