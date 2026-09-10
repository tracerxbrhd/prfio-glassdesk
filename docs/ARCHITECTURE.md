# Architecture and API

## Request flow

```text
Browser / React + Motion
  └── Vite proxy (native) or Nginx (Compose)
        ├── built frontend and local font assets
        └── /api/ → Django session + CSRF → DRF permissions
                       → serializers → transactional services → ORM
                                                            └── PostgreSQL / SQLite
```

The application uses one shared support workspace. Django users supply identity; active staff users and active members of `support_agents` are authorized agents. `StaffWrites` restricts customer, tag, and account mutations to administrators. `StaffDeletes` permits agent ticket work while reserving deletion for administrators. These checks run on the server independently of visible UI controls.

## Data model

| Entity | Important relationships and rules |
| --- | --- |
| Customer | Unique email; company and plan; protected from deletion while tickets reference it. |
| Ticket | Customer, optional agent, many tags, status and priority, creation/update/response/resolution timestamps. |
| Message | Belongs to a ticket; optional Django author; sender label; customer message, public reply, internal note, or generated event. |
| Tag | Unique name and validated six-digit hex color. |
| User | Django account, staff/group access, active flag, hashed password; inactive accounts cannot receive assignments. |

Deleting a ticket cascades to its messages. Removing a user clears message authors and ticket assignment references instead of deleting support history. Customer deletion returns a validation error while referenced. Conversation messages are ordered by timestamp and ID.

## Write services

`create_ticket` saves the ticket and required opening customer message in one transaction. `update_ticket` records subject, status, priority, and assignment changes as event messages. Resolving or closing sets a completion timestamp if absent; reopening clears it. Moving directly from resolved to closed preserves the same completed episode.

`add_message` accepts only an agent reply or internal note. It sets the author from the authenticated user, preventing a client from impersonating a customer or event source. The service locks the ticket row and sets the first-response timestamp only for the first public reply. Notes do not affect response time. PostgreSQL supplies the row-level concurrency guarantee; SQLite is a convenient local fallback with different locking behavior.

Messages are persistent application records. There is no mail transport behind the reply action. The lifecycle rules are expanded in [TICKET_LIFECYCLE.md](TICKET_LIFECYCLE.md).

## Session contract

| Method | Endpoint | Behavior |
| --- | --- | --- |
| GET | `/api/auth/csrf/` | Set the CSRF cookie and return `csrfToken`. |
| POST | `/api/auth/login/` | Accept email/password JSON; validate agent access; establish a session; return user and rotated CSRF token. |
| GET | `/api/auth/me/` | Return current agent identity; unauthenticated or unauthorized callers receive 401. |
| POST | `/api/auth/logout/` | End the session. |

Unsafe requests must include `X-CSRFToken` and the session/CSRF cookies. The frontend keeps its token in memory and replaces it when a response returns a new one. The session cookie is `glassdesk_sessionid`; the CSRF cookie is `glassdesk_csrftoken`. Both use Secure mode in production; the session cookie is HttpOnly, SameSite Lax, and expires after eight hours.

Failed logins are throttled after eight failures for the request IP in a five-minute window. The regular authenticated API rate defaults to `300/minute`. Debug mode uses local memory for cache state; production uses the database cache table created by container startup. Deployments should also enforce edge limits and review forwarded-address handling. See [SECURITY.md](SECURITY.md) for the access model and deployment boundary.

## Resource endpoints

| Endpoint | Methods and behavior |
| --- | --- |
| `/api/tickets/` | GET paginated list; POST create with `initial_message`. Filters: `status`, `priority`, `customer`, `assignee`, `unassigned=true`, and `search`. |
| `/api/tickets/{id}/` | GET, PATCH, PUT; DELETE for staff. |
| `/api/tickets/{id}/messages/` | GET conversation; POST `{ "kind": "reply" or "note", "body": "…" }`. |
| `/api/customers/` | GET list; staff POST. Detail supports GET, PATCH, PUT, DELETE. |
| `/api/tags/` | GET list; staff POST. Detail supports GET, PATCH, PUT, DELETE. |
| `/api/agents/` | GET list; staff POST. Detail supports GET, PATCH, PUT; account deactivation uses `is_active=false`. |
| `/api/dashboard/` | Database-derived summary, seven-day series, distributions, workload, and generation time. |

Resource lists use DRF pagination with a default page size of 100. The client follows all pages before filtering its current workspace. Ticket list queries select customer/agent relationships and prefetch tags/messages. Dashboard calculations currently load tickets into memory; this keeps the small-team implementation legible but is not a large-data reporting architecture.

Create a ticket:

```json
{
  "subject": "Help with workspace access",
  "customer": 1,
  "priority": "high",
  "status": "open",
  "assignee": 2,
  "tags": [1],
  "initial_message": "Our new teammate cannot open the shared workspace."
}
```

Statuses: `open`, `waiting`, `resolved`, `closed`. Priorities: `low`, `normal`, `high`, `urgent`. Initial messages and subsequent message bodies are limited to 10,000 characters. Customers and assignees must refer to valid records; assigned users must be active support agents. Invalid fields produce 400 responses, denied resource access uses 403, missing resources use 404, and throttles use 429.

## Reporting definitions

| Metric | Definition |
| --- | --- |
| Unresolved | Tickets currently open or waiting. |
| Unassigned | Unresolved tickets without an agent. |
| Urgent | Unresolved tickets with urgent priority. |
| Tickets today | Ticket creation dates matching the current UTC day. |
| First response average | Mean elapsed minutes from creation to first public reply, only for answered tickets. |
| Resolution average | Mean elapsed hours from creation to the stored resolved timestamp, only for currently completed tickets. |
| Seven-day series | Tickets created and tickets resolved on each UTC calendar day. |
| Agent workload | Current open/waiting ticket count; bars scale to the largest agent count. |

Missing response/resolution samples return null and appear as a dash. Reopened tickets leave the resolved sample until completed again. Averages include nights and weekends; they do not measure business-hour SLA compliance. The small decorative marks in metric cards are visual accents rather than separate time-series measurements. The main activity chart and workload bars use API data.

## Frontend and deployment boundaries

Feature pages live under `frontend/src/pages`. The workspace provider loads summaries and resources concurrently, exposes mutations, and refreshes after successful writes. Forms use native dialogs, and failed requests remain visible through alerts. Motion animates route changes; user reduced-motion preferences are respected.

Compose runs PostgreSQL, Gunicorn/Django, and Nginx. Development exposes loopback HTTP on 8083. The production override mounts existing TLS files and exposes HTTPS on 443, sends a fixed trusted HTTPS scheme to Django, and disables debug/demo seeding. WhiteNoise serves collected Django static files. Database migrations and cache creation run at startup; larger deployments should move these into a coordinated release step.

See the [README](../README.md), [ticket lifecycle](TICKET_LIFECYCLE.md), and [security notes](SECURITY.md).