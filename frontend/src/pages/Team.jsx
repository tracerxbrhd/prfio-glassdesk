import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context';
import { Avatar, ErrorMessage, Modal } from '../components';
import Icon from '../icons';

function AgentForm({ agent, onClose }) {
  const { mutate, user } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form);
    body.is_staff = body.is_staff === 'true';
    body.is_active = body.is_active === 'true';
    if (!body.password) delete body.password;
    try {
      await mutate(
        agent ? `agents/${agent.id}/` : 'agents/',
        { method: agent ? 'PATCH' : 'POST', body },
        'Team member saved.',
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal
      title={agent ? 'Edit team member' : 'Add a support agent'}
      subtitle="A workspace account with access to customer conversations."
      onClose={onClose}
    >
      <form className="form-grid" onSubmit={save}>
        <ErrorMessage error={error} />
        <label>
          First name
          <input
            required
            name="first_name"
            maxLength={150}
            autoFocus
            defaultValue={agent?.first_name}
          />
        </label>
        <label>
          Last name
          <input required name="last_name" maxLength={150} defaultValue={agent?.last_name} />
        </label>
        <label className="span-2">
          Email address
          <input required type="email" name="email" defaultValue={agent?.email} />
        </label>
        <label className="span-2">
          {agent ? 'New password (leave empty to keep current)' : 'Initial password'}
          <input
            type="password"
            name="password"
            minLength={10}
            required={!agent}
            autoComplete="new-password"
          />
        </label>
        <label>
          Role
          <select name="is_staff" defaultValue={String(agent?.is_staff || false)}>
            <option value="false" disabled={agent?.id === user.id}>
              Support agent
            </option>
            <option value="true">Administrator</option>
          </select>
        </label>
        <label>
          Access
          <select name="is_active" defaultValue={String(agent?.is_active ?? true)}>
            <option value="true">Active</option>
            <option value="false" disabled={agent?.id === user.id}>
              Inactive
            </option>
          </select>
        </label>
        <div className="modal-actions span-2">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save team member'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Team() {
  const { data, user } = useWorkspace();
  const [form, setForm] = useState(null);
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Thoughtful people. Shared responsibility.</span>
          <h1>A team that cares.</h1>
          <p>Keep the workload visible and the handoffs clear.</p>
        </div>
        {user.is_staff && (
          <button className="button primary" onClick={() => setForm({})}>
            <Icon name="plus" size={17} />
            Add agent
          </button>
        )}
      </div>
      <div className="team-summary panel">
        <Icon name="team" size={29} />
        <div>
          <strong>
            {data.agents.filter((agent) => agent.is_active).length} active team members
          </strong>
          <p>
            Support agents can manage conversations. Administrators also manage customers, tags, and
            team access.
          </p>
        </div>
      </div>
      <div className="team-grid">
        {data.agents.map((agent, index) => {
          const counts = data.dashboard.workload.find((item) => item.id === agent.id);
          return (
            <section className="panel team-card" key={agent.id}>
              <div className="team-card-top">
                <Avatar name={agent.name} index={index} size="large" />
                {user.is_staff && (
                  <button
                    className="icon-button"
                    aria-label={`Edit ${agent.name}`}
                    onClick={() => setForm(agent)}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                )}
              </div>
              <h2>{agent.name}</h2>
              <p>{agent.email}</p>
              <div className="agent-role">
                <span className={agent.is_active ? 'live-dot' : 'inactive-dot'} />
                {agent.is_active
                  ? agent.is_staff
                    ? 'Administrator'
                    : 'Support agent'
                  : 'Inactive account'}
              </div>
              <div className="team-stats">
                <div>
                  <strong>{agent.workload}</strong>
                  <span>Open tickets</span>
                </div>
                <div>
                  <strong>{counts?.resolved || 0}</strong>
                  <span>Resolved / closed</span>
                </div>
              </div>
              <Link className="text-button" to={`/inbox?assignee=${agent.id}`}>
                View conversations
                <Icon name="arrow" size={16} />
              </Link>
            </section>
          );
        })}
      </div>
      <div className="insight-strip">
        <Icon name="lock" size={20} />
        <p>
          Deactivating an account removes workspace access and prevents new assignments. Existing
          conversation history stays intact.
        </p>
      </div>
      {form && <AgentForm agent={form.id ? form : null} onClose={() => setForm(null)} />}
    </>
  );
}
