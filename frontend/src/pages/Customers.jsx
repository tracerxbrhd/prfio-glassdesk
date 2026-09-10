import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useWorkspace } from '../context';
import { Avatar, Empty, ErrorMessage, Modal, TicketRows } from '../components';
import Icon from '../icons';

function CustomerForm({ customer, onClose }) {
  const { mutate } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await mutate(
        customer ? `customers/${customer.id}/` : 'customers/',
        {
          method: customer ? 'PATCH' : 'POST',
          body: Object.fromEntries(new FormData(event.currentTarget)),
        },
        'Customer saved.',
      );
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <Modal title={customer ? 'Edit customer' : 'Add a customer'} onClose={onClose}>
      <form className="form-grid" onSubmit={save}>
        <ErrorMessage error={error} />
        <label className="span-2">
          Full name
          <input name="name" required maxLength={120} autoFocus defaultValue={customer?.name} />
        </label>
        <label className="span-2">
          Email address
          <input name="email" type="email" required defaultValue={customer?.email} />
        </label>
        <label>
          Company
          <input name="company" required maxLength={120} defaultValue={customer?.company} />
        </label>
        <label>
          Plan
          <select name="plan" defaultValue={customer?.plan || 'growth'}>
            <option>starter</option>
            <option>growth</option>
            <option>enterprise</option>
          </select>
        </label>
        <div className="modal-actions span-2">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy ? 'Saving…' : 'Save customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Customers() {
  const { data, user, mutate } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [form, setForm] = useState(null);
  const [remove, setRemove] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = data.customers.find(
    (customer) => customer.id === Number(params.get('customer')),
  );
  const customers = data.customers.filter((customer) =>
    `${customer.name} ${customer.company} ${customer.email}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  async function deleteCustomer() {
    setBusy(true);
    setError('');
    try {
      await mutate(`customers/${remove.id}/`, { method: 'DELETE' }, 'Customer removed.');
      setRemove(null);
      setParams({});
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Remember the people, not just the ticket</span>
          <h1>Your customers.</h1>
          <p>A little context makes every conversation better.</p>
        </div>
        {user.is_staff && (
          <button className="button primary" onClick={() => setForm({})}>
            <Icon name="plus" size={17} />
            Add customer
          </button>
        )}
      </div>
      <div className="customer-directory">
        <section className="panel">
          <div className="panel-header">
            <h2>{data.customers.length} relationships, and counting</h2>
            <label className="search-input">
              <Icon name="search" size={17} />
              <input
                placeholder="Find a customer…"
                aria-label="Search customers"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>
          {customers.length ? (
            <div className="customer-grid">
              {customers.map((customer) => (
                <button
                  className={`customer-card ${selected?.id === customer.id ? 'selected' : ''}`}
                  key={customer.id}
                  onClick={() => setParams({ customer: customer.id })}
                >
                  <div className="customer-card-top">
                    <Avatar name={customer.name} index={customer.id} />
                    <span className="plan-label">{customer.plan}</span>
                  </div>
                  <h3>{customer.name}</h3>
                  <p>{customer.company}</p>
                  <span className="customer-email">{customer.email}</span>
                  <div className="customer-card-bottom">
                    <span>
                      {customer.ticket_count} conversation{customer.ticket_count !== 1 ? 's' : ''}
                    </span>
                    <Icon name="arrow" size={17} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <Empty title="No matching customers.">
              Try another name, company, or email address.
            </Empty>
          )}
        </section>
        {selected && (
          <section className="panel customer-history">
            <div className="panel-header">
              <div>
                <span className="eyebrow">CUSTOMER PROFILE</span>
                <h2>
                  {selected.name} · {selected.company}
                </h2>
                <p>{selected.email}</p>
              </div>
              <div className="heading-actions">
                {user.is_staff && (
                  <>
                    <button className="button secondary" onClick={() => setForm(selected)}>
                      <Icon name="edit" size={15} />
                      Edit
                    </button>
                    <button
                      className="icon-button danger-text"
                      aria-label="Delete customer"
                      onClick={() => {
                        setError('');
                        setRemove(selected);
                      }}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  </>
                )}
                <button
                  className="icon-button"
                  aria-label="Close customer profile"
                  onClick={() => setParams({})}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
            </div>
            <TicketRows
              tickets={data.tickets.filter((ticket) => ticket.customer === selected.id)}
              compact
            />
          </section>
        )}
      </div>
      {form && <CustomerForm customer={form.id ? form : null} onClose={() => setForm(null)} />}
      {remove && (
        <Modal title="Remove customer?" onClose={() => setRemove(null)}>
          <p className="modal-copy">
            Remove {remove.name} from the directory. Customers with conversation history are
            protected and cannot be deleted.
          </p>
          <ErrorMessage error={error} />
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setRemove(null)}>
              Cancel
            </button>
            <button className="button danger" disabled={busy} onClick={deleteCustomer}>
              Remove customer
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
