# Ticket lifecycle

GlassDesk treats the ticket timeline as the history of support work. The current ticket row describes the present state; messages and generated events explain how it got there.

## Core records

A ticket belongs to a customer, may be assigned to an agent, may carry multiple tags, and stores priority, status and response/resolution timestamps.

Each conversation entry belongs to exactly one ticket and has one of four meanings:

| Kind | Source | Purpose |
| --- | --- | --- |
| Customer message | Ticket creation / stored conversation | The customer's request or follow-up context. |
| Reply | Authenticated agent | Public support response. The first reply establishes first-response time. |
| Internal note | Authenticated agent | Staff context that is not treated as a public response. |
| Event | Application service | Records important ticket-property changes in the timeline. |

The message author for replies and notes is taken from the authenticated user. The client cannot use the agent message endpoint to impersonate a customer or manufacture an event entry.

## Statuses

```text
open
  │
  ├──► waiting
  │       │
  │       ▼
  └──► resolved ───► closed
          │
          └────────► open / waiting (reopened)
```

The API accepts the four states `open`, `waiting`, `resolved`, and `closed`.

`open` and `waiting` are unresolved work. Moving a ticket into `resolved` or `closed` establishes its completion timestamp when one is not already present. Moving directly from `resolved` to `closed` keeps the same completed episode.

Reopening a completed ticket clears the completion timestamp so a later resolution can establish a new one.

## Ticket creation

Ticket creation requires an opening customer message. `create_ticket` stores the ticket and that first message in one transaction, so a successful ticket cannot exist without the conversation that opened it.

The customer must already exist. Assignment is optional; when supplied, the assignee must be an active support agent.

## Property changes

`update_ticket` handles changes that affect support context. Changes to subject, status, priority and assignment are represented by generated event messages in addition to updating the ticket row.

This keeps a reader from seeing only the final state. For example, a reassignment or escalation remains visible in the same chronology as replies and notes.

## First response

Only a public agent reply counts as a first response. Internal notes do not.

When a reply is added, the service locks the ticket row on PostgreSQL before checking `first_response_at`. If the field is still empty, the current reply establishes it. Later replies leave the original timestamp unchanged.

This matters when two agents reply to the same ticket at nearly the same time: the database row lock serializes the first-response decision rather than letting both requests independently observe an empty timestamp.

SQLite is supported for convenient native development, but its locking model is different. PostgreSQL is the intended database for the concurrency guarantee.

## Resolution metrics

GlassDesk reports elapsed clock time rather than a business-hours SLA.

- **First response duration:** ticket creation → first public reply.
- **Resolution duration:** ticket creation → current completion timestamp.
- **Unresolved:** current status is `open` or `waiting`.
- **Unassigned:** unresolved and no agent is assigned.

Averages include nights and weekends and use UTC reporting boundaries. Tickets without a response or completion sample are excluded from the corresponding average.

## Deletion and history

Deleting a ticket permanently also deletes its conversation messages and is restricted to administrators.

Customer records referenced by tickets are protected from deletion. Removing a user does not erase historical messages: message author and assignment references are nullable so the support record can survive account removal.

For the complete entity model and endpoint contract, see [ARCHITECTURE.md](ARCHITECTURE.md).