import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react';
import { api } from './api';
import { WorkspaceProvider, useWorkspace } from './context';
import { Avatar, ErrorMessage, TicketModal } from './components';
import Icon from './icons';
import Dashboard from './pages/Dashboard';
import Inbox from './pages/Inbox';
import TicketDetail from './pages/TicketDetail';
import Customers from './pages/Customers';
import Team from './pages/Team';
import Tags from './pages/Tags';

function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const result = await api('auth/login/', {
        method: 'POST',
        body: { email: form.get('email'), password: form.get('password') },
      });
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }
  return (
    <main className="login-page">
      <div className="login-story">
        <Link className="brand" to="/">
          <span className="brand-symbol">
            <Icon name="logo" size={26} />
          </span>
          glassdesk<span className="brand-period">.</span>
        </Link>
        <div className="login-story-copy">
          <span className="eyebrow">
            <span className="live-dot" />A little clarity goes a long way
          </span>
          <h1>
            Good support.
            <br />A clear connection.
          </h1>
          <p>
            Every customer has a story.
            <br />
            Give your team the space to listen.
          </p>
          <div className="glass-composition" aria-hidden="true">
            <div className="composition-orbit orbit-one" />
            <div className="composition-orbit orbit-two" />
            <div className="composition-card rear">
              <span className="mini-line" />
              <span className="mini-line short" />
            </div>
            <div className="composition-card front">
              <div className="composition-avatar">
                <Icon name="logo" size={34} />
              </div>
              <div>
                <span className="mini-label">ONE SHARED INBOX</span>
                <h3>You're in good company.</h3>
                <p>Thoughtful support starts here.</p>
              </div>
              <span className="composition-check">
                <Icon name="check" />
              </span>
            </div>
            <div className="composition-reply">
              <span className="tiny-avatar">OC</span>
              <span>That worked perfectly. Thank you!</span>
              <span>♡</span>
            </div>
          </div>
        </div>
        <div className="login-bottom">
          <span>A calmer way to care.</span>
          <span>Designed around people</span>
        </div>
      </div>
      <div className="login-form-side">
        <div className="login-form-wrap">
          <span className="login-tag">
            <Icon name="lock" size={14} />
            Your team's private workspace
          </span>
          <h2>Welcome back.</h2>
          <p className="muted">Let's make someone's day a little easier.</p>
          <form onSubmit={submit} className="login-form">
            <ErrorMessage error={error} />
            <label>
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                defaultValue="admin@example.com"
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                defaultValue="demo-password"
              />
            </label>
            <button className="button primary" disabled={busy}>
              {busy ? 'Opening your workspace…' : 'Sign in to GlassDesk'}
              <Icon name="arrow" size={18} />
            </button>
          </form>
          <div className="demo-note">
            <span className="demo-label">EXPLORE THE WORKSPACE</span>
            <p>
              The demo account is filled in for you. Meet your customers, follow a conversation, and
              try the workflow.
            </p>
            <code>admin@example.com / demo-password</code>
          </div>
          <p className="login-privacy">
            <Icon name="lock" size={13} />
            Secure session. No password stored in your browser.
          </p>
        </div>
        <span className="login-copyright">© {new Date().getFullYear()} GlassDesk</span>
      </div>
    </main>
  );
}

const navigation = [
  { path: '/', label: 'Overview', icon: 'dashboard' },
  { path: '/inbox', label: 'Inbox', icon: 'inbox' },
  { path: '/customers', label: 'Customers', icon: 'users' },
  { path: '/analytics', label: 'Analytics', icon: 'chart' },
];
function Shell() {
  const reducedMotion = useReducedMotion();
  const { data, user, error, refresh, refreshing, onSignOut } = useWorkspace();
  const [create, setCreate] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [signOutError, setSignOutError] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const pageName = location.pathname.startsWith('/inbox/')
    ? 'Conversation'
    : [...navigation, { path: '/team', label: 'Team' }, { path: '/tags', label: 'Tags' }].find(
        (item) => item.path === location.pathname,
      )?.label || 'Workspace';
  useEffect(() => {
    document.title = `${pageName} · GlassDesk`;
  }, [pageName]);
  useEffect(() => {
    const key = (event) => {
      if (
        event.key === '/' &&
        !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)
      ) {
        event.preventDefault();
        navigate('/inbox?focus=search');
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [navigate]);
  async function signOut() {
    try {
      await api('auth/logout/', { method: 'POST' });
      onSignOut();
    } catch (err) {
      setSignOutError(err.message);
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-symbol">
            <Icon name="logo" size={23} />
          </span>
          glassdesk<span className="brand-period">.</span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">S</span>
          <div>
            <strong>Studio workspace</strong>
            <span>Customer experience</span>
          </div>
          <span className="workspace-indicator" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === '/'} aria-label={item.label}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.path === '/inbox' && data && (
                <b className="nav-count">{data.dashboard.unresolved}</b>
              )}
            </NavLink>
          ))}
        </nav>
        <span className="nav-label organization-label">ORGANIZATION</span>
        <nav className="organization-nav" aria-label="Organization">
          <NavLink to="/team" aria-label="Support team" data-short="Team">
            <Icon name="team" />
            <span>Support team</span>
          </NavLink>
          <NavLink to="/tags" aria-label="Tags &amp; categories" data-short="Tags">
            <Icon name="tag" />
            <span>Tags & categories</span>
          </NavLink>
        </nav>
        <div className="sidebar-bottom">
          <div className="team-pulse">
            <span className="pulse-symbol">
              <Icon name="spark" size={18} />
            </span>
            <strong>A human touch.</strong>
            <p>
              One conversation can
              <br />
              make all the difference.
            </p>
            <Link to="/inbox">
              Find your next conversation
              <Icon name="arrow" size={14} />
            </Link>
          </div>
          <div className="current-user">
            <Avatar name={user.name} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.is_staff ? 'Workspace admin' : 'Support agent'}</span>
            </div>
            <button className="icon-button" onClick={signOut} aria-label="Sign out">
              <Icon name="logout" size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span>Workspace</span>
            <span>/</span>
            <strong>{pageName}</strong>
          </div>
          <div className="topbar-actions">
            <button className="icon-button mobile-signout" onClick={signOut} aria-label="Sign out">
              <Icon name="logout" size={16} />
            </button>
            <button
              className="global-search"
              aria-label="Search conversations"
              onClick={() => navigate('/inbox?focus=search')}
            >
              <Icon name="search" size={16} />
              <span>Search conversations</span>
              <kbd>/</kbd>
            </button>
            <span className="connection-state">
              <i />
              Live workspace
            </span>
            <div className="notification-wrap">
              <button
                className={`icon-button notification-button ${notifications ? 'selected' : ''}`}
                aria-label="Notifications"
                aria-expanded={notifications}
                onClick={() => setNotifications(!notifications)}
              >
                <Icon name="bell" size={20} />
                {data?.dashboard.urgent > 0 && <i />}
              </button>
              {notifications && (
                <div className="notification-popover">
                  <strong>Needs a little attention</strong>
                  <p>{data?.dashboard.urgent || 0} urgent conversations are unresolved.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      navigate('/inbox?priority=urgent');
                      setNotifications(false);
                    }}
                  >
                    Review urgent tickets
                    <Icon name="arrow" size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {error && (
            <div className="load-error" role="alert">
              <p>{error}</p>
              <button className="button secondary" onClick={refresh}>
                Retry connection
              </button>
            </div>
          )}
          <ErrorMessage error={signOutError} />
          {!data ? (
            !error && (
              <div className="loading-state" role="status">
                <span className="loader" />
                <p>Bringing your workspace into focus…</p>
              </div>
            )
          ) : (
            <AnimatePresence mode="wait">
              <Motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: reducedMotion ? 0 : 0.18 }}
              >
                <Routes location={location}>
                  <Route path="/" element={<Dashboard onCreate={() => setCreate(true)} />} />
                  <Route
                    path="/analytics"
                    element={<Dashboard analytics onCreate={() => setCreate(true)} />}
                  />
                  <Route path="/inbox" element={<Inbox onCreate={() => setCreate(true)} />} />
                  <Route path="/inbox/:id" element={<TicketDetail />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/tags" element={<Tags />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Motion.div>
            </AnimatePresence>
          )}
          <footer className="app-footer">
            <span>
              <span className="footer-mark">◌</span> A clearer view. A closer connection.
            </span>
            <button onClick={refresh} disabled={refreshing}>
              {refreshing ? 'Refreshing…' : 'Refresh workspace'}
              <Icon name="refresh" size={12} />
            </button>
          </footer>
        </main>
      </div>
      {create && (
        <TicketModal
          onClose={() => setCreate(false)}
          onCreated={(id) => navigate(`/inbox/${id}`)}
        />
      )}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  async function checkSession() {
    setLoading(true);
    setError('');
    try {
      setUser(await api('auth/me/'));
    } catch (err) {
      if (err.status !== 401) setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    checkSession();
  }, []);
  if (loading)
    return (
      <div className="loading-state full-screen" role="status">
        <span className="loader" />
        <p>Opening GlassDesk…</p>
      </div>
    );
  if (error)
    return (
      <div className="loading-state full-screen">
        <ErrorMessage error={error} />
        <button className="button primary" onClick={checkSession}>
          Retry connection
        </button>
      </div>
    );
  if (!user) return <Login onLogin={setUser} />;
  return (
    <WorkspaceProvider user={user} onSignOut={() => setUser(null)}>
      <Shell />
    </WorkspaceProvider>
  );
}
