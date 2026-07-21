import { create } from 'zustand';
import { supabase } from '../config/supabase';

interface TelemetryState {
  currentSpeedMph: number;
  topSpeedMph: number;
  avgSpeedMph: number;
  gForceLateral: number;
  gForceLongitudinal: number;
  zeroToSixtySec: number;
  quarterMileSec: number;
  distanceMiles: number;
  isSessionActive: boolean;
  speedHistory: number[];
  sessionDurationSec: number;
  
  startSession: () => void;
  stopSession: () => void;
  updateTelemetry: (speed: number, gLat?: number, gLong?: number) => void;
  saveSession: (userId: string, vehicleId: string, runType: 'quarter_mile' | 'zero_to_60' | 'top_speed') => Promise<void>;
  resetTelemetry: () => void;
  resetTelemetry: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  currentSpeedMph: 0,
  topSpeedMph: 0,
  avgSpeedMph: 0,
  gForceLateral: 0,
  gForceLongitudinal: 0,
  zeroToSixtySec: 0,
  quarterMileSec: 0,
  distanceMiles: 0,
  isSessionActive: false,
  speedHistory: [0],
  sessionDurationSec: 0,

  startSession: () => {
    set({
      isSessionActive: true,
      currentSpeedMph: 0,
      speedHistory: [0]
    });
  },

  stopSession: () => {
    set({ isSessionActive: false });
  },

  updateTelemetry: (speed, gLat = 0, gLong = 0) => {
    const state = get();
    const newTop = Math.max(state.topSpeedMph, speed);
    const newHistory = [...state.speedHistory.slice(-25), speed];
    const newAvg = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);

    set({
      currentSpeedMph: speed,
      topSpeedMph: newTop,
      avgSpeedMph: newAvg,
      gForceLateral: Number(gLat.toFixed(2)),
      gForceLongitudinal: Number(gLong.toFixed(2)),
      speedHistory: newHistory
    });
  },

  saveSession: async (userId, vehicleId, runType) => {
    const state = get();
    const resultValue = runType === 'quarter_mile' ? state.quarterMileSec : state.zeroToSixtySec;
    
    try {
      await supabase.rpc('save_telemetry_run', {
        p_user_id: userId,
        p_vehicle_id: vehicleId,
        p_run_type: runType,
        p_result_value: resultValue || 0,
        p_max_speed_mph: state.topSpeedMph,
        p_max_g_force: Math.max(state.gForceLateral, state.gForceLongitudinal),
        p_gps_log: { history: state.speedHistory }
      });
    } catch (err) {
      console.error('[TelemetryStore] saveSession error:', err);
    }
  },

  resetTelemetry: () => {
    set({
      currentSpeedMph: 0,
      topSpeedMph: 0,
      avgSpeedMph: 0,
      gForceLateral: 0,
      gForceLongitudinal: 0,
      distanceMiles: 0,
      speedHistory: [0],
      sessionDurationSec: 0
    });
  }
}));
