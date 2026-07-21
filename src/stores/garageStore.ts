import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type UserVehicle = Database['public']['Tables']['vehicles']['Row'];
type VehicleModification = Database['public']['Tables']['vehicle_modifications']['Row'];

export interface CartItem {
  product: Database['public']['Tables']['marketplace_products']['Row'];
  quantity: number;
}

interface GarageState {
  vehicles: UserVehicle[];
  modifications: VehicleModification[];
  activeVehicleId: string | null;
  isLoading: boolean;
  error: string | null;

  // Data fetching
  fetchVehicles: (userId: string) => Promise<void>;
  fetchModifications: (vehicleId: string) => Promise<void>;

  // Vehicle CRUD
  addVehicle: (vehicle: Database['public']['Tables']['vehicles']['Insert']) => Promise<{ error: string | null; id?: string }>;
  updateVehicle: (id: string, updates: Database['public']['Tables']['vehicles']['Update']) => Promise<{ error: string | null }>;
  deleteVehicle: (id: string) => Promise<{ error: string | null }>;
  setPrimaryVehicle: (vehicleId: string, userId: string) => Promise<void>;

  // Modification CRUD
  addModification: (mod: Database['public']['Tables']['vehicle_modifications']['Insert']) => Promise<{ error: string | null }>;
  deleteModification: (id: string) => Promise<{ error: string | null }>;

  // Photo management (Supabase Storage)
  uploadVehiclePhoto: (vehicleId: string, userId: string, uri: string, fileName: string) => Promise<{ url: string | null; error: string | null }>;

  // Computed helpers
  setActiveVehicle: (id: string) => void;
  getActiveVehicle: () => UserVehicle | undefined;
  getVehicleModifications: (vehicleId: string) => VehicleModification[];
  getTotalBuildValue: (vehicleId: string) => number;
  getTotalHpGain: (vehicleId: string) => number;
}

export const useGarageStore = create<GarageState>((set, get) => ({
  vehicles: [],
  modifications: [],
  activeVehicleId: null,
  isLoading: false,
  error: null,

  // ─── Fetch user's vehicles ────────────────────────────────────────────────
  fetchVehicles: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*')
        .eq('user_id', userId)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      const primary = data.find((v) => v.is_primary) || data[0];
      set({
        vehicles: data,
        activeVehicleId: primary?.id || null,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load vehicles', isLoading: false });
    }
  },

  // ─── Fetch modifications for a vehicle ────────────────────────────────────
  fetchModifications: async (vehicleId) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_modifications')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Merge with existing modifications (other vehicles' mods stay)
        const existing = get().modifications.filter((m) => m.vehicle_id !== vehicleId);
        set({ modifications: [...existing, ...data] });
      }
    } catch (err) {
      console.error('[GarageStore] fetchModifications error:', err);
    }
  },

  // ─── Add vehicle ──────────────────────────────────────────────────────────
  addVehicle: async (vehicleData) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .insert(vehicleData)
        .select()
        .single();

      if (error) {
        set({ isLoading: false });
        return { error: error.message };
      }

      set((state) => ({
        vehicles: [data, ...state.vehicles],
        activeVehicleId: data.id,
        isLoading: false,
      }));

      return { error: null, id: data.id };
    } catch (err: any) {
      set({ isLoading: false });
      return { error: err?.message || 'Failed to add vehicle' };
    }
  },

  // ─── Update vehicle ───────────────────────────────────────────────────────
  updateVehicle: async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('vehicles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) return { error: error.message };

      set((state) => ({
        vehicles: state.vehicles.map((v) => (v.id === id ? data : v)),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to update vehicle' };
    }
  },

  // ─── Delete vehicle ───────────────────────────────────────────────────────
  deleteVehicle: async (id) => {
    try {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) return { error: error.message };

      const remaining = get().vehicles.filter((v) => v.id !== id);
      set({
        vehicles: remaining,
        activeVehicleId: remaining[0]?.id || null,
      });

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to delete vehicle' };
    }
  },

  // ─── Set primary vehicle (unsets all others) ──────────────────────────────
  setPrimaryVehicle: async (vehicleId, userId) => {
    // Unset all primary flags for this user
    await supabase
      .from('vehicles')
      .update({ is_primary: false })
      .eq('user_id', userId);

    // Set the selected vehicle as primary
    await supabase
      .from('vehicles')
      .update({ is_primary: true })
      .eq('id', vehicleId);

    // Update local state
    set((state) => ({
      vehicles: state.vehicles.map((v) => ({
        ...v,
        is_primary: v.id === vehicleId,
      })),
      activeVehicleId: vehicleId,
    }));
  },

  // ─── Add modification ─────────────────────────────────────────────────────
  addModification: async (modData) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_modifications')
        .insert(modData)
        .select()
        .single();

      if (error) return { error: error.message };

      set((state) => ({
        modifications: [data, ...state.modifications],
        // Update vehicle's horsepower/torque figures
        vehicles: state.vehicles.map((v) => {
          if (v.id === modData.vehicle_id) {
            return {
              ...v,
              horsepower: v.horsepower + (modData.hp_gain || 0),
              torque: v.torque + (modData.torque_gain || 0),
            };
          }
          return v;
        }),
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to add modification' };
    }
  },

  // ─── Delete modification ──────────────────────────────────────────────────
  deleteModification: async (id) => {
    try {
      const mod = get().modifications.find((m) => m.id === id);
      const { error } = await supabase.from('vehicle_modifications').delete().eq('id', id);
      if (error) return { error: error.message };

      set((state) => ({
        modifications: state.modifications.filter((m) => m.id !== id),
        // Revert HP/torque if we know the mod's gains
        vehicles: mod
          ? state.vehicles.map((v) => {
              if (v.id === mod.vehicle_id) {
                return {
                  ...v,
                  horsepower: v.horsepower - (mod.hp_gain || 0),
                  torque: v.torque - (mod.torque_gain || 0),
                };
              }
              return v;
            })
          : state.vehicles,
      }));

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to delete modification' };
    }
  },

  // ─── Upload vehicle photo to Supabase Storage ─────────────────────────────
  uploadVehiclePhoto: async (vehicleId, userId, uri, fileName) => {
    try {
      // Fetch the file as blob
      const response = await fetch(uri);
      const blob = await response.blob();
      const filePath = `vehicles/${userId}/${vehicleId}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('vehicle-photos')
        .upload(filePath, blob, {
          contentType: blob.type || 'image/jpeg',
          upsert: false,
        });

      if (error) return { url: null, error: error.message };

      const { data: urlData } = supabase.storage
        .from('vehicle-photos')
        .getPublicUrl(filePath);

      return { url: urlData.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err?.message || 'Upload failed' };
    }
  },

  // ─── Computed helpers ─────────────────────────────────────────────────────
  setActiveVehicle: (id) => set({ activeVehicleId: id }),

  getActiveVehicle: () => {
    const { vehicles, activeVehicleId } = get();
    return vehicles.find((v) => v.id === activeVehicleId) || vehicles[0];
  },

  getVehicleModifications: (vehicleId) => {
    return get().modifications.filter((m) => m.vehicle_id === vehicleId);
  },

  getTotalBuildValue: (vehicleId) => {
    return get()
      .getVehicleModifications(vehicleId)
      .reduce((sum, m) => sum + Number(m.price || 0), 0);
  },

  getTotalHpGain: (vehicleId) => {
    return get()
      .getVehicleModifications(vehicleId)
      .reduce((sum, m) => sum + Number(m.hp_gain || 0), 0);
  },
}));
