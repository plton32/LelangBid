import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'member' | 'seller' | 'admin' | 'superadmin';
  status: 'active' | 'suspended';
  depositBalance?: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, phone: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const TOKEN_STORAGE_KEY = 'lelangbid_token';
const USER_STORAGE_KEY = 'lelangbid_user';
const AUTH_REFRESH_EVENT = 'lelangbid-auth-refresh';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const persistSession = useCallback((apiToken: string, apiUser: User) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, apiToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(apiUser));
    setToken(apiToken);
    setUser(apiUser);
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken) {
      clearSession();
      return;
    }

    try {
      const response = await api.get('/auth/me');
      const refreshedUser = response.data;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(refreshedUser));
      setToken(activeToken);
      setUser(refreshedUser);
    } catch (error: any) {
      console.error('Error refreshing user profile:', error);
      if ([401, 403].includes(error.response?.status)) {
        clearSession();
      }
    }
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    const bootstrapSession = async () => {
      const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (!storedToken) {
        clearSession();
        if (!cancelled) setLoading(false);
        return;
      }

      setToken(storedToken);

      try {
        const response = await api.get('/auth/me');
        if (cancelled) return;

        const refreshedUser = response.data;
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(refreshedUser));
        setUser(refreshedUser);
      } catch (error) {
        if (!cancelled) {
          console.error('Error restoring user session:', error);
          clearSession();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  useEffect(() => {
    const handleRefreshRequest = () => {
      refreshUser();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === TOKEN_STORAGE_KEY || event.key === USER_STORAGE_KEY) {
        refreshUser();
      }
    };

    window.addEventListener(AUTH_REFRESH_EVENT, handleRefreshRequest);
    window.addEventListener('focus', handleRefreshRequest);
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener(AUTH_REFRESH_EVENT, handleRefreshRequest);
      window.removeEventListener('focus', handleRefreshRequest);
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshUser]);

  useEffect(() => {
    if (!token) return undefined;

    const interval = window.setInterval(() => {
      refreshUser();
    }, 60000);

    return () => window.clearInterval(interval);
  }, [refreshUser, token]);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: apiToken, user: apiUser } = response.data;

      persistSession(apiToken, apiUser);
      return apiUser;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, phone: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { fullName, email, phone, password });
      const { token: apiToken, user: apiUser } = response.data;

      persistSession(apiToken, apiUser);
      return apiUser;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user ? user.role === 'admin' || user.role === 'superadmin' : false;
  const isSeller = user ? user.role === 'seller' : false;
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated,
      isAdmin,
      isSeller,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
