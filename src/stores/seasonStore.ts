import { create } from 'zustand';

export interface SeasonReward {
  level: number;
  type: 'gc' | 'xp' | 'badge' | 'banner' | 'cosmetic';
  amount?: number;
  id?: string;
  label: string;
}

export interface SeasonChallenge {
  id: string;
  challenge_type: 'daily' | 'weekly' | 'season';
  title: string;
  description: string;
  target_count: number;
  current_count: number;
  xp_reward: number;
  gc_reward: number;
  is_completed: number;
}

export interface SeasonData {
  id: string;
  season_number: number;
  name: string;
  theme: string;
  starts_at: string;
  ends_at: string;
  rewards: SeasonReward[];
}

export interface SeasonProgress {
  user_id: string;
  season_id: string;
  xp: number;
  level: number;
  claimed_levels: number[];
  has_premium_track: number;
}

interface SeasonState {
  season: SeasonData | null;
  progress: SeasonProgress | null;
  challenges: SeasonChallenge[];
  isLoading: boolean;
  error: string | null;
  fetchSeason: (token?: string) => Promise<void>;
  addXp: (amount: number, token?: string) => Promise<void>;
  claimLevelReward: (level: number, token?: string) => Promise<boolean>;
}

export const useSeasonStore = create<SeasonState>((set, get) => ({
  season: null,
  progress: null,
  challenges: [],
  isLoading: false,
  error: null,

  fetchSeason: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/seasons/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch season');
      set({
        season: data.season,
        progress: data.progress,
        challenges: data.challenges || [],
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  addXp: async (amount, token) => {
    try {
      const res = await fetch('/api/seasons/add-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (res.ok) {
        set((state) => ({
          progress: state.progress
            ? { ...state.progress, xp: data.xp, level: data.level }
            : null,
        }));
      }
    } catch (e) {}
  },

  claimLevelReward: async (level, token) => {
    try {
      const res = await fetch('/api/seasons/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ level }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');
      set((state) => ({
        progress: state.progress
          ? { ...state.progress, claimed_levels: data.claimedLevels }
          : null,
      }));
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },
}));
