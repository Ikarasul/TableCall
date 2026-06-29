import logging
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from staff.models import Staff

logger = logging.getLogger('tablecall')

class StaffJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Overrides the default get_user method to return a Staff instance
        instead of a Django User instance.
        """
        try:
            staff_id = validated_token.get('staff_id')
            if not staff_id:
                logger.warning('StaffJWTAuthentication: staff_id missing in token')
                raise InvalidToken('Token contained no recognizable user identification')
                
            staff = Staff.objects.get(id=staff_id, is_active=True)
            logger.debug(f'StaffJWTAuthentication: authenticated staff_id={staff_id}')
            return staff
        except Staff.DoesNotExist:
            logger.warning('StaffJWTAuthentication: staff does not exist')
            raise AuthenticationFailed('Staff not found or inactive', code='user_not_found')
        except (InvalidToken, AuthenticationFailed):
            raise
        except Exception as e:
            logger.error(f'StaffJWTAuthentication: unexpected error: {e}')
            raise
