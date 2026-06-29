"""
notifications/fcm.py
====================
Firebase Cloud Messaging (FCM) utility สำหรับส่ง Push Notification
ไปยัง Staff device ที่ login ผ่าน Android APK (Capacitor)

ใช้ firebase-admin SDK เพื่อรองรับ FCM HTTP v1 API
Prerequisites:
- วางไฟล์ service account JSON ไว้ที่ backend/service-account.json
"""

import logging
import os
from typing import Optional

logger = logging.getLogger('tablecall')

# ========================================================
# Emoji สำหรับแสดงใน notification
# ========================================================
KIND_EMOJI = {
    'call': '🔔',
    'bill': '💳',
}

KIND_LABEL = {
    'call': 'เรียกพนักงาน',
    'bill': 'เช็คบิล',
}

def get_firebase_app():
    """
    Lazy initialize Firebase Admin SDK
    """
    try:
        import firebase_admin
        from firebase_admin import credentials
    except ImportError:
        logger.error('[FCM] firebase-admin ไม่ได้ติดตั้ง')
        return None

    if firebase_admin._apps:
        return firebase_admin.get_app()

    # มองหา service-account.json ในโฟลเดอร์เดียวกับ manage.py หรือระบุผ่าน ENV
    from django.conf import settings
    # Base dir (tablecall/backend)
    base_dir = settings.BASE_DIR
    cred_path = os.path.join(base_dir, 'service-account.json')

    if not os.path.exists(cred_path):
        logger.warning(
            f'[FCM] ไม่พบไฟล์ {cred_path} — ข้าม Push Notification '
            '(ไปดาวน์โหลด Service Account Key จาก Firebase มาวาง)'
        )
        return None

    try:
        cred = credentials.Certificate(cred_path)
        app = firebase_admin.initialize_app(cred)
        logger.info('[FCM] Firebase Admin SDK initialized')
        return app
    except Exception as e:
        logger.error(f'[FCM] Error initializing firebase-admin: {e}')
        return None


def send_push_to_staff(
    table_number: str,
    table_id: int,
    notification_id: int,
    kind: str,
    timestamp: str,
) -> dict:
    """
    ส่ง FCM Push Notification ไปยัง Staff ทุกคนที่มี device token
    """
    app = get_firebase_app()
    if not app:
        return {'sent': 0, 'failed': 0, 'skipped': True}

    from firebase_admin import messaging

    # ดึง FCM tokens ของ staff ทุกคน
    from staff.models import StaffDevice
    tokens = list(
        StaffDevice.objects
        .filter(staff__is_active=True)
        .values_list('fcm_token', flat=True)
        .distinct()
    )

    if not tokens:
        logger.info('[FCM] ไม่มี device token — ไม่มี staff ที่ login ผ่าน APK')
        return {'sent': 0, 'failed': 0, 'skipped': False}

    emoji = KIND_EMOJI.get(kind, '📢')
    label = KIND_LABEL.get(kind, kind)
    title = f'{emoji} โต๊ะ {table_number} — {label}'
    body = f'มีคำร้องใหม่จากโต๊ะ {table_number}'

    # Data payload
    data_payload = {
        'type': 'notification.created',
        'notification_id': str(notification_id),
        'table_id': str(table_id),
        'table_number': table_number,
        'kind': kind,
        'timestamp': timestamp,
    }

    message = messaging.MulticastMessage(
        tokens=tokens,
        notification=messaging.Notification(
            title=title,
            body=body,
        ),
        data=data_payload,
        android=messaging.AndroidConfig(
            priority='high',
            notification=messaging.AndroidNotification(
                channel_id='tablecall_alerts',
                sound='default',
                default_vibrate_timings=True,
                default_sound=True,
            ),
        ),
    )

    try:
        response = messaging.send_each_for_multicast(message)

        logger.info(
            f'[FCM] Sent push for notification {notification_id}: '
            f'{response.success_count} success, {response.failure_count} failed, '
            f'{len(tokens)} devices total'
        )

        if response.failure_count > 0:
            _cleanup_invalid_tokens(response.responses, tokens)

        return {
            'sent': response.success_count,
            'failed': response.failure_count,
            'skipped': False,
        }

    except Exception as e:
        logger.error(f'[FCM] Error sending push notification: {e}')
        return {'sent': 0, 'failed': len(tokens), 'skipped': False}


def _cleanup_invalid_tokens(responses, tokens: list[str]) -> None:
    """
    ลบ FCM token ที่ไม่ valid ออกจากฐานข้อมูล
    """
    from firebase_admin.exceptions import InvalidArgumentError
    from firebase_admin.messaging import UnregisteredError

    invalid_tokens = []
    for idx, resp in enumerate(responses):
        if not resp.success:
            if isinstance(resp.exception, (UnregisteredError, InvalidArgumentError)):
                invalid_tokens.append(tokens[idx])

    if invalid_tokens:
        try:
            from staff.models import StaffDevice
            deleted_count, _ = StaffDevice.objects.filter(
                fcm_token__in=invalid_tokens
            ).delete()
            logger.info(f'[FCM] Removed {deleted_count} invalid device tokens')
        except Exception as e:
            logger.warning(f'[FCM] Error during token cleanup: {e}')
