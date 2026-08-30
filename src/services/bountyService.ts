import { BountyUserSettings, BountyConfig, BountySession, BountyHistoryItem, BountyUserStats } from '../types/database.types';

const API_BASE = '/api';

async function authHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const bountyService = {
  async getSettings(token?: string): Promise<BountyUserSettings> {
    const res = await fetch(`${API_BASE}/bounty/settings`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bounty settings');
    return data.settings;
  },

  async updateSettings(settings: Partial<BountyUserSettings> & { agreed?: boolean }, token?: string): Promise<{ success: boolean; bountyModeEnabled: boolean }> {
    const res = await fetch(`${API_BASE}/bounty/settings`, {
      method: 'PUT',
      headers: await authHeaders(token),
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update bounty settings');
    return data;
  },

  async getConfig(token?: string): Promise<BountyConfig> {
    const res = await fetch(`${API_BASE}/bounty/config`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bounty configuration');
    return data.config;
  },

  async getActiveSession(token?: string): Promise<{ role: 'target' | 'hunter' | null; session: BountySession | null }> {
    const res = await fetch(`${API_BASE}/bounty/active`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch active bounty session');
    return data;
  },

  async getMostWanted(token?: string): Promise<BountySession[]> {
    const res = await fetch(`${API_BASE}/bounty/most-wanted`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch Most Wanted list');
    return data.mostWanted;
  },

  async triggerBounty(options: { mode?: 'roaming' | 'venue'; starLevel?: number; venueName?: string }, token?: string): Promise<BountySession> {
    const res = await fetch(`${API_BASE}/bounty/trigger`, {
      method: 'POST',
      headers: await authHeaders(token),
      body: JSON.stringify(options),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to activate bounty session');
    return data;
  },

  async joinHunt(sessionId: string, token?: string): Promise<{ success: boolean; status: string }> {
    const res = await fetch(`${API_BASE}/bounty/sessions/${sessionId}/join`, {
      method: 'POST',
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to join hunt');
    return data;
  },

  async leaveHunt(sessionId: string, token?: string): Promise<{ success: boolean; status: string }> {
    const res = await fetch(`${API_BASE}/bounty/sessions/${sessionId}/leave`, {
      method: 'POST',
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to leave hunt');
    return data;
  },

  async sendSignalUpdate(
    sessionId: string,
    params: { latitude?: number; longitude?: number },
    token?: string
  ): Promise<{
    sessionId: string;
    signalStrengthPct: number;
    approxDistanceMiles: number;
    approxDirection: string;
    inClaimRange: boolean;
    proximityLockSeconds: number;
    targetVerified: boolean;
  }> {
    const res = await fetch(`${API_BASE}/bounty/sessions/${sessionId}/signal`, {
      method: 'POST',
      headers: await authHeaders(token),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update signal');
    return data;
  },

  async claimBounty(sessionId: string, token?: string): Promise<{ claimed: boolean; rewardGc: number; rewardRep: number; starLevel: number; badgeEarned?: string }> {
    const res = await fetch(`${API_BASE}/bounty/sessions/${sessionId}/claim`, {
      method: 'POST',
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to claim bounty');
    return data;
  },

  async progressBounty(sessionId: string, token?: string): Promise<{ status: string; starLevel: number; rewardGc?: number; rewardRep?: number; stageEndsAt?: string; remainingSeconds?: number; escaped?: boolean; badgeEarned?: string }> {
    const res = await fetch(`${API_BASE}/bounty/sessions/${sessionId}/progress`, {
      method: 'POST',
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to check bounty progress');
    return data;
  },

  async getHistory(token?: string): Promise<BountyHistoryItem[]> {
    const res = await fetch(`${API_BASE}/bounty/history`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bounty history');
    return data.history;
  },

  async getStats(token?: string): Promise<{ stats: BountyUserStats; badges: any[] }> {
    const res = await fetch(`${API_BASE}/bounty/stats`, {
      headers: await authHeaders(token),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch bounty stats');
    return data;
  },

  async devOverride(action: 'force_trigger' | 'shorten_timer' | 'force_claim' | 'force_escape', params?: any, token?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/bounty/dev-override`, {
      method: 'POST',
      headers: await authHeaders(token),
      body: JSON.stringify({ action, ...params }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Dev override failed');
    return data;
  },
};
