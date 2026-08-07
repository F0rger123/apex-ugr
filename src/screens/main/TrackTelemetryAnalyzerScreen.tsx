import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { AccelerationGraph } from '../../components/telemetry/AccelerationGraph';
import { GForceVectorBall } from '../../components/telemetry/GForceVectorBall';
import { colors } from '../../config/colors';
import {
  Activity,
  Flag,
  Trophy,
  Clock,
  Navigation,
  Download,
  Share2,
  TrendingUp,
  AlertCircle,
  Zap,
} from 'lucide-react-native';

export const TrackTelemetryAnalyzerScreen = ({ navigation }: any) => {
  const [selectedTrack, setSelectedTrack] = useState<'angeles' | 'homestead' | 'laguna'>('angeles');

  const TRACK_DATA = {
    angeles: {
      name: 'Angeles Crest Canyon Loop',
      lengthMiles: 4.2,
      bestLap: '1:48.24',
      delta: '-0.42s',
      topSpeed: 144.5,
      avgG: 1.12,
      sectors: [
        { name: 'Sector 1 (Uphill Hairpins)', time: '34.12s', speed: '84.2 MPH', status: 'optimal' },
        { name: 'Sector 2 (High Speed Crest)', time: '41.80s', speed: '144.5 MPH', status: 'optimal' },
        { name: 'Sector 3 (Technical Downhill)', time: '32.32s', speed: '92.0 MPH', status: 'improving' },
      ],
      speedTrace: [40, 65, 88, 110, 144, 98, 70, 120, 135, 90, 45, 0],
    },
    homestead: {
      name: 'Homestead Speedway Infield',
      lengthMiles: 2.3,
      bestLap: '1:24.10',
      delta: '-1.10s',
      topSpeed: 168.0,
      avgG: 1.35,
      sectors: [
        { name: 'Sector 1 (Oval Straight)', time: '22.40s', speed: '168.0 MPH', status: 'optimal' },
        { name: 'Sector 2 (Infield Chicane)', time: '38.10s', speed: '78.5 MPH', status: 'optimal' },
        { name: 'Sector 3 (Banked Turn 4)', time: '23.60s', speed: '135.2 MPH', status: 'optimal' },
      ],
      speedTrace: [60, 110, 145, 168, 110, 78, 92, 135, 150, 100, 50, 0],
    },
    laguna: {
      name: 'Laguna Seca Circuit',
      lengthMiles: 2.2,
      bestLap: '1:32.45',
      delta: '+0.15s',
      topSpeed: 138.2,
      avgG: 1.28,
      sectors: [
        { name: 'Sector 1 (Andretti Hairpin)', time: '28.50s', speed: '72.0 MPH', status: 'improving' },
        { name: 'Sector 2 (The Corkscrew)', time: '36.80s', speed: '64.5 MPH', status: 'optimal' },
        { name: 'Sector 3 (Main Straight)', time: '27.15s', speed: '138.2 MPH', status: 'optimal' },
      ],
      speedTrace: [50, 72, 95, 120, 64, 85, 110, 138, 100, 60, 30, 0],
    },
  };

  const track = TRACK_DATA[selectedTrack];

  const handleExportPDF = () => {
    Alert.alert('Telemetry Report Exported', 'Saved PDF telemetry log to documents.');
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="TRACK TELEMETRY ANALYZER"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Track Selector Tabs */}
        <View style={styles.trackTabs}>
          {(['angeles', 'homestead', 'laguna'] as const).map((tKey) => (
            <TouchableOpacity
              key={tKey}
              style={[styles.trackTabBtn, selectedTrack === tKey && styles.trackTabBtnActive]}
              onPress={() => setSelectedTrack(tKey)}
            >
              <Text style={[styles.trackTabText, selectedTrack === tKey && { color: colors.background }]}>
                {tKey.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Track Overview Card */}
        <GlassCard activeGlow style={styles.trackHeroCard}>
          <View style={styles.trackHeroHeader}>
            <View>
              <Text style={styles.trackHeroSub}>CIRCUIT TELEMETRY SESSION</Text>
              <Text style={styles.trackHeroTitle}>{track.name}</Text>
            </View>
            <MatrixBadge label={`${track.lengthMiles} MILES`} variant="green" />
          </View>

          <View style={styles.lapGrid}>
            <View style={styles.lapBox}>
              <Text style={styles.lapLab}>BEST LAP TIME</Text>
              <Text style={styles.lapValGreen}>{track.bestLap}</Text>
              <Text style={styles.lapSub}>DELTA {track.delta}</Text>
            </View>
            <View style={styles.lapBox}>
              <Text style={styles.lapLab}>MAX SPEED</Text>
              <Text style={styles.lapValGold}>{track.topSpeed} MPH</Text>
              <Text style={styles.lapSub}>GPS VERIFIED</Text>
            </View>
            <View style={styles.lapBox}>
              <Text style={styles.lapLab}>LATERAL G-FORCE</Text>
              <Text style={styles.lapVal}>{track.avgG} G</Text>
              <Text style={styles.lapSub}>PEAK GRIP</Text>
            </View>
          </View>
        </GlassCard>

        {/* Sector Split Times Table */}
        <SectionHeader title="SECTOR SPLIT TIMES & APEX SPEED" />
        <GlassCard style={{ padding: 12 }}>
          {track.sectors.map((sec, idx) => (
            <View key={sec.name} style={[styles.sectorRow, idx > 0 && styles.sectorRowBorder]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectorName}>{sec.name}</Text>
                <Text style={styles.sectorSpeed}>Apex Speed: {sec.speed}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.sectorTime}>{sec.time}</Text>
                <MatrixBadge
                  label={sec.status.toUpperCase()}
                  variant={sec.status === 'optimal' ? 'green' : 'silver'}
                  size="sm"
                />
              </View>
            </View>
          ))}
        </GlassCard>

        {/* Live G-Force Vector Ball Visualizer */}
        <SectionHeader title="FRICTION CIRCLE & G-FORCE VECTOR" />
        <GlassCard>
          <GForceVectorBall gLat={1.12} gLong={0.84} size={220} />
        </GlassCard>

        {/* Speed Trace Graph */}
        <SectionHeader title="SPEED TRACE & ACCELERATION LOG" />
        <AccelerationGraph data={track.speedTrace} height={150} />

        {/* Export Telemetry Log Button */}
        <View style={{ marginVertical: 16 }}>
          <ApexButton
            title="EXPORT PDF TELEMETRY REPORT"
            variant="primary"
            size="lg"
            icon={<Download size={18} color={colors.background} />}
            onPress={handleExportPDF}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },

  trackTabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginVertical: 12 },
  trackTabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  trackTabBtnActive: { backgroundColor: colors.primary },
  trackTabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  trackHeroCard: { padding: 18, marginBottom: 12 },
  trackHeroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  trackHeroSub: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  trackHeroTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },

  lapGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  lapBox: { alignItems: 'center', flex: 1 },
  lapLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  lapVal: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  lapValGreen: { color: colors.primary, fontSize: 20, fontWeight: '900', marginTop: 2 },
  lapValGold: { color: '#FFD700', fontSize: 20, fontWeight: '900', marginTop: 2 },
  lapSub: { color: colors.textSecondary, fontSize: 8, fontWeight: '800', marginTop: 2 },

  sectorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  sectorRowBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  sectorName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  sectorSpeed: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  sectorTime: { color: colors.primary, fontSize: 16, fontWeight: '900', marginBottom: 2 },
});
