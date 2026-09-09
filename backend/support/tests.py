from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import Group, User
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Customer, Message, Ticket


class SupportAPITests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = User.objects.create_user(
            "admin@example.com", password="strong-test-password", is_staff=True
        )
        self.agent = User.objects.create_user("agent@example.com", password="strong-test-password")
        self.agent.groups.add(Group.objects.create(name="support_agents"))
        self.outsider = User.objects.create_user(
            "viewer@example.com", password="strong-test-password"
        )
        self.customer = Customer.objects.create(
            name="Olivia Chen", email="olivia@example.com", company="Luma"
        )
        self.client = APIClient()

    def create_ticket(self):
        return self.client.post(
            "/api/tickets/",
            {
                "subject": "Workspace access",
                "customer": self.customer.pk,
                "priority": "high",
                "initial_message": "Please check my permissions.",
            },
            format="json",
        )

    def test_anonymous_and_outsiders_cannot_read_support_data(self):
        self.assertEqual(self.client.get("/api/tickets/").status_code, 403)
        self.client.force_authenticate(self.outsider)
        self.assertEqual(self.client.get("/api/customers/").status_code, 403)

    def test_login_requires_csrf_and_support_membership(self):
        client = APIClient(enforce_csrf_checks=True)
        self.assertEqual(
            client.post(
                "/api/auth/login/",
                {"email": "admin@example.com", "password": "strong-test-password"},
                format="json",
            ).status_code,
            403,
        )
        token = client.get("/api/auth/csrf/").json()["csrfToken"]
        response = client.post(
            "/api/auth/login/",
            {"email": "admin@example.com", "password": "strong-test-password"},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertTrue(client.cookies[settings.SESSION_COOKIE_NAME]["httponly"])
        self.assertEqual(settings.SESSION_COOKIE_NAME, "glassdesk_sessionid")
        self.assertEqual(settings.CSRF_COOKIE_NAME, "glassdesk_csrftoken")
        self.assertEqual(client.get("/api/auth/me/").status_code, 200)
        token = response.json()["csrfToken"]
        self.assertEqual(client.post("/api/auth/logout/", HTTP_X_CSRFTOKEN=token).status_code, 200)
        self.assertEqual(client.get("/api/auth/me/").status_code, 401)

    def test_authenticated_writes_require_csrf(self):
        client = APIClient(enforce_csrf_checks=True)
        client.force_login(self.admin)
        self.assertEqual(client.post("/api/tickets/", {}, format="json").status_code, 403)

    def test_ticket_crud_conversation_and_resolution(self):
        self.client.force_authenticate(self.admin)
        response = self.create_ticket()
        self.assertEqual(response.status_code, 201)
        pk = response.json()["id"]
        self.assertEqual(
            self.client.get(f"/api/tickets/{pk}/").json()["subject"], "Workspace access"
        )
        reply = self.client.post(
            f"/api/tickets/{pk}/messages/",
            {"kind": "reply", "body": "I've restored your access."},
            format="json",
        )
        self.assertEqual(reply.status_code, 201)
        self.assertIsNotNone(Ticket.objects.get(pk=pk).first_response_at)
        self.assertEqual(
            self.client.patch(
                f"/api/tickets/{pk}/", {"status": "resolved"}, format="json"
            ).status_code,
            200,
        )
        self.assertIsNotNone(Ticket.objects.get(pk=pk).resolved_at)
        self.assertEqual(
            self.client.get(f"/api/tickets/{pk}/messages/").json()[-1]["kind"], "event"
        )
        self.client.patch(f"/api/tickets/{pk}/", {"status": "open"}, format="json")
        self.assertIsNone(Ticket.objects.get(pk=pk).resolved_at)
        self.assertEqual(self.client.delete(f"/api/tickets/{pk}/").status_code, 204)
        self.assertFalse(Message.objects.filter(ticket_id=pk).exists())

    def test_validation_and_staff_boundaries(self):
        self.client.force_authenticate(self.agent)
        ticket = self.create_ticket().json()
        pk = ticket["id"]
        self.assertEqual(self.client.delete(f"/api/tickets/{pk}/").status_code, 403)
        self.assertEqual(self.client.post("/api/customers/", {}, format="json").status_code, 403)
        self.assertEqual(
            self.client.patch(
                f"/api/tickets/{pk}/", {"status": "invented"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/tickets/{pk}/", {"assignee": self.outsider.pk}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                f"/api/tickets/{pk}/messages/",
                {"kind": "event", "body": "spoof"},
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                f"/api/tickets/{pk}/messages/",
                {"kind": "reply", "body": " "},
                format="json",
            ).status_code,
            400,
        )
        self.assertEqual(self.client.get("/api/tickets/?customer=abc").status_code, 400)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.delete(f"/api/customers/{self.customer.pk}/").status_code, 400)
        self.assertEqual(
            self.client.post(
                "/api/tags/", {"name": "Billing", "color": "red"}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.post(
                "/api/tickets/",
                {"subject": "Empty", "customer": self.customer.pk},
                format="json",
            ).status_code,
            400,
        )

    def test_customer_tag_crud(self):
        self.client.force_authenticate(self.admin)
        customer = self.client.post(
            "/api/customers/",
            {
                "name": "New customer",
                "email": "new@example.com",
                "company": "New Co",
                "plan": "growth",
            },
            format="json",
        )
        self.assertEqual(customer.status_code, 201)
        path = f"/api/customers/{customer.json()['id']}/"
        self.assertEqual(
            self.client.patch(path, {"company": "Updated Co"}, format="json").status_code,
            200,
        )
        self.assertEqual(self.client.delete(path).status_code, 204)
        tag = self.client.post("/api/tags/", {"name": "Billing", "color": "#345678"}, format="json")
        self.assertEqual(tag.status_code, 201)
        path = f"/api/tags/{tag.json()['id']}/"
        self.assertEqual(
            self.client.patch(path, {"name": "Payments"}, format="json").status_code,
            200,
        )
        self.assertEqual(self.client.delete(path).status_code, 204)

    def test_dashboard_uses_persisted_timestamps(self):
        self.client.force_authenticate(self.admin)
        ticket = Ticket.objects.create(
            subject="Known duration", customer=self.customer, status="resolved"
        )
        created = timezone.now() - timedelta(hours=5)
        Ticket.objects.filter(pk=ticket.pk).update(
            created_at=created,
            first_response_at=created + timedelta(minutes=12),
            resolved_at=created + timedelta(hours=4),
        )
        metrics = self.client.get("/api/dashboard/").json()
        self.assertEqual(metrics["avg_resolution_hours"], 4)
        self.assertEqual(metrics["avg_response_minutes"], 12)
        self.assertEqual(metrics["unresolved"], 0)
        self.assertEqual(metrics["response_sample_size"], 1)

    def test_agent_management_password_and_deactivation(self):
        self.client.force_authenticate(self.admin)
        weak = self.client.post(
            "/api/agents/",
            {
                "first_name": "Weak",
                "last_name": "Password",
                "email": "weak@example.com",
                "password": "12345678901234",
            },
            format="json",
        )
        self.assertEqual(weak.status_code, 400)
        self.assertIn("password", weak.json())
        response = self.client.post(
            "/api/agents/",
            {
                "first_name": "Robin",
                "last_name": "Lane",
                "email": "robin@example.com",
                "password": "Initial-robin-password-42",
                "is_staff": False,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("password", response.json())
        agent = User.objects.get(pk=response.json()["id"])
        self.assertTrue(agent.check_password("Initial-robin-password-42"))
        self.assertTrue(agent.groups.filter(name="support_agents").exists())
        path = f"/api/agents/{agent.pk}/"
        self.assertEqual(
            self.client.patch(path, {"is_active": False}, format="json").status_code, 200
        )
        ticket = self.create_ticket().json()
        self.assertEqual(
            self.client.patch(
                f"/api/tickets/{ticket['id']}/", {"assignee": agent.pk}, format="json"
            ).status_code,
            400,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/agents/{self.admin.pk}/", {"is_staff": False}, format="json"
            ).status_code,
            400,
        )
        self.client.force_authenticate(self.agent)
        self.assertEqual(
            self.client.patch(path, {"is_staff": True}, format="json").status_code, 403
        )

    def test_login_rejects_inactive_outsider_and_invalid_json(self):
        client = APIClient()
        self.assertEqual(client.post("/api/auth/login/", [], format="json").status_code, 400)
        self.assertEqual(
            client.post(
                "/api/auth/login/",
                {"email": self.outsider.username, "password": "strong-test-password"},
                format="json",
            ).status_code,
            400,
        )
        self.agent.is_active = False
        self.agent.save()
        self.assertEqual(
            client.post(
                "/api/auth/login/",
                {"email": self.agent.username, "password": "strong-test-password"},
                format="json",
            ).status_code,
            400,
        )

    def test_internal_notes_do_not_count_as_first_response(self):
        self.client.force_authenticate(self.admin)
        ticket = self.create_ticket().json()
        response = self.client.post(
            f"/api/tickets/{ticket['id']}/messages/",
            {"kind": "note", "body": "Check with engineering."},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertIsNone(Ticket.objects.get(pk=ticket["id"]).first_response_at)
        self.assertIsNone(self.client.get("/api/dashboard/").json()["avg_response_minutes"])

    @override_settings(DEBUG=False)
    def test_demo_seed_is_disabled_in_production(self):
        from unittest.mock import patch

        from django.core.management.base import CommandError

        with patch.dict("os.environ", {"ALLOW_DEMO_SEED": "false"}):
            with self.assertRaises(CommandError):
                call_command("seed_demo")

    @override_settings(DEBUG=True)
    def test_seed_is_idempotent(self):
        call_command("seed_demo")
        count = Ticket.objects.count()
        password = User.objects.get(username="mia@example.com").password
        call_command("seed_demo")
        self.assertEqual(Ticket.objects.count(), count)
        self.assertEqual(User.objects.get(username="mia@example.com").password, password)
