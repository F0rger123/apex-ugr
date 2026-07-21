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

const DEFAULT_LEADERBOARD: LeaderboardUser[] = [
  {
    id: 'l-1',
    username: 'ghost_gtr',
    display_name: 'Ghost GTR',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    reputation_level: 'LEGEND',
    reputation_points: 9850,
    credits_balance: 145000,
    races_won: 142,
    races_entered: 150,
    top_speed_recorded: 212,
    win_rate_pct: 94.6,
  },
  {
    id: 'l-2',
    username: 'vargas_twinturbo',
    display_name: 'Vargas TT',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
    reputation_level: 'MASTER',
    reputation_points: 7420,
    credits_balance: 89000,
    races_won: 98,
    races_entered: 110,
    top_speed_recorded: 204,
    win_rate_pct: 89.1,
  },
  {
    id: 'l-3',
    username: 'apex_pilot',
    display_name: 'Apex Pilot',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
    reputation_level: 'MASTER',
    reputation_points: 5400,
    credits_balance: 45000,
    races_won: 65,
    races_entered: 74,
    top_speed_recorded: 198,
    win_rate_pct: 87.8,
  },
  {
    id: 'l-4',
    username: 'boosted_bimmer',
    display_name: 'Boosted M3',
    avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop',
    reputation_level: 'EXPERT',
    reputation_points: 3890,
    credits_balance: 32000,
    races_won: 48,
    races_entered: 60,
    top_speed_recorded: 191,
    win_rate_pct: 80.0,
  },
  {
    id: 'l-5',
    username: 'rotary_rx7',
    display_name: 'Rotary King',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=400&auto=format&fit=crop',
    reputation_level: 'EXPERT',
    reputation_points: 3120,
    credits_balance: 21000,
    races_won: 36,
    races_entered: 48,
    top_speed_recorded: 186,
    win_rate_pct: 75.0,
  }
];

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  globalLeaderboard: DEFAULT_LEADERBOARD,
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

      if (error || !data || data.length === 0) {
        set({ globalLeaderboard: DEFAULT_LEADERBOARD, isLoading: false });
        return;
      }

      set({ globalLeaderboard: data as LeaderboardUser[], isLoading: false });
    } catch (err: any) {
      set({ globalLeaderboard: DEFAULT_LEADERBOARD, isLoading: false });
    }
  },
}));
