import { create } from 'zustand';

export interface CotwSubmission {
  id: string;
  week_identifier: string;
  category: 'appearance' | 'build' | 'sound';
  user_id: string;
  vehicle_id: string;
  year_make_model: string;
  media_urls: string[];
  description: string;
  build_info: string;
  votes_count: number;
  username?: string;
  avatar_url?: string;
  vehicle_photo?: string;
}

export interface CotwWinner {
  id: string;
  week_identifier: string;
  category: 'appearance' | 'build' | 'sound';
  user_id: string;
  username: string;
  year: number;
  make: string;
  model: string;
  badge_id: string;
  media_urls: string[];
}

interface CotwState {
  weekIdentifier: string;
  submissions: CotwSubmission[];
  myVotes: { category: string; submission_id: string }[];
  mySubmissions: CotwSubmission[];
  winnersArchive: CotwWinner[];
  isLoading: boolean;
  error: string | null;
  fetchActive: (token?: string) => Promise<void>;
  submitVehicle: (data: { category: string; vehicleId: string; yearMakeModel: string; mediaUrls: string[]; description?: string; buildInfo?: string }, token?: string) => Promise<boolean>;
  vote: (submissionId: string, category: string, token?: string) => Promise<boolean>;
  fetchArchive: () => Promise<void>;
}

export const useCotwStore = create<CotwState>((set, get) => ({
  weekIdentifier: '',
  submissions: [],
  myVotes: [],
  mySubmissions: [],
  winnersArchive: [],
  isLoading: false,
  error: null,

  fetchActive: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch('/api/cotw/active', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch Car of the Week data');
      set({
        weekIdentifier: data.weekIdentifier,
        submissions: data.submissions || [],
        myVotes: data.myVotes || [],
        mySubmissions: data.mySubmissions || [],
        isLoading: false,
      });
    } catch (e: any) {
      set({ isLoading: false, error: e.message });
    }
  },

  submitVehicle: async (payload, token) => {
    try {
      const res = await fetch('/api/cotw/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      await get().fetchActive(token);
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  vote: async (submissionId, category, token) => {
    try {
      const { weekIdentifier } = get();
      const res = await fetch('/api/cotw/vote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ submissionId, category, weekIdentifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Voting failed');
      await get().fetchActive(token);
      return true;
    } catch (e: any) {
      set({ error: e.message });
      return false;
    }
  },

  fetchArchive: async () => {
    try {
      const res = await fetch('/api/cotw/archive');
      const data = await res.json();
      if (res.ok) {
        set({ winnersArchive: data.winners || [] });
      }
    } catch (e) {}
  },
}));
