import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, setAuth, clearAuth } from '../lib/api';

export type UserRole = 'super_admin' | 'admin' | 'student';
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  full_name: string;
  last_login?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('lms_token');
    const raw = sessionStorage.getItem('lms_user');
    if (token && raw) {
      try {
        const u = JSON.parse(raw) as AuthUser;
        setUser(u);
      } catch {
        // ignore JSON parse errors
      }
    }
    setLoading(false);
  }, []);

  async function signIn(email: string, password: string) {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
      setAuth(res.token, res.user);
      setUser(res.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    clearAuth();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
