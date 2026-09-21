import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const savedToken = localStorage.getItem('token');
    const clearSession = () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', clearSession);
    if (savedToken) {
      authApi.getMe().then((data) => {
        if (active && localStorage.getItem('token') === savedToken) {
          setUser(data);
          setToken(savedToken);
        }
      }).catch(() => { if (active) clearSession(); })
        .finally(() => { if (active) setLoading(false); });
    } else setLoading(false);
    return () => {
      active = false;
      window.removeEventListener('auth:expired', clearSession);
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const remaining = payload.exp * 1000 - Date.now();
      if (!Number.isFinite(remaining)) throw new Error('Token không hợp lệ');
      const timer = setTimeout(() => window.dispatchEvent(new Event('auth:expired')), Math.max(0, remaining));
      return () => clearTimeout(timer);
    } catch {
      window.dispatchEvent(new Event('auth:expired'));
    }
  }, [token]);

  const login = async (username, password) => {
    const res = await authApi.login({ username, password });
    const userData = {
      id: res.id,
      username: res.username,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
    };
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(res.token);
    setUser(userData);
    return userData;
  };

  const register = async (formData) => {
    const res = await authApi.register(formData);
    const userData = {
      id: res.id,
      username: res.username,
      email: res.email,
      fullName: res.fullName,
      role: res.role,
    };
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(res.token);
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    isAdmin: user?.role === 'ROLE_ADMIN',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
