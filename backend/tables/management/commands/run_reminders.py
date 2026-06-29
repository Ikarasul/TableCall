import time
import logging
from django.core.management.base import BaseCommand
from notifications.models import Notification
from notifications.fcm import send_push_to_staff
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from notifications.serializers import NotificationSerializer

logger = logging.getLogger('tablecall')

class Command(BaseCommand):
    help = 'Runs a background loop to send reminders for pending notifications every 30 seconds'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting reminder service...'))
        
        channel_layer = get_channel_layer()
        
        while True:
            # ดึงรายการแจ้งเตือนที่ยังรอการตอบรับ (pending)
            pending_notifications = Notification.objects.filter(status='pending').select_related('table')
            
            if pending_notifications.exists():
                self.stdout.write(f"Found {pending_notifications.count()} pending notifications. Sending reminders...")
                
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
                        logger.error(f"[Reminder] FCM Error: {e}")
                    
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
                            logger.error(f"[Reminder] WebSocket Error: {e}")
            
            # หน่วงเวลา 5 วินาที
            time.sleep(5)
