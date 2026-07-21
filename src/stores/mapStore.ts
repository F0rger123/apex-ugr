import { create } from 'zustand';
import { CarMeet } from '../types/database.types';

export interface DriverRadarMarker {
  id: string;
  username: string;
  vehicle_name: string;
  horsepower: number;
  latitude: number;
  longitude: number;
  speed_mph: number;
  avatar_url: string;
  status: 'Cruising' | 'Staged for Race' | 'Parked' | 'In Telemetry Run';
  reputation: string;
  is_friend: boolean;
}

interface MapState {
  currentLocation: { latitude: number; longitude: number };
  driversRadar: DriverRadarMarker[];
  meets: CarMeet[];
  privacyMode: 'all' | 'friends' | 'meet_only' | 'invisible';
  visibilityRadiusKm: number;

  setPrivacyMode: (mode: 'all' | 'friends' | 'meet_only' | 'invisible') => void;
  setVisibilityRadius: (radius: number) => void;
  updateLocation: (lat: number, lng: number) => void;
  addMeet: (meet: Omit<CarMeet, 'id' | 'created_at'>) => void;
}

const SAMPLE_DRIVERS: DriverRadarMarker[] = [
  {
    id: 'drv-1',
    username: 'phantom_gtr',
    vehicle_name: '2024 Nissan GT-R Nismo',
    horsepower: 1150,
    latitude: 34.0532,
    longitude: -118.2447,
    speed_mph: 74,
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    status: 'Cruising',
    reputation: 'Community Favorite',
    is_friend: true
  },
  {
    id: 'drv-2',
    username: 'apex_gt3',
    vehicle_name: '2023 Porsche 911 GT3 RS',
    horsepower: 518,
    latitude: 34.0489,
    longitude: -118.2510,
    speed_mph: 0,
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
    status: 'Staged for Race',
    reputation: 'Street Specialist',
    is_friend: true
  },
  {
    id: 'drv-3',
    username: 'boosted_2jz',
    vehicle_name: '1998 Toyota Supra 2JZ',
    horsepower: 920,
    latitude: 34.0610,
    longitude: -118.2380,
    speed_mph: 112,
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
    status: 'In Telemetry Run',
    reputation: 'Veteran',
    is_friend: false
  }
];

const SAMPLE_MEETS: CarMeet[] = [
  {
    id: 'meet-1',
    host_id: '00000000-0000-0000-0000-000000000001',
    title: 'Midnight Apex Underground Meet & Roll Sprint',
    description: 'High-horsepower gathering followed by organized highway roll runs on closed industrial corridors.',
    meet_type: 'Meet',
    start_time: 'Friday 11:00 PM',
    latitude: 34.0522,
    longitude: -118.2437,
    location_name: 'LA Industrial Warehouse Hub',
    max_attendance: 150,
    vehicle_requirements: '500+ WHP or Verified Sports Cars',
    rules: 'No burnouts in main lot. Obey pace safety marshal.',
    cover_image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    created_at: new Date().toISOString(),
    attendees_count: 84
  },
  {
    id: 'meet-2',
    host_id: '00000000-0000-0000-0000-000000000002',
    title: 'Canyons & Coffee Sunrise Cruise',
    description: 'High altitude canyon carving session through Angeles Crest Highway.',
    meet_type: 'Cruise',
    start_time: 'Sunday 6:30 AM',
    latitude: 34.2345,
    longitude: -118.1234,
    location_name: 'Angeles Crest Vista Point',
    max_attendance: 60,
    vehicle_requirements: 'All Performance Builds',
    rules: 'Single lane etiquette. Zero tailgating.',
    cover_image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop',
    created_at: new Date().toISOString(),
    attendees_count: 42
  }
];

export const useMapStore = create<MapState>((set) => ({
  currentLocation: { latitude: 34.0522, longitude: -118.2437 },
  driversRadar: SAMPLE_DRIVERS,
  meets: SAMPLE_MEETS,
  privacyMode: 'all',
  visibilityRadiusKm: 50,

  setPrivacyMode: (mode) => set({ privacyMode: mode }),
  setVisibilityRadius: (radius) => set({ visibilityRadiusKm: radius }),
  updateLocation: (latitude, longitude) => set({ currentLocation: { latitude, longitude } }),

  addMeet: (meetData) => {
    const newMeet: CarMeet = {
      ...meetData,
      id: `meet-${Date.now()}`,
      created_at: new Date().toISOString(),
      attendees_count: 1
    };
    set((state) => ({ meets: [newMeet, ...state.meets] }));
  }
}));
