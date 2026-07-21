import { create } from 'zustand';
import { RaceChallenge, RaceDispute } from '../types/database.types';

interface RaceState {
  races: RaceChallenge[];
  disputes: RaceDispute[];
  createChallenge: (challenge: Omit<RaceChallenge, 'id' | 'created_at' | 'status'>) => void;
  acceptChallenge: (raceId: string, opponentId: string) => void;
  declineChallenge: (raceId: string) => void;
  submitRaceResult: (raceId: string, winnerId: string) => void;
  submitDispute: (dispute: Omit<RaceDispute, 'id' | 'created_at' | 'status'>) => void;
  voteOnDispute: (disputeId: string, isValidVote: boolean) => void;
}

const INITIAL_RACES: RaceChallenge[] = [
  {
    id: 'race-1',
    challenger_id: '00000000-0000-0000-0000-000000000001',
    opponent_id: '00000000-0000-0000-0000-000000000003',
    race_type: 'Roll Race',
    wager_credits: 1000.00,
    start_time: 'Tonight, 11:30 PM',
    rules: '60 MPH Roll Start. Finish at 1/2 Mile mark. GPS logs required.',
    route_name: 'Industrial Corridor Sector 7',
    distance_miles: 0.50,
    status: 'open',
    created_at: new Date().toISOString(),
    challenger_profile: {
      id: '00000000-0000-0000-0000-000000000001',
      username: 'phantom_gtr',
      display_name: 'Ryder Vance',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Community Favorite',
      bio: null,
      home_city: 'Los Angeles, CA',
      reputation_points: 4850,
      credits_balance: 18500,
      favorite_car_type: 'JDM',
      racing_specialties: [],
      stats: { races_entered: 14, races_won: 11, top_speed_recorded: 224, meets_hosted: 5 },
      achievements: [],
      is_verified: true,
      privacy_mode: 'all',
      visibility_radius_km: 50,
      created_at: new Date().toISOString()
    }
  },
  {
    id: 'race-2',
    challenger_id: '00000000-0000-0000-0000-000000000002',
    opponent_id: '00000000-0000-0000-0000-000000000001',
    race_type: 'Time Attack',
    wager_credits: 2500.00,
    start_time: 'Saturday, 8:00 AM',
    rules: 'Best time on 4.2 mile canyon sector. Clean line required.',
    route_name: 'Angeles Crest Pass',
    distance_miles: 4.20,
    status: 'accepted',
    created_at: new Date().toISOString(),
    challenger_profile: {
      id: '00000000-0000-0000-0000-000000000002',
      username: 'apex_gt3',
      display_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Street Specialist',
      bio: null,
      home_city: 'Miami, FL',
      reputation_points: 3920,
      credits_balance: 14200,
      favorite_car_type: 'Euro',
      racing_specialties: [],
      stats: { races_entered: 10, races_won: 8, top_speed_recorded: 184, meets_hosted: 2 },
      achievements: [],
      is_verified: true,
      privacy_mode: 'all',
      visibility_radius_km: 50,
      created_at: new Date().toISOString()
    }
  }
];

const INITIAL_DISPUTES: RaceDispute[] = [
  {
    id: 'disp-1',
    race_id: 'race-historical-99',
    reporter_id: '00000000-0000-0000-0000-000000000003',
    reason: 'False launch start before green light trigger signal.',
    video_proof_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    gps_log_data: {
      finish_time_ms: 9840,
      max_gps_speed: 154.2,
      telemetry_samples: [0, 45, 98, 132, 154]
    },
    referee_votes: {
      valid_votes: 6,
      invalid_votes: 1
    },
    status: 'under_review',
    created_at: new Date().toISOString()
  }
];

export const useRaceStore = create<RaceState>((set) => ({
  races: INITIAL_RACES,
  disputes: INITIAL_DISPUTES,

  createChallenge: (challengeData) => {
    const newRace: RaceChallenge = {
      ...challengeData,
      id: `race-${Date.now()}`,
      status: 'open',
      created_at: new Date().toISOString()
    };
    set((state) => ({ races: [newRace, ...state.races] }));
  },

  acceptChallenge: (raceId, opponentId) => {
    set((state) => ({
      races: state.races.map((r) =>
        r.id === raceId ? { ...r, opponent_id: opponentId, status: 'accepted' } : r
      )
    }));
  },

  declineChallenge: (raceId) => {
    set((state) => ({
      races: state.races.map((r) =>
        r.id === raceId ? { ...r, status: 'cancelled' } : r
      )
    }));
  },

  submitRaceResult: (raceId, winnerId) => {
    set((state) => ({
      races: state.races.map((r) =>
        r.id === raceId ? { ...r, winner_id: winnerId, status: 'finished' } : r
      )
    }));
  },

  submitDispute: (disputeData) => {
    const newDispute: RaceDispute = {
      ...disputeData,
      id: `disp-${Date.now()}`,
      status: 'under_review',
      created_at: new Date().toISOString()
    };
    set((state) => ({ disputes: [newDispute, ...state.disputes] }));
  },

  voteOnDispute: (disputeId, isValidVote) => {
    set((state) => ({
      disputes: state.disputes.map((d) => {
        if (d.id === disputeId) {
          return {
            ...d,
            referee_votes: {
              valid_votes: d.referee_votes.valid_votes + (isValidVote ? 1 : 0),
              invalid_votes: d.referee_votes.invalid_votes + (!isValidVote ? 1 : 0)
            }
          };
        }
        return d;
      })
    }));
  }
}));
