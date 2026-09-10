let csrfToken = '';

export async function api(path, options = {}) {
  const method = options.method || 'GET';
  if (method !== 'GET' && !csrfToken) {
    const response = await fetch('/api/auth/csrf/', { credentials: 'include' });
    csrfToken = (await response.json()).csrfToken;
  }
  const response = await fetch(`/api/${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' ? { 'X-CSRFToken': csrfToken } : {}),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (response.status === 204) return null;
  const data = await response
    .json()
    .catch(() => ({ detail: 'The server could not complete this request. Please try again.' }));
  if (!response.ok) {
    const error = new Error(
      data.detail ||
        Object.entries(data)
          .map(
            ([key, value]) =>
              `${key.replaceAll('_', ' ')}: ${Array.isArray(value) ? value.join(', ') : value}`,
          )
          .join(' · '),
    );
    error.status = response.status;
    throw error;
  }
  if (data.csrfToken) csrfToken = data.csrfToken;
  return data;
}

export const list = (data) => data.results || data;
export async function allPages(path) {
  const rows = [];
  let next = path;
  while (next) {
    const page = await api(next);
    rows.push(...list(page));
    next = page.next
      ? new URL(page.next, window.location.origin).pathname.replace('/api/', '') +
        new URL(page.next, window.location.origin).search
      : null;
  }
  return rows;
}
export const initials = (name = '') =>
  name
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('');
export const shortDate = (value) =>
  new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
export const longDate = (value) =>
  new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
export function relativeTime(value) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  return minutes < 60
    ? `${minutes}m ago`
    : minutes < 1440
      ? `${Math.floor(minutes / 60)}h ago`
      : `${Math.floor(minutes / 1440)}d ago`;
}
