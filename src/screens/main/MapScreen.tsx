import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useMapStore, DriverRadarMarker } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Navigation, Shield, Eye, EyeOff, MapPin, Users, Gauge, ChevronRight } from 'lucide-react-native';

export const MapScreen = ({ navigation }: any) => {
  const { driversRadar, meets, privacyMode, setPrivacyMode, visibilityRadiusKm } = useMapStore();
  const { user } = useAuthStore();
  const [selectedDriver, setSelectedDriver] = useState<DriverRadarMarker | null>(driversRadar[0]);

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      {/* Simulated High-Tech Radar Map Display Box */}
      <View style={styles.mapCanvasContainer}>
        {/* Radar Map Grid Background */}
        <View style={styles.radarGridBackground}>
          {/* Radar Circles */}
          <View style={[styles.radarCircle, { width: 100, height: 100, borderRadius: 50 }]} />
          <View style={[styles.radarCircle, { width: 200, height: 200, borderRadius: 100 }]} />
          <View style={[styles.radarCircle, { width: 300, height: 300, borderRadius: 150 }]} />
          <View style={styles.radarCrosshairH} />
          <View style={styles.radarCrosshairV} />

          {/* User Marker */}
          <View style={styles.userMarkerCenter}>
            <View style={styles.userMarkerPulse} />
            <Text style={styles.userMarkerText}>YOU (1,150 WHP)</Text>
          </View>

          {/* Driver Radar Pins */}
          {driversRadar.map((driver, idx) => {
            const offsets = [
              { top: 50, left: 60 },
              { top: 180, right: 40 },
              { bottom: 40, left: 120 },
            ];
            const pos = offsets[idx % offsets.length];

            return (
              <TouchableOpacity
                key={driver.id}
                style={[styles.driverPin, pos, selectedDriver?.id === driver.id && styles.driverPinSelected]}
                onPress={() => setSelectedDriver(driver)}
              >
                <Image source={{ uri: driver.avatar_url }} style={styles.pinAvatar} />
                <View style={styles.pinLabel}>
                  <Text style={styles.pinUsername}>{driver.username}</Text>
                  <Text style={styles.pinSpeed}>{driver.speed_mph} MPH</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Top Control Bar */}
        <View style={styles.topControlBar}>
          <View style={styles.privacyPill}>
            <Shield size={12} color={colors.primary} />
            <Text style={styles.privacyText}>RADAR: {privacyMode.toUpperCase()}</Text>
          </View>
          <MatrixBadge label={`RADIUS: ${visibilityRadiusKm} KM`} variant="silver" size="sm" />
        </View>

        {/* Selected Driver Popup Drawer */}
        {selectedDriver && (
          <GlassCard activeGlow style={styles.driverDrawer}>
            <View style={styles.drawerHeader}>
              <Image source={{ uri: selectedDriver.avatar_url }} style={styles.drawerAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.drawerName}>{selectedDriver.username}</Text>
                <Text style={styles.drawerVehicle}>{selectedDriver.vehicle_name}</Text>
                <Text style={styles.drawerRep}>{selectedDriver.reputation} • {selectedDriver.horsepower} WHP</Text>
              </View>
              <MatrixBadge label={selectedDriver.status} variant="green" size="sm" />
            </View>

            <View style={styles.drawerActions}>
              <ApexButton
                title="CHALLENGE RACER"
                variant="primary"
                size="sm"
                style={{ flex: 1 }}
                onPress={() => navigation.navigate('CreateChallenge')}
              />
              <ApexButton
                title="DIRECT MESSAGE"
                variant="secondary"
                size="sm"
                style={{ flex: 1, marginLeft: 8 }}
                onPress={() => navigation.navigate('Messages')}
              />
            </View>
          </GlassCard>
        )}
      </View>

      {/* Nearby Meets & Driver List Scroll */}
      <ScrollView style={styles.content}>
        <SectionHeader title="PRIVACY & RADAR CONTROLS" />
        <GlassCard>
          <Text style={styles.controlSub}>VISIBILITY PREFERENCE</Text>
          <View style={styles.privacyModesRow}>
            {(['all', 'friends', 'meet_only', 'invisible'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.privacyBtn, privacyMode === mode && styles.privacyBtnActive]}
                onPress={() => setPrivacyMode(mode)}
              >
                <Text style={[styles.privacyBtnText, privacyMode === mode && { color: colors.background }]}>
                  {mode.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        <SectionHeader title="NEARBY DRIVERS IN RANGE" />
        {driversRadar.map((d) => (
          <GlassCard key={d.id} onPress={() => setSelectedDriver(d)}>
            <View style={styles.driverListRow}>
              <Image source={{ uri: d.avatar_url }} style={styles.listAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listUsername}>{d.username}</Text>
                <Text style={styles.listVehicle}>{d.vehicle_name} ({d.horsepower} WHP)</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.listSpeed}>{d.speed_mph} MPH</Text>
                <MatrixBadge label={d.status} variant="green" size="sm" />
              </View>
            </View>
          </GlassCard>
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  mapCanvasContainer: { height: 320, width: '100%', backgroundColor: '#070A0F', overflow: 'hidden' },
  radarGridBackground: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  radarCircle: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(0, 255, 102, 0.15)' },
  radarCrosshairH: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(0, 255, 102, 0.1)' },
  radarCrosshairV: { position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(0, 255, 102, 0.1)' },
  userMarkerCenter: { alignItems: 'center', justifyContent: 'center' },
  userMarkerPulse: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 3, borderColor: colors.background },
  userMarkerText: { color: colors.primary, fontSize: 9, fontWeight: '900', marginTop: 4 },

  driverPin: { position: 'absolute', backgroundColor: colors.card, padding: 4, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center' },
  driverPinSelected: { borderColor: colors.primary, shadowColor: colors.primary, shadowRadius: 8, shadowOpacity: 0.8 },
  pinAvatar: { width: 22, height: 22, borderRadius: 11 },
  pinLabel: { marginLeft: 4, paddingRight: 4 },
  pinUsername: { color: colors.text, fontSize: 9, fontWeight: '800' },
  pinSpeed: { color: colors.primary, fontSize: 8, fontWeight: '900' },

  topControlBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  privacyPill: { backgroundColor: 'rgba(0, 255, 102, 0.12)', borderColor: colors.primary, borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  privacyText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 4 },

  driverDrawer: { position: 'absolute', bottom: 10, left: 12, right: 12, padding: 12 },
  drawerHeader: { flexDirection: 'row', alignItems: 'center' },
  drawerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.primary },
  drawerName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  drawerVehicle: { color: colors.textSecondary, fontSize: 11 },
  drawerRep: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  drawerActions: { flexDirection: 'row', marginTop: 10 },

  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  controlSub: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 8 },
  privacyModesRow: { flexDirection: 'row', gap: 6 },
  privacyBtn: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  privacyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  privacyBtnText: { color: colors.text, fontSize: 9, fontWeight: '900' },

  driverListRow: { flexDirection: 'row', alignItems: 'center' },
  listAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.primary },
  listUsername: { color: colors.text, fontSize: 13, fontWeight: '900' },
  listVehicle: { color: colors.textSecondary, fontSize: 11 },
  listSpeed: { color: colors.primary, fontSize: 14, fontWeight: '900', marginBottom: 2 },
});
