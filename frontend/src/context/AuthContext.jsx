import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { setRoleGetter } from '../services/branchBridge';
import { isTrainerOnShift, setTrainerOnShift } from '../services/shiftBridge';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    setRoleGetter(() => user?.role || null);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        setUser(null);
        setToken(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const persist = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const login = async (payload) => {
    const { data } = await api.post('/auth/login', payload);
    persist(data.token, data.user);
    return data.user;
  };

  const signup = async (payload) => {
    const { data } = await api.post('/auth/signup', payload);
    persist(data.token, data.user);
    return data.user;
  };

  const logout = async () => {
    if (user?.role === 'TRAINER') {
      try {
        await api.post('/auth/logout');
      } catch (error) {
        if (error.response?.status === 409 || isTrainerOnShift()) {
          const blocked = new Error(
            error.response?.data?.message || 'Check out before logging out'
          );
          blocked.code = 'SHIFT_LOCK';
          throw blocked;
        }
      }
    }
    setTrainerOnShift(false);
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value = useMemo(
    () => ({ user, token, loading, login, signup, logout, setUser }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
