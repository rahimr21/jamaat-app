import * as Linking from 'expo-linking';
import { create } from 'zustand';
import { supabase, Session, User } from '@/lib/supabase';
import type { User as AppUser } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: AppUser | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  initialize: () => Promise<void>;
  setSession: (session: Session | null) => void;
  setSessionFromUrl: (url: string) => Promise<void>;
  setProfile: (profile: AppUser | null) => void;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  fetchProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });

      if (session?.user) {
        get().fetchProfile();
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
        });

        if (session?.user) {
          get().fetchProfile();
        } else {
          set({ profile: null });
        }
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isLoading: false, isInitialized: true });
    }
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null });
  },

  setSessionFromUrl: async (url: string) => {
    if (!url.startsWith('jamaat://auth/callback')) return;
    const queryOrHash = url.includes('#') ? url.split('#')[1] : url.includes('?') ? url.split('?')[1] : '';
    const params = new URLSearchParams(queryOrHash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (!access_token || !refresh_token) return;
    try {
      await supabase.auth.setSession({ access_token, refresh_token });
      get().fetchProfile();
    } catch (error) {
      console.error('Error setting session from URL:', error);
    }
  },

  setProfile: (profile) => {
    set({ profile });
  },

  signInWithEmail: async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'jamaat://auth/callback',
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  signInWithPassword: async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: 'jamaat://auth/callback',
        },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  signInWithPhone: async (phone: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  verifyOtp: async (phone: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms',
      });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      return { error: error as Error };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null, profile: null });
  },

  fetchProfile: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        // Profile might not exist yet (new user)
        if (error.code === 'PGRST116') {
          set({ profile: null });
          return;
        }
        throw error;
      }

      set({ profile: data as AppUser });
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  },
}));
