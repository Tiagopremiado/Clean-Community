import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (mounted) {
          if (error) {
            console.error('Error fetching session:', error);
          }
          
          // Prevent race condition: if getSession() resolves with null, 
          // but a session was already established (e.g. by a fast login triggering onAuthStateChange),
          // do NOT overwrite the valid session with null.
          setSession((prev) => {
            if (session === null && prev !== null) return prev;
            return session;
          });
          
          setUser((prev) => {
            if (session === null && prev !== null) return prev;
            return session?.user ?? null;
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (event === 'INITIAL_SESSION') {
          // In some cases INITIAL_SESSION fires synchronously with null before storage is read.
          // We rely on getSession() to handle the true initial load.
          // But if it has a valid session, we can safely apply it.
          if (session) {
             setSession(session);
             setUser(session.user);
          }
          return;
        }

        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else if (session) {
          setSession(session);
          setUser(session.user);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
