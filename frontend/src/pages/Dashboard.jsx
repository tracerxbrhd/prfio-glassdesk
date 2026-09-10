import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../context';
import { Avatar, TicketRows } from '../components';
import Icon from '../icons';

function TrendChart({ daily }) {
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(5, ...daily.flatMap((item) => [item.received, item.resolved]));
  const ceiling = Math.ceil(max / 5) * 5;
  const xy = (value, index) => [42 + index * 96, 191 - (value / ceiling) * 160];
  const pathFor = (key) =>
    daily
      .map((item, index) => `${index === 0 ? 'M' : 'L'}${xy(item[key], index).join(',')}`)
      .join(' ');
  const received = daily.reduce((sum, day) => sum + day.received, 0);
  const resolved = daily.reduce((sum, day) => sum + day.resolved, 0);
  return (
    <section className="panel trend-panel">
      <div className="panel-header">
        <div>
          <h2>Conversation activity</h2>
          <p>A little perspective on your week.</p>
        </div>
        <span className="period-label">
          <Icon name="clock" size={14} />
          Last 7 days
        </span>
      </div>
      <div className="chart-summary">
        <div>
          <i className="legend-dot received" />
          <strong>{received}</strong>
          <span>Received</span>
        </div>
        <div>
          <i className="legend-dot resolved" />
          <strong>{resolved}</strong>
          <span>Resolved</span>
        </div>
        <button className="text-button chart-table-toggle" onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Show chart' : 'View data'}
        </button>
      </div>
      {showTable ? (
        <table className="chart-data">
          <caption>Conversation counts for the last seven days</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Received</th>
              <th>Resolved</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((day) => (
              <tr key={day.date}>
                <td>{day.date}</td>
                <td>{day.received}</td>
                <td>{day.resolved}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <svg
          className="activity-chart"
          viewBox="0 0 660 226"
          role="img"
          aria-label={`Last seven days: ${received} received and ${resolved} resolved. Use View data for daily counts.`}
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6577ea" stopOpacity=".22" />
              <stop offset="100%" stopColor="#6577ea" stopOpacity=".01" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((level) => (
            <g key={level}>
              <line
                x1="42"
                x2="626"
                y1={191 - level * 40}
                y2={191 - level * 40}
                stroke="#dce2f0"
                strokeDasharray="3 5"
              />
              <text x="26" y={196 - level * 40} textAnchor="end">
                {Math.round((ceiling * level) / 4)}
              </text>
            </g>
          ))}
          <path d={`${pathFor('received')} L618,191 L42,191 Z`} fill="url(#chart-fill)" />
          <path
            d={pathFor('resolved')}
            fill="none"
            stroke="#66aca7"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="5 6"
          />
          <path
            d={pathFor('received')}
            fill="none"
            stroke="#6577df"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {daily.map((day, index) => (
            <g key={day.date}>
              <circle
                cx={xy(day.received, index)[0]}
                cy={xy(day.received, index)[1]}
                r="4"
                fill="#6577df"
                stroke="white"
                strokeWidth="2"
              >
                <title>
                  {day.date}: {day.received} received, {day.resolved} resolved
                </title>
              </circle>
              <text x={xy(0, index)[0]} y="219" textAnchor="middle">
                {day.label}
              </text>
            </g>
          ))}
        </svg>
      )}
    </section>
  );
}

export default function Dashboard({ analytics = false, onCreate }) {
  const { data, user, refresh, refreshing } = useWorkspace();
  const metrics = data.dashboard;
  const maxWorkload = Math.max(1, ...metrics.workload.map((agent) => agent.open));
  const outstanding = data.tickets.filter((ticket) => ['open', 'waiting'].includes(ticket.status));
  const metricCards = [
    {
      label: 'Unresolved tickets',
      value: metrics.unresolved,
      unit: '',
      icon: 'inbox',
      description: `${metrics.unassigned} waiting for an owner`,
      tone: 'blue',
      link: '/inbox',
    },
    {
      label: 'Avg. resolution time',
      value: metrics.avg_resolution_hours ?? '—',
      unit: metrics.avg_resolution_hours === null ? '' : 'h',
      icon: 'checkCircle',
      description: `Across ${metrics.resolved_total} completed tickets`,
      tone: 'mint',
      link: '/analytics',
    },
    {
      label: 'New tickets today',
      value: metrics.tickets_today,
      unit: '',
      icon: 'mail',
      description: 'Since 00:00 UTC',
      tone: 'lavender',
      link: '/inbox',
    },
    {
      label: 'First response time',
      value: metrics.avg_response_minutes ?? '—',
      unit: metrics.avg_response_minutes === null ? '' : 'm',
      icon: 'clock',
      description: `${metrics.response_sample_size} conversations answered`,
      tone: 'peach',
      link: '/analytics',
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {analytics
              ? 'A closer look at your support'
              : `Good to see you, ${user.name.split(' ')[0]}`}
          </span>
          <h1>{analytics ? 'The story behind the numbers.' : 'A clear view of your day.'}</h1>
          <p>
            {analytics
              ? 'Real conversations. Measured progress. Room to grow.'
              : "Here's how your team is taking care of your customers."}
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="button secondary refresh-button"
            onClick={refresh}
            disabled={refreshing}
          >
            <Icon name="refresh" size={16} />
            <span>{refreshing ? 'Refreshing' : 'Refresh'}</span>
          </button>
          <button className="button primary" onClick={onCreate}>
            <Icon name="plus" size={17} />
            New ticket
          </button>
        </div>
      </div>
      <div className="metrics-grid">
        {metricCards.map((metric) => (
          <Link to={metric.link} className={`metric-card ${metric.tone}`} key={metric.label}>
            <div className="metric-top">
              <span>{metric.label}</span>
              <span className="metric-icon">
                <Icon name={metric.icon} size={19} />
              </span>
            </div>
            <div className="metric-value">
              {metric.value}
              <span>{metric.unit}</span>
              <span className="metric-spark" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
            </div>
            <p>{metric.description}</p>
          </Link>
        ))}
      </div>
      <div className="dashboard-middle">
        <TrendChart daily={metrics.daily} />
        <section className="panel workload-panel">
          <div className="panel-header">
            <div>
              <h2>A shared effort</h2>
              <p>Open conversations by agent</p>
            </div>
            <Link className="icon-button" to="/team" aria-label="View support team">
              <Icon name="arrow" size={19} />
            </Link>
          </div>
          <div className="workload-list">
            {metrics.workload.map((agent, index) => (
              <Link to={`/inbox?assignee=${agent.id}`} className="workload-agent" key={agent.id}>
                <Avatar name={agent.name} index={index} />
                <div>
                  <div className="workload-label">
                    <strong>{agent.name}</strong>
                    <span>
                      {agent.open}
                      <small> tickets</small>
                    </span>
                  </div>
                  <div className="workload-track">
                    <span
                      style={{ width: `${(agent.open / maxWorkload) * 100}%` }}
                      className={`workload-fill fill-${index}`}
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="workload-footer">
            <span className="live-dot" />
            <span>{metrics.workload.length} people, one thoughtful team.</span>
          </div>
        </section>
      </div>
      {analytics ? (
        <div className="analytics-bottom">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Where conversations stand</h2>
                <p>All {metrics.total} tickets in your workspace</p>
              </div>
            </div>
            <div className="status-breakdown">
              {['open', 'waiting', 'resolved', 'closed'].map((status) => {
                const count = metrics.statuses.find((row) => row.status === status)?.count || 0;
                return (
                  <Link key={status} to={`/inbox?status=${status}`}>
                    <span className={`status status-${status}`}>
                      <i />
                      {status}
                    </span>
                    <div className="distribution-track">
                      <span
                        style={{ width: `${metrics.total ? (count / metrics.total) * 100 : 0}%` }}
                      />
                    </div>
                    <strong>{count}</strong>
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="panel metric-method">
            <Icon name="chart" size={26} />
            <h2>Numbers with context.</h2>
            <p>
              Resolution time runs from ticket creation to its latest resolved state. First response
              measures the first public agent reply; internal notes are excluded.
            </p>
            <p>
              Durations use elapsed clock time, including weekends. Reopened tickets leave the
              resolved sample until they are resolved again.
            </p>
            <span>
              Updated{' '}
              {new Date(metrics.generated_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              · workspace totals
            </span>
          </section>
        </div>
      ) : (
        <section className="panel recent-panel">
          <div className="panel-header">
            <div>
              <h2>
                A few conversations to pick up{' '}
                <span className="heading-count">{outstanding.length}</span>
              </h2>
              <p>The people behind your open tickets.</p>
            </div>
            <Link className="text-button" to="/inbox">
              View inbox
              <Icon name="arrow" size={16} />
            </Link>
          </div>
          <TicketRows tickets={outstanding.slice(0, 4)} compact />
        </section>
      )}
      <div className="insight-strip">
        <span className="insight-icon">
          <Icon name="spark" size={18} />
        </span>
        <p>
          <strong>A moment of focus.</strong>{' '}
          {metrics.urgent
            ? `${metrics.urgent} urgent conversations could use your attention.`
            : 'No urgent conversations are waiting. A good moment to check in with your customers.'}
        </p>
        <Link to="/inbox?priority=urgent">
          Take a look
          <Icon name="arrow" size={15} />
        </Link>
      </div>
    </>
  );
}
