import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

export interface LeaderboardUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  reputation_level: string;
  reputation_points: number;
  credits_balance: number;
  races_won: number;
  races_entered: number;
  top_speed_recorded: number;
  win_rate_pct: number;
}

interface LeaderboardState {
  globalLeaderboard: LeaderboardUser[];
  isLoading: boolean;
  error: string | null;

  fetchLeaderboard: () => Promise<void>;
}

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  globalLeaderboard: [],
  isLoading: false,
  error: null,

  fetchLeaderboard: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('*')
        .order('reputation_points', { ascending: false })
        .limit(100);

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      set({ globalLeaderboard: data as LeaderboardUser[], isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to fetch leaderboard', isLoading: false });
    }
  },
}));
