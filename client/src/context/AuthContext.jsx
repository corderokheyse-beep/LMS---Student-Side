import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { lmsApi } from '../services/api';

const AuthContext = createContext(null);

export const ROLE_HOME_PATHS = {
  super_admin: '/admin/dashboard',
  academic_admin: '/academic/dashboard',
  instructor: '/instructor/dashboard',
  teaching_assistant: '/ta/dashboard',
  student: '/student/dashboard'
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await lmsApi.getMe();
      setUser(res.data.user);
      return res.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const login = async (credentials) => {
    const res = await lmsApi.login(credentials);
    const loggedInUser = res.data.user;
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = async () => {
    await lmsApi.logout();
    setUser(null);
  };

  const hasRole = (roleSlug) => {
    if (!user || !Array.isArray(user.roles)) return false;
    return user.roles.includes(roleSlug);
  };

  const hasPermission = (permCode) => {
    if (!user || !Array.isArray(user.permissions)) return false;
    return user.permissions.includes(permCode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshAuth,
        hasRole,
        hasPermission,
        homePath: user ? (ROLE_HOME_PATHS[user.primaryRole] || '/student/dashboard') : '/login'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

