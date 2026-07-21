import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { SpeedometerGauge } from '../../components/telemetry/SpeedometerGauge';
import { GForceMeter } from '../../components/telemetry/GForceMeter';
import { AccelerationGraph } from '../../components/telemetry/AccelerationGraph';
import { colors } from '../../config/colors';
import { Play, Square, RefreshCw, Zap, Flame, Shield, Award } from 'lucide-react-native';

export const TelemetryScreen = ({ navigation }: any) => {
  const {
    currentSpeedMph,
    topSpeedMph,
    avgSpeedMph,
    gForceLateral,
    gForceLongitudinal,
    zeroToSixtySec,
    quarterMileSec,
    distanceMiles,
    isSessionActive,
    speedHistory,
    startSession,
    stopSession,
    updateTelemetry,
    resetTelemetry,
  } = useTelemetryStore();

  // Simulate real-time speed fluctuations when session is active
  useEffect(() => {
    let interval: any;
    if (isSessionActive) {
      interval = setInterval(() => {
        const randomSpeed = Math.floor(60 + Math.random() * 85);
        const randomLat = (Math.random() * 0.8 - 0.4);
        const randomLong = (Math.random() * 1.2 - 0.2);
        updateTelemetry(randomSpeed, randomLat, randomLong);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSessionActive]);

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Telemetry Status Bar */}
        <GlassCard activeGlow={isSessionActive} style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.liveDot, isSessionActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.statusTitle}>
                {isSessionActive ? 'TELEMETRY RECORDING LIVE' : 'TELEMETRY STANDBY'}
              </Text>
            </View>

            <MatrixBadge
              label={isSessionActive ? 'GPS ACTIVE' : 'GPS LOCKED'}
              variant={isSessionActive ? 'green' : 'silver'}
            />
          </View>

          {/* Session Control Buttons */}
          <View style={styles.controlsRow}>
            {isSessionActive ? (
              <ApexButton
                title="STOP RECORDING"
                variant="danger"
                size="md"
                style={{ flex: 1 }}
                icon={<Square size={16} color={colors.danger} />}
                onPress={stopSession}
              />
            ) : (
              <ApexButton
                title="START TELEMETRY SESSION"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                icon={<Play size={16} color={colors.background} />}
                onPress={startSession}
              />
            )}
            <TouchableOpacity style={styles.resetBtn} onPress={resetTelemetry}>
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Speedometer Gauge HUD */}
        <GlassCard style={{ alignItems: 'center', paddingVertical: 20 }}>
          <SpeedometerGauge currentSpeed={currentSpeedMph} maxSpeed={240} size={250} />
        </GlassCard>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>0-60 MPH TIMER</Text>
            <Text style={styles.statValGreen}>{zeroToSixtySec}s</Text>
            <Text style={styles.statSub}>VERIFIED LAUNCH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>1/4 MILE SPRINT</Text>
            <Text style={styles.statValGreen}>{quarterMileSec}s</Text>
            <Text style={styles.statSub}>@ 142.5 MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>SESSION TOP SPEED</Text>
            <Text style={styles.statValGold}>{topSpeedMph} MPH</Text>
            <Text style={styles.statSub}>AVG {avgSpeedMph} MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>DISTANCE TRAVELED</Text>
            <Text style={styles.statVal}>{distanceMiles} MI</Text>
            <Text style={styles.statSub}>GPS VERIFIED</Text>
          </GlassCard>
        </View>

        {/* G-Force Meter & Acceleration Graph */}
        <SectionHeader title="G-FORCE & DYNAMICS" />
        <GlassCard>
          <GForceMeter gLat={gForceLateral} gLong={gForceLongitudinal} />
        </GlassCard>

        <SectionHeader title="REAL-TIME ACCELERATION LOG" />
        <AccelerationGraph data={speedHistory} />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  statusCard: { marginVertical: 8 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusLeft: { flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  dotActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowRadius: 6, shadowOpacity: 1 },
  dotInactive: { backgroundColor: colors.textMuted },
  statusTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
  controlsRow: { flexDirection: 'row', gap: 10 },
  resetBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  statCard: { width: '48%', alignItems: 'center', padding: 12 },
  statLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  statVal: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  statValGreen: { color: colors.primary, fontSize: 20, fontWeight: '900', marginTop: 4 },
  statValGold: { color: colors.warning, fontSize: 20, fontWeight: '900', marginTop: 4 },
  statSub: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 2 },
});
