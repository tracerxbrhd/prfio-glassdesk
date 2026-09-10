import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, allPages } from './api';

const WorkspaceContext = createContext(null);
export function WorkspaceProvider({ children, user, onSignOut }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState('');
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [dashboard, tickets, customers, agents, tags] = await Promise.all([
        api('dashboard/'),
        ...['tickets/', 'customers/', 'agents/', 'tags/'].map(allPages),
      ]);
      setData({ dashboard, tickets, customers, agents, tags });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(''), 4500);
    return () => clearTimeout(id);
  }, [toast]);
  async function mutate(path, options, message) {
    const result = await api(path, options);
    await refresh();
    if (message) setToast(message);
    return result;
  }
  return (
    <WorkspaceContext.Provider
      value={{ data, user, error, refreshing, refresh, mutate, setToast, onSignOut }}
    >
      {children}
      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </WorkspaceContext.Provider>
  );
}
// Context is deliberately shared by the shell and feature routes.
// eslint-disable-next-line react-refresh/only-export-components
export const useWorkspace = () => useContext(WorkspaceContext);
