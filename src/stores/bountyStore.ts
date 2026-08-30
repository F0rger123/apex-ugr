import { create } from 'zustand';
import { bountyService } from '../services/bountyService';
import { BountyUserSettings, BountyConfig, BountySession, BountyHistoryItem, BountyUserStats } from '../types/database.types';

interface BountyState {
  settings: BountyUserSettings | null;
  config: BountyConfig | null;
  activeRole: 'target' | 'hunter' | null;
  activeSession: BountySession | null;
  mostWanted: BountySession[];
  history: BountyHistoryItem[];
  stats: BountyUserStats | null;
  badges: any[];
  isLoading: boolean;
  error: string | null;

  // Signal & Proximity State (for active hunt)
  signalStrengthPct: number;
  approxDistanceMiles: number;
  approxDirection: string;
  proximityLockSeconds: number; // 0 to 20
  inClaimRange: boolean;
  targetVerified: boolean;

  // Actions
  fetchSettings: (token?: string) => Promise<void>;
  updateSettings: (newSettings: Partial<BountyUserSettings> & { agreed?: boolean }, token?: string) => Promise<boolean>;
  fetchConfig: (token?: string) => Promise<void>;
  fetchActiveSession: (token?: string) => Promise<void>;
  fetchMostWanted: (token?: string) => Promise<void>;
  fetchHistory: (token?: string) => Promise<void>;
  fetchStats: (token?: string) => Promise<void>;

  triggerBounty: (options: { mode?: 'roaming' | 'venue'; starLevel?: number; venueName?: string }, token?: string) => Promise<BountySession>;
  joinHunt: (sessionId: string, token?: string) => Promise<boolean>;
  leaveHunt: (sessionId: string, token?: string) => Promise<boolean>;
  sendSignalUpdate: (sessionId: string, params: { latitude?: number; longitude?: number }, token?: string) => Promise<void>;
  claimBounty: (sessionId: string, token?: string) => Promise<{ claimed: boolean; rewardGc: number; rewardRep: number; starLevel: number; badgeEarned?: string }>;
  progressBounty: (sessionId: string, token?: string) => Promise<{ status: string; starLevel: number; escaped?: boolean; badgeEarned?: string }>;

  // Dev Testing Overrides
  devOverride: (action: 'force_trigger' | 'shorten_timer' | 'force_claim' | 'force_escape', params?: any, token?: string) => Promise<any>;
}

export const useBountyStore = create<BountyState>((set, get) => ({
  settings: null,
  config: null,
  activeRole: null,
  activeSession: null,
  mostWanted: [],
  history: [],
  stats: null,
  badges: [],
  isLoading: false,
  error: null,

  signalStrengthPct: 0,
  approxDistanceMiles: 0,
  approxDirection: 'N',
  proximityLockSeconds: 0,
  inClaimRange: false,
  targetVerified: false,

  fetchSettings: async (token) => {
    try {
      const settings = await bountyService.getSettings(token);
      set({ settings });
    } catch (err: any) {
      console.warn('[BountyStore] fetchSettings fallback:', err?.message);
    }
  },

  updateSettings: async (newSettings, token) => {
    try {
      const res = await bountyService.updateSettings(newSettings, token);
      set((state) => ({
        settings: state.settings
          ? { ...state.settings, ...newSettings, bounty_mode_enabled: res.bountyModeEnabled }
          : null,
      }));
      return res.success;
    } catch (err: any) {
      set({ error: err?.message || 'Failed to update settings' });
      return false;
    }
  },

  fetchConfig: async (token) => {
    try {
      const config = await bountyService.getConfig(token);
      set({ config });
    } catch (err: any) {
      console.warn('[BountyStore] fetchConfig error:', err?.message);
    }
  },

  fetchActiveSession: async (token) => {
    set({ isLoading: true });
    try {
      const res = await bountyService.getActiveSession(token);
      set({
        activeRole: res.role,
        activeSession: res.session,
        signalStrengthPct: res.session?.signal_strength_pct || 0,
        approxDistanceMiles: res.session?.approx_distance_miles || 0,
        approxDirection: res.session?.approx_direction || 'NW',
        proximityLockSeconds: res.session?.proximity_lock_seconds || 0,
        isLoading: false,
      });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
    }
  },

  fetchMostWanted: async (token) => {
    try {
      const mostWanted = await bountyService.getMostWanted(token);
      set({ mostWanted });
    } catch (err: any) {
      console.warn('[BountyStore] fetchMostWanted error:', err?.message);
    }
  },

  fetchHistory: async (token) => {
    try {
      const history = await bountyService.getHistory(token);
      set({ history });
    } catch (err: any) {
      console.warn('[BountyStore] fetchHistory error:', err?.message);
    }
  },

  fetchStats: async (token) => {
    try {
      const res = await bountyService.getStats(token);
      set({ stats: res.stats, badges: res.badges });
    } catch (err: any) {
      console.warn('[BountyStore] fetchStats error:', err?.message);
    }
  },

  triggerBounty: async (options, token) => {
    set({ isLoading: true, error: null });
    try {
      const session = await bountyService.triggerBounty(options, token);
      set({
        activeRole: 'target',
        activeSession: session,
        isLoading: false,
      });
      return session;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
      throw err;
    }
  },

  joinHunt: async (sessionId, token) => {
    set({ isLoading: true, error: null });
    try {
      await bountyService.joinHunt(sessionId, token);
      await get().fetchActiveSession(token);
      set({ isLoading: false });
      return true;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
      return false;
    }
  },

  leaveHunt: async (sessionId, token) => {
    try {
      await bountyService.leaveHunt(sessionId, token);
      set({
        activeRole: null,
        activeSession: null,
        proximityLockSeconds: 0,
        inClaimRange: false,
        targetVerified: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err?.message });
      return false;
    }
  },

  sendSignalUpdate: async (sessionId, params, token) => {
    try {
      const res = await bountyService.sendSignalUpdate(sessionId, params, token);
      set({
        signalStrengthPct: res.signalStrengthPct,
        approxDistanceMiles: res.approxDistanceMiles,
        approxDirection: res.approxDirection,
        inClaimRange: res.inClaimRange,
        proximityLockSeconds: res.proximityLockSeconds,
        targetVerified: res.targetVerified,
      });
    } catch (err: any) {
      console.warn('[BountyStore] sendSignalUpdate error:', err?.message);
    }
  },

  claimBounty: async (sessionId, token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await bountyService.claimBounty(sessionId, token);
      set({
        activeRole: null,
        activeSession: null,
        proximityLockSeconds: 0,
        targetVerified: false,
        isLoading: false,
      });
      get().fetchHistory(token);
      get().fetchStats(token);
      return res;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message });
      throw err;
    }
  },

  progressBounty: async (sessionId, token) => {
    try {
      const res = await bountyService.progressBounty(sessionId, token);
      if (res.escaped) {
        set({ activeRole: null, activeSession: null });
        get().fetchHistory(token);
        get().fetchStats(token);
      } else if (res.status === 'escalated' && get().activeSession) {
        set((state) => ({
          activeSession: state.activeSession ? {
            ...state.activeSession,
            star_level: res.starLevel,
            reward_gc: res.rewardGc || state.activeSession.reward_gc,
            reward_rep: res.rewardRep || state.activeSession.reward_rep,
            stage_ends_at: res.stageEndsAt || state.activeSession.stage_ends_at,
          } : null
        }));
      }
      return res;
    } catch (err: any) {
      console.warn('[BountyStore] progressBounty error:', err?.message);
      throw err;
    }
  },

  devOverride: async (action, params, token) => {
    const res = await bountyService.devOverride(action, params, token);
    await get().fetchActiveSession(token);
    return res;
  },
}));
