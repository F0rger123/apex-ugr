import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

type RaceChallenge = Database['public']['Tables']['race_challenges']['Row'];
type RaceDispute = Database['public']['Tables']['race_disputes']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export type RaceChallengeWithProfiles = RaceChallenge & {
  challenger_profile?: Profile;
  opponent_profile?: Profile;
};

interface RaceState {
  races: RaceChallengeWithProfiles[];
  disputes: RaceDispute[];
  isLoading: boolean;
  error: string | null;
  _channel: RealtimeChannel | null;

  fetchRaces: (userId: string) => Promise<void>;
  fetchDisputes: () => Promise<void>;

  createChallenge: (
    data: Omit<Database['public']['Tables']['race_challenges']['Insert'], 'challenger_id'>,
    challengerId: string
  ) => Promise<{ error: string | null; id?: string }>;

  acceptChallenge: (raceId: string, opponentId: string) => Promise<{ error: string | null }>;
  declineChallenge: (raceId: string) => Promise<{ error: string | null }>;
  submitRaceResult: (raceId: string, winnerId: string) => Promise<{ error: string | null }>;

  submitDispute: (
    data: Omit<Database['public']['Tables']['race_disputes']['Insert'], 'reporter_id'>,
    reporterId: string
  ) => Promise<{ error: string | null }>;

  voteOnDispute: (disputeId: string, userId: string, isValidVote: boolean) => Promise<void>;

  subscribeToRaces: (userId: string) => void;
  unsubscribeFromRaces: () => void;
}

export const useRaceStore = create<RaceState>((set, get) => ({
  races: [],
  disputes: [],
  isLoading: false,
  error: null,
  _channel: null,

  // ─── Fetch races ──────────────────────────────────────────────────────────
  fetchRaces: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('race_challenges')
        .select(`
          *,
          challenger_profile:profiles!race_challenges_challenger_id_fkey(*),
          opponent_profile:profiles!race_challenges_opponent_id_fkey(*)
        `)
        .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
        .in('status', ['open', 'accepted', 'in_progress', 'disputed'])
        .order('created_at', { ascending: false });

      if (!data || data.length === 0) {
        const SEED_RACES: RaceChallengeWithProfiles[] = [
          {
            id: 'r_seed_1',
            challenger_id: '00000000-0000-0000-0000-000000000001',
            opponent_id: '00000000-0000-0000-0000-000000000002',
            race_type: 'Roll Race',
            route_name: '60-130 MPH SPRINT',
            distance_miles: 0.5,
            wager_credits: 1000,
            start_time: new Date().toISOString(),
            rules: 'Rolling start at 60 MPH. Honk 3 times to launch.',
            status: 'accepted',
            winner_id: null,
            created_at: new Date().toISOString(),
            challenger_profile: {
              id: '00000000-0000-0000-0000-000000000001',
              username: 'phantom_gtr',
              display_name: 'Ryder Vance',
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
            } as any,
            opponent_profile: {
              id: '00000000-0000-0000-0000-000000000002',
              username: 'apex_gt3',
              display_name: 'Elena Rostova',
              avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
            } as any,
          },
          {
            id: 'r_seed_2',
            challenger_id: '00000000-0000-0000-0000-000000000003',
            opponent_id: null,
            race_type: 'Drag Race',
            route_name: '1/4 MILE STANDING DRAG',
            distance_miles: 0.25,
            wager_credits: 500,
            start_time: new Date(Date.now() + 3600000).toISOString(),
            rules: 'Standing dig launch. Green light start.',
            status: 'open',
            winner_id: null,
            created_at: new Date(Date.now() - 1800000).toISOString(),
            challenger_profile: {
              id: '00000000-0000-0000-0000-000000000003',
              username: 'coyote_50',
              display_name: 'Marcus Brody',
              avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop',
            } as any,
          },
        ];
        set({ races: SEED_RACES, isLoading: false });
        return;
      }

      set({ races: data as RaceChallengeWithProfiles[], isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load races', isLoading: false });
    }
  },

  // ─── Fetch disputes ───────────────────────────────────────────────────────
  fetchDisputes: async () => {
    try {
      const { data, error } = await supabase
        .from('race_disputes')
        .select('*')
        .eq('status', 'under_review')
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ disputes: data });
      }
    } catch (err) {
      console.error('[RaceStore] fetchDisputes error:', err);
    }
  },

  // ─── Create challenge ─────────────────────────────────────────────────────
  createChallenge: async (data, challengerId) => {
    set({ isLoading: true });
    try {
      // If there's a wager, escrow the credits immediately
      if (data.wager_credits && data.wager_credits > 0 && data.opponent_id) {
        const { data: escrowResult, error: escrowError } = await supabase.rpc('escrow_wager', {
          p_challenger_id: challengerId,
          p_opponent_id: data.opponent_id,
          p_amount: data.wager_credits,
          p_race_id: '', // placeholder, will update after insert
        });

        if (escrowError || !escrowResult) {
          set({ isLoading: false });
          return { error: 'Insufficient credits for this wager.' };
        }
      }

      const { data: race, error } = await supabase
        .from('race_challenges')
        .insert({ ...data, challenger_id: challengerId })
        .select(`
          *,
          challenger_profile:profiles!race_challenges_challenger_id_fkey(*)
        `)
        .single();

      if (error) {
        const localRace = {
          ...data,
          id: `local-race-${Date.now()}`,
          challenger_id: challengerId,
          created_at: new Date().toISOString(),
          challenger_profile: { username: 'YOU' },
        } as RaceChallengeWithProfiles;
        set((state) => ({ races: [localRace, ...state.races], isLoading: false }));
        return { error: null, id: localRace.id };
      }

      set((state) => ({
        races: [race as RaceChallengeWithProfiles, ...state.races],
        isLoading: false,
      }));

      return { error: null, id: race.id };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: err?.message || 'Failed to create challenge' };
    }
  },

  // ─── Accept challenge ─────────────────────────────────────────────────────
  acceptChallenge: async (raceId, opponentId) => {
    set((state) => ({
      races: state.races.map((r) => (r.id === raceId ? { ...r, opponent_id: opponentId, status: 'accepted' } : r)),
    }));
    try {
      const request = supabase
        .from('race_challenges')
        .update({ opponent_id: opponentId, status: 'accepted' })
        .eq('id', raceId)
        .select()
        .single();
      const { data, error }: any = await Promise.race([
        request,
        new Promise(resolve => setTimeout(() => resolve({ data: null, error: { message: 'sync timeout' } }), 5000)),
      ]);

      if (error) return { error: null };

      set((state) => ({
        races: state.races.map((r) => (r.id === raceId ? { ...r, ...data } : r)),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to accept challenge' };
    }
  },

  // ─── Decline challenge ────────────────────────────────────────────────────
  declineChallenge: async (raceId) => {
    try {
      // Get race to check if we need to refund credits
      const race = get().races.find((r) => r.id === raceId);

      const { error } = await supabase
        .from('race_challenges')
        .update({ status: 'cancelled' })
        .eq('id', raceId);

      if (error) return { error: error.message };

      // Refund wager if it was escrowed
      if (race?.wager_credits && race.wager_credits > 0) {
        await supabase.rpc('add_credits', {
          user_id: race.challenger_id,
          amount: race.wager_credits,
        });
        if (race.opponent_id) {
          await supabase.rpc('add_credits', {
            user_id: race.opponent_id,
            amount: race.wager_credits,
          });
        }
      }

      set((state) => ({
        races: state.races.filter((r) => r.id !== raceId),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to decline challenge' };
    }
  },

  // ─── Submit race result ───────────────────────────────────────────────────
  submitRaceResult: async (raceId, winnerId) => {
    try {
      // Release wager to winner via atomic DB function
      const { error: wagerError } = await supabase.rpc('release_wager', {
        p_race_id: raceId,
        p_winner_id: winnerId,
      });

      if (wagerError) return { error: wagerError.message };

      set((state) => ({
        races: state.races.map((r) =>
          r.id === raceId ? { ...r, winner_id: winnerId, status: 'finished' } : r
        ),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to submit result' };
    }
  },

  // ─── Submit dispute ───────────────────────────────────────────────────────
  submitDispute: async (data, reporterId) => {
    try {
      const { data: dispute, error } = await supabase
        .from('race_disputes')
        .insert({ ...data, reporter_id: reporterId })
        .select()
        .single();

      if (error) return { error: error.message };

      // Mark race as disputed
      await supabase
        .from('race_challenges')
        .update({ status: 'disputed' })
        .eq('id', data.race_id);

      set((state) => ({
        disputes: [dispute, ...state.disputes],
        races: state.races.map((r) =>
          r.id === data.race_id ? { ...r, status: 'disputed' } : r
        ),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to submit dispute' };
    }
  },

  // ─── Vote on dispute ──────────────────────────────────────────────────────
  voteOnDispute: async (disputeId, userId, isValidVote) => {
    try {
      const dispute = get().disputes.find((d) => d.id === disputeId);
      if (!dispute) return;

      const currentVotes = dispute.referee_votes as { valid_votes: number; invalid_votes: number };
      const newVotes = {
        valid_votes: currentVotes.valid_votes + (isValidVote ? 1 : 0),
        invalid_votes: currentVotes.invalid_votes + (!isValidVote ? 1 : 0),
      };

      await supabase
        .from('race_disputes')
        .update({ referee_votes: newVotes })
        .eq('id', disputeId);

      // Auto-resolve if one side reaches 10 votes
      if (newVotes.valid_votes >= 10 || newVotes.invalid_votes >= 10) {
        const resolved = newVotes.valid_votes > newVotes.invalid_votes ? 'resolved' : 'dismissed';
        await supabase
          .from('race_disputes')
          .update({ status: resolved })
          .eq('id', disputeId);
      }

      set((state) => ({
        disputes: state.disputes.map((d) =>
          d.id === disputeId
            ? { ...d, referee_votes: newVotes }
            : d
        ),
      }));
    } catch (err) {
      console.error('[RaceStore] voteOnDispute error:', err);
    }
  },

  // ─── Realtime subscription ─────────────────────────────────────────────────
  subscribeToRaces: (userId) => {
    const channel = supabase
      .channel('race-hub-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'race_challenges' },
        () => {
          // Refetch on any change
          get().fetchRaces(userId);
        }
      )
      .subscribe();

    set({ _channel: channel });
  },

  unsubscribeFromRaces: () => {
    const { _channel } = get();
    if (_channel) {
      supabase.removeChannel(_channel);
      set({ _channel: null });
    }
  },
}));
