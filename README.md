# GlassDesk

A shared customer-support workspace built around the lifecycle of a ticket: triage the request, assign an owner, keep replies and internal notes in one timeline, and measure how the team is responding.

![GlassDesk overview](docs/screenshots/dashboard-1440.png)

GlassDesk is a full-stack portfolio project using React and Django REST Framework. It is deliberately scoped as an **agent workspace** rather than a complete help-desk service: messages are persisted as conversation records, but no email transport or customer portal is connected.

## Support workflow

A ticket connects a customer, an optional support agent, tags, priority, status, timestamps, and a persistent conversation.

```text
new request
    │
    ▼
  open ──────────────┐
    │                 │
    ▼                 │
 waiting              │ reopen
    │                 │
    ▼                 │
 resolved ────────────┘
    │
    ▼
 closed
```

Agents can add two kinds of conversation entries:

- **Reply** — a public support response stored in the ticket timeline. The first reply establishes `first_response_at`.
- **Internal note** — staff-only context that remains in the timeline but does not affect first-response metrics.

Changes to status, priority, subject, and assignment are also recorded as timeline events. This makes the ticket conversation the history of the work rather than keeping important changes only in the current row state.

For the detailed transition and timestamp rules, see [Ticket lifecycle](docs/TICKET_LIFECYCLE.md).

## What is in the workspace

- **Inbox** — search by ticket, subject, customer, or company; filter by ownership, status, priority, and agent.
- **Conversation view** — replies, notes, generated events, ticket properties, customer context, and assignment in one screen.
- **Customers** — company, plan, contact details, and previous tickets.
- **Team** — agent accounts and access administration.
- **Reporting** — unresolved and unassigned work, first-response and resolution averages, seven-day activity, and current agent workload.

| Inbox | Ticket conversation |
| --- | --- |
| ![Shared inbox](docs/screenshots/inbox-1440.png) | ![Ticket detail](docs/screenshots/ticket-1440.png) |

| Sign in | Analytics |
| --- | --- |
| ![Login](docs/screenshots/login-1440.png) | ![Analytics](docs/screenshots/analytics-1440.png) |

## Ticket consistency

The service layer owns the operations where a support timeline and the ticket row must remain consistent.

`create_ticket` creates the ticket and its opening customer message in one database transaction. `update_ticket` records important property changes as event messages instead of silently replacing history.

`add_message` derives the author from the authenticated session and only accepts agent replies or internal notes. A client cannot submit a forged customer/event message through this path.

For a public reply, PostgreSQL locks the ticket row before checking `first_response_at`. Two agents replying concurrently therefore cannot independently establish different first-response timestamps. SQLite remains useful for local development, but PostgreSQL provides the intended row-lock semantics.

## Access model

GlassDesk has two workspace roles rather than the three-role project hierarchy used by a project-management system.

| Capability | Administrator | Support agent |
| --- | --- | --- |
| Read shared tickets, customers, tags and reporting | Yes | Yes |
| Create/edit/assign tickets | Yes | Yes |
| Add replies and internal notes | Yes | Yes |
| Delete tickets permanently | Yes | No |
| Manage customers and tags | Yes | No |
| Create, deactivate and update agent accounts | Yes | No |

An active Django staff user or active member of the `support_agents` group can enter the workspace. Authorization is enforced by DRF permissions, independently of whether a control is visible in React.

Sessions use the HttpOnly `glassdesk_sessionid` cookie and a separate `glassdesk_csrftoken`. Unsafe requests require CSRF protection; credentials are not stored in browser local storage. Production enables secure-cookie settings and uses a database-backed cache for shared throttling.

More detail is in [Security and access](docs/SECURITY.md).

## Reporting semantics

The dashboard reports operational state derived from persisted tickets:

- **Unresolved** — tickets currently `open` or `waiting`.
- **Unassigned** — unresolved tickets without an agent.
- **First response** — elapsed time from ticket creation to the first public agent reply. Notes do not count.
- **Resolution** — elapsed time from creation to the stored completion timestamp.
- **Agent workload** — current open/waiting ticket count per agent.

These are elapsed-clock metrics with UTC reporting boundaries, not business-hours SLA calculations. The current dashboard is designed for the seeded small-team dataset and performs some aggregation in Python; a larger installation should move reporting aggregation into database queries or a reporting pipeline.

## Stack

**Frontend:** React 19, React Router, Vite, Motion, custom CSS.

**Backend:** Django 5.2, Django REST Framework, PostgreSQL 17 in Compose, SQLite for lightweight native development.

**Runtime:** Gunicorn, WhiteNoise and Nginx. The application uses same-origin API requests in the container deployment.

The backend separates models, serializers, permission policies, HTTP views, and transactional services. [Architecture and API](docs/ARCHITECTURE.md) documents the request flow, data model and endpoint contract.

## Run locally

### Docker

Requires Docker Engine and Docker Compose v2:

```bash
cp .env.example .env
docker compose up --build
```

On PowerShell use `Copy-Item .env.example .env`. Choose a local PostgreSQL password and `DJANGO_SECRET_KEY` in `.env`, then open `http://localhost:8083`.

Container startup applies migrations, creates the cache table, collects Django static assets and, when enabled, seeds the demonstration workspace.

### Native development

Requires Python 3.12+ and Node.js 24.

```bash
python -m venv .venv
# activate the virtual environment
python -m pip install -r backend/requirements.txt
python backend/manage.py migrate
python backend/manage.py seed_demo
python backend/manage.py runserver 127.0.0.1:8103
```

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

Without `DATABASE_URL`, native development uses `backend/db.sqlite3`. The frontend runs on port 5105 and proxies API requests to Django on port 8103.

## Demo workspace

A fresh seed contains **42 tickets, nine customers, four agents and five tags**, with history generated relative to the seed date.

| Account | Email | Password |
| --- | --- | --- |
| Administrator | `admin@example.com` | `demo-password` |
| Agent | `mia@example.com` | `demo-password` |
| Agent | `leo@example.com` | `demo-password` |
| Agent | `ava@example.com` | `demo-password` |

These credentials are for local evaluation only. Demo seeding is blocked outside debug mode unless explicitly overridden, and the production Compose configuration disables it.

## Verification

Backend:

```bash
ruff check backend
ruff format --check backend
python backend/manage.py check
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test support
```

Frontend:

```bash
cd frontend
npm run lint
npm run format:check
npm run build
npx playwright install chromium
npm run test:e2e
```

The test suite covers authentication and permissions, ticket and conversation persistence, response/resolution timestamps, administration boundaries, reporting values, browser workflows, responsive layouts, keyboard interactions, and automated accessibility checks. CI additionally exercises the backend against PostgreSQL and builds the container images.

## Deployment notes

`compose.production.yaml` provides a dedicated-host configuration with HTTPS, secure Django settings, PostgreSQL, shared cache state, Gunicorn and Nginx. It expects existing TLS certificate files and production secrets; it does not provision DNS, certificates, backups, monitoring, or ingress policy.

Before using it outside a review environment, create real staff accounts, disable demo seeding, arrange PostgreSQL backup/restore procedures, and configure operational monitoring and request limiting.

## Scope

GlassDesk is intentionally a single shared support workspace. It does not currently implement:

- inbound or outbound email transport;
- a customer self-service portal;
- attachments;
- tenant isolation;
- real-time push updates;
- business-hours SLA calendars;
- immutable compliance auditing.

The UI follows API pagination but currently loads the workspace for local filtering. Server-driven filtering and database-side reporting would be the next scaling boundary.

The people, companies, conversations and metrics in the seed are fictional demonstration data.

## Documentation

- [Ticket lifecycle](docs/TICKET_LIFECYCLE.md) — conversation types, transitions and response/resolution timestamps.
- [Architecture and API](docs/ARCHITECTURE.md) — request flow, data model, endpoints and reporting definitions.
- [Security and access](docs/SECURITY.md) — workspace membership, administrative boundaries, sessions, CSRF and throttling.
- [Credits and licenses](CREDITS.md) — local typography, dependencies and asset provenance.

## License

This repository is source-available for portfolio review and evaluation only. The original code and other original materials are **not open source** and may not be reused, redistributed, incorporated into other projects, or commercially exploited without prior written permission. See the [Portfolio Source License](LICENSE) for the complete terms. Third-party components remain subject to their respective licenses.
