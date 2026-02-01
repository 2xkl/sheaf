import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authApi, type User } from '../lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem('token'),
  );

  useEffect(() => {
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('token', token);
    else localStorage.removeItem('token');
  }, [token]);

  const login = async (username: string, password: string) => {
    const { data } = await authApi.login(username, password);
    setToken(data.access_token);

    const payload = JSON.parse(atob(data.access_token.split('.')[1]));
    // Fetch user info — we decode sub from JWT and get user from register response
    // For simplicity, store minimal info
    setUser({ id: payload.sub, username, is_admin: false, is_active: true, created_at: '' });

    // Try to get full user info from admin endpoint if admin
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, is_admin: true } : prev);
      }
    } catch {
      // not admin, that's fine
    }
  };

  const register = async (username: string, password: string) => {
    await authApi.register(username, password);
    await login(username, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
