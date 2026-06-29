from rest_framework.permissions import BasePermission

class IsAdminStaff(BasePermission):
    """
    อนุญาตเฉพาะพนักงานที่มี role='admin' ใน JWT token
    """
    def has_permission(self, request, view):
        # request.auth เป็น JWT payload
        if not request.auth:
            return False
        payload = getattr(request.auth, 'payload', {})
        return payload.get('staff_role') == 'admin'
