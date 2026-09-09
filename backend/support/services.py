from datetime import timedelta

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Count, Q
from django.utils import timezone

from .models import Message, Ticket


@transaction.atomic
def create_ticket(serializer):
    opening = serializer.validated_data.pop("initial_message")
    ticket = serializer.save()
    if ticket.status in ["resolved", "closed"]:
        ticket.resolved_at = timezone.now()
        ticket.save(update_fields=["resolved_at"])
    Message.objects.create(
        ticket=ticket, sender=ticket.customer.name, kind="customer", body=opening
    )
    return ticket


@transaction.atomic
def update_ticket(serializer, user):
    previous = serializer.instance
    old = {
        field: getattr(previous, field)
        for field in ["status", "priority", "assignee_id", "subject"]
    }
    ticket = serializer.save()
    changes = []
    for field in ["status", "priority", "subject"]:
        if old[field] != getattr(ticket, field):
            changes.append(f"{field.capitalize()} changed to {getattr(ticket, field)}")
    if old["assignee_id"] != ticket.assignee_id:
        changes.append(
            f"Assigned to {ticket.assignee.get_full_name()}"
            if ticket.assignee
            else "Assignment removed"
        )
    if old["status"] != ticket.status:
        if ticket.status in ["resolved", "closed"]:
            ticket.resolved_at = ticket.resolved_at or timezone.now()
        else:
            ticket.resolved_at = None
        ticket.save(update_fields=["resolved_at"])
    if changes:
        Message.objects.create(
            ticket=ticket,
            author=user,
            sender=user.get_full_name(),
            kind="event",
            body=" · ".join(changes),
        )
    return ticket


@transaction.atomic
def add_message(ticket, serializer, user):
    # Serialize first-response updates so simultaneous replies cannot overwrite the first timestamp.
    ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
    message = serializer.save(
        ticket=ticket, author=user, sender=user.get_full_name() or user.username
    )
    if message.kind == "reply" and not ticket.first_response_at:
        ticket.first_response_at = message.created_at
    ticket.save(update_fields=["updated_at", "first_response_at"])
    return message


def dashboard():
    now = timezone.now()
    today = now.date()
    tickets = list(Ticket.objects.all())
    resolved_hours = [
        (t.resolved_at - t.created_at).total_seconds() / 3600 for t in tickets if t.resolved_at
    ]
    response_minutes = [
        (t.first_response_at - t.created_at).total_seconds() / 60
        for t in tickets
        if t.first_response_at
    ]
    daily = []
    for offset in range(6, -1, -1):
        day = today - timedelta(days=offset)
        daily.append(
            {
                "date": day.isoformat(),
                "label": day.strftime("%a"),
                "received": sum(t.created_at.date() == day for t in tickets),
                "resolved": sum(
                    t.resolved_at is not None and t.resolved_at.date() == day for t in tickets
                ),
            }
        )
    agents = User.objects.filter(
        Q(groups__name="support_agents") | Q(is_staff=True), is_active=True
    ).distinct()
    workload = [
        {
            "id": a.pk,
            "name": a.get_full_name(),
            "email": a.email,
            "open": sum(t.assignee_id == a.pk and t.status in ["open", "waiting"] for t in tickets),
            "resolved": sum(
                t.assignee_id == a.pk and t.status in ["resolved", "closed"] for t in tickets
            ),
        }
        for a in agents
    ]
    return {
        "unresolved": sum(t.status in ["open", "waiting"] for t in tickets),
        "tickets_today": sum(t.created_at.date() == today for t in tickets),
        "avg_resolution_hours": round(sum(resolved_hours) / len(resolved_hours), 1)
        if resolved_hours
        else None,
        "avg_response_minutes": round(sum(response_minutes) / len(response_minutes), 1)
        if response_minutes
        else None,
        "resolved_total": len(resolved_hours),
        "response_sample_size": len(response_minutes),
        "unassigned": sum(
            t.assignee_id is None and t.status in ["open", "waiting"] for t in tickets
        ),
        "urgent": sum(t.priority == "urgent" and t.status in ["open", "waiting"] for t in tickets),
        "total": len(tickets),
        "daily": daily,
        "workload": workload,
        "statuses": list(
            Ticket.objects.values("status").annotate(count=Count("id")).order_by("status")
        ),
        "priorities": list(
            Ticket.objects.filter(status__in=["open", "waiting"])
            .values("priority")
            .annotate(count=Count("id"))
            .order_by("priority")
        ),
        "generated_at": now.isoformat(),
    }
