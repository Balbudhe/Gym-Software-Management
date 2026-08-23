import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [gym, setGym] = useState(null);
  const [trainer, setTrainer] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setGym(data.gym);
      setTrainer(data.trainer);
    } catch {
      setUser(null);
      setGym(null);
      setTrainer(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('apexfit_token', data.token);
    setUser(data.user);
    setGym(data.gym);
    await loadMe();
    return data.user;
  }

  async function register(payload) {
    const { data } = await api.post('/auth/register', payload);
    localStorage.setItem('apexfit_token', data.token);
    setUser(data.user);
    setGym(data.gym);
    return data.user;
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('apexfit_token');
      setUser(null);
      setGym(null);
      setTrainer(null);
    }
  }

  const value = useMemo(
    () => ({ user, gym, trainer, loading, login, register, logout, refresh: loadMe }),
    [user, gym, trainer, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
