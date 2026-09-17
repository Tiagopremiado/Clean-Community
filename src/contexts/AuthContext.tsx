import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, normalizeProfile } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Helper to safely load or reload profile data from 'profiles' table
  const fetchProfileForUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.warn('Could not load profile from profiles table:', error.message);
        return null;
      }
      return normalizeProfile(data as UserProfile | null);
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await fetchProfileForUser(user.id);
    if (p) {
      setProfile(p);
    }
  }, [user?.id, fetchProfileForUser]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Race getSession with a 3.5s timeout to prevent infinite hanging if Supabase is blocked or slow on PC
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: any }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: new Error('Auth timeout') }), 3500);
        });

        const { data: { session: currentSession }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (mounted) {
          if (error && error.message !== 'Auth timeout') {
            console.error('Error fetching session:', error);
          }

          if (currentSession?.user) {
            setSession(currentSession);
            setUser(currentSession.user);

            // Fetch profile asynchronously without blocking session state
            fetchProfileForUser(currentSession.user.id).then((p) => {
              if (mounted && p) {
                setProfile(p);
              }
            });
          } else {
            // Keep existing session if already populated by fast sign-in event
            setSession((prev) => prev);
            setUser((prev) => prev);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (currentSession?.user) {
        setSession(currentSession);
        setUser(currentSession.user);
        setLoading(false);

        const p = await fetchProfileForUser(currentSession.user.id);
        if (mounted && p) {
          setProfile(p);
        }
      } else if (event === 'INITIAL_SESSION') {
        // If initial session event has no session, let initializeAuth complete
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileForUser]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
