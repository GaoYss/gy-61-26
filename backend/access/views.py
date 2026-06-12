from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AccessDevice, AlarmEvent, DoorOpenLog, NighttimeRule, VisitorPass
from .serializers import AccessDeviceSerializer, AlarmEventSerializer, DoorOpenLogSerializer, NighttimeRuleSerializer, VisitorPassSerializer


class DeviceViewSet(viewsets.ModelViewSet):
    queryset = AccessDevice.objects.all()
    serializer_class = AccessDeviceSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "device_code", "location"]
    ordering_fields = ["device_code", "last_heartbeat", "status"]


class VisitorPassViewSet(viewsets.ModelViewSet):
    serializer_class = VisitorPassSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["visitor_name", "phone", "host_name", "reason"]
    ordering_fields = ["visit_time", "created_at", "pass_status"]

    def get_queryset(self):
        queryset = VisitorPass.objects.select_related("device")
        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(pass_status=status_value)
        return queryset


class AlarmViewSet(viewsets.ModelViewSet):
    serializer_class = AlarmEventSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description", "handled_by"]
    ordering_fields = ["occurred_at", "level", "status"]

    def get_queryset(self):
        queryset = AlarmEvent.objects.select_related("device")
        status_value = self.request.query_params.get("status")
        level = self.request.query_params.get("level")
        if status_value:
            queryset = queryset.filter(status=status_value)
        if level:
            queryset = queryset.filter(level=level)
        return queryset


class DoorLogViewSet(viewsets.ModelViewSet):
    serializer_class = DoorOpenLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["opener_name", "failure_reason", "device__name", "device__location"]
    ordering_fields = ["opened_at", "result", "opener_type"]

    def get_queryset(self):
        queryset = DoorOpenLog.objects.select_related("device", "visitor_pass")
        result = self.request.query_params.get("result")
        opener_type = self.request.query_params.get("opener_type")
        keyword = self.request.query_params.get("keyword")
        if result:
            queryset = queryset.filter(result=result)
        if opener_type:
            queryset = queryset.filter(opener_type=opener_type)
        if keyword:
            queryset = queryset.filter(
                Q(opener_name__icontains=keyword)
                | Q(device__name__icontains=keyword)
                | Q(device__location__icontains=keyword)
            )
        return queryset

    def perform_create(self, serializer):
        instance = serializer.save()
        self._check_nighttime_rule(instance)

    def _check_nighttime_rule(self, log):
        if log.result != DoorOpenLog.Result.DENIED:
            return
        try:
            rule = NighttimeRule.objects.get(device=log.device, enabled=True)
        except NighttimeRule.DoesNotExist:
            return
        if rule.is_nighttime(log.opened_at):
            AlarmEvent.objects.create(
                device=log.device,
                alarm_type=AlarmEvent.AlarmType.NIGHTTIME_DENIED,
                level=AlarmEvent.Level.HIGH,
                title=f"{log.device.name} 夜间拒绝开门告警",
                description=f"时段 {rule.start_time:%H:%M}-{rule.end_time:%H:%M} 内检测到拒绝开门：{log.opener_name}，原因：{log.failure_reason or '未授权'}。请值班人员立即复核。",
                occurred_at=log.opened_at,
            )


class StatsView(APIView):
    def get(self, request):
        today = timezone.localdate()
        return Response(
            {
                "devices_total": AccessDevice.objects.count(),
                "devices_online": AccessDevice.objects.filter(status=AccessDevice.Status.ONLINE).count(),
                "visitors_pending": VisitorPass.objects.filter(pass_status=VisitorPass.PassStatus.PENDING).count(),
                "open_alarms": AlarmEvent.objects.exclude(status=AlarmEvent.Status.RESOLVED).count(),
                "today_success_logs": DoorOpenLog.objects.filter(
                    result=DoorOpenLog.Result.SUCCESS,
                    opened_at__date=today,
                ).count(),
                "logs_by_method": list(
                    DoorOpenLog.objects.values("credential_method").annotate(count=Count("id")).order_by("credential_method")
                ),
            }
        )


class NighttimeRuleViewSet(viewsets.ModelViewSet):
    queryset = NighttimeRule.objects.select_related("device")
    serializer_class = NighttimeRuleSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["device__name", "device__device_code", "device__location"]
    ordering_fields = ["start_time", "end_time", "created_at"]
