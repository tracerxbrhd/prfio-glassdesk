from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_agent(user):
    return (
        user.is_authenticated
        and user.is_active
        and (user.is_staff or user.groups.filter(name="support_agents").exists())
    )


class IsSupportAgent(BasePermission):
    message = "A support team account is required."

    def has_permission(self, request, view):
        return is_agent(request.user)


class StaffWrites(BasePermission):
    message = "Only administrators can change customer or tag records."

    def has_permission(self, request, view):
        return is_agent(request.user) and (request.method in SAFE_METHODS or request.user.is_staff)


class StaffDeletes(IsSupportAgent):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.method != "DELETE" or request.user.is_staff
        )
