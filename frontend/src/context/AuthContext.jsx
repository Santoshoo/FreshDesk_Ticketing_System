import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    // Check URL query param first (from Google OAuth redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    if (urlToken) {
      localStorage.setItem('kims_token', urlToken);
      // Clean query params from URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return urlToken;
    }
    return localStorage.getItem('kims_token');
  });

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('kims_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await authApi.getMe();
          if (res.success && res.data) {
            setUser(res.data);
            localStorage.setItem('kims_user', JSON.stringify(res.data));
          }
        } catch (err) {
          console.error('Failed to restore session:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await authApi.login(email, password);
    if (res.success && res.data) {
      const { accessToken, user: userData } = res.data;
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('kims_token', accessToken);
      localStorage.setItem('kims_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.error?.message || 'Login failed');
  };

  const googleLogin = async (email, name) => {
    const res = await authApi.googleLogin(email, name);
    if (res.success && res.data) {
      const { accessToken, user: userData } = res.data;
      setToken(accessToken);
      setUser(userData);
      localStorage.setItem('kims_token', accessToken);
      localStorage.setItem('kims_user', JSON.stringify(userData));
      return userData;
    }
    throw new Error(res.error?.message || 'Google Login failed');
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('kims_token');
    localStorage.removeItem('kims_user');
    authApi.logout().catch(() => {});
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAgent = user?.role === 'AGENT';
  const isAgentOrAdmin = isAdmin || isAgent;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        googleLogin,
        logout,
        isAdmin,
        isSuperAdmin,
        isAgent,
        isAgentOrAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
