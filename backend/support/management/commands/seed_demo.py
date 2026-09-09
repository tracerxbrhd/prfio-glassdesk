import os
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from support.models import Customer, Message, Tag, Ticket

CUSTOMERS = [
    ("Olivia Chen", "olivia@lumalabs.example", "Luma Labs", "enterprise"),
    ("James Wilson", "james@arcstudio.example", "Arc Studio", "growth"),
    ("Sofia Martins", "sofia@northstar.example", "Northstar", "enterprise"),
    ("Ethan Brooks", "ethan@folio.example", "Folio", "growth"),
    ("Amara Okafor", "amara@kindred.example", "Kindred", "starter"),
    ("Noah Park", "noah@orbit.example", "Orbit Health", "enterprise"),
    ("Isabella Rossi", "isabella@forma.example", "Forma", "growth"),
    ("Lucas Meyer", "lucas@fieldwork.example", "Fieldwork", "growth"),
    ("Maya Patel", "maya@coast.example", "Coast Finance", "enterprise"),
]
SUBJECTS = [
    (
        "Workspace members can't access shared projects",
        "We've added three teammates to our workspace, but they see an access denied message when opening shared projects. Our launch review is this afternoon. Could you help us check the workspace permissions?",
        "urgent",
        "open",
        0,
        0,
    ),
    (
        "Invoice needs our updated billing address",
        "Could you update our September invoice with our new address: 18 River Street, London? The legal entity is still Arc Studio Ltd. Thank you!",
        "normal",
        "open",
        1,
        1,
    ),
    (
        "Webhook deliveries stopped after key rotation",
        "We rotated our integration key this morning. Since then, the project.updated webhook has stopped arriving at our endpoint. Our server logs don't show any incoming requests.",
        "high",
        "open",
        2,
        2,
    ),
    (
        "A little help exporting our project archive",
        "We're wrapping up our quarterly audit and need to export all completed projects, including their activity history. Is the CSV export the best way to do this?",
        "normal",
        "waiting",
        3,
        3,
    ),
    (
        "Can we add a second workspace?",
        "Our editorial team would like a separate workspace. Can it share the same subscription, or do we need a second plan?",
        "low",
        "open",
        4,
        4,
    ),
    (
        "SSO sign-in redirects to the wrong workspace",
        "Our SAML provider is correctly configured, but two colleagues are landing in our archived workspace after signing in. We've attached the workspace ID in our account notes.",
        "urgent",
        "waiting",
        5,
        0,
    ),
    (
        "Custom domain verification is pending",
        "We added the TXT record yesterday. The domain still shows as pending in settings. Could you check whether your verification has picked it up?",
        "high",
        "open",
        6,
        2,
    ),
    (
        "Where can I download the signed DPA?",
        "Our procurement team needs the signed data processing agreement. I couldn't find the document under billing. Can you point us in the right direction?",
        "normal",
        "open",
        7,
        1,
    ),
    (
        "Dashboard loading slowly with date filters",
        "The reporting dashboard takes around 20 seconds to load when we filter to the last 90 days. This started after we imported our historical projects last week.",
        "high",
        "waiting",
        8,
        2,
    ),
    (
        "Permission settings for external reviewers",
        "We want our client to leave comments without seeing internal tasks. Is there a reviewer role we can use for this?",
        "normal",
        "resolved",
        0,
        0,
    ),
    (
        "Monthly export is missing two columns",
        "The CSV export doesn't include the custom fields we added last week. We'd like to use these in our monthly reporting workflow.",
        "normal",
        "resolved",
        1,
        3,
    ),
    (
        "Update our subscription contact",
        "Please change the billing contact to our new finance lead. I've added them as a workspace administrator and they can verify the request.",
        "low",
        "closed",
        2,
        1,
    ),
]


class Command(BaseCommand):
    help = "Create a realistic, idempotent support workspace for local evaluation."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG and os.getenv("ALLOW_DEMO_SEED") != "true":
            raise CommandError(
                "Demo seeding is disabled outside development. Set ALLOW_DEMO_SEED=true explicitly."
            )
        group, _ = Group.objects.get_or_create(name="support_agents")
        agents = []
        for email, first, last, staff in [
            ("admin@example.com", "Alex", "Morgan", True),
            ("mia@example.com", "Mia", "Thompson", False),
            ("leo@example.com", "Leo", "Kim", False),
            ("ava@example.com", "Ava", "Robinson", False),
        ]:
            user, created = User.objects.get_or_create(
                username=email,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "is_staff": staff,
                    "is_superuser": staff,
                },
            )
            if created:
                user.set_password(os.getenv("DEMO_PASSWORD", "demo-password"))
                user.save()
                user.groups.add(group)
            agents.append(user)
        customers = [
            Customer.objects.get_or_create(
                email=email, defaults={"name": name, "company": company, "plan": plan}
            )[0]
            for name, email, company, plan in CUSTOMERS
        ]
        tags = [
            Tag.objects.get_or_create(name=name, defaults={"color": color})[0]
            for name, color in [
                ("Account", "#5664d7"),
                ("Billing", "#ab6b35"),
                ("Technical", "#278687"),
                ("How-to", "#8061ba"),
                ("Feature request", "#c16381"),
            ]
        ]
        now = timezone.now()
        added = 0
        for index in range(42):
            subject, body, priority, base_status, customer_index, tag_index = SUBJECTS[
                index % len(SUBJECTS)
            ]
            if index >= 12:
                subject = f"{subject} — {['August follow-up', 'September follow-up', 'Team rollout'][index // 12 - 1]}"
            ticket, created = Ticket.objects.get_or_create(
                subject=subject,
                customer=customers[customer_index],
                defaults={
                    "priority": priority,
                    "status": base_status
                    if index < 12
                    else ["resolved", "closed", "resolved", "open"][index % 4],
                    "assignee": None if index in [4, 7, 14] else agents[index % 4],
                },
            )
            if not created:
                continue
            added += 1
            created_at = now - timedelta(days=index // 6, hours=(index % 6) * 1.5 + 0.6)
            response_at = (
                created_at + timedelta(minutes=12 + (index % 8) * 7) if index % 5 != 0 else None
            )
            resolved_at = (
                created_at + timedelta(hours=2.2 + index % 5)
                if ticket.status in ["resolved", "closed"]
                else None
            )
            if resolved_at and resolved_at > now:
                resolved_at = now - timedelta(minutes=3)
            Ticket.objects.filter(pk=ticket.pk).update(
                created_at=created_at,
                updated_at=created_at + timedelta(minutes=35),
                first_response_at=response_at,
                resolved_at=resolved_at,
            )
            ticket.tags.add(tags[tag_index])
            message = Message.objects.create(
                ticket=ticket, sender=ticket.customer.name, kind="customer", body=body
            )
            Message.objects.filter(pk=message.pk).update(created_at=created_at)
            if response_at:
                author = ticket.assignee or agents[0]
                message = Message.objects.create(
                    ticket=ticket,
                    author=author,
                    sender=author.get_full_name(),
                    kind="reply",
                    body="Thanks for the details. I've checked your workspace and am looking into this with our team. I'll keep everything in this conversation so you have a clear record of the next steps.",
                )
                Message.objects.filter(pk=message.pk).update(created_at=response_at)
            if index == 0:
                note = Message.objects.create(
                    ticket=ticket,
                    author=agents[0],
                    sender="Alex Morgan",
                    kind="note",
                    body="Confirmed: the new members were invited before the project visibility update. Checking their inherited access with the platform team. Customer has a review at 3 pm.",
                )
                Message.objects.filter(pk=note.pk).update(
                    created_at=created_at + timedelta(minutes=8)
                )
            if resolved_at:
                msg = Message.objects.create(
                    ticket=ticket,
                    sender="GlassDesk",
                    kind="event",
                    body="Ticket marked as resolved after confirming the fix with the customer.",
                )
                Message.objects.filter(pk=msg.pk).update(created_at=resolved_at)
        self.stdout.write(
            self.style.SUCCESS(
                f"Workspace ready: {added} new tickets, {Ticket.objects.count()} total. Existing records and passwords preserved."
            )
        )
