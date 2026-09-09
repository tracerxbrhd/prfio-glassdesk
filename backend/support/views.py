from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from . import services
from .models import Customer, Tag, Ticket
from .permissions import StaffDeletes, StaffWrites
from .serializers import (
    AgentSerializer,
    CustomerSerializer,
    MessageSerializer,
    TagSerializer,
    TicketSerializer,
)


class TicketViewSet(viewsets.ModelViewSet):
    serializer_class = TicketSerializer
    permission_classes = [StaffDeletes]

    def get_queryset(self):
        queryset = (
            Ticket.objects.select_related("customer", "assignee")
            .prefetch_related("tags", "messages")
            .annotate(message_count=Count("messages", distinct=True))
        )
        for field in ["status", "priority", "customer", "assignee"]:
            value = self.request.query_params.get(field)
            if value:
                if field in ["customer", "assignee"] and not value.isdigit():
                    raise ValidationError({field: "Provide a numeric identifier."})
                queryset = queryset.filter(**{field: value})
        if self.request.query_params.get("unassigned") == "true":
            queryset = queryset.filter(assignee__isnull=True)
        if query := self.request.query_params.get("search", "").strip():
            queryset = queryset.filter(
                Q(subject__icontains=query)
                | Q(customer__name__icontains=query)
                | Q(customer__company__icontains=query)
            )
        return queryset

    def perform_create(self, serializer):
        services.create_ticket(serializer)

    def perform_update(self, serializer):
        services.update_ticket(serializer, self.request.user)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        ticket = self.get_object()
        if request.method == "GET":
            return Response(MessageSerializer(ticket.messages.all(), many=True).data)
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        services.add_message(ticket, serializer, request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.annotate(ticket_count=Count("tickets")).order_by("name", "pk")
    serializer_class = CustomerSerializer
    permission_classes = [StaffWrites]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError(
                {"detail": "A customer with tickets cannot be deleted."}
            ) from None


class TagViewSet(viewsets.ModelViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    permission_classes = [StaffWrites]


class AgentViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = AgentSerializer
    permission_classes = [StaffWrites]

    def get_queryset(self):
        return (
            User.objects.filter(Q(groups__name="support_agents") | Q(is_staff=True))
            .distinct()
            .order_by("first_name")
        )


class DashboardView(APIView):
    def get(self, request):
        return Response(services.dashboard())
