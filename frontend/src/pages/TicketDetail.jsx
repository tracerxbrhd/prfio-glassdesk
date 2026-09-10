import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, longDate } from '../api';
import { useWorkspace } from '../context';
import { Avatar, ErrorMessage, Modal, Priority, Status, TicketModal } from '../components';
import Icon from '../icons';

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, user, mutate } = useWorkspace();
  const ticket = data.tickets.find((item) => item.id === Number(id));
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [kind, setKind] = useState('reply');
  const [body, setBody] = useState('');
  const loadMessages = useCallback(async () => {
    try {
      setMessages(await api(`tickets/${id}/messages/`));
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    loadMessages();
  }, [loadMessages, ticket?.updated_at]);
  async function update(field, value) {
    setBusy(true);
    setError('');
    try {
      await mutate(
        `tickets/${id}/`,
        { method: 'PATCH', body: { [field]: value } },
        'Conversation updated.',
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function reply(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate(
        `tickets/${id}/messages/`,
        { method: 'POST', body: { kind, body } },
        kind === 'note' ? 'Internal note saved.' : 'Reply added to the conversation.',
      );
      setBody('');
      await loadMessages();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError('');
    try {
      await mutate(`tickets/${id}/`, { method: 'DELETE' }, 'Ticket deleted.');
      navigate('/inbox');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  if (!ticket)
    return (
      <section className="panel empty">
        <h1>Conversation not found</h1>
        <p>It may have been removed from the workspace.</p>
        <Link to="/inbox" className="button primary">
          Back to inbox
        </Link>
      </section>
    );
  return (
    <>
      <Link className="back-link" to="/inbox">
        <Icon name="back" size={17} />
        Back to inbox
      </Link>
      <div className="detail-heading">
        <div>
          <span className="eyebrow">
            GD-{String(ticket.id).padStart(4, '0')}
            <span className="meta-dot">·</span>
            {longDate(ticket.created_at)}
          </span>
          <h1>{ticket.subject}</h1>
          <div className="detail-badges">
            <Status value={ticket.status} />
            <Priority value={ticket.priority} />
            {ticket.tag_details.map((tag) => (
              <span className="tag-chip" key={tag.id}>
                <i style={{ background: tag.color }} />
                {tag.name}
              </span>
            ))}
          </div>
        </div>
        <button className="button secondary" onClick={() => setEditing(true)}>
          <Icon name="edit" size={16} />
          Edit ticket
        </button>
      </div>
      <ErrorMessage error={error} />
      <div className="conversation-layout">
        <section className="panel conversation-panel">
          <div className="panel-header">
            <h2>Conversation</h2>
            <span className="muted">
              {messages.filter((message) => message.kind !== 'event').length} messages
            </span>
          </div>
          <div className="timeline" aria-live="polite">
            {loading ? (
              <p role="status">Loading conversation…</p>
            ) : (
              messages.map((message) =>
                message.kind === 'event' ? (
                  <div className="timeline-event" key={message.id}>
                    <Icon name="checkCircle" size={15} />
                    <p>
                      {message.body}
                      <time>{longDate(message.created_at)}</time>
                    </p>
                  </div>
                ) : (
                  <article className={`message message-${message.kind}`} key={message.id}>
                    <Avatar
                      name={message.sender}
                      index={message.kind === 'customer' ? ticket.customer : message.author}
                    />
                    <div className="message-main">
                      <div className="message-meta">
                        <strong>{message.sender}</strong>
                        <span>
                          {message.kind === 'note'
                            ? 'Internal note'
                            : message.kind === 'customer'
                              ? 'Customer'
                              : 'Support team'}
                        </span>
                        <time>{longDate(message.created_at)}</time>
                      </div>
                      <div className="message-body">{message.body}</div>
                    </div>
                  </article>
                ),
              )
            )}
          </div>
          <form
            className={`reply-composer ${kind === 'note' ? 'note-composer' : ''}`}
            onSubmit={reply}
          >
            <div className="composer-tabs">
              <button
                type="button"
                className={kind === 'reply' ? 'active' : ''}
                aria-pressed={kind === 'reply'}
                onClick={() => setKind('reply')}
              >
                <Icon name="mail" size={15} />
                Reply
              </button>
              <button
                type="button"
                className={kind === 'note' ? 'active' : ''}
                aria-pressed={kind === 'note'}
                onClick={() => setKind('note')}
              >
                <Icon name="lock" size={15} />
                Internal note
              </button>
            </div>
            <label className="sr-only" htmlFor="reply-body">
              {kind === 'note' ? 'Internal note' : 'Reply message'}
            </label>
            <textarea
              id="reply-body"
              required
              maxLength={10000}
              rows={5}
              placeholder={
                kind === 'note'
                  ? 'Leave helpful context for your team…'
                  : `Write a thoughtful reply to ${ticket.customer_detail.name.split(' ')[0]}…`
              }
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
            <div className="composer-footer">
              <span>
                {kind === 'note'
                  ? 'Visible to your support team.'
                  : 'Saved in this conversation. Email delivery is not connected.'}
              </span>
              <button className="button primary" disabled={busy || !body.trim()}>
                {busy ? 'Saving…' : kind === 'note' ? 'Save note' : 'Add reply'}
                <Icon name="arrow" size={16} />
              </button>
            </div>
          </form>
        </section>
        <aside className="ticket-properties">
          <section className="panel customer-profile">
            <span className="eyebrow">THE PERSON BEHIND THE TICKET</span>
            <Avatar name={ticket.customer_detail.name} index={ticket.customer} size="large" />
            <h2>{ticket.customer_detail.name}</h2>
            <p>{ticket.customer_detail.company}</p>
            <a href={`mailto:${ticket.customer_detail.email}`}>{ticket.customer_detail.email}</a>
            <span className="plan-label">{ticket.customer_detail.plan} plan</span>
            <Link className="text-button" to={`/customers?customer=${ticket.customer}`}>
              View customer
              <Icon name="arrow" size={15} />
            </Link>
          </section>
          <section className="panel properties-panel">
            <h2>Ticket details</h2>
            <label>
              Status
              <select
                value={ticket.status}
                disabled={busy}
                onChange={(event) => update('status', event.target.value)}
              >
                {['open', 'waiting', 'resolved', 'closed'].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select
                value={ticket.priority}
                disabled={busy}
                onChange={(event) => update('priority', event.target.value)}
              >
                {['low', 'normal', 'high', 'urgent'].map((priority) => (
                  <option key={priority}>{priority}</option>
                ))}
              </select>
            </label>
            <label>
              Assigned to
              <select
                value={ticket.assignee || ''}
                disabled={busy}
                onChange={(event) => update('assignee', Number(event.target.value) || null)}
              >
                <option value="">Unassigned</option>
                {data.agents
                  .filter((agent) => agent.is_active || agent.id === ticket.assignee)
                  .map((agent) => (
                    <option key={agent.id} value={agent.id} disabled={!agent.is_active}>
                      {agent.name}
                      {!agent.is_active ? ' (inactive)' : ''}
                    </option>
                  ))}
              </select>
            </label>
            <div className="property-dates">
              <span>
                Created<strong>{longDate(ticket.created_at)}</strong>
              </span>
              <span>
                Last activity<strong>{longDate(ticket.updated_at)}</strong>
              </span>
            </div>
            {user.is_staff && (
              <button className="text-button danger-text" onClick={() => setRemoving(true)}>
                <Icon name="trash" size={15} />
                Delete ticket
              </button>
            )}
          </section>
        </aside>
      </div>
      {editing && <TicketModal ticket={ticket} onClose={() => setEditing(false)} />}
      {removing && (
        <Modal title="Delete this conversation?" onClose={() => setRemoving(false)}>
          <p className="modal-copy">
            This permanently removes GD-{String(ticket.id).padStart(4, '0')} and its entire message
            history.
          </p>
          <ErrorMessage error={error} />
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setRemoving(false)}>
              Keep ticket
            </button>
            <button className="button danger" onClick={remove} disabled={busy}>
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
