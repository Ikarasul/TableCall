"""
notifications/views.py
======================
API Views สำหรับ Notifications app

Endpoints:
- GET  /api/notifications/            → list notifications (filter ?status=pending)
- POST /api/notifications/<id>/handle/ → mark handled (select_for_update + broadcast)

Business Logic:
- select_for_update(): ป้องกัน race condition เมื่อ staff หลายคน handle พร้อมกัน
- Broadcast 'notification.handled' ไปยัง staff group หลัง handle สำเร็จ
"""

import logging
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Notification
from .serializers import NotificationSerializer
from staff.models import Staff

logger = logging.getLogger('tablecall')


# ---------------------------------------------------------------------------
# 1. GET /api/notifications/ → list notifications
# ---------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """
    แสดงรายการ notifications ทั้งหมด
    
    Query params:
    - ?status=pending  → เฉพาะที่ยังรอ
    - ?status=handled  → เฉพาะที่จัดการแล้ว
    - ?table_id=<id>   → filter by table
    - ?limit=<n>       → จำกัดจำนวน (default 100)
    
    Response: list of NotificationSerializer
    """
    queryset = Notification.objects.select_related('table', 'handled_by').order_by('-created_at')

    # Filter by status
    status_filter = request.query_params.get('status')
    if status_filter in ['pending', 'handled']:
        queryset = queryset.filter(status=status_filter)

    # Filter by table
    table_id = request.query_params.get('table_id')
    if table_id:
        try:
            queryset = queryset.filter(table_id=int(table_id))
        except ValueError:
            return Response({'detail': 'table_id ต้องเป็นตัวเลข'}, status=status.HTTP_400_BAD_REQUEST)

    # Limit
    try:
        limit = int(request.query_params.get('limit', 100))
        limit = min(limit, 500)  # cap ที่ 500
    except ValueError:
        limit = 100

    queryset = queryset[:limit]
    serializer = NotificationSerializer(queryset, many=True)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# 2. POST /api/notifications/<id>/handle/ → mark handled
# ---------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def handle_notification(request, notification_id: int):
    """
    พนักงานกดรับงาน / mark notification ว่าจัดการแล้ว
    
    Race Condition Protection:
    - ใช้ select_for_update() เพื่อ lock row ระหว่าง transaction
    - ถ้า notification ถูก handle ไปแล้วโดย staff คนอื่น → 409 Conflict
    
    Flow:
    1. Begin transaction
    2. SELECT ... FOR UPDATE (lock row)
    3. ตรวจสอบว่า status == pending
    4. mark_handled(staff)
    5. Commit
    6. Broadcast 'notification.handled' ไปยัง group
    
    Response 200: notification ที่ update แล้ว
    Response 409: ถ้า handle ไปแล้ว
    """
    # ดึง staff จาก JWT token
    token_payload = getattr(request.auth, 'payload', {})
    staff_id = token_payload.get('staff_id')

    if not staff_id:
        return Response(
            {'detail': 'ไม่พบ staff_id ใน token'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        return Response({'detail': 'ไม่พบพนักงาน'}, status=status.HTTP_404_NOT_FOUND)

    # ใช้ transaction + select_for_update() ป้องกัน race condition
    try:
        with transaction.atomic():
            # SELECT ... FOR UPDATE: lock row ไว้จนกว่า transaction จะ commit/rollback
            # staff 2 คนกด handle พร้อมกัน คนแรกจะ lock ได้ คนที่สองจะรอ
            try:
                notification = (
                    Notification.objects
                    .select_for_update()
                    .select_related('table', 'handled_by')
                    .get(id=notification_id)
                )
            except Notification.DoesNotExist:
                return Response(
                    {'detail': f'ไม่พบ notification id={notification_id}'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # ตรวจสอบว่า notification ยัง pending อยู่
            if notification.status != Notification.STATUS_PENDING:
                return Response(
                    {
                        'detail': 'notification นี้จัดการไปแล้ว',
                        'handled_by': notification.handled_by.name if notification.handled_by else None,
                        'handled_at': notification.handled_at,
                    },
                    status=status.HTTP_409_CONFLICT
                )

            # Mark as handled
            notification.mark_handled(staff)
            logger.info(
                f'Notification {notification_id} handled by staff {staff_id} ({staff.name}). '
                f'Table: {notification.table.number}, Kind: {notification.kind}, '
                f'Response time: {notification.response_time_seconds}s'
            )

    except Exception as e:
        logger.error(f'Error handling notification {notification_id}: {e}')
        return Response(
            {'detail': 'เกิดข้อผิดพลาด กรุณาลองใหม่'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Broadcast หลัง transaction commit แล้ว (ป้องกัน broadcast ก่อน DB commit)
    _broadcast_notification_handled(notification, staff)

    serializer = NotificationSerializer(notification)
    return Response(serializer.data, status=status.HTTP_200_OK)


def _broadcast_notification_handled(notification: Notification, staff: Staff) -> None:
    """
    ส่ง WebSocket event 'notification.handled' ไปยัง group 'staff_notifications'
    ทุก staff ที่ connect อยู่จะได้รับ event และ update UI
    """
    channel_layer = get_channel_layer()
    if channel_layer is None:
        logger.warning('Channel layer ไม่พร้อมใช้งาน ไม่สามารถ broadcast ได้')
        return

    try:
        async_to_sync(channel_layer.group_send)(
            'staff_notifications',
            {
                'type': 'notification.handled',
                'data': {
                    'notification': NotificationSerializer(notification).data,
                    'staff_name': staff.name,
                },
            }
        )
        logger.debug(f'Broadcast notification.handled: id={notification.id}')
    except Exception as e:
        logger.error(f'Broadcast error for notification.handled: {e}')
