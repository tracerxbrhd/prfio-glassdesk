import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { initials, relativeTime } from './api';
import { useWorkspace } from './context';
import Icon from './icons';

export function Avatar({ name, size = '', index = 0 }) {
  return (
    <span className={`avatar ${size} avatar-${index % 5}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
export function Status({ value }) {
  return (
    <span className={`status status-${value}`}>
      <i />
      {value}
    </span>
  );
}
export function Priority({ value }) {
  return (
    <span className={`priority priority-${value}`}>
      <span className="priority-bars">
        <i />
        <i />
        <i />
      </span>
      {value}
    </span>
  );
}
export function Empty({ title = 'A little breathing room.', children, action }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="inbox" size={30} />
      </span>
      <h3>{title}</h3>
      <p>
        {children ||
          'There are no tickets in this view. Try another filter or start a new conversation.'}
      </p>
      {action}
    </div>
  );
}
export function ErrorMessage({ error }) {
  return error ? (
    <div className="form-error" role="alert">
      <Icon name="help" size={18} />
      {error}
    </div>
  ) : null;
}
export function Modal({ title, children, onClose, subtitle }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      aria-label={title}
    >
      <div className="modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="icon-button" onClick={onClose} aria-label="Close dialog">
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function TicketModal({ ticket, onClose, onCreated }) {
  const { data, mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body = {
      subject: form.get('subject'),
      customer: Number(form.get('customer')),
      priority: form.get('priority'),
      assignee: Number(form.get('assignee')) || null,
      tags: form.getAll('tags').map(Number),
    };
    if (!ticket) body.initial_message = form.get('initial_message');
    try {
      const result = await mutate(
        ticket ? `tickets/${ticket.id}/` : 'tickets/',
        { method: ticket ? 'PATCH' : 'POST', body },
        ticket ? 'Ticket updated.' : 'New conversation created.',
      );
      onClose();
      onCreated?.(result.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={ticket ? 'Edit ticket' : 'Start a conversation'}
      subtitle={
        ticket
          ? `GD-${String(ticket.id).padStart(4, '0')}`
          : 'Give your team the context they need to help.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="form-grid">
        <ErrorMessage error={error} />
        <label className="span-2">
          Subject
          <input
            name="subject"
            maxLength={200}
            required
            autoFocus
            defaultValue={ticket?.subject}
            placeholder="What does your customer need help with?"
          />
        </label>
        <label>
          Customer
          <select name="customer" required defaultValue={ticket?.customer || ''}>
            <option value="" disabled>
              Select a customer
            </option>
            {data.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.company}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select name="priority" defaultValue={ticket?.priority || 'normal'}>
            {['low', 'normal', 'high', 'urgent'].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label className="span-2">
          Assign to
          <select name="assignee" defaultValue={ticket?.assignee || ''}>
            <option value="">Unassigned</option>
            {data.agents
              .filter((agent) => agent.is_active || agent.id === ticket?.assignee)
              .map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
          </select>
        </label>
        {!ticket && (
          <label className="span-2">
            Opening message
            <textarea
              name="initial_message"
              rows={5}
              maxLength={10000}
              required
              placeholder="Describe the issue, including any useful details."
            />
          </label>
        )}
        <fieldset className="span-2">
          <legend>Tags</legend>
          <div className="tag-options">
            {data.tags.map((tag) => (
              <label className="check-tag" key={tag.id}>
                <input
                  type="checkbox"
                  name="tags"
                  value={tag.id}
                  defaultChecked={ticket?.tags.includes(tag.id)}
                />
                <span>{tag.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="modal-actions span-2">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : ticket ? 'Save changes' : 'Create ticket'}
            <Icon name="arrow" size={16} />
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TicketRows({ tickets, compact = false }) {
  if (!tickets.length) return <Empty />;
  return (
    <div className={`ticket-table ${compact ? 'compact' : ''}`}>
      <div className="ticket-table-heading">
        <span>Conversation</span>
        <span>Status</span>
        <span>Priority</span>
        <span>Assignee</span>
        <span>Updated</span>
      </div>
      {tickets.map((ticket) => (
        <Link className="ticket-row" key={ticket.id} to={`/inbox/${ticket.id}`}>
          <div className="ticket-description">
            <Avatar name={ticket.customer_detail.name} index={ticket.customer % 5} />
            <div>
              <div className="ticket-subject">{ticket.subject}</div>
              <div className="ticket-meta">
                <span>{ticket.customer_detail.name}</span>
                <span className="meta-dot">·</span>
                <span>{ticket.customer_detail.company}</span>
                <span className="ticket-number">GD-{String(ticket.id).padStart(4, '0')}</span>
              </div>
              {!compact && <p className="ticket-preview">{ticket.preview}</p>}
            </div>
          </div>
          <Status value={ticket.status} />
          <Priority value={ticket.priority} />
          <span className="row-assignee">
            {ticket.assignee_detail ? (
              <>
                <Avatar name={ticket.assignee_detail.name} size="small" index={ticket.assignee} />
                <span>{ticket.assignee_detail.name.split(' ')[0]}</span>
              </>
            ) : (
              <span className="muted">Unassigned</span>
            )}
          </span>
          <time className="row-time">{relativeTime(ticket.updated_at)}</time>
        </Link>
      ))}
    </div>
  );
}
