import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useConvoyRadioStore } from '../../stores/convoyRadioStore';
import { GlassCard } from '../common/GlassCard';
import { colors } from '../../config/colors';
import { Radio, Mic, MicOff, VolumeX, Navigation, Users } from 'lucide-react-native';

export const ConvoyRadioHUD: React.FC = () => {
  const { isConnected, mode, isMicMuted, isNavDuckingActive, participants, localMutes, leaveRadio, setMode, toggleMicMute, toggleParticipantMute } = useConvoyRadioStore();

  if (!isConnected) return null;

  return (
    <GlassCard style={styles.radioBar}>
      <View style={styles.topRow}>
        <View style={styles.leftInfo}>
          <Radio size={16} color={colors.primary} />
          <Text style={styles.radioTitle}>CONVOY RADIO</Text>
          {isNavDuckingActive ? (
            <View style={styles.duckingBadge}>
              <Navigation size={10} color={colors.warning} />
              <Text style={styles.duckingText}>NAV DUCKING</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity onPress={leaveRadio} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>LEAVE</Text>
        </TouchableOpacity>
      </View>

      {/* Control Modes */}
      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.modeBtn, mode === 'OPEN MIC' && styles.modeBtnActive]}
          onPress={() => setMode('OPEN MIC')}
        >
          <Text style={[styles.modeText, mode === 'OPEN MIC' && styles.modeTextActive]}>OPEN MIC</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeBtn, mode === 'PUSH TO TALK' && styles.modeBtnActive]}
          onPress={() => setMode('PUSH TO TALK')}
        >
          <Text style={[styles.modeText, mode === 'PUSH TO TALK' && styles.modeTextActive]}>PTT</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.micToggleBtn} onPress={toggleMicMute}>
          {isMicMuted ? <MicOff size={16} color={colors.warning} /> : <Mic size={16} color={colors.primary} />}
        </TouchableOpacity>
      </View>

      {/* Participants */}
      <View style={styles.participantsList}>
        {participants.map((p) => {
          const isLocallyMuted = localMutes[p.userId];

          return (
            <View key={p.userId} style={styles.participantChip}>
              <View style={[styles.speakingDot, p.isSpeaking && styles.speakingDotActive]} />
              <Text style={styles.participantName} numberOfLines={1}>{p.username}</Text>

              <TouchableOpacity onPress={() => toggleParticipantMute(p.userId)}>
                <VolumeX size={12} color={isLocallyMuted ? colors.warning : colors.textMuted} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  radioBar: { padding: 10, marginHorizontal: 12, marginVertical: 6, borderColor: colors.primary },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  leftInfo: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radioTitle: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  duckingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,204,0,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  duckingText: { color: colors.warning, fontSize: 8, fontWeight: '900' },
  leaveBtn: { backgroundColor: 'rgba(255,59,48,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  leaveText: { color: '#FF3B30', fontSize: 9, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
  modeBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  modeTextActive: { color: '#000' },
  micToggleBtn: { padding: 6, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4 },
  participantsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  participantChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  speakingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted },
  speakingDotActive: { backgroundColor: colors.primary },
  participantName: { color: colors.text, fontSize: 10, fontWeight: '800', maxWidth: 90 },
});
