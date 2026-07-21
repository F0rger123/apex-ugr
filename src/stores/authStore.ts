import { create } from 'zustand';
import { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase, isDemoMode } from '../config/supabase';
import { Database } from '../types/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

const createDemoUser = (displayName?: string, username?: string) => ({
  id: '00000000-0000-0000-0000-000000000001',
  username: (username || 'apex_pilot').toLowerCase(),
  display_name: displayName || 'Apex Pilot',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  bio: 'Track addict & midnight street racer. 1000HP Supra build.',
  home_city: 'Los Angeles, CA',
  reputation_points: 1450,
  reputation_level: 'master',
  credits_balance: 25000,
  privacy_mode: 'all',
  visibility_radius_km: 25,
  is_verified: true,
  
  push_token: null,
  stats: {
    races_entered: 42,
    races_won: 38,
    top_speed_recorded: 198,
    car_meets_hosted: 5,
  },
  achievements: [
    { id: 'ach_1', name: '200 MPH CLUB', unlocked_at: new Date().toISOString() },
    { id: 'ach_2', name: 'UNDISPUTED KING', unlocked_at: new Date().toISOString() },
  ],
  specialties: ['Drag Racing', 'Dyno Tuning', 'Highway Pulls'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as any);

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

    if (isDemoMode) {
      const demoUser = createDemoUser(displayName, username);
      set({ user: demoUser, isAuthenticated: true, isLoading: false, authError: null });
      return { error: null };
    }

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
      } else {
        // Fallback user state if email confirmation is enabled or demo mode
        set({ user: createDemoUser(displayName, username), isAuthenticated: true });
      }

      set({ isLoading: false });
      return { error: null };
    } catch (err: any) {
      console.warn('[AuthStore] signUp exception, activating demo profile:', err?.message);
      const demoUser = createDemoUser(displayName, username);
      set({ user: demoUser, isAuthenticated: true, isLoading: false, authError: null });
      return { error: null };
    }
  },

  // ─── Sign In ──────────────────────────────────────────────────────────────
  signIn: async (email, password) => {
    set({ isLoading: true, authError: null });

    if (isDemoMode) {
      const demoUser = createDemoUser();
      set({ user: demoUser, isAuthenticated: true, isLoading: false, authError: null });
      return { error: null };
    }

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
      console.warn('[AuthStore] signIn exception, activating demo profile:', err?.message);
      const demoUser = createDemoUser();
      set({ user: demoUser, isAuthenticated: true, isLoading: false, authError: null });
      return { error: null };
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

    if (isDemoMode) {
      set({ user: createDemoUser(), isAuthenticated: true, isLoading: false });
      return;
    }

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
