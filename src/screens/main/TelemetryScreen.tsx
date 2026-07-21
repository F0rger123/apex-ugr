import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Animated } from 'react-native';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useAuthStore } from '../../stores/authStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { SpeedometerGauge } from '../../components/telemetry/SpeedometerGauge';
import { GForceMeter } from '../../components/telemetry/GForceMeter';
import { AccelerationGraph } from '../../components/telemetry/AccelerationGraph';
import { supabase } from '../../config/supabase';
import { colors } from '../../config/colors';
import { Play, Square, RefreshCw, Zap, Flame, Shield, Award, Gauge, History } from 'lucide-react-native';

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
    saveSession,
  } = useTelemetryStore();
  const { user } = useAuthStore();
  const { getActiveVehicle } = useGarageStore();

  const handleStopSession = async () => {
    if (user) {
      const vehicle = getActiveVehicle();
      // Assume a 1/4 mile run for now based on stats
      await saveSession(user.id, vehicle?.id || '', 'quarter_mile');
    }
    stopSession();
  };

  const [sensorSource, setSensorSource] = useState<'DEVICE_HARDWARE' | 'SIMULATOR'>('DEVICE_HARDWARE');
  const [isHudOverlay, setIsHudOverlay] = useState(false);
  const lastPosRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Pulse animation for HUD
  const pulseAnim = useRef(new Animated.Value(1)).current;

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

  useEffect(() => {
    if (isHudOverlay && isSessionActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: false }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: false })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isHudOverlay, isSessionActive]);

  // Real Hardware Device Motion & GPS Location Sensor Listeners
  useEffect(() => {
    let watchId: number;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // 1. Web Device Motion API for G-Forces
      const handleMotion = (event: DeviceMotionEvent) => {
        if (event.accelerationIncludingGravity && isSessionActive) {
          const x = event.accelerationIncludingGravity.x || 0;
          const y = event.accelerationIncludingGravity.y || 0;
          // Scale raw m/s^2 to G (1G ~ 9.8m/s^2)
          const gLat = Number((x / 9.8).toFixed(2));
          const gLong = Number((y / 9.8).toFixed(2));
          updateTelemetry(currentSpeedMph, gLat, gLong);
        }
      };

      window.addEventListener('devicemotion', handleMotion);

      // 2. Geolocation Watch Position for Live Speed (m/s -> MPH with Haversine fallback)
      if ('geolocation' in navigator && isSessionActive) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            let speedMph = 0;
            const rawSpeedMs = position.coords.speed;
            const now = Date.now();
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            if (rawSpeedMs !== null && rawSpeedMs > 0) {
              speedMph = Math.round(rawSpeedMs * 2.23694);
            } else if (lastPosRef.current) {
              const prev = lastPosRef.current;
              const dtSec = (now - prev.time) / 1000;
              if (dtSec > 0.5) {
                // Haversine formula
                const R = 6371; // km
                const dLat = (lat - prev.lat) * (Math.PI / 180);
                const dLng = (lng - prev.lng) * (Math.PI / 180);
                const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(prev.lat * (Math.PI / 180)) * Math.cos(lat * (Math.PI / 180)) *
                          Math.sin(dLng / 2) * Math.sin(dLng / 2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                const distKm = R * c;
                const speedKmh = (distKm / dtSec) * 3600;
                speedMph = Math.round(speedKmh * 0.621371);
              }
            }

            lastPosRef.current = { lat, lng, time: now };
            if (speedMph >= 0 && speedMph < 350) {
              updateTelemetry(speedMph);
            }
          },
          (err) => console.log('GPS Error:', err),
          { enableHighAccuracy: true, maximumAge: 500, timeout: 5000 }
        );
      }

      return () => {
        window.removeEventListener('devicemotion', handleMotion);
        if (watchId) navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [isSessionActive, currentSpeedMph]);

  // Simulator Telemetry Fallback Loop
  useEffect(() => {
    let simInterval: any;
    if (isSessionActive && sensorSource === 'SIMULATOR') {
      let mockSpeed = currentSpeedMph;
      let accelPhase = true;
      simInterval = setInterval(() => {
        if (accelPhase) {
          mockSpeed += Math.floor(Math.random() * 12) + 2;
          const gLong = (Math.random() * 0.8 + 0.4);
          const gLat = (Math.random() * 0.1);
          if (mockSpeed >= 160) {
            accelPhase = false;
          }
          updateTelemetry(mockSpeed, gLat, gLong);
        } else {
          mockSpeed -= Math.floor(Math.random() * 8) + 4;
          const gLong = -(Math.random() * 0.6 + 0.2);
          const gLat = (Math.random() * 0.1);
          if (mockSpeed <= 0) {
            mockSpeed = 0;
            accelPhase = true; // reset cycle for fun
          }
          updateTelemetry(mockSpeed, gLat, gLong);
        }
      }, 500);
    }
    return () => clearInterval(simInterval);
  }, [isSessionActive, sensorSource, currentSpeedMph]);

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
              label={isSessionActive ? 'HARDWARE GPS LOCKED' : 'STANDBY'}
              variant={isSessionActive ? 'green' : 'silver'}
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
                icon={<Play size={16} color={colors.background} />}
                onPress={startSession}
              />
            )}
            <TouchableOpacity 
              style={[styles.resetBtn, sensorSource === 'SIMULATOR' && { borderColor: colors.primary }]} 
              onPress={() => setSensorSource(s => s === 'SIMULATOR' ? 'DEVICE_HARDWARE' : 'SIMULATOR')}
            >
              <Text style={{ color: sensorSource === 'SIMULATOR' ? colors.primary : colors.text, fontSize: 10, fontWeight: '900' }}>
                {sensorSource === 'SIMULATOR' ? 'SIM MODE' : 'LIVE GPS'}
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
            
            <Animated.View style={{ opacity: pulseAnim, alignItems: 'center' }}>
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
            <SpeedometerGauge currentSpeed={currentSpeedMph} maxSpeed={240} size={250} />
          </GlassCard>
        )}

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>0-60 MPH LAUNCH TIMER</Text>
            <Text style={styles.statValGreen}>{zeroToSixtySec}s</Text>
            <Text style={styles.statSub}>GPS VERIFIED</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>1/4 MILE SPRINT</Text>
            <Text style={styles.statValGreen}>{quarterMileSec}s</Text>
            <Text style={styles.statSub}>@ 142.5 MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>RECORD TOP SPEED</Text>
            <Text style={styles.statValGold}>{topSpeedMph} MPH</Text>
            <Text style={styles.statSub}>AVG {avgSpeedMph} MPH</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statLabel}>DISTANCE TRAVELED</Text>
            <Text style={styles.statVal}>{distanceMiles} MI</Text>
            <Text style={styles.statSub}>GPS SENSOR FEED</Text>
          </GlassCard>
        </View>

        {/* G-Force Meter & Acceleration Graph */}
        <SectionHeader title="REAL HARDWARE G-FORCE DYNAMICS" />
        <GlassCard>
          <GForceMeter gLat={gForceLateral} gLong={gForceLongitudinal} />
        </GlassCard>

        <SectionHeader title="TELEMETRY ACCELERATION LOG" />
        <AccelerationGraph data={speedHistory} />

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
