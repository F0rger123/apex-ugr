import { create } from 'zustand';
import { supabase } from '../config/supabase';

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
  home_city?: string;
}

interface LeaderboardState {
  globalLeaderboard: LeaderboardUser[];
  isLoading: boolean;
  error: string | null;
  fetchLeaderboard: () => Promise<void>;
}

const SEED_LEADERBOARD: LeaderboardUser[] = [
  { id: 'l-1', username: 'ghost_gtr', display_name: 'Ghost GTR', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop', reputation_level: 'LEGEND', reputation_points: 9850, credits_balance: 145000, races_won: 142, races_entered: 150, top_speed_recorded: 212, win_rate_pct: 94.6, home_city: 'Los Angeles, CA' },
  { id: 'l-2', username: 'vargas_twinturbo', display_name: 'Vargas TT', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', reputation_level: 'MASTER', reputation_points: 7420, credits_balance: 89000, races_won: 98, races_entered: 110, top_speed_recorded: 204, win_rate_pct: 89.1, home_city: 'Compton, CA' },
  { id: 'l-3', username: 'apex_pilot', display_name: 'Apex Pilot', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop', reputation_level: 'MASTER', reputation_points: 5400, credits_balance: 45000, races_won: 65, races_entered: 74, top_speed_recorded: 198, win_rate_pct: 87.8, home_city: 'Long Beach, CA' },
  { id: 'l-4', username: 'boosted_bimmer', display_name: 'Boosted M3', avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?q=80&w=400&auto=format&fit=crop', reputation_level: 'EXPERT', reputation_points: 3890, credits_balance: 32000, races_won: 48, races_entered: 60, top_speed_recorded: 191, win_rate_pct: 80.0, home_city: 'Burbank, CA' },
  { id: 'l-5', username: 'rotary_rx7', display_name: 'Rotary King', avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=400&auto=format&fit=crop', reputation_level: 'EXPERT', reputation_points: 3120, credits_balance: 21000, races_won: 36, races_entered: 48, top_speed_recorded: 186, win_rate_pct: 75.0, home_city: 'Inglewood, CA' },
  { id: 'l-6', username: 'hellcat_queen', display_name: 'Hellcat Queen', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop', reputation_level: 'EXPERT', reputation_points: 2780, credits_balance: 18500, races_won: 29, races_entered: 40, top_speed_recorded: 182, win_rate_pct: 72.5, home_city: 'Pomona, CA' },
  { id: 'l-7', username: 'evo_ramirez', display_name: 'Evo Ramirez', avatar_url: 'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?q=80&w=400&auto=format&fit=crop', reputation_level: 'SKILLED', reputation_points: 2100, credits_balance: 12000, races_won: 22, races_entered: 34, top_speed_recorded: 175, win_rate_pct: 64.7, home_city: 'East LA, CA' },
  { id: 'l-8', username: 'supra_king', display_name: 'Supra King', avatar_url: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?q=80&w=400&auto=format&fit=crop', reputation_level: 'SKILLED', reputation_points: 1820, credits_balance: 9500, races_won: 18, races_entered: 28, top_speed_recorded: 170, win_rate_pct: 64.3, home_city: 'Torrance, CA' },
  { id: 'l-9', username: 'nitro_nova', display_name: 'Nitro Nova', avatar_url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?q=80&w=400&auto=format&fit=crop', reputation_level: 'RACER', reputation_points: 1220, credits_balance: 6000, races_won: 11, races_entered: 20, top_speed_recorded: 162, win_rate_pct: 55.0, home_city: 'Hawthorne, CA' },
  { id: 'l-10', username: 'drift_kaneda', display_name: 'Drift Kaneda', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400&auto=format&fit=crop', reputation_level: 'ROOKIE', reputation_points: 680, credits_balance: 2500, races_won: 5, races_entered: 12, top_speed_recorded: 148, win_rate_pct: 41.7, home_city: 'Carson, CA' },
];

export const useLeaderboardStore = create<LeaderboardState>((set) => ({
  globalLeaderboard: SEED_LEADERBOARD,
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

      if (!error && data && data.length > 0) {
        set({ globalLeaderboard: data as LeaderboardUser[], isLoading: false });
      } else {
        set({ isLoading: false }); // Keep seed data showing
      }
    } catch {
      set({ isLoading: false }); // Keep seed data showing
    }
  },
}));
