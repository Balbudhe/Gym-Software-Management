import axios from 'axios';
import { branchGetter, roleGetter } from './branchBridge';
import { isTrainerOnShift, setTrainerOnShift } from './shiftBridge';

const notifyUnexpectedLogout = (token, reason) => {
  if (!token || !isTrainerOnShift()) return;
  try {
    fetch('/api/trainer-attendance/unexpected-logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason, token }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore
  }
};

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const role = roleGetter();
  const branch = branchGetter();
  if (role === 'OWNER' && branch && branch !== 'ALL') {
    config.headers['X-Branch-Id'] = branch;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error.config?.url || '');
    if (url.includes('/unexpected-logout')) {
      return Promise.reject(error);
    }
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      if (!path.startsWith('/login') && !path.startsWith('/signup')) {
        const token = localStorage.getItem('token');
        notifyUnexpectedLogout(token, 'session-expired');
        setTrainerOnShift(false);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
