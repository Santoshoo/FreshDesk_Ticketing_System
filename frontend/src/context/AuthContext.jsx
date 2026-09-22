import React, { createContext, useContext, useState, useEffect } from 'react';
import authApi from '../services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on app load
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem('kims_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await authApi.getMe();
        if (res.success && res.data) {
          setUser(res.data);
          localStorage.setItem('kims_active_user_id', String(res.data.id));
        } else {
          setUser(null);
          localStorage.removeItem('kims_token');
          localStorage.removeItem('kims_active_user_id');
        }
      } catch (err) {
        console.warn('Session restoration failed or expired:', err.message);
        setUser(null);
        localStorage.removeItem('kims_token');
        localStorage.removeItem('kims_active_user_id');
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  // Login handler
  const login = async (identifier, password) => {
    const res = await authApi.login(identifier, password);
    if (res.success && res.data) {
      const { accessToken, user: loggedInUser } = res.data;
      localStorage.setItem('kims_token', accessToken);
      localStorage.setItem('kims_active_user_id', String(loggedInUser.id));
      setUser(loggedInUser);
      return res.data;
    }
    throw new Error(res.message || 'Login failed');
  };

  // Logout handler
  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('kims_token');
      localStorage.removeItem('kims_active_user_id');
      setUser(null);
    }
  };

  // Update user state directly (e.g. after profile edit)
  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  };

  const refreshUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res.success && res.data) {
        setUser(res.data);
      }
    } catch (e) {
      console.warn('Failed to refresh user:', e.message);
    }
  };

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isAgent = user?.role === 'AGENT';
  const isEmployee = user?.role === 'EMPLOYEE';
  const isAgentOrAdmin = isAdmin || isAgent;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        updateUser,
        refreshUser,
        isAdmin,
        isSuperAdmin,
        isAgent,
        isEmployee,
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
