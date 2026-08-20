import { create } from 'zustand';

export interface RecapMetrics {
  milesDriven: number;
  roadsDiscovered: number;
  districtsExplored: number;
  driverModeSessions: number;
  mostDrivenVehicle: string;
  ghostCreditsEarned: number;
  ghostCachesClaimed: number;
  bountiesSurvived: number;
  bountiesClaimed: number;
  convoyMiles: number;
  convoysJoined: number;
  meetsAttended: number;
  meetsOrganized: number;
  races: number;
  wins: number;
  losses: number;
  winRatePct: number;
  personalRecordsSet: number;
  repEarned: number;
  seasonLevel: number;
  cotwNominations: number;
  cotwWins: number;
  modsAdded: number;
}

interface RecapState {
  recapData: {
    year: number;
    metrics: RecapMetrics;
    awards: string[];
    primaryVehicle: any;
  } | null;
  isLoading: boolean;
  error: string | null;
  fetchRecap: (token?: string) => Promise<void>;
}

export const useRecapStore = create<RecapState>((set) => ({
  recapData: null,
  isLoading: false,
  error: null,

  fetchRecap: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/recap/2026', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        set({ recapData: data, isLoading: false });
      }
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },
}));
