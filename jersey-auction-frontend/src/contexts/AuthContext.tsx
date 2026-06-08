import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'member' | 'seller' | 'admin' | 'superadmin';
  status: 'active' | 'suspended';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (fullName: string, email: string, phone: string, password: string, role: 'member' | 'seller') => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load persisted session
    const storedToken = localStorage.getItem('lelangbid_token');
    const storedUser = localStorage.getItem('lelangbid_user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: apiToken, user: apiUser } = response.data;
      
      localStorage.setItem('lelangbid_token', apiToken);
      localStorage.setItem('lelangbid_user', JSON.stringify(apiUser));
      
      setToken(apiToken);
      setUser(apiUser);
      return apiUser;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (fullName: string, email: string, phone: string, password: string, role: 'member' | 'seller'): Promise<User> => {
    setLoading(true);
    try {
      const response = await api.post('/auth/register', { fullName, email, phone, password, role });
      const { token: apiToken, user: apiUser } = response.data;
      
      localStorage.setItem('lelangbid_token', apiToken);
      localStorage.setItem('lelangbid_user', JSON.stringify(apiUser));
      
      setToken(apiToken);
      setUser(apiUser);
      return apiUser;
    } catch (error) {
      logout();
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('lelangbid_token');
    localStorage.removeItem('lelangbid_user');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const response = await api.get('/auth/me');
      const refreshedUser = response.data;
      localStorage.setItem('lelangbid_user', JSON.stringify(refreshedUser));
      setUser(refreshedUser);
    } catch (error) {
      console.error('Error refreshing user profiles:', error);
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
