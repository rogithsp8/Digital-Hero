import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import api from '../lib/api';

interface User {
  id: string;
  email: string;
  role: string;
}

interface Subscription {
  plan: string;
  status: string;
  charity_id: string | null;
  charity_pct: number;
  current_period_end: string | null;
}

interface AuthContextType {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshMe() {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.profile);
      setSubscription(data.subscription);
    } catch {
      setUser(null);
      setSubscription(null);
    }
  }

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) {
        localStorage.setItem('dh_token', session.access_token);
        refreshMe().finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem('dh_token', session.access_token);
        refreshMe();
      } else {
        localStorage.removeItem('dh_token');
        setUser(null);
        setSubscription(null);
      }
    });

    return () => authSub.unsubscribe();
  }, []);

  async function login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (data.session?.access_token) {
      localStorage.setItem('dh_token', data.session.access_token);
      await refreshMe();
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem('dh_token');
    setUser(null);
    setSubscription(null);
  }

  return (
    <AuthContext.Provider value={{ user, subscription, loading, login, logout, refreshMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
