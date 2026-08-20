// Auto-generated Supabase database types for Apex UGR
// Run `npx supabase gen types typescript --project-id YOUR_PROJECT_ID` to regenerate.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          bio: string | null;
          home_city: string;
          reputation_level: string;
          reputation_points: number;
          credits_balance: number;
          favorite_car_type: string;
          racing_specialties: string[];
          stats: Json;
          achievements: Json;
          is_verified: boolean;
          privacy_mode: 'all' | 'friends' | 'meet_only' | 'invisible';
          visibility_radius_km: number;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          year: number;
          make: string;
          model: string;
          trim: string | null;
          color: string;
          nickname: string | null;
          vin: string | null;
          engine: string;
          transmission: string;
          horsepower: number;
          torque: number;
          weight_lbs: number;
          top_speed_mph: number;
          quarter_mile_sec: number | null;
          zero_to_sixty_sec: number | null;
          drivetrain: 'AWD' | 'RWD' | 'FWD';
          fuel_type: string;
          photos: string[];
          video_url: string | null;
          sound_clip_url: string | null;
          dyno_chart_url: string | null;
          is_primary: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicles']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['vehicles']['Row']>;
      };
      vehicle_modifications: {
        Row: {
          id: string;
          vehicle_id: string;
          category: string;
          brand: string;
          part_name: string;
          price: number;
          installation_date: string | null;
          notes: string | null;
          hp_gain: number;
          torque_gain: number;
          purchase_source: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['vehicle_modifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['vehicle_modifications']['Row']>;
      };
      marketplace_products: {
        Row: {
          id: string;
          title: string;
          brand: string;
          category: string;
          price: number;
          vendor_name: string;
          image_url: string;
          description: string;
          compatible_makes: string[];
          compatible_models: string[];
          rating: number;
          reviews_count: number;
          purchase_url: string;
          in_stock: boolean;
          hp_gain: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['marketplace_products']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['marketplace_products']['Row']>;
      };
      marketplace_orders: {
        Row: {
          id: string;
          user_id: string;
          items: Json;
          total_amount: number;
          shipping_status: 'processing' | 'shipped' | 'in_transit' | 'delivered';
          tracking_number: string;
          shipping_address: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['marketplace_orders']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['marketplace_orders']['Row']>;
      };
      race_challenges: {
        Row: {
          id: string;
          challenger_id: string;
          opponent_id: string | null;
          race_type: 'Drag Race' | 'Roll Race' | 'Circuit Race' | 'Time Attack' | 'Highway Pull' | 'Custom';
          wager_credits: number;
          start_time: string;
          rules: string;
          route_name: string;
          distance_miles: number;
          status: 'open' | 'accepted' | 'in_progress' | 'finished' | 'disputed' | 'cancelled';
          winner_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['race_challenges']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['race_challenges']['Row']>;
      };
      race_disputes: {
        Row: {
          id: string;
          race_id: string;
          reporter_id: string;
          reason: string;
          video_proof_url: string | null;
          gps_log_data: Json;
          referee_votes: Json;
          status: 'under_review' | 'resolved' | 'dismissed';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['race_disputes']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['race_disputes']['Row']>;
      };
      car_meets: {
        Row: {
          id: string;
          host_id: string;
          title: string;
          description: string;
          meet_type: 'Meet' | 'Cruise' | 'Show' | 'Track Day';
          start_time: string;
          end_time: string | null;
          latitude: number;
          longitude: number;
          location_name: string;
          max_attendance: number;
          vehicle_requirements: string;
          rules: string;
          cover_image_url: string;
          attendees_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['car_meets']['Row'], 'id' | 'created_at' | 'attendees_count'>;
        Update: Partial<Database['public']['Tables']['car_meets']['Row']>;
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          post_type: 'video' | 'photo' | 'build_update' | 'meet_recap';
          media_url: string;
          video_url: string | null;
          thumbnail_url: string | null;
          caption: string;
          tags: string[];
          vehicle_id: string | null;
          likes_count: number;
          comments_count: number;
          reposts_count: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['posts']['Row'], 'id' | 'created_at' | 'likes_count' | 'comments_count' | 'reposts_count'>;
        Update: Partial<Database['public']['Tables']['posts']['Row']>;
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          comment_text: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['comments']['Row']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          media_url: string | null;
          media_type: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['messages']['Row']>;
      };
      conversations: {
        Row: {
          id: string;
          participants: string[];
          is_group: boolean;
          group_name: string | null;
          last_message: string | null;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['conversations']['Row'], 'id' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['conversations']['Row']>;
      };
      post_likes: {
        Row: {
          id: string;
          post_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['post_likes']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['follows']['Row'], 'id' | 'created_at'>;
        Update: never;
      };
      moderation_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          reported_post_id: string | null;
          reason: string;
          details: string | null;
          status: 'pending' | 'reviewed' | 'dismissed';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['moderation_reports']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['moderation_reports']['Row']>;
      };
      driver_locations: {
        Row: {
          id: string;
          user_id: string;
          latitude: number;
          longitude: number;
          speed_mph: number;
          heading: number;
          status: 'Cruising' | 'Staged for Race' | 'Parked' | 'In Telemetry Run';
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['driver_locations']['Row'], 'id'>;
        Update: Partial<Database['public']['Tables']['driver_locations']['Row']>;
      };
    };
    Functions: {
      add_credits: {
        Args: { user_id: string; amount: number };
        Returns: void;
      };
      deduct_credits: {
        Args: { user_id: string; amount: number };
        Returns: boolean;
      };
      escrow_wager: {
        Args: { challenger_id: string; opponent_id: string; amount: number; race_id: string };
        Returns: boolean;
      };
      release_wager: {
        Args: { race_id: string; winner_id: string };
        Returns: void;
      };
    };
  };
}

// ─── Convenience Row Aliases ───────────────────────────────────────────────
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserVehicle = Database['public']['Tables']['vehicles']['Row'];
export type VehicleModification = Database['public']['Tables']['vehicle_modifications']['Row'];
export type MarketplaceProduct = Database['public']['Tables']['marketplace_products']['Row'];
export type MarketplaceOrder = Database['public']['Tables']['marketplace_orders']['Row'];
export type RaceChallenge = Database['public']['Tables']['race_challenges']['Row'];
export type RaceDispute = Database['public']['Tables']['race_disputes']['Row'];
export type CarMeet = Database['public']['Tables']['car_meets']['Row'];
export type Post = Database['public']['Tables']['posts']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type DriverLocation = Database['public']['Tables']['driver_locations']['Row'];

// ─── Joined Types (with relations) ────────────────────────────────────────
export type PostWithProfile = Post & {
  user_profile: Profile;
  user_vehicle?: UserVehicle;
  user_has_liked?: boolean;
};

export type CommentWithProfile = Comment & {
  user_profile: Profile;
};

export type RaceChallengeWithProfiles = RaceChallenge & {
  challenger_profile?: Profile;
  opponent_profile?: Profile;
};

export type MessageWithSender = Message & {
  sender_profile?: Profile;
};

export type ConversationWithProfile = Conversation & {
  other_profile?: Profile;
};

export type CarMeetWithHost = CarMeet & {
  host_profile?: Profile;
};

// ─── Bounty System Types ──────────────────────────────────────────────────
export type BountyMode = 'roaming' | 'venue' | 'event';
export type BountyState = 'pending' | 'active' | 'escalating' | 'claimed' | 'escaped' | 'cancelled' | 'expired' | 'invalidated';
export type HunterParticipantStatus = 'hunting' | 'left' | 'claimed' | 'failed';

export interface BountyUserSettings {
  user_id: string;
  bounty_mode_enabled: boolean;
  notifications_enabled: boolean;
  show_public_photo: boolean;
  allow_most_wanted: boolean;
  agreement_version: string;
  agreed_at: string | null;
  cooldown_until: string | null;
  created_at: string;
  updated_at: string;
}

export interface BountyConfig {
  id: string;
  bounty_enabled: boolean;
  roaming_enabled: boolean;
  venue_enabled: boolean;
  stage_duration_seconds: Record<string, number>;
  stage_reward_gc: Record<string, number>;
  stage_reward_rep: Record<string, number>;
  claim_radius_miles: number;
  lock_duration_seconds: number;
  cooldown_minutes: number;
  broadcast_radius_miles: Record<string, number>;
  updated_at: string;
}

export interface BountySession {
  id: string;
  mode: BountyMode;
  venue_id: string | null;
  venue_name: string | null;
  target_user_id: string;
  target_vehicle_id: string;
  star_level: number; // 1..5
  status: BountyState;
  starts_at: string;
  stage_started_at: string;
  stage_ends_at: string;
  reward_gc: number;
  reward_rep: number;
  claimed_by_user_id: string | null;
  claimed_at: string | null;
  escaped_at: string | null;
  completed_at: string | null;
  escalation_history: Array<{
    star_level: number;
    reached_at: string;
    reward_gc: number;
    reward_rep: number;
  }>;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields from API
  target_username?: string;
  target_rank?: string;
  target_vehicle?: {
    year: number;
    make: string;
    model: string;
    trim?: string | null;
    color: string;
    photo_url?: string | null;
  };
  approx_distance_miles?: number;
  approx_direction?: string; // e.g. 'NW', 'SE'
  signal_strength_pct?: number; // 0..100
  is_hunter?: boolean;
  remaining_seconds?: number;
  proximity_lock_seconds?: number;
}

export interface BountyParticipant {
  session_id: string;
  user_id: string;
  active_vehicle_id: string | null;
  joined_at: string;
  left_at: string | null;
  status: HunterParticipantStatus;
  last_signal_pct: number;
  proximity_lock_seconds: number;
  lock_started_at: string | null;
}

export interface BountyUserStats {
  user_id: string;
  // Hunter Stats
  hunts_joined: number;
  successful_claims: number;
  highest_star_claimed: number;
  current_hunter_streak: number;
  best_hunter_streak: number;
  five_star_claims: number;
  hunter_gc_earned: number;
  hunter_rep_earned: number;
  // Survivor Stats
  times_selected: number;
  escapes: number;
  highest_star_survived: number;
  five_star_survivals: number;
  current_survival_streak: number;
  best_survival_streak: number;
  survivor_gc_earned: number;
  survivor_rep_earned: number;
  updated_at: string;
}

export interface BountySafeZone {
  id: string;
  user_id: string | null;
  name: string;
  latitude: number;
  longitude: number;
  radius_m: number;
  created_at: string;
}

export interface BountyHistoryItem {
  id: string;
  date: string;
  role: 'bounty' | 'hunter';
  vehicle: string; // e.g., "WHITE 2011 FORD MUSTANG"
  stars: number;
  outcome: 'claimed' | 'escaped' | 'failed';
  reward_gc: number;
  reward_rep: number;
}
