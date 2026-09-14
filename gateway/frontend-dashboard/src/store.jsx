import { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api.js';
import { disconnectSocket } from './socket.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const token = localStorage.getItem('gw_token');
    if (!token) {
      Promise.resolve().then(() => {
        if (!cancelled) setLoading(false);
      });
      return () => { cancelled = true; };
    }
    api.get('/auth/me')
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem('gw_token');
          disconnectSocket();
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function login(email, password) {
    const { user, token } = await api.post('/auth/login', { email, password });
    localStorage.setItem('gw_token', token);
    disconnectSocket();
    setUser(user);
    return user;
  }

  function logout() {
    localStorage.removeItem('gw_token');
    disconnectSocket();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
