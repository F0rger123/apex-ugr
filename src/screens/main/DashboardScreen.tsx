import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated, Platform } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useGarageStore } from '../../stores/garageStore';
import { useRaceStore } from '../../stores/raceStore';
import { useTelemetryStore } from '../../stores/telemetryStore';
import { useMapStore } from '../../stores/mapStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { VehicleCard } from '../../components/garage/VehicleCard';
import { SpeedometerGauge } from '../../components/telemetry/SpeedometerGauge';
import { RaceChallengeCard } from '../../components/race/RaceChallengeCard';
import { colors } from '../../config/colors';
import { Zap, Flame, Trophy, MapPin, Gauge, ChevronRight, Wifi, Activity } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { getActiveVehicle, getTotalBuildValue, fetchVehicles } = useGarageStore();
  const { races, fetchRaces } = useRaceStore();
  const { currentSpeedMph, gpsLocked, gpsAccuracy } = useTelemetryStore();
  const { meets, fetchMeets, currentLocation } = useMapStore();

  // Entrance animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  // Pulse for live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchVehicles(user.id);
      fetchRaces(user.id);
      fetchMeets(currentLocation?.latitude || 34.0522, currentLocation?.longitude || -118.2437);
    }
  }, [user?.id]);

  const activeVehicle = getActiveVehicle();
  const buildValue = activeVehicle ? getTotalBuildValue(activeVehicle.id) : 0;
  const activeWager = races.find(r => r.status === 'open' || r.status === 'accepted');
  const upcomingMeet = meets[0];

  const userStats = user?.stats as any;

  return (
    <View style={styles.container}>
      <ApexHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onNotificationPress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* ── Hero Welcome Banner with Gradient ─────────────────────────────── */}
        <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.heroBanner}>
            {/* Gradient overlay via nested views */}
            <View style={styles.heroGradientLayer1} />
            <View style={styles.heroGradientLayer2} />

            <View style={styles.heroContent}>
              <View style={styles.heroTop}>
                <View>
                  <Text style={styles.heroLabel}>PILOT RECORD · APEX OS</Text>
                  <Text style={styles.heroName}>{user?.display_name || 'PILOT'}</Text>
                </View>
                <MatrixBadge label={user?.reputation_level?.toUpperCase() || 'ROOKIE'} variant="green" />
              </View>

              {/* Live status strip */}
              <View style={styles.liveStrip}>
                <Animated.View style={[styles.liveDotContainer, { transform: [{ scale: pulseAnim }] }]}>
                  <View style={styles.liveDot} />
                </Animated.View>
                <Text style={styles.liveText}>
                  {currentLocation ? `GPS LOCKED · ${gpsAccuracy || 0}m accuracy` : 'APEX OS ONLINE'}
                </Text>
                <View style={{ flex: 1 }} />
                <Wifi size={13} color={currentLocation ? colors.primary : colors.textMuted} />
              </View>

              {/* Stats row */}
              <View style={styles.statsRow}>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>
                    {userStats?.races_won || 0} <Text style={styles.statSep}>/</Text> {userStats?.races_entered || 0}
                  </Text>
                  <Text style={styles.statLab}>WIN RECORD</Text>
                </View>
                <View style={[styles.statCol, styles.statColMid]}>
                  <Text style={styles.statValGreen}>{userStats?.top_speed_recorded || 0} <Text style={{ fontSize: 12 }}>MPH</Text></Text>
                  <Text style={styles.statLab}>TOP SPEED</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={styles.statValGold}>{user?.reputation_points || 0} <Text style={{ fontSize: 12 }}>PTS</Text></Text>
                  <Text style={styles.statLab}>REPUTATION</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Quick Nav Cards ──────────────────────────────────────────────── */}
        <View style={styles.quickNavRow}>
          {[
            { label: 'MAP', icon: <MapPin size={20} color={colors.primary} />, screen: 'Map', sub: `${0} NEARBY` },
            { label: 'SHOP', icon: <Zap size={20} color='#FFB800' />, screen: 'Marketplace', sub: 'LIVE PARTS' },
            { label: 'RACE', icon: <Flame size={20} color='#FF0055' />, screen: 'RaceHub', sub: 'WAGER NOW' },
            { label: 'RANKS', icon: <Trophy size={20} color={colors.primary} />, screen: 'Leaderboards', sub: 'GLOBAL' },
          ].map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.quickNavCard}
              onPress={() => navigation.navigate(item.screen)}
            >
              <View style={styles.quickNavIcon}>{item.icon}</View>
              <Text style={styles.quickNavLabel}>{item.label}</Text>
              <Text style={styles.quickNavSub}>{item.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Primary Ride ─────────────────────────────────────────────────── */}
        <SectionHeader
          title="PRIMARY RIDE & BUILD"
          actionText="GARAGE →"
          onActionPress={() => navigation.navigate('Garage')}
        />
        {activeVehicle ? (
          <VehicleCard
            vehicle={activeVehicle}
            totalBuildValue={buildValue}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: activeVehicle.id })}
          />
        ) : (
          <GlassCard>
            <TouchableOpacity style={styles.addVehicleCard} onPress={() => navigation.navigate('Garage')}>
              <Text style={styles.addVehicleText}>+ ADD YOUR VEHICLE TO GET STARTED</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Live Telemetry Widget ─────────────────────────────────────────── */}
        <SectionHeader
          title="LIVE SENSOR TELEMETRY"
          actionText="OPEN HUD →"
          onActionPress={() => navigation.navigate('Telemetry')}
        />
        <GlassCard style={styles.telemetryWidget} activeGlow={currentSpeedMph > 5}>
          <View style={styles.telemetryRow}>
            <SpeedometerGauge currentSpeed={currentSpeedMph} size={130} />
            <View style={styles.telemetryMeta}>
              <View style={styles.telemetryStatusRow}>
                <View style={[styles.telemetryDot, { backgroundColor: gpsLocked ? colors.primary : colors.textMuted }]} />
                <Text style={styles.telemetryLabel}>
                  {gpsLocked ? 'GPS LOCKED' : 'AWAITING GPS'}
                </Text>
              </View>
              <Text style={styles.telemetryMetaSub}>Device Motion & GPS Active</Text>
              <View style={styles.telemetryPills}>
                <MatrixBadge
                  label={`0-60: ${activeVehicle?.zero_to_sixty_sec ? activeVehicle.zero_to_sixty_sec + 's' : 'READY'}`}
                  variant="green"
                  size="sm"
                  style={{ marginBottom: 5 }}
                />
                <MatrixBadge
                  label={`1/4 Mi: ${activeVehicle?.quarter_mile_sec ? activeVehicle.quarter_mile_sec + 's' : 'READY'}`}
                  variant="gold"
                  size="sm"
                />
              </View>
              <TouchableOpacity style={styles.telemetryBtn} onPress={() => navigation.navigate('Telemetry')}>
                <Gauge size={14} color="#000000" />
                <Text style={styles.telemetryBtnText}>START LAUNCH RUN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* ── Active Race Wager ─────────────────────────────────────────────── */}
        <SectionHeader
          title="STAGED RACE WAGERS"
          actionText="RACE HUB →"
          onActionPress={() => navigation.navigate('RaceHub')}
        />
        {activeWager ? (
          <RaceChallengeCard challenge={activeWager} onAccept={() => navigation.navigate('RaceHub')} />
        ) : (
          <GlassCard>
            <TouchableOpacity style={styles.emptyWager} onPress={() => navigation.navigate('RaceHub')}>
              <Flame size={22} color={colors.textMuted} />
              <Text style={styles.emptyWagerText}>NO ACTIVE WAGERS STAGED</Text>
              <Text style={styles.emptyWagerSub}>Tap to issue a challenge →</Text>
            </TouchableOpacity>
          </GlassCard>
        )}

        {/* ── Upcoming Meet ─────────────────────────────────────────────────── */}
        {upcomingMeet && (
          <>
            <SectionHeader
              title="NEXT CAR MEET"
              actionText="ALL MEETS →"
              onActionPress={() => navigation.navigate('CarMeets')}
            />
            <GlassCard onPress={() => navigation.navigate('CarMeets')}>
              <View style={styles.meetRow}>
                <View style={styles.meetIconBox}>
                  <MapPin size={18} color="#FF0055" />
                </View>
                <View style={{ flex: 1 }}>
                  <MatrixBadge label={upcomingMeet.meet_type} variant="silver" size="sm" />
                  <Text style={styles.meetTitle}>{upcomingMeet.title}</Text>
                  <Text style={styles.meetLoc}>📍 {upcomingMeet.location_name}</Text>
                </View>
                <ChevronRight size={20} color={colors.primary} />
              </View>
            </GlassCard>
          </>
        )}

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  // Hero Banner
  heroBanner: {
    borderRadius: 20,
    overflow: 'hidden',
    marginVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.15)',
    position: 'relative',
  },
  heroGradientLayer1: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#091328',
  },
  heroGradientLayer2: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '60%',
    height: '100%',
    backgroundColor: 'rgba(0, 255, 102, 0.04)',
    borderTopLeftRadius: 100,
    borderBottomLeftRadius: 100,
  },
  heroContent: { padding: 20, zIndex: 1 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  heroLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 2, opacity: 0.8 },
  heroName: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },

  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  liveDotContainer: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  liveText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1 },

  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 14,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statColMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statVal: { color: colors.text, fontSize: 18, fontWeight: '900' },
  statSep: { color: colors.textMuted, fontSize: 16 },
  statValGreen: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  statValGold: { color: '#FFD700', fontSize: 18, fontWeight: '900' },
  statLab: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

  // Quick nav
  quickNavRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickNavCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  quickNavIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickNavLabel: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  quickNavSub: { color: colors.textMuted, fontSize: 8, fontWeight: '700', marginTop: 2, letterSpacing: 0.5 },

  // Add vehicle
  addVehicleCard: { alignItems: 'center', paddingVertical: 20 },
  addVehicleText: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  // Telemetry widget
  telemetryWidget: { padding: 12, marginBottom: 4 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  telemetryMeta: { flex: 1 },
  telemetryStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  telemetryDot: { width: 6, height: 6, borderRadius: 3 },
  telemetryLabel: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  telemetryMetaSub: { color: colors.textMuted, fontSize: 10, marginBottom: 8 },
  telemetryPills: { gap: 4, marginBottom: 10 },
  telemetryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
  },
  telemetryBtnText: { color: '#000000', fontSize: 10, fontWeight: '900' },

  // Empty wager
  emptyWager: { alignItems: 'center', paddingVertical: 16, gap: 6 },
  emptyWagerText: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  emptyWagerSub: { color: colors.textMuted, fontSize: 11 },

  // Meet card
  meetRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meetIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,0,85,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 4 },
  meetLoc: { color: colors.textSecondary, fontSize: 11, marginTop: 3 },
});
