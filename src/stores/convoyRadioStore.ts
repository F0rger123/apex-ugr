import { create } from 'zustand';

export interface RadioParticipant {
  userId: string;
  username: string;
  isSpeaking: boolean;
  isMuted: boolean;
}

interface ConvoyRadioState {
  isConnected: boolean;
  convoyId: string | null;
  mode: 'OPEN MIC' | 'PUSH TO TALK' | 'MUTED';
  isMicMuted: boolean;
  isNavDuckingActive: boolean;
  participants: RadioParticipant[];
  localMutes: Record<string, boolean>;
  joinRadio: (convoyId: string, initialParticipants?: RadioParticipant[]) => void;
  leaveRadio: () => void;
  setMode: (mode: 'OPEN MIC' | 'PUSH TO TALK' | 'MUTED') => void;
  toggleMicMute: () => void;
  toggleParticipantMute: (userId: string) => void;
  setNavDucking: (active: boolean) => void;
}

export const useConvoyRadioStore = create<ConvoyRadioState>((set, get) => ({
  isConnected: false,
  convoyId: null,
  mode: 'OPEN MIC',
  isMicMuted: false,
  isNavDuckingActive: false,
  participants: [],
  localMutes: {},

  joinRadio: (convoyId, initialParticipants = []) => {
    set({
      isConnected: true,
      convoyId,
      participants: initialParticipants.length > 0 ? initialParticipants : [
        { userId: 'pilot-1', username: 'APEX_GHOST', isSpeaking: true, isMuted: false },
        { userId: 'pilot-2', username: 'NIGHTSHIFT_99', isSpeaking: false, isMuted: false },
      ],
    });
  },

  leaveRadio: () => {
    set({
      isConnected: false,
      convoyId: null,
      participants: [],
    });
  },

  setMode: (mode) => {
    set({ mode, isMicMuted: mode === 'MUTED' });
  },

  toggleMicMute: () => {
    set((state) => ({ isMicMuted: !state.isMicMuted }));
  },

  toggleParticipantMute: (userId) => {
    set((state) => ({
      localMutes: {
        ...state.localMutes,
        [userId]: !state.localMutes[userId],
      },
    }));
  },

  setNavDucking: (active) => {
    set({ isNavDuckingActive: active });
  },
}));
