import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  username: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('pvc_erp_user');
      return saved ? (JSON.parse(saved) as User) : null;
    } catch {
      localStorage.removeItem('pvc_erp_user');
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('pvc_erp_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pvc_erp_user');
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
      localStorage.setItem('token', res.token);
      setUser({ username: res.user.username, name: res.user.username, role: res.user.role });
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

