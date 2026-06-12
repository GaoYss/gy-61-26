from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from access.views import AlarmViewSet, DeviceViewSet, DoorLogViewSet, NighttimeRuleViewSet, StatsView, VisitorPassViewSet


router = DefaultRouter()
router.register("devices", DeviceViewSet, basename="device")
router.register("visitors", VisitorPassViewSet, basename="visitor")
router.register("alarms", AlarmViewSet, basename="alarm")
router.register("door-logs", DoorLogViewSet, basename="door-log")
router.register("nighttime-rules", NighttimeRuleViewSet, basename="nighttime-rule")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/stats/", StatsView.as_view(), name="stats"),
    path("api/", include(router.urls)),
]
