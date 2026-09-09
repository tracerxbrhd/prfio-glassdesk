from django.contrib.auth.models import Group, User
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import Customer, Message, Tag, Ticket


class AgentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    workload = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, min_length=10)
    email = serializers.EmailField()

    class Meta:
        model = User
        fields = [
            "id",
            "name",
            "first_name",
            "last_name",
            "email",
            "is_staff",
            "is_active",
            "workload",
            "password",
        ]

    def validate_email(self, value):
        value = value.strip().lower()
        existing = User.objects.filter(username=value)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError("An agent already uses this email address.")
        return value

    def validate(self, data):
        if self.instance is None and not data.get("password"):
            raise serializers.ValidationError({"password": "An initial password is required."})
        if self.instance and self.instance.pk == self.context["request"].user.pk:
            if data.get("is_staff") is False or data.get("is_active") is False:
                raise serializers.ValidationError(
                    "You cannot remove your own administrator access."
                )
        if (
            self.instance
            and self.instance.is_superuser
            and (data.get("is_staff") is False or data.get("is_active") is False)
        ):
            raise serializers.ValidationError("Manage technical superuser access in Django Admin.")
        if "password" in data:
            try:
                validate_password(
                    data["password"], self.instance or User(email=data.get("email", ""))
                )
            except DjangoValidationError as error:
                raise serializers.ValidationError({"password": error.messages}) from error
        return data

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User.objects.create_user(
            username=validated_data["email"], password=password, **validated_data
        )
        user.groups.add(Group.objects.get_or_create(name="support_agents")[0])
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        if "email" in validated_data:
            validated_data["username"] = validated_data["email"]
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        return user

    def get_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_workload(self, obj):
        return obj.tickets.filter(status__in=["open", "waiting"]).count()


class CustomerSerializer(serializers.ModelSerializer):
    ticket_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            "id",
            "name",
            "email",
            "company",
            "plan",
            "created_at",
            "ticket_count",
        ]
        read_only_fields = ["created_at"]


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ["id", "name", "color"]


class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "author", "sender", "kind", "body", "created_at"]
        read_only_fields = ["id", "author", "sender", "created_at"]

    def validate_kind(self, value):
        if value not in ["reply", "note"]:
            raise serializers.ValidationError("Choose reply or internal note.")
        return value


class TicketSerializer(serializers.ModelSerializer):
    customer_detail = CustomerSerializer(source="customer", read_only=True)
    assignee_detail = AgentSerializer(source="assignee", read_only=True)
    tag_details = TagSerializer(source="tags", many=True, read_only=True)
    message_count = serializers.IntegerField(read_only=True)
    preview = serializers.SerializerMethodField()
    initial_message = serializers.CharField(write_only=True, required=False, max_length=10000)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "subject",
            "customer",
            "customer_detail",
            "status",
            "priority",
            "assignee",
            "assignee_detail",
            "tags",
            "tag_details",
            "created_at",
            "updated_at",
            "first_response_at",
            "resolved_at",
            "message_count",
            "preview",
            "initial_message",
        ]
        read_only_fields = [
            "created_at",
            "updated_at",
            "first_response_at",
            "resolved_at",
        ]

    def get_preview(self, obj):
        messages = [m for m in obj.messages.all() if m.kind != "event"]
        return messages[-1].body[:160] if messages else ""

    def validate_assignee(self, value):
        from .permissions import is_agent

        if value and not is_agent(value):
            raise serializers.ValidationError("Select an active support agent.")
        return value

    def validate(self, data):
        if self.instance is None and not data.get("initial_message", "").strip():
            raise serializers.ValidationError(
                {"initial_message": "An opening message is required."}
            )
        if self.instance is not None and "initial_message" in data:
            raise serializers.ValidationError(
                {"initial_message": "Use the conversation endpoint to add a reply."}
            )
        return data
