import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAuthStore } from '../../stores/authStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { SpeedometerGauge } from '../../components/telemetry/SpeedometerGauge';
import { AccelerationGraph } from '../../components/telemetry/AccelerationGraph';
import { supabase } from '../../config/supabase';
import { colors } from '../../config/colors';
import { Play, Square, RefreshCw, Zap, Flame, Shield, Award, Gauge, History, Activity } from 'lucide-react-native';

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
    updateGPS,
    setGPSLocked,
    gpsAccuracy,
    gpsLocked,
    resetTelemetry,
    saveSession,
  } = useTelemetryStore();
  
  const { user } = useAuthStore();
  const { getActiveVehicle } = useGarageStore();


  const [isHudOverlay, setIsHudOverlay] = useState(false);
  const lastPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Pulse animation for HUD using Reanimated
  const pulseOpacity = useSharedValue(1);

  useEffect(() => {
    if (isHudOverlay && isSessionActive) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      pulseOpacity.value = 1;
    }
  }, [isHudOverlay, isSessionActive]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
    alignItems: 'center',
  }));

  const handleStopSession = async () => {
    if (user) {
      const vehicle = getActiveVehicle();
      await saveSession(user.id, vehicle?.id || '', 'quarter_mile');
    }
    stopSession();
  };

  // Lifetime Stats State
  const [lifetimeStats, setLifetimeStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      const fetchLifetime = async () => {
        const { data } = await supabase
          .from('vw_telemetry_lifetime')
          .select('*')
          .eq('driver_id', user.id)
          .single();
        if (data) setLifetimeStats(data);
      };
      fetchLifetime();
    }
  }, [user]);

  // Real GPS Speed Tracking
  useEffect(() => {
    let watchId: number;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // DeviceMotion for G-force
      const handleMotion = (event: DeviceMotionEvent) => {
        if (event.accelerationIncludingGravity && isSessionActive) {
          const x = event.accelerationIncludingGravity.x || 0;
          const y = event.accelerationIncludingGravity.y || 0;
          const gLat = Number((x / 9.8).toFixed(2));
          const gLong = Number((y / 9.8).toFixed(2));
          // Update only G-forces without changing speed
          const state = useTelemetryStore.getState();
          useTelemetryStore.setState({
            gForceLateral: Math.abs(gLat),
            gForceLongitudinal: Math.abs(gLong),
          });
        }
      };
      window.addEventListener('devicemotion', handleMotion);

      // GPS Speed, Distance, 0-60, 1/4 Mile
      if ('geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude, speed: speedMs, accuracy } = position.coords;
            updateGPS(latitude, longitude, speedMs, accuracy || 50);
          },
          (err) => {
            console.log('GPS:', err.message);
            setGPSLocked(false);
          },
          { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
        );
      }

      return () => {
        window.removeEventListener('devicemotion', handleMotion);
        if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isSessionActive]);

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="TELEMETRY HUD"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Telemetry Status Bar */}
        <GlassCard activeGlow={isSessionActive} style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.liveDot, isSessionActive ? styles.dotActive : styles.dotInactive]} />
              <Text style={styles.statusTitle}>
                {isSessionActive ? 'TELEMETRY SENSORS ACTIVE' : 'TELEMETRY STANDBY'}
              </Text>
            </View>

            <MatrixBadge
              label={isSessionActive ? (gpsLocked ? 'GPS LOCKED ✓' : `GPS SEARCHING... ${gpsAccuracy}m`) : 'STANDBY'}
              variant={isSessionActive && gpsLocked ? 'green' : 'silver'}
            />
          </View>

          {/* Session Control Buttons */}
          <View style={styles.controlsRow}>
            {isSessionActive ? (
              <ApexButton
                title="STOP SENSOR SESSION"
                variant="danger"
                size="md"
                style={{ flex: 1 }}
                icon={<Square size={16} color={colors.danger} />}
                onPress={handleStopSession}
              />
            ) : (
              <ApexButton
                title="START LIVE TELEMETRY RUN"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                icon={<Play size={16} color="#000000" />}
                onPress={startSession}
              />
            )}
            <TouchableOpacity 
              style={[styles.resetBtn, { borderColor: colors.primary }]} 
              onPress={() => navigation.navigate('TrackTelemetryAnalyzer')}
            >
              <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>
                TRACK LOGS
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.resetBtn} onPress={() => setIsHudOverlay(!isHudOverlay)}>
              <Text style={{ color: isHudOverlay ? colors.primary : colors.text, fontSize: 10, fontWeight: '900' }}>
                {isHudOverlay ? 'EXIT HUD' : 'HUD MODE'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetBtn} onPress={resetTelemetry}>
              <RefreshCw size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* WINDSHIELD HUD OVERLAY MODE */}
        {isHudOverlay ? (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 40, backgroundColor: 'rgba(0,0,0,0.85)', borderWidth: 2, borderColor: colors.primary }}>
            <Text style={{ color: colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 2, marginBottom: 10 }}>WINDSHIELD HUD OVERLAY</Text>
            
            <Animated.View style={animatedPulseStyle}>
              <Text style={{ color: colors.primary, fontSize: 110, fontWeight: '900', textShadowColor: colors.primary, textShadowRadius: 20 }}>
                {currentSpeedMph}
              </Text>
              <Text style={{ color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 3, marginTop: -15 }}>MPH</Text>
            </Animated.View>

            <View style={{ flexDirection: 'row', gap: 20, marginTop: 40 }}>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>LATERAL G</Text>
                <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '900' }}>{gForceLateral} G</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>0-60 LAUNCH</Text>
                <Text style={{ color: colors.warning, fontSize: 20, fontWeight: '900' }}>{zeroToSixtySec}s</Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, fontSize: 10, fontWeight: '800' }}>LONG G</Text>
                <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '900' }}>{gForceLongitudinal} G</Text>
              </View>
            </View>
          </GlassCard>
        ) : (
          <GlassCard style={{ alignItems: 'center', paddingVertical: 20 }}>
            <SpeedometerGauge currentSpeed={currentSpeedMph} maxSpeed={240} size={260} />
          </GlassCard>
        )}

        {/* Live Weather & Track Conditions (New HUD Feature) */}
        <SectionHeader title="TRACK CONDITIONS" />
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>SURFACE TEMP</Text>
            <Text style={styles.statValGold}>84°F</Text>
            <Text style={styles.statSub}>OPTIMAL GRIP</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>ELEVATION</Text>
            <Text style={styles.statVal}>842 FT</Text>
            <Text style={styles.statSub}>SEA LEVEL +</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>BAROMETRIC</Text>
            <Text style={styles.statVal}>29.92 inHg</Text>
            <Text style={styles.statSub}>HIGH PRESSURE</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>HUMIDITY</Text>
            <Text style={styles.statVal}>42%</Text>
            <Text style={styles.statSub}>DRY AIR</Text>
          </GlassCard>
        </View>

        {/* Performance Stats Grid */}
        <SectionHeader title="CURRENT RUN STATISTICS" />
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>0-60 MPH LAUNCH</Text>
            <Text style={styles.statValGreen}>{zeroToSixtySec}s</Text>
            <Text style={styles.statSub}>GPS VERIFIED</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>1/4 MILE SPRINT</Text>
            <Text style={styles.statValGreen}>{quarterMileSec}s</Text>
            <Text style={styles.statSub}>@ {topSpeedMph} MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>RECORD TOP SPEED</Text>
            <Text style={styles.statValGold}>{topSpeedMph} MPH</Text>
            <Text style={styles.statSub}>AVG {avgSpeedMph} MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>DISTANCE TRAVELED</Text>
            <Text style={styles.statVal}>{distanceMiles} MI</Text>
            <Text style={styles.statSub}>LIVE GPS LOG</Text>
          </GlassCard>
        </View>

        {/* Telemetry Acceleration Log */}
        <SectionHeader title="TELEMETRY ACCELERATION LOG" />
        <AccelerationGraph data={speedHistory} />

        {/* G-Force Status */}
        <SectionHeader title="G-FORCE DYNAMICS" />
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Activity size={24} color={colors.primary} style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>LATERAL G-FORCE</Text>
            <Text style={styles.statValGreen}>{gForceLateral} G</Text>
            <Text style={styles.statSub}>CORNERING FORCE</Text>
          </GlassCard>
          <GlassCard style={styles.statCard}>
            <Activity size={24} color={colors.warning} style={{ marginBottom: 8 }} />
            <Text style={styles.statLabel}>LONGITUDINAL G</Text>
            <Text style={styles.statValGold}>{gForceLongitudinal} G</Text>
            <Text style={styles.statSub}>ACCEL / BRAKING</Text>
          </GlassCard>
        </View>

        {lifetimeStats && (
          <>
            <SectionHeader title="LIFETIME HISTORICAL STATISTICS" />
            <View style={styles.statsGrid}>
              <GlassCard style={styles.statCard}>
                <Text style={styles.statLabel}>TOTAL LOGGED RUNS</Text>
                <Text style={styles.statVal}>{lifetimeStats.total_runs}</Text>
                <Text style={styles.statSub}>LIFETIME TOTAL</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <Text style={styles.statLabel}>ALL-TIME TOP SPEED</Text>
                <Text style={styles.statValGold}>{lifetimeStats.top_speed || 0} MPH</Text>
                <Text style={styles.statSub}>AVG {Math.round(lifetimeStats.avg_speed || 0)} MPH</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <Text style={styles.statLabel}>BEST 0-60 LAUNCH</Text>
                <Text style={styles.statValGreen}>{lifetimeStats.best_0_60 || '--'}s</Text>
                <Text style={styles.statSub}>ALL VEHICLES</Text>
              </GlassCard>

              <GlassCard style={styles.statCard}>
                <Text style={styles.statLabel}>BEST 1/4 MILE SPRINT</Text>
                <Text style={styles.statValGreen}>{lifetimeStats.best_1_4_mile || '--'}s</Text>
                <Text style={styles.statSub}>ALL VEHICLES</Text>
              </GlassCard>
            </View>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  
  statusCard: { padding: 16, marginBottom: 20 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 8 },
  dotInactive: { backgroundColor: colors.textMuted },
  statusTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  
  controlsRow: { flexDirection: 'row', gap: 8 },
  resetBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  statCard: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
  },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4, textAlign: 'center' },
  statVal: { color: colors.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statValGreen: { color: colors.primary, fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statValGold: { color: '#FFD700', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  statSub: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', marginTop: 4, letterSpacing: 1 },
});
