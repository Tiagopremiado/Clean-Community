import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, normalizeProfile, Role, isUserAdminOrDev, isAdminUser } from '../types';

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

  // Helper to safely load or reload profile data from 'profiles' table with auto-provisioning
  const fetchProfileForUser = useCallback(async (userId: string, userObj?: User | null) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        return normalizeProfile(data as UserProfile);
      }

      if (error) {
        console.warn('Could not load profile from profiles table:', error.message);
      }

      // If no profile found in Supabase (e.g. user registered on PC and trigger didn't run)
      // Automatically attempt to provision their profile row
      const email = userObj?.email || '';
      const emailPrefix = email ? email.split('@')[0] : '';
      const isKnownThales = email.toLowerCase().includes('thaleskaleby') || email.toLowerCase().includes('kalebyalvesgamer');
      
      const fallbackUsername = (userObj?.user_metadata?.username as string) || 
        (isKnownThales ? 'thalesdev' : (emailPrefix || `user_${userId.slice(0, 5)}`));
      const fallbackName = (userObj?.user_metadata?.full_name as string) || 
        (isKnownThales ? 'Thales — Atos Web 💜' : (emailPrefix || 'Membro'));
      const fallbackAvatar = (userObj?.user_metadata?.avatar_url as string) || 
        `https://api.dicebear.com/9.x/notionists/svg?seed=${userId}`;
      const isDevOrAdmin = isUserAdminOrDev(userObj as any) || isAdminUser(fallbackUsername);

      const newProfilePayload = {
        id: userId,
        name: fallbackName,
        username: fallbackUsername,
        avatar: fallbackAvatar,
        role: (isDevOrAdmin ? 'admin' : 'member') as Role
      };

      // Try inserting into Supabase so future queries and relations succeed
      try {
        const { data: createdData } = await supabase
          .from('profiles')
          .insert(newProfilePayload)
          .select()
          .maybeSingle();

        if (createdData) {
          return normalizeProfile(createdData as UserProfile);
        }
      } catch (insertErr) {
        console.warn('Could not auto-insert profile into Supabase:', insertErr);
      }

      // Return synthetic normalized profile so the user is never left with null profile or broken UI
      return normalizeProfile({
        ...newProfilePayload,
        bio: isKnownThales ? '💜 — Insta: @atosweb_\n💎 — Owner: LPVCW Workflow \n🎩 — Moderador: CLEAN Community' : null,
        created_at: userObj?.created_at || new Date().toISOString()
      });
    } catch (err) {
      console.warn('Error fetching profile:', err);
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;
    const p = await fetchProfileForUser(user.id, user);
    if (p) {
      setProfile(p);
    }
  }, [user, fetchProfileForUser]);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        // Race getSession with a 7s timeout to prevent infinite hanging if Supabase is blocked or slow on PC
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: any }>((resolve) => {
          setTimeout(() => resolve({ data: { session: null }, error: new Error('Auth timeout') }), 7000);
        });

        const { data: { session: currentSession }, error } = await Promise.race([sessionPromise, timeoutPromise]);
        if (mounted) {
          if (error && error.message !== 'Auth timeout') {
            console.error('Error fetching session:', error);
          }

          if (currentSession?.user) {
            setSession(currentSession);
            setUser(currentSession.user);

            // Fetch profile immediately
            const p = await fetchProfileForUser(currentSession.user.id, currentSession.user);
            if (mounted && p) {
              setProfile(p);
            }
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

        const p = await fetchProfileForUser(currentSession.user.id, currentSession.user);
        if (mounted && p) {
          setProfile(p);
        }
        setLoading(false);
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
      // Timeout to ensure signOut never hangs if offline or network latency spikes
      const signOutPromise = supabase.auth.signOut({ scope: 'local' });
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 1500));
      await Promise.race([signOutPromise, timeoutPromise]);
    } catch (err) {
      console.warn('Erro durante supabase signOut:', err);
    } finally {
      // Forcefully clear any auth session tokens from storage
      try {
        if (typeof window !== 'undefined') {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('sb-') || k.includes('supabase') || k.startsWith('clean_'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          sessionStorage.clear();
        }
      } catch (e) {
        console.warn('Erro ao limpar storage de sessão:', e);
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
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
