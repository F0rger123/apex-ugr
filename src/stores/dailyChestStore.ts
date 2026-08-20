import { create } from 'zustand';

export interface DailyChestClaimResult {
  id: string;
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'CLASSIFIED';
  streakDay: number;
  gcReward: number;
  xpReward: number;
  itemReward: string | null;
}

interface DailyChestState {
  available: boolean;
  streakCount: number;
  lastClaimedDate: string | null;
  lastClaimResult: DailyChestClaimResult | null;
  isLoading: boolean;
  error: string | null;
  fetchStatus: (token?: string) => Promise<void>;
  claimChest: (token?: string) => Promise<DailyChestClaimResult | null>;
}

export const useDailyChestStore = create<DailyChestState>((set) => ({
  available: false,
  streakCount: 0,
  lastClaimedDate: null,
  lastClaimResult: null,
  isLoading: false,
  error: null,

  fetchStatus: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/daily-chest/status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (res.ok) {
        set({
          available: data.available,
          streakCount: data.streakCount,
          lastClaimedDate: data.lastClaimedDate,
          isLoading: false,
        });
      }
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  claimChest: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/daily-chest/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');

      const claim: DailyChestClaimResult = data.claim;
      set({
        available: false,
        streakCount: claim.streakDay,
        lastClaimResult: claim,
        isLoading: false,
      });
      return claim;
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
      return null;
    }
  },
}));
