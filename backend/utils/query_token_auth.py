"""
utils/query_token_auth.py
=========================
Custom authentication ที่รับ JWT token จาก query parameter ?token=<jwt>
ใช้เฉพาะใน export/download endpoints ที่ต้องใช้ <a href> ธรรมดา
"""
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from staff.models import Staff
import logging

logger = logging.getLogger('tablecall')


class QueryParamJWTAuthentication(BaseAuthentication):
    """
    รับ JWT token จาก query parameter: ?token=<jwt>
    ใช้สำหรับ download endpoints ที่ไม่สามารถส่ง Authorization header ได้
    """

    def authenticate(self, request):
        raw_token = request.GET.get('token')
        if not raw_token:
            return None  # ให้ authentication class อื่นลอง

        try:
            token = AccessToken(raw_token)
            payload = token.payload

            # สร้าง mock auth object ที่ IsAdminStaff permission ใช้ได้
            class TokenAuth:
                def __init__(self, p):
                    self.payload = p

            # สร้าง mock user ที่ DRF ยอมรับ
            staff_id = payload.get('staff_id')
            if not staff_id:
                raise AuthenticationFailed('ไม่พบ staff_id ใน token')

            try:
                staff = Staff.objects.get(id=staff_id, is_active=True)
            except Staff.DoesNotExist:
                raise AuthenticationFailed('ไม่พบพนักงาน')

            return (staff, TokenAuth(payload))

        except (TokenError, InvalidToken) as e:
            logger.warning(f'QueryParamJWT: token invalid: {e}')
            raise AuthenticationFailed('Token ไม่ถูกต้อง')
        except AuthenticationFailed:
            raise
        except Exception as e:
            logger.error(f'QueryParamJWT unexpected error: {e}')
            return None
