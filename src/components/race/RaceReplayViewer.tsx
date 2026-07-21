import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Rect, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';
import { Play, Pause, RefreshCw, Flag } from 'lucide-react-native';

interface RaceReplayViewerProps {
  challengerName?: string;
  opponentName?: string;
  challengerFinishMs?: number;
  opponentFinishMs?: number;
}

export const RaceReplayViewer: React.FC<RaceReplayViewerProps> = ({
  challengerName = 'Ryder Vance (GT-R)',
  opponentName = 'Elena Rostova (GT3 RS)',
  challengerFinishMs = 8850,
  opponentFinishMs = 10420,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 1) {
            setIsPlaying(false);
            return 1;
          }
          return prev + 0.02;
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const resetReplay = () => {
    setProgress(0);
    setIsPlaying(false);
  };

  const trackWidth = 280;
  const startX = 20;
  const finishX = 260;
  const distance = finishX - startX;

  // Car 1 (Challenger - Faster)
  const car1X = startX + Math.min(1, progress * (10000 / challengerFinishMs)) * distance;
  // Car 2 (Opponent - Slower)
  const car2X = startX + Math.min(1, progress * (10000 / opponentFinishMs)) * distance;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GPS TELEMETRY REPLAY</Text>
        <Text style={styles.subText}>0.25 MILE SPRINT FINISH LOG</Text>
      </View>

      {/* Track Canvas */}
      <View style={styles.trackCanvas}>
        <Svg width={300} height={100}>
          {/* Lane Dividers */}
          <Line x1={startX} y1={25} x2={finishX} y2={25} stroke="rgba(255,255,255,0.1)" strokeDasharray="6 6" />
          <Line x1={startX} y1={50} x2={finishX} y2={50} stroke={colors.primary} strokeWidth={1.5} />
          <Line x1={startX} y1={75} x2={finishX} y2={75} stroke="rgba(255,255,255,0.1)" strokeDasharray="6 6" />

          {/* Start Line */}
          <Line x1={startX} y1={10} x2={startX} y2={90} stroke={colors.warning} strokeWidth={2} />

          {/* Finish Line */}
          <Line x1={finishX} y1={10} x2={finishX} y2={90} stroke={colors.primary} strokeWidth={3} />

          {/* Car 1 Marker (Challenger) */}
          <Rect x={car1X - 12} y={15} width={24} height={12} rx={3} fill={colors.primary} />

          {/* Car 2 Marker (Opponent) */}
          <Rect x={car2X - 12} y={65} width={24} height={12} rx={3} fill={colors.warning} />
        </Svg>
      </View>

      {/* Driver Labels & Times */}
      <View style={styles.racersMetaRow}>
        <View style={styles.racerMeta}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <Text style={styles.racerName}>{challengerName}: </Text>
          <Text style={styles.racerTime}>{(challengerFinishMs / 1000).toFixed(2)}s</Text>
        </View>

        <View style={styles.racerMeta}>
          <View style={[styles.dot, { backgroundColor: colors.warning }]} />
          <Text style={styles.racerName}>{opponentName}: </Text>
          <Text style={styles.racerTime}>{(opponentFinishMs / 1000).toFixed(2)}s</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsRow}>
        <TouchableOpacity style={styles.playBtn} onPress={() => setIsPlaying(!isPlaying)}>
          {isPlaying ? <Pause size={14} color={colors.background} /> : <Play size={14} color={colors.background} />}
          <Text style={styles.playText}>{isPlaying ? 'PAUSE' : 'PLAY REPLAY'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={resetReplay}>
          <RefreshCw size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.cardBorder, marginVertical: 8 },
  header: { marginBottom: 8 },
  title: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  subText: { color: colors.textMuted, fontSize: 9, fontWeight: '700' },
  trackCanvas: { height: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: '#070A0F', borderRadius: 8, marginVertical: 6 },
  racersMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 6 },
  racerMeta: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  racerName: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  racerTime: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  controlsRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  playBtn: { flex: 1, backgroundColor: colors.primary, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  playText: { color: colors.background, fontSize: 10, fontWeight: '900', marginLeft: 4 },
  resetBtn: { padding: 6, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
});
