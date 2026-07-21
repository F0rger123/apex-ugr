import { create } from 'zustand';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthState {
  session: Session | null;
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  followStats: { followers: number; following: number };

  // Auth actions
  signUp: (email: string, password: string, username: string, displayName: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithPhone: (phone: string) => Promise<{ error: string | null }>;
  verifyOtp: (phone: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;

  // Profile actions
  loadProfile: (userId: string) => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  addCredits: (amount: number) => Promise<{ error: string | null }>;
  deductCredits: (amount: number) => Promise<{ error: string | null }>;
  togglePrivacyMode: (mode: 'all' | 'friends' | 'meet_only' | 'invisible') => Promise<void>;
  fetchFollowStats: (userId: string) => Promise<void>;
  savePushToken: (userId: string, token: string) => Promise<void>;

  // Session management
  initializeAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  authError: null,
  followStats: { followers: 0, following: 0 },

  // ─── Sign Up ──────────────────────────────────────────────────────────────
  signUp: async (email, password, username, displayName) => {
    set({ isLoading: true, authError: null });
    try {
      // Check username is not already taken
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        set({ isLoading: false, authError: 'Username already taken.' });
        return { error: 'Username already taken.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: displayName,
          },
        },
      });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { error: error.message };
      }

      if (data.session) {
        set({ session: data.session, isAuthenticated: true });
        await get().loadProfile(data.session.user.id);
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Sign up failed';
      set({ isLoading: false, authError: msg });
      return { error: msg };
    }
  },

  // ─── Sign In ──────────────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { error: error.message };
      }

      if (data.session) {
        set({ session: data.session, isAuthenticated: true });
        await get().loadProfile(data.session.user.id);
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Sign in failed';
      set({ isLoading: false, authError: msg });
      return { error: msg };
    }
  },

  // ─── Phone OTP ────────────────────────────────────────────────────────────
  signInWithPhone: async (phone) => {
    set({ isLoading: true, authError: null });
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      set({ isLoading: false });
      if (error) {
        set({ authError: error.message });
        return { error: error.message };
      }
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'Failed to send OTP';
      set({ isLoading: false, authError: msg });
      return { error: msg };
    }
  },

  verifyOtp: async (phone, token) => {
    set({ isLoading: true, authError: null });
    try {
      const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });

      if (error) {
        set({ isLoading: false, authError: error.message });
        return { error: error.message };
      }

      if (data.session) {
        set({ session: data.session, isAuthenticated: true });
        await get().loadProfile(data.session.user.id);
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      const msg = err?.message || 'OTP verification failed';
      set({ isLoading: false, authError: msg });
      return { error: msg };
    }
  },

  // ─── Sign Out ─────────────────────────────────────────────────────────────
  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, isAuthenticated: false, isLoading: false, authError: null });
  },

  // ─── Profile & Credits ────────────────────────────────────────────────────
  savePushToken: async (userId, token) => {
    try {
      await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    } catch (err) {
      console.error('[AuthStore] Failed to save push token:', err);
    }
  },

  fetchFollowStats: async (userId) => {
    try {
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      set({ followStats: { followers: followers || 0, following: following || 0 } });
    } catch (err) {
      console.error('[AuthStore] fetchFollowStats error:', err);
    }
  },

  loadProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('[AuthStore] Failed to load profile:', error.message);
        return;
      }

      set({ user: data });
    } catch (err) {
      console.error('[AuthStore] loadProfile error:', err);
    }
  },

  // ─── Update Profile ───────────────────────────────────────────────────────
  updateProfile: async (updates) => {
    const { user, session } = get();
    if (!user || !session) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id)
        .select()
        .single();

      if (error) return { error: error.message };
      set({ user: data });
      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Update failed' };
    }
  },

  // ─── Credits ──────────────────────────────────────────────────────────────
  addCredits: async (amount) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('add_credits', {
      user_id: user.id,
      amount,
    });

    if (error) return { error: error.message };
    // Reload profile to get fresh balance
    await get().loadProfile(user.id);
    return { error: null };
  },

  deductCredits: async (amount) => {
    const { user } = get();
    if (!user) return { error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('deduct_credits', {
      user_id: user.id,
      amount,
    });

    if (error) return { error: error.message };
    await get().loadProfile(user.id);
    return { error: null };
  },

  // ─── Privacy Mode ─────────────────────────────────────────────────────────
  togglePrivacyMode: async (mode) => {
    const { user } = get();
    if (!user) return;

    await supabase
      .from('profiles')
      .update({ privacy_mode: mode })
      .eq('id', user.id);

    set((state) => ({
      user: state.user ? { ...state.user, privacy_mode: mode } : null,
    }));
  },

  // ─── Session Init ─────────────────────────────────────────────────────────
  initializeAuth: async () => {
    set({ isLoading: true });

    try {
      // Get existing session from storage
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        set({ session, isAuthenticated: true });
        await get().loadProfile(session.user.id);
      }
    } catch (err) {
      console.warn('[AuthStore] Session init error:', err);
    } finally {
      set({ isLoading: false });
    }

    // Listen for auth state changes (login, logout, token refresh)
    try {
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          set({ session, isAuthenticated: true });
          await get().loadProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          set({ session: null, user: null, isAuthenticated: false });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          set({ session });
        }
      });
    } catch (err) {
      console.warn('[AuthStore] AuthStateChange listener error:', err);
    }
  },

  clearError: () => set({ authError: null }),
}));
