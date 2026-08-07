import { create } from 'zustand';

export interface EcuTuneMap {
  id: string;
  name: string;
  stage: 'Stock' | 'Stage 1 (93 Octane)' | 'Stage 2 (E85 Flex)' | 'Stage 3 (Alpha Turbo)';
  hpGain: number;
  torqueGain: number;
  boostPsi: number;
  targetAfr: number;
  redlineRpm: number;
  description: string;
}

interface DynoState {
  activeTuneMap: EcuTuneMap;
  availableMaps: EcuTuneMap[];
  isSimulatingPull: boolean;
  currentRpm: number;
  currentHp: number;
  currentTorque: number;
  currentBoost: number;
  
  setActiveTuneMap: (tune: EcuTuneMap) => void;
  startDynoPull: (baseHp: number, baseTorque: number, onComplete?: () => void) => void;
  stopDynoPull: () => void;
}

const DEFAULT_MAPS: EcuTuneMap[] = [
  {
    id: 'stock',
    name: 'Factory OEM Spec',
    stage: 'Stock',
    hpGain: 0,
    torqueGain: 0,
    boostPsi: 12.5,
    targetAfr: 14.7,
    redlineRpm: 7200,
    description: 'Factory calibrated air/fuel maps for daily commuting and emission compliance.',
  },
  {
    id: 'stage1',
    name: 'Apex Stage 1 Street (93 Octane)',
    stage: 'Stage 1 (93 Octane)',
    hpGain: 65,
    torqueGain: 75,
    boostPsi: 18.0,
    targetAfr: 12.2,
    redlineRpm: 7600,
    description: 'Optimized ignition timing and increased boost pressure for 93 premium pump gas.',
  },
  {
    id: 'stage2',
    name: 'Apex Stage 2 E85 FlexFuel',
    stage: 'Stage 2 (E85 Flex)',
    hpGain: 140,
    torqueGain: 165,
    boostPsi: 24.5,
    targetAfr: 11.5,
    redlineRpm: 8000,
    description: 'High-octane corn fuel calibration providing cooler intake charge and aggressive timing.',
  },
  {
    id: 'stage3',
    name: 'Alpha 12 Race Map (E98 Fuel)',
    stage: 'Stage 3 (Alpha Turbo)',
    hpGain: 320,
    torqueGain: 290,
    boostPsi: 34.0,
    targetAfr: 11.0,
    redlineRpm: 8500,
    description: 'Unrestricted drag strip competition map with antilag launch control and max boost.',
  },
];

export const useDynoStore = create<DynoState>((set, get) => ({
  activeTuneMap: DEFAULT_MAPS[1],
  availableMaps: DEFAULT_MAPS,
  isSimulatingPull: false,
  currentRpm: 1000,
  currentHp: 0,
  currentTorque: 0,
  currentBoost: 0,

  setActiveTuneMap: (tune) => set({ activeTuneMap: tune }),

  startDynoPull: (baseHp, baseTorque, onComplete) => {
    set({ isSimulatingPull: true, currentRpm: 1000 });
    const tune = get().activeTuneMap;
    const targetHp = baseHp + tune.hpGain;
    const targetTorque = baseTorque + tune.torqueGain;
    const maxRpm = tune.redlineRpm;

    let rpm = 1000;
    const interval = setInterval(() => {
      rpm += 200;
      const progress = rpm / maxRpm;
      const hp = Math.round(targetHp * Math.sin(progress * Math.PI * 0.85));
      const torque = Math.round(targetTorque * Math.cos(progress * Math.PI * 0.5));
      const boost = Number((tune.boostPsi * Math.min(1, progress * 1.3)).toFixed(1));

      set({
        currentRpm: rpm,
        currentHp: Math.max(50, hp),
        currentTorque: Math.max(80, torque),
        currentBoost: Math.max(0, boost),
      });

      if (rpm >= maxRpm) {
        clearInterval(interval);
        set({ isSimulatingPull: false, currentRpm: 1000 });
        if (onComplete) onComplete();
      }
    }, 80);
  },

  stopDynoPull: () => {
    set({ isSimulatingPull: false, currentRpm: 1000, currentHp: 0, currentTorque: 0, currentBoost: 0 });
  },
}));
