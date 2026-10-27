import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';
import type { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string; role: Role }) => Promise<void>;
  registerOwner: (data: { name: string; email: string; password: string; phone?: string; otp?: string }) => Promise<void>;
  registerDriver: (data: {
    name: string;
    email: string;
    password: string;
    mobile: string;
    licenseNumber?: string | null;
    otp?: string;
    ownerId?: string;
  }) => Promise<void>;
  sendOtp: (data: { email: string; purpose: 'OWNER_REGISTRATION' | 'DRIVER_REGISTRATION'; name?: string }) => Promise<{
    success: boolean;
    message: string;
    devOtp?: string;
  }>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: Partial<User>) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const saved = await api.getSavedUser();
        if (saved) {
          setUser(saved);
        }
      } catch (err) {
        console.warn('Failed to load user:', err);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const login = async (credentials: { email: string; password: string; role: Role }) => {
    const res = await api.login(credentials);
    setUser(res.user);
  };

  const registerOwner = async (data: { name: string; email: string; password: string; phone?: string; otp?: string }) => {
    const res = await api.registerOwner(data);
    if (res.user) {
      setUser(res.user);
    } else {
      const loginRes = await api.login({
        email: data.email,
        password: data.password,
        role: 'OWNER',
      });
      setUser(loginRes.user);
    }
  };

  const registerDriver = async (data: {
    name: string;
    email: string;
    password: string;
    mobile: string;
    licenseNumber?: string | null;
    otp?: string;
    ownerId?: string;
  }) => {
    const res = await api.registerDriver(data);
    if (res.user) {
      setUser(res.user);
    } else {
      const loginRes = await api.login({
        email: data.email,
        password: data.password,
        role: 'DRIVER',
      });
      setUser(loginRes.user);
    }
  };

  const sendOtp = async (data: { email: string; purpose: 'OWNER_REGISTRATION' | 'DRIVER_REGISTRATION'; name?: string }) => {
    return api.sendOtp(data);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...updatedUser } : null));
  };

  const refreshUser = async () => {
    try {
      const saved = await api.getSavedUser();
      if (saved) {
        setUser(saved);
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerOwner,
        registerDriver,
        sendOtp,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
