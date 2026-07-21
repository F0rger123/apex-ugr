import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
import { Shield, Zap, Flame, Trophy, MapPin, Gauge, ChevronRight } from 'lucide-react-native';

export const DashboardScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();
  const { getActiveVehicle, getTotalBuildValue, fetchVehicles } = useGarageStore();
  const { races, fetchRaces } = useRaceStore();
  const { currentSpeedMph } = useTelemetryStore();
  const { meets, fetchMeets, currentLocation } = useMapStore();

  useEffect(() => {
    if (user?.id) {
      fetchVehicles(user.id);
      fetchRaces(user.id);
      if (currentLocation) {
        fetchMeets(currentLocation.latitude, currentLocation.longitude);
      } else {
        fetchMeets(34.0522, -118.2437); // Fallback
      }
    }
  }, [user?.id, currentLocation]);

  const activeVehicle = getActiveVehicle();
  const buildValue = activeVehicle ? getTotalBuildValue(activeVehicle.id) : 0;
  const activeWager = races.find((r) => r.status === 'open' || r.status === 'accepted');
  const upcomingMeet = meets[0];

  return (
    <View style={styles.container}>
      <ApexHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onNotificationPress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Status Welcome Banner */}
        <GlassCard activeGlow style={styles.welcomeBanner}>
          <View style={styles.welcomeHeader}>
            <View>
              <Text style={styles.welcomeSub}>PILOT RECORD • APEX OS</Text>
              <Text style={styles.welcomeTitle}>{user?.display_name}</Text>
            </View>
            <MatrixBadge label={user?.reputation_level || 'ROOKIE'} variant="green" />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statVal}>{user?.stats.races_won} / {user?.stats.races_entered}</Text>
              <Text style={styles.statLab}>WIN RECORD</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValGreen}>{user?.stats.top_speed_recorded} MPH</Text>
              <Text style={styles.statLab}>TOP SPEED</Text>
            </View>
            <View style={styles.statCol}>
              <Text style={styles.statValGold}>{user?.reputation_points} PTS</Text>
              <Text style={styles.statLab}>REPUTATION</Text>
            </View>
          </View>
        </GlassCard>

        {/* Primary Ride Section */}
        <SectionHeader
          title="PRIMARY RIDE & BUILD SPECS"
          actionText="GARAGE"
          onActionPress={() => navigation.navigate('Garage')}
        />
        {activeVehicle && (
          <VehicleCard
            vehicle={activeVehicle}
            totalBuildValue={buildValue}
            onPress={() => navigation.navigate('VehicleDetail', { vehicleId: activeVehicle.id })}
          />
        )}

        {/* Telemetry Quick Launch Widget */}
        <SectionHeader
          title="LIVE SENSOR TELEMETRY"
          actionText="OPEN HUD"
          onActionPress={() => navigation.navigate('Telemetry')}
        />
        <GlassCard style={styles.telemetryWidget}>
          <View style={styles.telemetryRow}>
            <SpeedometerGauge currentSpeed={currentSpeedMph} size={140} />
            <View style={styles.telemetryMeta}>
              <Text style={styles.telemetryMetaTitle}>LIVE SENSOR FEED</Text>
              <Text style={styles.telemetryMetaSub}>Device Motion & GPS Active</Text>
              <View style={styles.telemetryPills}>
                <MatrixBadge label="0-60: 2.05s" variant="green" size="sm" style={{ marginBottom: 4 }} />
                <MatrixBadge label="1/4 Mi: 8.85s" variant="gold" size="sm" />
              </View>
              <TouchableOpacity
                style={styles.telemetryBtn}
                onPress={() => navigation.navigate('Telemetry')}
              >
                <Gauge size={14} color={colors.background} />
                <Text style={styles.telemetryBtnText}>START LAUNCH RUN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Active Race Wagers */}
        <SectionHeader
          title="STAGED RACE WAGERS"
          actionText="RACE HUB"
          onActionPress={() => navigation.navigate('RaceHub')}
        />
        {activeWager ? (
          <RaceChallengeCard
            challenge={activeWager}
            onAccept={() => navigation.navigate('RaceHub')}
          />
        ) : (
          <GlassCard style={{ alignItems: 'center', padding: 20 }}>
            <Text style={{ color: colors.textMuted, fontSize: 12 }}>No active race wagers staged.</Text>
          </GlassCard>
        )}

        {/* Upcoming Car Meet */}
        {upcomingMeet && (
          <>
            <SectionHeader
              title="NEXT CAR MEET"
              actionText="CAR MEETS"
              onActionPress={() => navigation.navigate('CarMeets')}
            />
            <GlassCard onPress={() => navigation.navigate('CarMeets')}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  welcomeBanner: { marginTop: 8, marginBottom: 8 },
  welcomeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  welcomeSub: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  welcomeTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 2 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  statCol: { alignItems: 'center', flex: 1 },
  statVal: { color: colors.text, fontSize: 15, fontWeight: '900' },
  statValGreen: { color: colors.primary, fontSize: 15, fontWeight: '900' },
  statValGold: { color: colors.warning, fontSize: 15, fontWeight: '900' },
  statLab: { color: colors.textMuted, fontSize: 8, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  telemetryWidget: { padding: 8 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center' },
  telemetryMeta: { flex: 1, marginLeft: 12 },
  telemetryMetaTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  telemetryMetaSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  telemetryPills: { marginVertical: 8 },
  telemetryBtn: { backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  telemetryBtnText: { color: colors.background, fontSize: 10, fontWeight: '900', marginLeft: 4 },
  meetTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 4 },
  meetLoc: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
});
