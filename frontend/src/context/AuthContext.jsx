import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { userApi } from '../api/userApi';
import { authApi } from '../api/authApi';

const AuthContext = createContext(null);
export function safeInternalRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\u0000-\u001f\u007f]/.test(value)
    && !/^\/(?:login|register)(?:[/?#]|$)/i.test(value) ? value : '/';
}
export function loginDestination(location) {
  const from = location.state?.from;
  const path = safeInternalRedirect(new URLSearchParams(location.search).get('redirect') || from || '/');
  return { path, state: location.state?.returnState ?? location.state ?? null };
}
const sessionUser = response => ({ id: response.id, username: response.username, email: response.email,
  fullName: response.fullName, role: response.role });

export const AuthProvider = ({ children }) => {
  const [user, setUserState] = useState(null), [token, setToken] = useState(null);
  const [profile, setProfileState] = useState(null), [loading, setLoading] = useState(true);
  const [verificationError, setVerificationError] = useState(''), [sessionNotice, setSessionNotice] = useState('');
  const currentUser = useRef(null), currentToken = useRef(null), generation = useRef(0), mounted = useRef(true);
  const setUser = data => { currentUser.current = data; setUserState(data); };
  const setSessionToken = value => { currentToken.current = value; setToken(value); };
  const current = (attempt, capturedToken) => mounted.current && generation.current === attempt
    && (capturedToken === undefined || localStorage.getItem('token') === capturedToken);
  const clearLocalSession = () => {
    generation.current++; localStorage.removeItem('token'); localStorage.removeItem('user');
    setSessionToken(null); setUser(null); setProfileState(null); setVerificationError(''); setLoading(false);
  };
  const verifySession = async () => {
    const savedToken = localStorage.getItem('token'), attempt = ++generation.current;
    setVerificationError(''); setProfileState(null); setUser(null); setSessionToken(savedToken); setLoading(Boolean(savedToken));
    if (!savedToken) return;
    try {
      const data = await authApi.getMe(savedToken);
      if (current(attempt, savedToken)) setUser(data);
    } catch (error) {
      if (!current(attempt, savedToken)) return;
      if (error.response?.status === 401) clearLocalSession();
      else setVerificationError('Chưa xác minh được phiên đăng nhập. Kiểm tra kết nối rồi thử lại.');
    } finally { if (current(attempt, savedToken)) setLoading(false); }
  };
  useEffect(() => {
    mounted.current = true;
    const expire = event => {
      const expired = event.detail?.token;
      if (expired && expired !== currentToken.current) return;
      const stored = localStorage.getItem('token');
      if (expired && stored && stored !== expired) return;
      clearLocalSession();
    };
    const storageChanged = event => { if (event.key === 'token') verifySession(); };
    window.addEventListener('auth:expired', expire); window.addEventListener('storage', storageChanged); verifySession();
    return () => { mounted.current = false; generation.current++; window.removeEventListener('auth:expired', expire); window.removeEventListener('storage', storageChanged); };
  }, []);
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const remaining = payload.exp * 1000 - Date.now();
      if (!Number.isFinite(remaining)) throw new Error('Token không hợp lệ');
      const timer = setTimeout(() => window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token } })), Math.max(0, remaining));
      return () => clearTimeout(timer);
    } catch { window.dispatchEvent(new CustomEvent('auth:expired', { detail: { token } })); }
  }, [token]);
  useEffect(() => {
    setProfileState(null);
    if (!token || !user || verificationError) return;
    let active = true; const ownerId = user.id, attempt = generation.current;
    userApi.getProfile({ headers: { Authorization: `Bearer ${token}` } }).then(data => {
      if (active && current(attempt, token) && currentUser.current?.id === ownerId && data?.id === ownerId) setProfileState(data);
    }).catch(() => {});
    return () => { active = false; };
  }, [token, user?.id, verificationError]);
  const authenticate = async (operation, payload) => {
    const attempt = ++generation.current; setLoading(true); setVerificationError(''); setSessionNotice('');
    try {
      const response = await operation(payload);
      if (!current(attempt)) throw new Error('Yêu cầu đăng nhập đã được thay thế.');
      const data = sessionUser(response);
      localStorage.setItem('token', response.token); localStorage.setItem('user', JSON.stringify(data));
      setProfileState(null); setSessionToken(response.token); setUser(data); return data;
    } finally { if (current(attempt)) setLoading(false); }
  };
  const login = (username, password) => authenticate(authApi.login, { username, password });
  const register = payload => authenticate(authApi.register, payload);
  const logout = async () => {
    const capturedToken = currentToken.current || localStorage.getItem('token'); clearLocalSession();
    const attempt = generation.current; setSessionNotice('Đã đăng xuất trên thiết bị này.');
    if (!capturedToken) return;
    try {
      await authApi.logout(capturedToken);
      if (current(attempt)) setSessionNotice('Đã đăng xuất và thu hồi tất cả phiên đăng nhập.');
    } catch {
      if (current(attempt)) setSessionNotice('Đã đăng xuất trên thiết bị này; chưa xác nhận thu hồi các phiên trên thiết bị khác.');
    }
  };
  const value = { user, token, profile, loading, verificationError, sessionNotice, retryVerification: verifySession,
    setProfile: data => { if (currentUser.current && data?.id === currentUser.current.id) setProfileState(data); },
    isAuthenticated: Boolean(token && user && !verificationError), isAdmin: user?.role === 'ROLE_ADMIN',
    login, register, logout, clearLocalSession };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
export const useAuth = () => useContext(AuthContext);
