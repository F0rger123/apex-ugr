import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

type DriverLocation = Database['public']['Tables']['driver_locations']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type CarMeet = Database['public']['Tables']['car_meets']['Row'];

export type DriverRadarMarker = DriverLocation & {
  profile?: Profile;
};

export type CarMeetWithHost = CarMeet & {
  host_profile?: Profile;
};

interface MapState {
  currentLocation: { latitude: number; longitude: number } | null;
  driversNearby: DriverRadarMarker[];
  meets: CarMeetWithHost[];
  privacyMode: 'all' | 'friends' | 'meet_only' | 'invisible';
  visibilityRadiusKm: number;
  isLoading: boolean;
  error: string | null;
  _channel: RealtimeChannel | null;
  _locationWatchId: number | null;

  // Location
  startLocationTracking: (userId: string) => void;
  stopLocationTracking: () => void;
  updateLocationInDB: (userId: string, lat: number, lng: number, speedMph: number, status: DriverLocation['status']) => Promise<void>;

  // Radar
  fetchNearbyDrivers: (lat: number, lng: number, radiusKm: number) => Promise<void>;
  subscribeToDriverLocations: () => void;
  unsubscribeFromDriverLocations: () => void;

  // Meets
  fetchMeets: (lat: number, lng: number) => Promise<void>;
  createMeet: (data: Omit<Database['public']['Tables']['car_meets']['Insert'], 'host_id'>, hostId: string) => Promise<{ error: string | null }>;
  joinMeet: (meetId: string, userId: string) => Promise<void>;

  // Privacy
  setPrivacyMode: (mode: 'all' | 'friends' | 'meet_only' | 'invisible', userId: string) => Promise<void>;
  setVisibilityRadius: (radius: number, userId: string) => Promise<void>;
}

// Haversine distance calculation (in km)
const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const useMapStore = create<MapState>((set, get) => ({
  currentLocation: null,
  driversNearby: [],
  meets: [],
  privacyMode: 'all',
  visibilityRadiusKm: 50,
  isLoading: false,
  error: null,
  _channel: null,
  _locationWatchId: null,

  // ─── Start GPS tracking ───────────────────────────────────────────────────
  startLocationTracking: (userId) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      console.warn('[MapStore] Geolocation not available on this platform.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, speed } = position.coords;
        const speedMph = speed ? Math.round(speed * 2.23694) : 0;

        set({ currentLocation: { latitude, longitude } });

        // Determine status from speed
        let status: DriverLocation['status'] = 'Parked';
        if (speedMph > 5) status = 'Cruising';
        if (speedMph > 60) status = 'In Telemetry Run';

        await get().updateLocationInDB(userId, latitude, longitude, speedMph, status);
        await get().fetchNearbyDrivers(latitude, longitude, get().visibilityRadiusKm);
      },
      (err) => console.error('[MapStore] GPS error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    set({ _locationWatchId: watchId });
  },

  // ─── Stop GPS tracking ────────────────────────────────────────────────────
  stopLocationTracking: () => {
    const { _locationWatchId } = get();
    if (_locationWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(_locationWatchId);
      set({ _locationWatchId: null });
    }
  },

  // ─── Update location in Supabase ──────────────────────────────────────────
  updateLocationInDB: async (userId, latitude, longitude, speedMph, status) => {
    const { privacyMode } = get();
    if (privacyMode === 'invisible') return; // Don't broadcast when invisible

    await supabase
      .from('driver_locations')
      .upsert(
        {
          user_id: userId,
          latitude,
          longitude,
          speed_mph: speedMph,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
  },

  // ─── Fetch nearby drivers ─────────────────────────────────────────────────
  fetchNearbyDrivers: async (lat, lng, radiusKm) => {
    try {
      // Fetch all driver locations updated in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('driver_locations')
        .select('*, profile:profiles!driver_locations_user_id_fkey(*)')
        .gte('updated_at', tenMinutesAgo);

      if (error || !data) return;

      // Client-side haversine filter (Supabase doesn't have PostGIS enabled by default)
      const nearby = (data as any[]).filter((driver) => {
        const dist = haversineDistance(lat, lng, driver.latitude, driver.longitude);
        // Also respect the driver's own privacy mode
        if (driver.profile?.privacy_mode === 'invisible') return false;
        return dist <= radiusKm;
      });

      set({ driversNearby: nearby as DriverRadarMarker[] });
    } catch (err) {
      console.error('[MapStore] fetchNearbyDrivers error:', err);
    }
  },

  // ─── Realtime driver location subscription ────────────────────────────────
  subscribeToDriverLocations: () => {
    const channel = supabase
      .channel('driver-locations-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations' },
        async () => {
          // Refetch nearby drivers on any location change
          const { currentLocation, visibilityRadiusKm } = get();
          if (currentLocation) {
            await get().fetchNearbyDrivers(
              currentLocation.latitude,
              currentLocation.longitude,
              visibilityRadiusKm
            );
          }
        }
      )
      .subscribe();

    set({ _channel: channel });
  },

  unsubscribeFromDriverLocations: () => {
    const { _channel } = get();
    if (_channel) {
      supabase.removeChannel(_channel);
      set({ _channel: null });
    }
  },

  // ─── Fetch nearby meets ───────────────────────────────────────────────────
  fetchMeets: async (lat, lng) => {
    set({ isLoading: true });
    try {
      // Fetch future meets only
      const { data, error } = await supabase
        .from('car_meets')
        .select('*, host_profile:profiles!car_meets_host_id_fkey(*)')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(20);

      if (error) {
        set({ isLoading: false });
        return;
      }

      // Filter by ~100km radius
      const nearby = (data || []).filter((meet) => {
        const dist = haversineDistance(lat, lng, meet.latitude, meet.longitude);
        return dist <= 100;
      });

      set({ meets: nearby as CarMeetWithHost[], isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load meets', isLoading: false });
    }
  },

  // ─── Create car meet ──────────────────────────────────────────────────────
  createMeet: async (data, hostId) => {
    try {
      const { data: meet, error } = await supabase
        .from('car_meets')
        .insert({ ...data, host_id: hostId, attendees_count: 1 })
        .select('*, host_profile:profiles!car_meets_host_id_fkey(*)')
        .single();

      if (error) return { error: error.message };

      set((state) => ({
        meets: [meet as CarMeetWithHost, ...state.meets],
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to create meet' };
    }
  },

  // ─── Join a meet (increment attendees count) ──────────────────────────────
  joinMeet: async (meetId, userId) => {
    await supabase.rpc('join_car_meet', { p_meet_id: meetId, p_user_id: userId });
    set((state) => ({
      meets: state.meets.map((m) =>
        m.id === meetId ? { ...m, attendees_count: m.attendees_count + 1 } : m
      ),
    }));
  },

  // ─── Privacy mode ─────────────────────────────────────────────────────────
  setPrivacyMode: async (mode, userId) => {
    set({ privacyMode: mode });

    // Update profile in Supabase
    await supabase.from('profiles').update({ privacy_mode: mode }).eq('id', userId);

    // If going invisible, remove from driver_locations
    if (mode === 'invisible') {
      await supabase.from('driver_locations').delete().eq('user_id', userId);
      set({ driversNearby: [] });
    }
  },

  setVisibilityRadius: async (radius, userId) => {
    set({ visibilityRadiusKm: radius });
    await supabase.from('profiles').update({ visibility_radius_km: radius }).eq('id', userId);
  },
}));
