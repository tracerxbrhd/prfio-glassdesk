import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { TicketRows } from '../components';
import { useWorkspace } from '../context';
import Icon from '../icons';

export default function Inbox({ onCreate }) {
  const { data, user } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('all');
  const [sort, setSort] = useState('recent');
  const search = useRef(null);
  const status = params.get('status') || '';
  const priority = params.get('priority') || '';
  const assignee = params.get('assignee') || '';
  useEffect(() => {
    if (params.get('focus') === 'search') search.current?.focus();
  }, [params]);
  function filter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  const ranks = { urgent: 0, high: 1, normal: 2, low: 3 };
  const tickets = data.tickets
    .filter(
      (ticket) =>
        (view !== 'mine' || ticket.assignee === user.id) &&
        (view !== 'unassigned' || ticket.assignee === null) &&
        (!status || ticket.status === status) &&
        (!priority || ticket.priority === priority) &&
        (!assignee || ticket.assignee === Number(assignee)) &&
        `${ticket.subject} ${ticket.customer_detail.name} ${ticket.customer_detail.company} ${ticket.id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === 'priority'
        ? ranks[a.priority] - ranks[b.priority]
        : new Date(b.updated_at) - new Date(a.updated_at),
    );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Make room for a good conversation</span>
          <h1>Your shared inbox.</h1>
          <p>One place for every question, follow-up, and thank you.</p>
        </div>
        <button className="button primary" onClick={onCreate}>
          <Icon name="plus" size={17} />
          New ticket
        </button>
      </div>
      <section className="panel inbox-panel">
        <div className="inbox-tabs" role="group" aria-label="Ticket ownership">
          {[
            { id: 'all', title: 'All conversations', count: data.tickets.length },
            {
              id: 'mine',
              title: 'Assigned to me',
              count: data.tickets.filter((ticket) => ticket.assignee === user.id).length,
            },
            {
              id: 'unassigned',
              title: 'Unassigned',
              count: data.tickets.filter((ticket) => ticket.assignee === null).length,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              className={view === tab.id ? 'active' : ''}
              aria-pressed={view === tab.id}
              onClick={() => setView(tab.id)}
            >
              {tab.title}
              <span>{tab.count}</span>
            </button>
          ))}
        </div>
        <div className="inbox-toolbar">
          <label className="search-input">
            <Icon name="search" size={18} />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a name, subject, or ticket…"
              aria-label="Search tickets"
            />
            {query && (
              <button onClick={() => setQuery('')} aria-label="Clear search">
                <Icon name="close" size={15} />
              </button>
            )}
          </label>
          <div className="filter-controls">
            <label>
              <span className="sr-only">Filter status</span>
              <select value={status} onChange={(event) => filter('status', event.target.value)}>
                <option value="">All statuses</option>
                {['open', 'waiting', 'resolved', 'closed'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter priority</span>
              <select value={priority} onChange={(event) => filter('priority', event.target.value)}>
                <option value="">All priorities</option>
                {['urgent', 'high', 'normal', 'low'].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Sort tickets</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="recent">Newest activity</option>
                <option value="priority">Priority first</option>
              </select>
            </label>
          </div>
        </div>
        {(status || priority || assignee) && (
          <div className="active-filters">
            <Icon name="filter" size={14} />
            <span>
              Filtered by{' '}
              {[
                status,
                priority,
                assignee && data.agents.find((agent) => agent.id === Number(assignee))?.name,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <button onClick={() => setParams({})}>
              Clear filters
              <Icon name="close" size={12} />
            </button>
          </div>
        )}
        <TicketRows tickets={tickets} />
        <div className="table-footer">
          <span>
            {tickets.length} conversation{tickets.length !== 1 ? 's' : ''}
          </span>
          <span>
            Click a conversation to pick up where you left off
            <Icon name="arrow" size={13} />
          </span>
        </div>
      </section>
    </>
  );
}
