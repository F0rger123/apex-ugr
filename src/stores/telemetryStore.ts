import { create } from 'zustand';

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
  resetTelemetry: () => void;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  currentSpeedMph: 0,
  topSpeedMph: 194,
  avgSpeedMph: 68.4,
  gForceLateral: 0.12,
  gForceLongitudinal: 0.08,
  zeroToSixtySec: 2.05,
  quarterMileSec: 8.85,
  distanceMiles: 48.2,
  isSessionActive: false,
  speedHistory: [0, 15, 35, 60, 85, 110, 135, 142, 120, 80, 45, 0],
  sessionDurationSec: 1420,

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
