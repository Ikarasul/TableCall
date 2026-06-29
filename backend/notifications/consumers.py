"""
notifications/consumers.py
==========================
WebSocket Consumer สำหรับ real-time notifications ของ TableCall

Flow:
1. Staff เปิด app → connect WebSocket ws://host/ws/notifications/?token=<jwt>
2. Consumer ตรวจสอบ JWT token จาก query param
3. เข้าร่วม group 'staff_notifications'
4. รับ events: notification.created, notification.handled
5. Forward event data ไปยัง client (JSON)

Authentication:
- ใช้ JWT จาก query parameter ?token=<jwt>
  เพราะ WebSocket ไม่สามารถส่ง Authorization header ได้ตรงๆ ใน browser
- Decode token ด้วย simplejwt
"""

import json
import logging
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

logger = logging.getLogger('tablecall')

# ชื่อ group ที่ staff ทุกคนจะเข้าร่วม
STAFF_GROUP_NAME = 'staff_notifications'


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    Async WebSocket Consumer สำหรับรับ notification real-time
    
    Events ที่รองรับ:
    - notification.created : มี notification ใหม่เข้ามา
    - notification.handled : notification ถูก handle แล้ว
    - ping                 : heartbeat จาก client
    """

    async def connect(self):
        """
        เมื่อ client เชื่อมต่อ:
        1. ตรวจสอบ JWT token จาก query param
        2. ถ้า token ไม่ valid → close(4001)
        3. ถ้า valid → เข้าร่วม group + accept connection
        """
        # ดึง token จาก query string: ?token=<jwt>
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token_list = query_params.get('token', [])

        if not token_list:
            logger.warning('WebSocket connection rejected: no token provided')
            await self.close(code=4001)
            return

        raw_token = token_list[0]

        # Verify JWT token
        staff_data = await self._authenticate_token(raw_token)
        if staff_data is None:
            logger.warning('WebSocket connection rejected: invalid token')
            await self.close(code=4001)
            return

        # บันทึกข้อมูล staff ใน scope
        self.staff_id = staff_data.get('staff_id')
        self.staff_name = staff_data.get('staff_name', 'Unknown')

        # เข้าร่วม group 'staff_notifications'
        await self.channel_layer.group_add(
            STAFF_GROUP_NAME,
            self.channel_name
        )

        await self.accept()
        logger.info(
            f'WebSocket connected: staff_id={self.staff_id}, '
            f'name={self.staff_name}, channel={self.channel_name}'
        )

        # ส่ง welcome message
        await self.send_json({
            'type': 'connected',
            'message': f'สวัสดี {self.staff_name}! เชื่อมต่อ real-time notifications แล้ว',
            'staff_id': self.staff_id,
        })

    async def disconnect(self, close_code: int):
        """เมื่อ client disconnect → ออกจาก group"""
        if hasattr(self, 'staff_id'):
            await self.channel_layer.group_discard(
                STAFF_GROUP_NAME,
                self.channel_name
            )
            logger.info(
                f'WebSocket disconnected: staff_id={self.staff_id}, '
                f'code={close_code}'
            )

    async def receive_json(self, content: dict, **kwargs):
        """
        รับข้อความจาก client
        รองรับ ping/pong heartbeat
        """
        msg_type = content.get('type', '')

        if msg_type == 'ping':
            # ตอบ pong เพื่อ keep connection alive
            await self.send_json({'type': 'pong'})
        else:
            logger.debug(f'Received from client: {content}')

    # ---------------------------------------------------------------------------
    # Group event handlers — รับ event จาก Channel Layer และส่งต่อไปยัง client
    # ---------------------------------------------------------------------------

    async def notification_created(self, event: dict):
        """
        รับ event 'notification.created' จาก Channel Layer
        (ส่งมาจาก tables/views.py เมื่อลูกค้ากดเรียก)
        
        Forward ข้อมูลไปยัง connected staff clients
        """
        logger.debug(f'Event notification.created received: {event["data"]}')
        await self.send_json({
            'type': 'notification.created',
            'data': event['data'],
        })

    async def notification_handled(self, event: dict):
        """
        รับ event 'notification.handled' จาก Channel Layer
        (ส่งมาจาก notifications/views.py เมื่อ staff handle notification)
        
        Forward ข้อมูลไปยัง connected staff clients เพื่ออัปเดต UI
        """
        logger.debug(f'Event notification.handled received: {event["data"]}')
        await self.send_json({
            'type': 'notification.handled',
            'data': event['data'],
        })

    async def staff_logged_in(self, event: dict):
        """
        รับ event 'staff.logged_in' จาก Channel Layer
        Forward ข้อมูลไปยัง connected staff clients เพื่อแสดง toast notification
        """
        logger.debug(f'Event staff.logged_in received: {event["data"]}')
        await self.send_json({
            'type': 'staff.logged_in',
            'data': event['data'],
        })

    # ---------------------------------------------------------------------------
    # Private helpers
    # ---------------------------------------------------------------------------

    async def _authenticate_token(self, raw_token: str) -> dict | None:
        """
        ตรวจสอบ JWT access token
        คืน payload dict ถ้า valid, None ถ้า invalid
        
        ทำงานใน async context โดยใช้ simplejwt AccessToken
        """
        try:
            # AccessToken validate signature + expiry
            token = AccessToken(raw_token)
            payload = {
                'staff_id': token.get('staff_id'),
                'staff_name': token.get('staff_name', ''),
                'staff_code': token.get('staff_code', ''),
            }
            return payload
        except (TokenError, InvalidToken) as e:
            logger.warning(f'JWT validation failed: {e}')
            return None
        except Exception as e:
            logger.error(f'Unexpected error during JWT validation: {e}')
            return None
