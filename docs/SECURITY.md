# Security and access

GlassDesk is a shared internal support workspace. Its authorization model distinguishes ordinary support work from administrative changes to the workspace itself.

## Workspace membership

A user can enter the application when the Django account is active and either:

- has Django staff access; or
- belongs to the `support_agents` group.

This is a single-team boundary. An authorized support agent can read the shared ticket history, customer context, tags, team list and reporting data. The current implementation does not provide tenant isolation or per-customer visibility partitions.

Inactive accounts cannot authenticate into the workspace or receive new ticket assignments.

## Agent and administrator operations

Support agents can perform day-to-day ticket work:

- create and edit tickets;
- change status, priority and assignment;
- add public replies;
- add internal notes;
- read customer context, tags, team information and reporting.

Administrator-only operations include:

- permanently deleting tickets;
- creating, editing and deleting customer records when referential rules permit it;
- managing tags;
- creating and updating agent accounts;
- setting passwords and deactivating accounts.

Administrators cannot use the team API to remove their own staff access or deactivate themselves. Django superuser status is a separate technical-administration concern.

DRF permission classes enforce these boundaries on the server. Hiding a React control is not treated as authorization.

## Conversation authorship

Agent message creation accepts only a reply or internal note. The backend derives the author from the authenticated request instead of accepting an arbitrary author identity from the client.

Generated timeline events are created by ticket services when relevant properties change. They are not a client-selectable message type.

These rules prevent the ordinary conversation endpoint from being used to forge customer messages, system events or another agent's identity.

## Sessions and CSRF

Authentication uses Django sessions rather than browser-stored bearer tokens.

- Session cookie: `glassdesk_sessionid`
- CSRF cookie: `glassdesk_csrftoken`
- Session cookie is HttpOnly.
- SameSite is Lax.
- Production enables Secure cookies.
- Session lifetime is eight hours.

The frontend obtains a CSRF token from the authentication API and sends it on unsafe requests. Credentials and session tokens are not persisted in local storage.

Project-specific cookie names allow GlassDesk to run beside other local Django applications on the same hostname without replacing their default session/CSRF cookies.

## Login and API throttling

Repeated failed login attempts are throttled for the request IP. The regular authenticated API also has a configurable request rate.

Debug development uses local memory for cache state. The production Compose configuration uses Django's database cache so multiple Gunicorn workers share throttle state.

Application throttling is not a substitute for trusted-edge controls. A real deployment should configure ingress request limiting and forwarded-address handling according to its reverse-proxy topology.

## Production configuration

Production configuration requires a non-debug Django setup, a strong secret, PostgreSQL, trusted hosts/origins and HTTPS. The provided production Compose overlay enables secure-cookie/HTTPS settings and disables demo seeding.

The repository does not provision DNS or certificates and does not constitute a complete production security baseline. Operators still need certificate renewal, PostgreSQL backups and restore testing, monitoring, log retention and host/ingress hardening.

## Data and scope boundaries

GlassDesk stores support conversations and customer records, so a real deployment should treat its database and backups as sensitive operational data.

The current project does not implement immutable compliance logging, tenant isolation, customer authentication, attachment scanning, email security controls, SSO or external identity federation. Those are explicit scope boundaries rather than implied capabilities.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the request flow and [TICKET_LIFECYCLE.md](TICKET_LIFECYCLE.md) for transactional conversation behavior.