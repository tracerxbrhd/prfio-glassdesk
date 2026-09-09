import json

from django.contrib.auth import authenticate, login, logout
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .permissions import is_agent


def user_data(user):
    return {
        "id": user.pk,
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "is_staff": user.is_staff,
    }


@require_GET
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request)})


@require_POST
@csrf_protect
def login_view(request):
    # Local-memory cache is suitable for the demo; configure a shared cache for multiple workers.
    throttle_key = f"login:{request.META.get('REMOTE_ADDR', 'unknown')}"
    failures = cache.get(throttle_key, 0)
    if failures >= 8:
        return JsonResponse({"detail": "Too many attempts. Try again in five minutes."}, status=429)
    try:
        data = json.loads(request.body)
        if not isinstance(data, dict):
            raise ValueError
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"detail": "Provide a valid JSON object."}, status=400)
    email, password = data.get("email"), data.get("password")
    if not isinstance(email, str) or not isinstance(password, str):
        return JsonResponse({"detail": "Email and password are required."}, status=400)
    user = authenticate(request, username=email.strip().lower(), password=password)
    if user is None or not is_agent(user):
        cache.set(throttle_key, failures + 1, 300)
        return JsonResponse({"detail": "Email or password is incorrect."}, status=400)
    cache.delete(throttle_key)
    login(request, user)
    return JsonResponse({"user": user_data(user), "csrfToken": get_token(request)})


@require_POST
@csrf_protect
def logout_view(request):
    logout(request)
    return JsonResponse({"detail": "Signed out."})


@require_GET
def me(request):
    if not is_agent(request.user):
        return JsonResponse({"detail": "Sign in to your support workspace."}, status=401)
    return JsonResponse(user_data(request.user))
