"""
staff/views.py
==============
API Views สำหรับ Staff app ของ TableCall

Endpoints:
- GET  /api/staff/                    → list active staff
- POST /api/staff/<id>/verify-pin/   → verify PIN + Redis lock logic
- POST /api/staff/clock-out/         → clock out พนักงาน
- GET  /api/staff/me/stats/          → ดู stats ของกะนี้
- POST /api/staff/device-token/      → save/update FCM token
"""

import logging
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.authentication import JWTAuthentication
from utils.query_token_auth import QueryParamJWTAuthentication
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Staff, ShiftLog, StaffDevice
from .serializers import (
    StaffSerializer,
    ShiftLogSerializer,
    LoginSerializer,
    StaffStatsSerializer,
    DeviceTokenSerializer,
    StaffCreateSerializer,
)

logger = logging.getLogger('tablecall')

# ---------------------------------------------------------------------------
# Redis key helpers
# ---------------------------------------------------------------------------
def _pin_attempts_key(staff_id: int) -> str:
    """Redis key สำหรับนับจำนวนครั้งที่ PIN ผิด"""
    return f'pin_attempts:{staff_id}'


def _pin_lock_key(staff_id: int) -> str:
    """Redis key สำหรับตรวจสอบว่า account ถูก lock อยู่หรือไม่"""
    return f'pin_locked:{staff_id}'


# ---------------------------------------------------------------------------
# 1. GET /api/staff/ → list active staff
# ---------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([AllowAny])
def staff_list(request):
    """
    แสดงรายชื่อพนักงานที่ active ทั้งหมด
    ใช้ใน Staff Selection Screen
    """
    staffs = Staff.objects.filter(is_active=True).order_by('code')
    serializer = StaffSerializer(staffs, many=True)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# 2. POST /api/staff/login/ → staff login with Redis lock
# ---------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([AllowAny])
def staff_login(request):
    """
    เข้าสู่ระบบพนักงานด้วย code และ password
    """
    # Validate input
    serializer = LoginSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    code = serializer.validated_data['code']
    password = serializer.validated_data['password']

    try:
        staff = Staff.objects.get(code=code, is_active=True)
    except Staff.DoesNotExist:
        return Response(
            {'detail': 'รหัสพนักงานไม่ถูกต้อง หรือบัญชีถูกปิดใช้งาน'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    staff_id = staff.id
    lock_key = _pin_lock_key(staff_id)
    attempts_key = _pin_attempts_key(staff_id)

    # ตรวจสอบว่า account ถูก lock อยู่หรือไม่
    if cache.get(lock_key):
        logger.warning(f'Staff {staff_id} is locked.')
        return Response(
            {
                'detail': 'บัญชีถูกล็อกชั่วคราว กรุณารอสักครู่',
                'locked': True,
                'retry_after': settings.PIN_LOCK_DURATION,
            },
            status=status.HTTP_429_TOO_MANY_REQUESTS
        )

    # ตรวจสอบ Password
    if not staff.verify_password(password):
        # Password ผิด → เพิ่ม counter
        current_attempts = cache.get(attempts_key, 0) + 1
        
        if current_attempts >= settings.PIN_MAX_ATTEMPTS:
            cache.set(lock_key, True, timeout=settings.PIN_LOCK_DURATION)
            cache.delete(attempts_key)
            logger.warning(
                f'Staff {staff_id} ({staff.name}) locked after {settings.PIN_MAX_ATTEMPTS} failed attempts'
            )
            return Response(
                {
                    'detail': f'รหัสผ่านผิดครบ {settings.PIN_MAX_ATTEMPTS} ครั้ง บัญชีถูกล็อก {settings.PIN_LOCK_DURATION // 60} นาที',
                    'locked': True,
                    'retry_after': settings.PIN_LOCK_DURATION,
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        else:
            cache.set(attempts_key, current_attempts, timeout=600)
            remaining_attempts = settings.PIN_MAX_ATTEMPTS - current_attempts
            logger.info(f'Staff {staff_id} wrong Password. Attempts: {current_attempts}/{settings.PIN_MAX_ATTEMPTS}')
            return Response(
                {
                    'detail': f'รหัสผ่านไม่ถูกต้อง เหลืออีก {remaining_attempts} ครั้ง',
                    'locked': False,
                    'attempts_remaining': remaining_attempts,
                },
                status=status.HTTP_401_UNAUTHORIZED
            )

    # Password ถูกต้อง → reset counter
    cache.delete(attempts_key)
    cache.delete(lock_key)

    # สร้าง ShiftLog (clock in)
    shift_log = ShiftLog.objects.create(staff=staff)
    logger.info(f'Staff {staff_id} ({staff.name}) clocked in. ShiftLog id={shift_log.id}')

    # สร้าง JWT Token พร้อม custom claims
    # เนื่องจาก Staff ไม่ใช่ Django User, สร้าง token ด้วย RefreshToken โดยตรง
    refresh = RefreshToken()
    refresh['staff_id'] = staff.id
    refresh['staff_code'] = staff.code
    refresh['staff_name'] = staff.name
    refresh['staff_role'] = staff.role
    refresh['shift_log_id'] = shift_log.id

    # Broadcast notification to admin/staff that someone logged in
    channel_layer = get_channel_layer()
    if channel_layer:
        try:
            async_to_sync(channel_layer.group_send)(
                'staff_notifications',
                {
                    'type': 'staff.logged_in',
                    'data': {
                        'staff_id': staff.id,
                        'staff_name': staff.name,
                        'staff_role': staff.role,
                        'timestamp': timezone.now().isoformat()
                    }
                }
            )
        except Exception as e:
            logger.error(f'WebSocket broadcast error on login: {e}')

    return Response({
        'access_token': str(refresh.access_token),
        'refresh_token': str(refresh),
        'staff': StaffSerializer(staff).data,
        'shift_log': ShiftLogSerializer(shift_log).data,
    }, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# Admin Staff Management endpoints
# ---------------------------------------------------------------------------
from .permissions import IsAdminStaff
from .serializers import StaffCreateSerializer

@api_view(['POST'])
@permission_classes([IsAdminStaff])
def admin_create_staff(request):
    """
    Admin สร้างพนักงานใหม่
    """
    serializer = StaffCreateSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAdminStaff])
def admin_list_staff(request):
    """
    Admin ดูรายชื่อพนักงานทั้งหมด (รวมที่ถูกปิดใช้งาน)
    """
    staffs = Staff.objects.all().order_by('code')
    serializer = StaffSerializer(staffs, many=True)
    return Response(serializer.data)

@api_view(['PATCH', 'DELETE'])
@permission_classes([IsAdminStaff])
def admin_detail_staff(request, staff_id):
    """
    Admin แก้ไข หรือ ลบ(ปิดใช้งาน) พนักงาน
    """
    try:
        staff = Staff.objects.get(id=staff_id)
    except Staff.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'PATCH':
        # ถ้ามีการเปลี่ยน Password ให้ hash ใหม่ (เราต้อง handle เองถ้าส่ง password มา)
        password = request.data.get('password')
        serializer = StaffSerializer(staff, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            if password:
                staff.set_password(password)
                staff.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    elif request.method == 'DELETE':
        # แทนที่จะลบข้อมูล เราปิดการใช้งาน
        staff.is_active = False
        staff.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# 3. POST /api/staff/clock-out/ → clock out
# ---------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def clock_out(request):
    """
    บันทึกเวลาออกงานของพนักงาน
    ดึง staff_id และ shift_log_id จาก JWT claims
    
    Body (optional): { "shift_log_id": 123 }
    """
    # ดึง shift_log_id จาก token claims หรือ request body
    shift_log_id = (
        request.data.get('shift_log_id') or
        getattr(request.auth, 'payload', {}).get('shift_log_id')
    )
    staff_id = (
        getattr(request.auth, 'payload', {}).get('staff_id') or
        request.data.get('staff_id')
    )

    if not shift_log_id or not staff_id:
        return Response(
            {'detail': 'ไม่พบข้อมูล shift log หรือ staff ใน token'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        shift_log = ShiftLog.objects.get(id=shift_log_id, staff_id=staff_id, clock_out__isnull=True)
    except ShiftLog.DoesNotExist:
        return Response(
            {'detail': 'ไม่พบกะงานที่ active หรือ clock out แล้ว'},
            status=status.HTTP_404_NOT_FOUND
        )

    # บันทึกเวลาออกงาน
    shift_log.clock_out = timezone.now()
    shift_log.save(update_fields=['clock_out'])

    logger.info(
        f'Staff {staff_id} clocked out. ShiftLog {shift_log_id}, '
        f'duration: {shift_log.duration_minutes} minutes'
    )

    return Response(
        ShiftLogSerializer(shift_log).data,
        status=status.HTTP_200_OK
    )


# ---------------------------------------------------------------------------
# 4. GET /api/staff/me/stats/ → stats ของกะนี้
# ---------------------------------------------------------------------------
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def staff_stats(request):
    """
    ดู stats ของพนักงานในกะปัจจุบัน
    - shift_duration_minutes: ระยะเวลาที่ทำงานแล้ว
    - handled_count: จำนวน notification ที่ handle ในกะนี้
    - pending_count: จำนวน notification ที่ยัง pending
    """
    token_payload = getattr(request.auth, 'payload', {})
    staff_id = token_payload.get('staff_id')
    shift_log_id = token_payload.get('shift_log_id')

    if not staff_id:
        return Response(
            {'detail': 'ไม่พบ staff_id ใน token'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        return Response({'detail': 'ไม่พบพนักงาน'}, status=status.HTTP_404_NOT_FOUND)

    # หา active shift log
    shift_log = None
    shift_start = None
    shift_duration = None
    is_clocked_in = False

    if shift_log_id:
        try:
            shift_log = ShiftLog.objects.get(id=shift_log_id, staff=staff)
            shift_start = shift_log.clock_in
            is_clocked_in = shift_log.is_active_shift
            # คำนวณระยะเวลาทำงาน — ถ้ายังทำงานอยู่ให้คำนวณ live
            if is_clocked_in:
                shift_duration = int((timezone.now() - shift_log.clock_in).total_seconds() // 60)
            else:
                shift_duration = shift_log.duration_minutes
        except ShiftLog.DoesNotExist:
            pass

    # Import Notification model ที่นี่เพื่อหลีกเลี่ยง circular import
    from notifications.models import Notification

    today = timezone.now().date()

    # นับ notifications ที่ staff คนนี้ handle แล้วในกะนี้
    handled_shift = 0
    if shift_log:
        handled_shift = Notification.objects.filter(
            handled_by=staff,
            handled_at__gte=shift_log.clock_in,
        ).count()

    # นับ notifications ที่ staff handle ทั้งหมดวันนี้
    handled_today = Notification.objects.filter(
        handled_by=staff,
        handled_at__date=today,
    ).count()

    # นับ pending notifications ทั้งหมด
    pending_count = Notification.objects.filter(status='pending').count()

    stats_data = {
        'staff_id': staff.id,
        'staff_name': staff.name,
        'shift_start': shift_start,
        'shift_duration_minutes': shift_duration,
        'handled_count': handled_shift,
        'total_handled_shift': handled_shift,
        'total_handled_today': handled_today,
        'pending_count': pending_count,
        'is_clocked_in': is_clocked_in,
    }

    serializer = StaffStatsSerializer(data=stats_data)
    serializer.is_valid()  # ไม่ validate ลึก เพราะ data สร้างเองทั้งหมด
    return Response(stats_data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 5. POST /api/staff/device-token/ → save/update FCM token
# ---------------------------------------------------------------------------
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_device_token(request):
    """
    บันทึกหรืออัปเดต FCM token ของ device พนักงาน
    ใช้สำหรับส่ง push notification เมื่อมีลูกค้าเรียก
    
    Body: { "fcm_token": "..." }
    """
    token_payload = getattr(request.auth, 'payload', {})
    staff_id = token_payload.get('staff_id')

    if not staff_id:
        return Response({'detail': 'ไม่พบ staff_id ใน token'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        return Response({'detail': 'ไม่พบพนักงาน'}, status=status.HTTP_404_NOT_FOUND)

    fcm_token = request.data.get('fcm_token', '').strip()
    if not fcm_token:
        return Response({'detail': 'กรุณาระบุ fcm_token'}, status=status.HTTP_400_BAD_REQUEST)

    # upsert: update or create
    device, created = StaffDevice.objects.update_or_create(
        staff=staff,
        defaults={'fcm_token': fcm_token}
    )

    action = 'created' if created else 'updated'
    logger.info(f'FCM token {action} for staff {staff_id}')

    serializer = DeviceTokenSerializer(device)
    return Response(serializer.data, status=status.HTTP_200_OK)


# ---------------------------------------------------------------------------
# 6. GET /api/staff/admin/shift-logs/ → ดูข้อมูลเข้า-ออกงานทั้งหมด (Admin)
# ---------------------------------------------------------------------------
from .permissions import IsAdminStaff
import csv
from django.http import HttpResponse

@api_view(['GET'])
@permission_classes([IsAdminStaff])
def admin_shift_logs(request):
    """
    Admin ดูข้อมูลเข้า-ออกงานของพนักงานทั้งหมด (หรือกรองตามวันที่)
    Query params:
    - ?date=YYYY-MM-DD  → กรองตามวันที่ (default: วันนี้)
    - ?staff_id=<id>    → กรองตามพนักงาน
    """
    import datetime
    date_str = request.GET.get('date')
    staff_id = request.GET.get('staff_id')

    if date_str:
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = timezone.now().date()
    else:
        target_date = timezone.now().date()

    logs = ShiftLog.objects.filter(
        clock_in__date=target_date
    ).select_related('staff').order_by('-clock_in')

    if staff_id:
        try:
            logs = logs.filter(staff_id=int(staff_id))
        except ValueError:
            pass

    serializer = ShiftLogSerializer(logs, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAdminStaff])
@authentication_classes([QueryParamJWTAuthentication, JWTAuthentication])
def export_shift_logs_csv(request):
    """
    Admin ดาวน์โหลดข้อมูลเข้า-ออกงานทั้งวันเป็น CSV (UTF-8 with BOM)
    Query params:
    - ?date=YYYY-MM-DD → กรองตามวันที่ (default: วันนี้)
    """
    import datetime
    date_str = request.GET.get('date')

    if date_str:
        try:
            target_date = datetime.datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            target_date = timezone.now().date()
    else:
        target_date = timezone.now().date()

    response = HttpResponse(content_type='text/csv; charset=utf-8-sig')
    filename = f"shift_logs_{target_date}.csv"
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    writer = csv.writer(response)
    writer.writerow(['ชื่อพนักงาน', 'รหัสพนักงาน', 'เวลาเข้างาน', 'เวลาออกงาน', 'ระยะเวลา (นาที)', 'สถานะ'])

    logs = ShiftLog.objects.filter(
        clock_in__date=target_date
    ).select_related('staff').order_by('staff__name', 'clock_in')

    for log in logs:
        clock_in_str = log.clock_in.strftime('%Y-%m-%d %H:%M:%S')
        clock_out_str = log.clock_out.strftime('%Y-%m-%d %H:%M:%S') if log.clock_out else '-'
        duration = log.duration_minutes if log.duration_minutes is not None else '-'
        status_str = 'ทำงานอยู่' if log.is_active_shift else 'ออกงานแล้ว'
        writer.writerow([
            log.staff.name,
            log.staff.code,
            clock_in_str,
            clock_out_str,
            duration,
            status_str,
        ])

    return response

