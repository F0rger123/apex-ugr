import { create } from 'zustand';
import { Profile } from '../types/database.types';

interface AuthState {
  user: Profile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<Profile>) => void;
  addCredits: (amount: number) => void;
  deductCredits: (amount: number) => void;
  togglePrivacyMode: (mode: 'all' | 'friends' | 'meet_only' | 'invisible') => void;
}

const DEFAULT_PROFILE: Profile = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'phantom_gtr',
  display_name: 'Ryder Vance',
  bio: '1,150WHP R35 GT-R | Apex Champion 2025 | Drag & Highway Pulls',
  home_city: 'Los Angeles, CA',
  reputation_level: 'Community Favorite',
  reputation_points: 4850,
  credits_balance: 18500.00,
  favorite_car_type: 'JDM / All-Wheel Drive',
  racing_specialties: ['Drag Race', 'Roll Race', 'Highway Pull'],
  stats: {
    races_entered: 14,
    races_won: 11,
    top_speed_recorded: 224,
    meets_hosted: 5
  },
  achievements: [
    { id: 'first_win', name: 'First Victory', unlocked: true },
    { id: 'speed_demon', name: '200+ MPH Club', unlocked: true },
    { id: 'wager_master', name: '10K Credits Wagered', unlocked: true },
    { id: 'referee_badge', name: 'Dispute Referee', unlocked: true }
  ],
  is_verified: true,
  privacy_mode: 'all',
  visibility_radius_km: 50,
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
  created_at: new Date().toISOString()
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEFAULT_PROFILE,
  isAuthenticated: true,
  isLoading: false,

  login: async (_email: string) => {
    set({ isLoading: true });
    setTimeout(() => {
      set({ user: DEFAULT_PROFILE, isAuthenticated: true, isLoading: false });
    }, 600);
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  },

  updateProfile: (updates) => {
    set((state) => ({
      user: state.user ? { ...state.user, ...updates } : null
    }));
  },

  addCredits: (amount) => {
    set((state) => ({
      user: state.user ? { ...state.user, credits_balance: state.user.credits_balance + amount } : null
    }));
  },

  deductCredits: (amount) => {
    set((state) => ({
      user: state.user ? { ...state.user, credits_balance: Math.max(0, state.user.credits_balance - amount) } : null
    }));
  },

  togglePrivacyMode: (mode) => {
    set((state) => ({
      user: state.user ? { ...state.user, privacy_mode: mode } : null
    }));
  }
}));
