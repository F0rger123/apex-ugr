export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  bio: string | null;
  home_city: string;
  reputation_level: 'Rookie' | 'Veteran' | 'Drag Specialist' | 'Street Specialist' | 'Community Favorite' | 'Meet Organizer';
  reputation_points: number;
  credits_balance: number;
  favorite_car_type: string;
  racing_specialties: string[];
  stats: {
    races_entered: number;
    races_won: number;
    top_speed_recorded: number;
    meets_hosted: number;
  };
  achievements: Array<{
    id: string;
    name: string;
    unlocked: boolean;
  }>;
  is_verified: boolean;
  privacy_mode: 'all' | 'friends' | 'meet_only' | 'invisible';
  visibility_radius_km: number;
  avatar_url: string;
  created_at: string;
}

export interface UserVehicle {
  id: string;
  user_id: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  color: string;
  nickname?: string;
  vin?: string;
  engine: string;
  transmission: string;
  horsepower: number;
  torque: number;
  weight_lbs: number;
  top_speed_mph: number;
  quarter_mile_sec?: number;
  zero_to_sixty_sec?: number;
  drivetrain: 'AWD' | 'RWD' | 'FWD';
  fuel_type: string;
  photos: string[];
  video_url?: string;
  sound_clip_url?: string;
  dyno_chart_url?: string;
  is_primary: boolean;
  created_at: string;
}

export interface VehicleModification {
  id: string;
  vehicle_id: string;
  category: 'Intake' | 'Exhaust' | 'Headers' | 'Turbo' | 'Supercharger' | 'Tune' | 'Nitrous' | 'Suspension' | 'Wheels & Tires' | 'Brakes' | 'Lighting' | 'Interior' | 'Exterior' | 'Electronics';
  brand: string;
  part_name: string;
  price: number;
  installation_date?: string;
  notes?: string;
  hp_gain: number;
  torque_gain: number;
  purchase_source: string;
  created_at: string;
}

export interface RaceChallenge {
  id: string;
  challenger_id: string;
  opponent_id?: string;
  race_type: 'Drag Race' | 'Roll Race' | 'Circuit Race' | 'Time Attack' | 'Highway Pull' | 'Custom';
  wager_credits: number;
  start_time: string;
  rules: string;
  route_name: string;
  distance_miles: number;
  status: 'open' | 'accepted' | 'in_progress' | 'finished' | 'disputed' | 'cancelled';
  winner_id?: string;
  created_at: string;
  challenger_profile?: Profile;
  opponent_profile?: Profile;
}

export interface RaceDispute {
  id: string;
  race_id: string;
  reporter_id: string;
  reason: string;
  video_proof_url?: string;
  gps_log_data: {
    finish_time_ms: number;
    max_gps_speed: number;
    telemetry_samples?: number[];
  };
  referee_votes: {
    valid_votes: number;
    invalid_votes: number;
  };
  status: 'under_review' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface MarketplaceProduct {
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
  created_at: string;
}

export interface MarketplaceOrder {
  id: string;
  user_id: string;
  items: Array<{
    product_id: string;
    title: string;
    price: number;
    quantity: number;
  }>;
  total_amount: number;
  shipping_status: 'processing' | 'shipped' | 'in_transit' | 'delivered';
  tracking_number: string;
  shipping_address: string;
  created_at: string;
}

export interface CarMeet {
  id: string;
  host_id: string;
  title: string;
  description: string;
  meet_type: 'Meet' | 'Cruise' | 'Show' | 'Track Day';
  start_time: string;
  end_time?: string;
  latitude: number;
  longitude: number;
  location_name: string;
  max_attendance: number;
  vehicle_requirements: string;
  rules: string;
  route_waypoints?: any;
  cover_image_url: string;
  created_at: string;
  host_profile?: Profile;
  attendees_count?: number;
}

export interface Post {
  id: string;
  user_id: string;
  post_type: 'video' | 'photo' | 'build_update' | 'meet_recap';
  media_url: string;
  thumbnail_url?: string;
  caption: string;
  tags: string[];
  vehicle_id?: string;
  likes_count: number;
  comments_count: number;
  reposts_count: number;
  created_at: string;
  user_profile?: Profile;
  user_vehicle?: UserVehicle;
  user_has_liked?: boolean;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  user_profile?: Profile;
}

export interface Conversation {
  id: string;
  participants: string[];
  is_group: boolean;
  group_name?: string;
  last_message?: string;
  updated_at: string;
  other_profile?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: string;
  created_at: string;
  sender_profile?: Profile;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'challenge' | 'race_result' | 'message' | 'comment' | 'meet_invite' | 'order_update';
  target_id?: string;
  is_read: boolean;
  created_at: string;
}

export interface TelemetrySession {
  current_speed_mph: number;
  top_speed_mph: number;
  avg_speed_mph: number;
  g_force_lateral: number;
  g_force_longitudinal: number;
  zero_to_sixty_timer_sec: number;
  quarter_mile_timer_sec: number;
  distance_miles: number;
  session_duration_sec: number;
  is_active: boolean;
  speed_history: number[];
}
