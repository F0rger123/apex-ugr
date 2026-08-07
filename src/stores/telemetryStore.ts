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
  gpsAccuracy: number;
  gpsLocked: boolean;
  // Internal tracking
  _sessionStartTime: number | null;
  _zeroStartTime: number | null;
  _zeroStarted: boolean;
  _quarterStarted: boolean;
  _quarterStartTime: number | null;
  _distanceAccum: number;
  _lastLat: number | null;
  _lastLng: number | null;

  startSession: () => void;
  stopSession: () => void;
  updateTelemetry: (speed: number, gLat?: number, gLong?: number, accuracy?: number) => void;
  updateGPS: (lat: number, lng: number, speedMs: number | null, accuracy: number) => void;
  saveSession: (userId: string, vehicleId: string, runType: 'quarter_mile' | 'zero_to_60' | 'top_speed') => Promise<void>;
  resetTelemetry: () => void;
  setGPSLocked: (locked: boolean) => void;
}

const R_EARTH = 6371; // km

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R_EARTH * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  gpsAccuracy: 0,
  gpsLocked: false,
  _sessionStartTime: null,
  _zeroStartTime: null,
  _zeroStarted: false,
  _quarterStarted: false,
  _quarterStartTime: null,
  _distanceAccum: 0,
  _lastLat: null,
  _lastLng: null,

  startSession: () => {
    set({
      isSessionActive: true,
      currentSpeedMph: 0,
      topSpeedMph: 0,
      avgSpeedMph: 0,
      zeroToSixtySec: 0,
      quarterMileSec: 0,
      distanceMiles: 0,
      speedHistory: [0],
      sessionDurationSec: 0,
      _sessionStartTime: Date.now(),
      _zeroStartTime: null,
      _zeroStarted: false,
      _quarterStarted: false,
      _quarterStartTime: null,
      _distanceAccum: 0,
      _lastLat: null,
      _lastLng: null,
    });
  },

  stopSession: () => {
    set({ isSessionActive: false });
  },

  setGPSLocked: (locked: boolean) => {
    set({ gpsLocked: locked });
  },

  // Called by DeviceMotion for G-force
  updateTelemetry: (speed, gLat = 0, gLong = 0, accuracy = 0) => {
    const state = get();
    if (!state.isSessionActive) return;

    const newTop = Math.max(state.topSpeedMph, speed);
    const newHistory = [...state.speedHistory.slice(-50), speed];
    const newAvg = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);
    const elapsed = state._sessionStartTime ? Math.floor((Date.now() - state._sessionStartTime) / 1000) : 0;

    set({
      currentSpeedMph: speed,
      topSpeedMph: newTop,
      avgSpeedMph: newAvg,
      gForceLateral: Number(gLat.toFixed(2)),
      gForceLongitudinal: Number(gLong.toFixed(2)),
      speedHistory: newHistory,
      sessionDurationSec: elapsed,
      gpsAccuracy: accuracy,
    });
  },

  // Called by GPS watchPosition — handles speed, distance, 0-60, 1/4 mile
  updateGPS: (lat: number, lng: number, speedMs: number | null, accuracy: number) => {
    const state = get();
    if (!state.isSessionActive) return;

    // Compute speed in mph
    let speedMph = 0;
    if (speedMs !== null && speedMs >= 0) {
      speedMph = Math.round(speedMs * 2.23694);
    }

    // Distance accumulation via Haversine
    let distanceAccum = state._distanceAccum;
    if (state._lastLat !== null && state._lastLng !== null) {
      const distKm = haversineKm(state._lastLat, state._lastLng, lat, lng);
      if (distKm < 1) { // Sanity check: ignore GPS jumps > 1km
        distanceAccum += distKm;
      }
    }
    const distanceMiles = Number((distanceAccum * 0.621371).toFixed(3));

    // 0-60 Auto Detection
    let zeroStarted = state._zeroStarted;
    let zeroStartTime = state._zeroStartTime;
    let zeroToSixtySec = state.zeroToSixtySec;
    let quarterStarted = state._quarterStarted;
    let quarterStartTime = state._quarterStartTime;
    let quarterMileSec = state.quarterMileSec;

    if (!zeroStarted && speedMph >= 5) {
      // Just started moving — begin 0-60 timer
      zeroStarted = true;
      zeroStartTime = Date.now();
    }
    if (zeroStarted && zeroStartTime && zeroToSixtySec === 0 && speedMph >= 60) {
      zeroToSixtySec = Number(((Date.now() - zeroStartTime) / 1000).toFixed(2));
    }

    // 1/4 mile (0.25 miles)
    if (!quarterStarted && distanceMiles >= 0.01) {
      quarterStarted = true;
      quarterStartTime = Date.now();
    }
    if (quarterStarted && quarterStartTime && quarterMileSec === 0 && distanceMiles >= 0.25) {
      quarterMileSec = Number(((Date.now() - quarterStartTime) / 1000).toFixed(2));
    }

    const newTop = Math.max(state.topSpeedMph, speedMph);
    const newHistory = [...state.speedHistory.slice(-50), speedMph];
    const newAvg = Math.round(newHistory.reduce((a, b) => a + b, 0) / newHistory.length);
    const elapsed = state._sessionStartTime ? Math.floor((Date.now() - state._sessionStartTime) / 1000) : 0;

    set({
      currentSpeedMph: speedMph,
      topSpeedMph: newTop,
      avgSpeedMph: newAvg,
      speedHistory: newHistory,
      distanceMiles,
      zeroToSixtySec,
      quarterMileSec,
      sessionDurationSec: elapsed,
      gpsAccuracy: Math.round(accuracy),
      gpsLocked: accuracy < 20,
      _distanceAccum: distanceAccum,
      _lastLat: lat,
      _lastLng: lng,
      _zeroStarted: zeroStarted,
      _zeroStartTime: zeroStartTime,
      _quarterStarted: quarterStarted,
      _quarterStartTime: quarterStartTime,
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
        p_max_g_force: Math.max(Math.abs(state.gForceLateral), Math.abs(state.gForceLongitudinal)),
        p_gps_log: { history: state.speedHistory, distance_miles: state.distanceMiles }
      });
    } catch (err) {
      console.log('[TelemetryStore] saveSession:', err);
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
      zeroToSixtySec: 0,
      quarterMileSec: 0,
      speedHistory: [0],
      sessionDurationSec: 0,
      _sessionStartTime: null,
      _zeroStartTime: null,
      _zeroStarted: false,
      _quarterStarted: false,
      _quarterStartTime: null,
      _distanceAccum: 0,
      _lastLat: null,
      _lastLng: null,
    });
  },
}));
