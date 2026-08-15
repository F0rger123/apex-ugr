import { create } from 'zustand';
import * as Location from 'expo-location';
import { RealtimeChannel } from '@supabase/supabase-js';
import { hasLiveBackend, supabase } from '../../config/supabase';

export type LiveCoordinate = {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  altitude: number | null;
  heading: number;
  speedKph: number;
  timestamp: number;
};

export type LiveDriver = {
  id: string;
  userId: string;
  alias: string;
  avatarUrl: string | null;
  vehicle: string | null;
  latitude: number;
  longitude: number;
  heading: number;
  speedKph: number;
  driveMode: boolean;
  cruiseId: string | null;
  updatedAt: string;
  mystery: boolean;
  tier: 'Bronze' | 'Silver' | 'Master' | 'Platinum';
  record: string;
};

export type LiveEvent = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  radiusM: number;
  attendees: number;
  startTime: string;
  locationName: string;
};

export type LiveCruise = {
  id: string;
  title: string;
  status: string;
  memberCount: number;
};

type NetworkStatus = 'offline' | 'gps_required' | 'gps_locked' | 'backend_required' | 'auth_required' | 'live' | 'error';

interface LiveNetworkState {
  location: LiveCoordinate | null;
  drivers: LiveDriver[];
  events: LiveEvent[];
  cruises: LiveCruise[];
  networkStatus: NetworkStatus;
  error: string | null;
  isDriving: boolean;
  unit: 'mph' | 'kph';
  distanceKm: number;
  maxSpeedKph: number;
  startedAt: number | null;
  _watch: Location.LocationSubscription | null;
  _channel: RealtimeChannel | null;
  _userId: string | null;
  initialize: () => Promise<void>;
  lockLocation: () => Promise<void>;
  startDrive: () => Promise<void>;
  stopDrive: () => Promise<void>;
  toggleUnit: () => void;
  refreshNetwork: () => Promise<void>;
  dispose: () => void;
}

function distanceKm(a: LiveCoordinate, b: LiveCoordinate) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLng = (b.longitude - a.longitude) * rad;
  const lat1 = a.latitude * rad;
  const lat2 = b.latitude * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toCoordinate(position: Location.LocationObject): LiveCoordinate {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
    altitude: position.coords.altitude,
    heading: Math.max(0, position.coords.heading || 0),
    speedKph: Math.max(0, (position.coords.speed || 0) * 3.6),
    timestamp: position.timestamp,
  };
}

export const useLiveNetworkStore = create<LiveNetworkState>((set, get) => ({
  location: null,
  drivers: [],
  events: [],
  cruises: [],
  networkStatus: 'offline',
  error: null,
  isDriving: false,
  unit: 'mph',
  distanceKm: 0,
  maxSpeedKph: 0,
  startedAt: null,
  _watch: null,
  _channel: null,
  _userId: null,

  initialize: async () => {
    if (!hasLiveBackend) {
      set({ networkStatus: 'backend_required' });
      return;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      set({ networkStatus: 'error', error: error.message });
      return;
    }
    if (!data.session?.user.id) {
      set({ networkStatus: 'auth_required' });
      return;
    }
    set({ _userId: data.session.user.id, networkStatus: 'live' });
    await get().refreshNetwork();
    const channel = supabase
      .channel('apex-v2-live-network')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'driver_locations' }, () => get().refreshNetwork())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'car_meets' }, () => get().refreshNetwork())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cruises' }, () => get().refreshNetwork())
      .subscribe();
    set({ _channel: channel });
  },

  lockLocation: async () => {
    set({ error: null });
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      set({ networkStatus: 'gps_required', error: 'Precise location permission is required for Radar and Drive Mode.' });
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    const location = toCoordinate(position);
    set(state => ({ location, networkStatus: state._userId ? 'live' : 'gps_locked' }));
    if (get()._userId && hasLiveBackend) {
      await supabase.rpc('publish_driver_location', {
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_accuracy_m: location.accuracy,
        p_altitude_m: location.altitude,
        p_speed_kph: location.speedKph,
        p_heading: location.heading,
        p_drive_mode: false,
        p_vehicle_id: null,
        p_cruise_id: null,
      });
    }
  },

  startDrive: async () => {
    if (get().isDriving) return;
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      set({ networkStatus: 'gps_required', error: 'Drive Mode cannot start without precise location access.' });
      return;
    }
    get()._watch?.remove();
    set({ isDriving: true, distanceKm: 0, maxSpeedKph: 0, startedAt: Date.now(), error: null });
    const watch = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 1 },
      async position => {
        const next = toCoordinate(position);
        const previous = get().location;
        const segment = previous && next.accuracy !== null && next.accuracy <= 65 ? distanceKm(previous, next) : 0;
        set(state => ({
          location: next,
          distanceKm: state.distanceKm + Math.min(segment, 0.5),
          maxSpeedKph: Math.max(state.maxSpeedKph, next.speedKph),
          networkStatus: state._userId ? 'live' : 'gps_locked',
        }));
        if (get()._userId && hasLiveBackend) {
          await supabase.rpc('publish_driver_location', {
            p_latitude: next.latitude,
            p_longitude: next.longitude,
            p_accuracy_m: next.accuracy,
            p_altitude_m: next.altitude,
            p_speed_kph: next.speedKph,
            p_heading: next.heading,
            p_drive_mode: true,
            p_vehicle_id: null,
            p_cruise_id: null,
          });
        }
      }
    );
    set({ _watch: watch });
  },

  stopDrive: async () => {
    get()._watch?.remove();
    set({ _watch: null, isDriving: false });
    const location = get().location;
    if (location && get()._userId && hasLiveBackend) {
      await supabase.rpc('publish_driver_location', {
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_accuracy_m: location.accuracy,
        p_altitude_m: location.altitude,
        p_speed_kph: 0,
        p_heading: location.heading,
        p_drive_mode: false,
        p_vehicle_id: null,
        p_cruise_id: null,
      });
    }
  },

  toggleUnit: () => set(state => ({ unit: state.unit === 'mph' ? 'kph' : 'mph' })),

  refreshNetwork: async () => {
    if (!hasLiveBackend || !get()._userId) return;
    const [driverResult, eventResult, cruiseResult] = await Promise.all([
      supabase.from('driver_locations').select('*, profile:profiles!driver_locations_user_id_fkey(username,avatar_url,privacy_mode,reputation_level,stats), vehicle:vehicles!driver_locations_vehicle_id_fkey(year,make,model)').gt('expires_at', new Date().toISOString()),
      supabase.from('car_meets').select('id,title,latitude,longitude,attendees_count,start_time,location_name,event_geofences(radius_m)').or(`end_time.is.null,end_time.gte.${new Date().toISOString()}`).order('start_time'),
      supabase.from('cruises').select('id,title,status,cruise_members(count)').in('status', ['scheduled', 'live']).order('starts_at'),
    ]);
    if (driverResult.error || eventResult.error || cruiseResult.error) {
      set({ error: driverResult.error?.message || eventResult.error?.message || cruiseResult.error?.message || 'Network refresh failed' });
    }
    const drivers = (driverResult.data || []).filter((row: any) => row.user_id !== get()._userId).map((row: any): LiveDriver => ({
      id: row.id,
      userId: row.user_id,
      alias: row.profile?.username || 'UNKNOWN',
      avatarUrl: row.profile?.avatar_url || null,
      vehicle: row.vehicle ? `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}` : null,
      latitude: Number(row.latitude), longitude: Number(row.longitude), heading: Number(row.heading || 0),
      speedKph: Number(row.speed_kph || 0), driveMode: Boolean(row.drive_mode), cruiseId: row.cruise_id || null,
      updatedAt: row.updated_at, mystery: row.profile?.privacy_mode === 'meet_only',
      tier: ['Bronze', 'Silver', 'Master', 'Platinum'].includes(row.profile?.reputation_level) ? row.profile.reputation_level : 'Bronze',
      record: `${Number(row.profile?.stats?.races_won || 0)}–${Math.max(0, Number(row.profile?.stats?.races_entered || 0) - Number(row.profile?.stats?.races_won || 0))}`,
    }));
    const events = (eventResult.data || []).map((row: any): LiveEvent => ({
      id: row.id, title: row.title, latitude: Number(row.latitude), longitude: Number(row.longitude),
      radiusM: Number((Array.isArray(row.event_geofences) ? row.event_geofences[0]?.radius_m : row.event_geofences?.radius_m) || 250), attendees: Number(row.attendees_count || 0),
      startTime: row.start_time, locationName: row.location_name,
    }));
    const cruises = (cruiseResult.data || []).map((row: any): LiveCruise => ({
      id: row.id, title: row.title, status: row.status, memberCount: Number(row.cruise_members?.[0]?.count || 0),
    }));
    set({ drivers, events, cruises });
  },

  dispose: () => {
    get()._watch?.remove();
    if (get()._channel) supabase.removeChannel(get()._channel!);
    set({ _watch: null, _channel: null, isDriving: false });
  },
}));
