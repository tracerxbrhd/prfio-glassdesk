from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from support import auth_views, views

router = DefaultRouter()
router.register("tickets", views.TicketViewSet, basename="ticket")
router.register("customers", views.CustomerViewSet)
router.register("tags", views.TagViewSet)
router.register("agents", views.AgentViewSet, basename="agent")
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/csrf/", auth_views.csrf),
    path("api/auth/login/", auth_views.login_view),
    path("api/auth/logout/", auth_views.logout_view),
    path("api/auth/me/", auth_views.me),
    path("api/dashboard/", views.DashboardView.as_view()),
    path("api/", include(router.urls)),
]
