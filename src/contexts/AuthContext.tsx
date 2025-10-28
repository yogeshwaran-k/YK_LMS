import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase, User } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateLastLogin: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const userId = sessionStorage.getItem('lms_user_id');
      if (userId) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .eq('is_active', true)
          .maybeSingle();

        if (!error && data) {
          setUser(data);
        } else {
          sessionStorage.removeItem('lms_user_id');
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { data: users, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('is_active', true)
        .maybeSingle();

      if (queryError || !users) {
        return { error: new Error('Invalid email or password') };
      }

      const bcrypt = await import('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, users.password_hash);

      if (!isValidPassword) {
        return { error: new Error('Invalid email or password') };
      }

      sessionStorage.setItem('lms_user_id', users.id);
      setUser(users);

      await updateLastLogin(users.id);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    sessionStorage.removeItem('lms_user_id');
    setUser(null);
  }

  async function updateLastLogin(userId: string) {
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userId);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, updateLastLogin }}>
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
