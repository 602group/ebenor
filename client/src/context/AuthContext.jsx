import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.get('/auth/me')
        .then(r => setUser(r.data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(username, password) {
    const r = await api.post('/auth/login', { username, password });
    localStorage.setItem('token', r.data.token);
    setUser(r.data.user);
    return r.data;
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    window.location.href = '/login';
  }

  function hasPermission(permissionName) {
    if (!user) return false;
    if (user.role === 'owner') return true;
    const perms = user.permissions || [];
    return perms.includes(permissionName);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
