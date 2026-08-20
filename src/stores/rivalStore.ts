import { create } from 'zustand';

export interface RivalUser {
  id: string;
  username: string;
  avatar_url?: string;
  tier: string;
  wins: number;
  losses: number;
}

export interface H2HRace {
  id: string;
  driver_a_id: string;
  driver_b_id: string;
  event_context: string;
  distance_format: string;
  winner_id: string;
  loser_id: string;
  time_a_seconds?: number;
  time_b_seconds?: number;
  status: 'pending' | 'confirmed' | 'disputed';
  driver_a_confirmed: number;
  driver_b_confirmed: number;
  created_at: string;
}

interface RivalState {
  rivals: any[];
  activeRivalDetail: any | null;
  isLoading: boolean;
  error: string | null;
  fetchRivals: (token?: string) => Promise<void>;
  fetchRivalDetail: (rivalUserId: string, token?: string) => Promise<void>;
  createH2HRace: (data: { driverBId: string; winnerId: string; vehicleAId?: string; vehicleBId?: string; eventContext?: string; distanceFormat?: string; timeASeconds?: number; timeBSeconds?: number }, token?: string) => Promise<boolean>;
  confirmH2HRace: (raceId: string, action: 'confirm' | 'dispute', token?: string) => Promise<boolean>;
}

export const useRivalStore = create<RivalState>((set, get) => ({
  rivals: [],
  activeRivalDetail: null,
  isLoading: false,
  error: null,

  fetchRivals: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/rivals', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        set({ rivals: data.rivals || [], isLoading: false });
      }
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  fetchRivalDetail: async (rivalUserId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`/api/rivals/${rivalUserId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        set({ activeRivalDetail: data, isLoading: false });
      }
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  createH2HRace: async (payload, token) => {
    try {
      const res = await fetch('/api/head-to-head/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to record race');
      await get().fetchRivals(token);
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  confirmH2HRace: async (raceId, action, token) => {
    try {
      const res = await fetch('/api/head-to-head/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ raceId, action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');
      await get().fetchRivals(token);
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },
}));
