import { create } from 'zustand';
import { UserVehicle, VehicleModification } from '../types/database.types';

interface GarageState {
  vehicles: UserVehicle[];
  modifications: VehicleModification[];
  activeVehicleId: string;
  addVehicle: (vehicle: Omit<UserVehicle, 'id' | 'created_at'>) => void;
  setPrimaryVehicle: (id: string) => void;
  addModification: (mod: Omit<VehicleModification, 'id' | 'created_at'>) => void;
  deleteModification: (id: string) => void;
  getActiveVehicle: () => UserVehicle | undefined;
  getVehicleModifications: (vehicleId: string) => VehicleModification[];
  getTotalBuildValue: (vehicleId: string) => number;
  getTotalHpGain: (vehicleId: string) => number;
}

const INITIAL_VEHICLES: UserVehicle[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    user_id: '00000000-0000-0000-0000-000000000001',
    year: 2024,
    make: 'Nissan',
    model: 'GT-R',
    trim: 'Nismo Alpha 12',
    color: 'Midnight Purple IV',
    nickname: 'GODZILLA',
    vin: 'JN1AR3EF9NW104822',
    engine: '3.8L VR38DETT Twin-Turbo',
    transmission: '6-Speed Dual Clutch ATTESA E-TS',
    horsepower: 1150,
    torque: 980,
    weight_lbs: 3860,
    top_speed_mph: 224,
    quarter_mile_sec: 8.85,
    zero_to_sixty_sec: 2.05,
    drivetrain: 'AWD',
    fuel_type: 'E85 Flex Fuel',
    photos: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop'
    ],
    video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    sound_clip_url: 'https://actions.google.com/sounds/v1/transports/sports_car_rev.ogg',
    dyno_chart_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop',
    is_primary: true,
    created_at: new Date().toISOString()
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: '00000000-0000-0000-0000-000000000001',
    year: 2023,
    make: 'Porsche',
    model: '911 GT3 RS',
    trim: 'Weissach Package',
    color: 'Lizard Green',
    nickname: 'VIREN',
    engine: '4.0L High-Rev Flat-6 NA',
    transmission: '7-Speed PDK Dual-Clutch',
    horsepower: 518,
    torque: 343,
    weight_lbs: 3197,
    top_speed_mph: 184,
    quarter_mile_sec: 10.90,
    zero_to_sixty_sec: 2.90,
    drivetrain: 'RWD',
    fuel_type: '93 Octane / E30',
    photos: [
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?q=80&w=800&auto=format&fit=crop'
    ],
    is_primary: false,
    created_at: new Date().toISOString()
  }
];

const INITIAL_MODIFICATIONS: VehicleModification[] = [
  {
    id: 'mod-1',
    vehicle_id: '11111111-1111-1111-1111-111111111111',
    category: 'Turbo',
    brand: 'AMS Performance',
    part_name: 'Alpha 12 Twin Turbocharger System',
    price: 18500.00,
    installation_date: '2025-11-12',
    notes: 'Billet wheel Garrett dual ball-bearing turbochargers rated for 1,300 HP',
    hp_gain: 350,
    torque_gain: 280,
    purchase_source: 'AMS Performance',
    created_at: new Date().toISOString()
  },
  {
    id: 'mod-2',
    vehicle_id: '11111111-1111-1111-1111-111111111111',
    category: 'Exhaust',
    brand: 'Akrapovič',
    part_name: 'Titanium Evolution Line Exhaust',
    price: 8490.00,
    installation_date: '2025-10-05',
    notes: 'Full titanium dual cat-back exhaust system with carbon fiber tips',
    hp_gain: 28,
    torque_gain: 32,
    purchase_source: 'Summit Racing',
    created_at: new Date().toISOString()
  },
  {
    id: 'mod-3',
    vehicle_id: '11111111-1111-1111-1111-111111111111',
    category: 'Tune',
    brand: 'Cobb Tuning',
    part_name: 'Accessport V3 Custom E85 Map',
    price: 1750.00,
    installation_date: '2025-11-15',
    notes: 'Custom dyno tune by Prime Motoring on E85 Flex Fuel',
    hp_gain: 120,
    torque_gain: 110,
    purchase_source: 'Cobb Tuning',
    created_at: new Date().toISOString()
  }
];

export const useGarageStore = create<GarageState>((set, get) => ({
  vehicles: INITIAL_VEHICLES,
  modifications: INITIAL_MODIFICATIONS,
  activeVehicleId: INITIAL_VEHICLES[0].id,

  addVehicle: (vehicleData) => {
    const newVehicle: UserVehicle = {
      ...vehicleData,
      id: `veh-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    set((state) => ({
      vehicles: [newVehicle, ...state.vehicles],
      activeVehicleId: newVehicle.id
    }));
  },

  setPrimaryVehicle: (id) => {
    set((state) => ({
      vehicles: state.vehicles.map((v) => ({
        ...v,
        is_primary: v.id === id
      })),
      activeVehicleId: id
    }));
  },

  addModification: (modData) => {
    const newMod: VehicleModification = {
      ...modData,
      id: `mod-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    set((state) => {
      const updatedMods = [newMod, ...state.modifications];
      // Update vehicle horsepower & torque with estimated gain
      const updatedVehicles = state.vehicles.map((v) => {
        if (v.id === modData.vehicle_id) {
          return {
            ...v,
            horsepower: v.horsepower + (modData.hp_gain || 0),
            torque: v.torque + (modData.torque_gain || 0)
          };
        }
        return v;
      });
      return {
        modifications: updatedMods,
        vehicles: updatedVehicles
      };
    });
  },

  deleteModification: (id) => {
    set((state) => ({
      modifications: state.modifications.filter((m) => m.id !== id)
    }));
  },

  getActiveVehicle: () => {
    const { vehicles, activeVehicleId } = get();
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
  },

  getVehicleModifications: (vehicleId) => {
    return get().modifications.filter((m) => m.vehicle_id === vehicleId);
  },

  getTotalBuildValue: (vehicleId) => {
    const mods = get().getVehicleModifications(vehicleId);
    return mods.reduce((sum, m) => sum + Number(m.price || 0), 0);
  },

  getTotalHpGain: (vehicleId) => {
    const mods = get().getVehicleModifications(vehicleId);
    return mods.reduce((sum, m) => sum + Number(m.hp_gain || 0), 0);
  }
}));
