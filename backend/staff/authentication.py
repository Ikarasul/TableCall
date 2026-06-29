from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from staff.models import Staff

class StaffJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        """
        Overrides the default get_user method to return a Staff instance
        instead of a Django User instance.
        """
        try:
            print("StaffJWTAuthentication: validating token payload", validated_token)
            staff_id = validated_token.get('staff_id')
            if not staff_id:
                print("StaffJWTAuthentication: staff_id missing")
                raise InvalidToken('Token contained no recognizable user identification')
                
            staff = Staff.objects.get(id=staff_id, is_active=True)
            print("StaffJWTAuthentication: found staff", staff)
            return staff
        except Staff.DoesNotExist:
            print("StaffJWTAuthentication: staff does not exist")
            raise AuthenticationFailed('Staff not found or inactive', code='user_not_found')
        except Exception as e:
            print("StaffJWTAuthentication: unexpected error:", e)
            raise
