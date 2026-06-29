import time
import logging
from django.conf import settings
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from notifications.models import Notification
from notifications.fcm import send_push_to_staff
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from notifications.serializers import NotificationSerializer

logger = logging.getLogger('tablecall')

# จำนวนครั้งสูงสุดที่จะส่ง reminder ต่อ notification (ป้องกันสแปมไม่รู้จบ)
DEFAULT_MAX_REMINDERS = getattr(settings, 'REMINDER_MAX_PER_NOTIFICATION', 3)
# ระยะห่างระหว่างรอบ reminder (วินาที)
DEFAULT_REMINDER_INTERVAL = getattr(settings, 'REMINDER_INTERVAL_SECONDS', 30)
# รออย่างน้อยเท่านี้หลังสร้างก่อนเริ่มส่ง reminder
DEFAULT_INITIAL_DELAY = getattr(settings, 'REMINDER_INITIAL_DELAY_SECONDS', 15)


class Command(BaseCommand):
    help = (
        'Runs a background loop to send reminders for pending notifications. '
        f'Max {DEFAULT_MAX_REMINDERS} reminders per notification, '
        f'every {DEFAULT_REMINDER_INTERVAL}s after an initial {DEFAULT_INITIAL_DELAY}s delay.'
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting reminder service...'))

        channel_layer = get_channel_layer()

        while True:
            try:
                self._send_reminders(channel_layer)
            except Exception as e:
                logger.error(f"[Reminder] Loop error: {e}")

            time.sleep(DEFAULT_REMINDER_INTERVAL)

    def _send_reminders(self, channel_layer):
        """ส่ง reminder สำหรับ notification ที่ยัง pending และยังไม่เกินโควต้า"""
        now = timezone.now()
        # เริ่มส่ง reminder ได้หลัง initial delay ผ่านไป
        eligible_after = now - timedelta(seconds=DEFAULT_INITIAL_DELAY)

        pending_notifications = (
            Notification.objects
            .filter(status='pending')
            .filter(created_at__lte=eligible_after)
            .filter(reminded_count__lt=DEFAULT_MAX_REMINDERS)
            .select_related('table')
        )

        if not pending_notifications.exists():
            return

        count = pending_notifications.count()
        self.stdout.write(f"Found {count} pending notification(s) needing reminder.")

        for notif in pending_notifications:
            # 1. ส่ง Push Notification ซ้ำ
            try:
                send_push_to_staff(
                    table_number=notif.table.number,
                    table_id=notif.table.id,
                    notification_id=notif.id,
                    kind=notif.kind,
                    timestamp=notif.created_at.isoformat(),
                )
            except Exception as e:
                logger.error(f"[Reminder] FCM Error for notif {notif.id}: {e}")

            # 2. ส่ง WebSocket Broadcast ซ้ำ เพื่อให้แอปหน้าเว็บมีเสียง
            if channel_layer:
                try:
                    async_to_sync(channel_layer.group_send)(
                        'staff_notifications',
                        {
                            'type': 'notification.created',
                            'data': {
                                'notification': NotificationSerializer(notif).data
                            },
                        }
                    )
                except Exception as e:
                    logger.error(f"[Reminder] WebSocket Error for notif {notif.id}: {e}")

            # 3. เพิ่ม counter
            try:
                notif.reminded_count = notif.reminded_count + 1
                notif.save(update_fields=['reminded_count'])
            except Exception as e:
                logger.error(f"[Reminder] Failed to increment counter for notif {notif.id}: {e}")
