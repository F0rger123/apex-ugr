import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDynoStore, EcuTuneMap } from '../../stores/dynoStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { DynoChart } from '../../components/garage/DynoChart';
import { playEngineSound } from '../../utils/soundSynthesizer';
import { colors } from '../../config/colors';
import {
  Flame,
  Zap,
  Gauge,
  Sliders,
  Play,
  Square,
  Check,
  Activity,
  AlertTriangle,
  ChevronRight,
  Wind,
} from 'lucide-react-native';

export const DynoSimulatorScreen = ({ navigation }: any) => {
  const { getActiveVehicle } = useGarageStore();
  const {
    activeTuneMap,
    availableMaps,
    setActiveTuneMap,
    isSimulatingPull,
    startDynoPull,
    stopDynoPull,
    currentRpm,
    currentHp,
    currentTorque,
    currentBoost,
  } = useDynoStore();

  const activeVehicle = getActiveVehicle() || {
    horsepower: 750,
    torque: 680,
    engine: '3.8L VR38DETT Twin-Turbo',
    make: 'Nissan',
    model: 'GT-R',
  };

  const handleStartPull = () => {
    playEngineSound(activeVehicle.engine);
    startDynoPull(activeVehicle.horsepower, activeVehicle.torque, () => {
      Alert.alert('Dyno Pull Complete!', `Peak Power: ${activeVehicle.horsepower + activeTuneMap.hpGain} WHP | Peak Boost: ${activeTuneMap.boostPsi} PSI`);
    });
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="ECU DYNO SIMULATOR"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Vehicle Tune Banner */}
        <GlassCard activeGlow={isSimulatingPull} style={styles.vehicleBanner}>
          <View style={styles.bannerHeader}>
            <View>
              <Text style={styles.bannerSub}>TUNING VEHICLE TARGET</Text>
              <Text style={styles.bannerTitle}>{activeVehicle.make} {activeVehicle.model}</Text>
              <Text style={styles.engineText}>{activeVehicle.engine}</Text>
            </View>
            <MatrixBadge label={activeTuneMap.stage} variant="green" />
          </View>
        </GlassCard>

        {/* Live Gauges Dashboard (RPM, Boost, AFR, Power) */}
        <SectionHeader title="LIVE DYNO CELL TELEMETRY" />
        <View style={styles.gaugeGrid}>
          <GlassCard style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>ENGINE RPM</Text>
            <Text style={styles.gaugeValGold}>{isSimulatingPull ? currentRpm : 1000}</Text>
            <Text style={styles.gaugeSub}>REDLINE {activeTuneMap.redlineRpm}</Text>
          </GlassCard>

          <GlassCard style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>BOOST PRESSURE</Text>
            <Text style={styles.gaugeValGreen}>{isSimulatingPull ? currentBoost : 0} PSI</Text>
            <Text style={styles.gaugeSub}>MAX {activeTuneMap.boostPsi} PSI</Text>
          </GlassCard>

          <GlassCard style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>LIVE HORSEPOWER</Text>
            <Text style={styles.gaugeVal}>{isSimulatingPull ? currentHp : activeVehicle.horsepower + activeTuneMap.hpGain} WHP</Text>
            <Text style={styles.gaugeSub}>+{activeTuneMap.hpGain} HP GAIN</Text>
          </GlassCard>

          <GlassCard style={styles.gaugeCard}>
            <Text style={styles.gaugeLabel}>AIR-FUEL RATIO (AFR)</Text>
            <Text style={styles.gaugeVal}>{isSimulatingPull ? (11.8 + Math.random() * 0.4).toFixed(1) : activeTuneMap.targetAfr}</Text>
            <Text style={styles.gaugeSub}>TARGET AFR</Text>
          </GlassCard>
        </View>

        {/* Dyno Pull Action Controls */}
        <View style={{ marginVertical: 12 }}>
          {isSimulatingPull ? (
            <ApexButton
              title="ABORT DYNO PULL"
              variant="danger"
              size="lg"
              icon={<Square size={18} color={colors.danger} />}
              onPress={stopDynoPull}
            />
          ) : (
            <ApexButton
              title="START WIDE-OPEN THROTTLE DYNO PULL"
              variant="primary"
              size="lg"
              icon={<Flame size={18} color={colors.background} />}
              onPress={handleStartPull}
            />
          )}
        </View>

        {/* Dynamic Dyno Chart Visualization */}
        <SectionHeader title="DYNO POWER & TORQUE CURVE" />
        <DynoChart
          maxHp={activeVehicle.horsepower + activeTuneMap.hpGain}
          maxTorque={activeVehicle.torque + activeTuneMap.torqueGain}
          engineName={`${activeVehicle.engine} (${activeTuneMap.stage})`}
        />

        {/* ECU Tune Map Selection List */}
        <SectionHeader title="SELECT ECU FLASH CALIBRATION" />
        <View style={styles.mapList}>
          {availableMaps.map((map) => {
            const isSelected = activeTuneMap.id === map.id;
            return (
              <GlassCard
                key={map.id}
                onPress={() => setActiveTuneMap(map)}
                style={{
                  ...styles.mapCard,
                  ...(isSelected ? styles.mapCardSelected : {}),
                }}
              >
                <View style={styles.mapCardHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.mapName}>{map.name}</Text>
                      {isSelected && <Check size={14} color={colors.primary} />}
                    </View>
                    <Text style={styles.mapDesc}>{map.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.gainText}>+{map.hpGain} HP</Text>
                    <Text style={styles.boostText}>{map.boostPsi} PSI</Text>
                  </View>
                </View>
              </GlassCard>
            );
          })}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },

  vehicleBanner: { padding: 16, marginVertical: 12 },
  bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerSub: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  bannerTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  engineText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 2 },

  gaugeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 8 },
  gaugeCard: { width: '48%', padding: 14, alignItems: 'center' },
  gaugeLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  gaugeVal: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 4 },
  gaugeValGreen: { color: colors.primary, fontSize: 22, fontWeight: '900', marginTop: 4 },
  gaugeValGold: { color: '#FFD700', fontSize: 22, fontWeight: '900', marginTop: 4 },
  gaugeSub: { color: colors.textSecondary, fontSize: 8, fontWeight: '800', marginTop: 2 },

  mapList: { gap: 10, marginVertical: 8 },
  mapCard: { padding: 14, borderWidth: 1, borderColor: colors.cardBorder },
  mapCardSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,102,0.06)' },
  mapCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  mapDesc: { color: colors.textMuted, fontSize: 11, marginTop: 4, lineHeight: 16 },
  gainText: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  boostText: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 2 },
});
