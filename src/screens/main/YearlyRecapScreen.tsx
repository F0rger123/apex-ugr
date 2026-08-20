import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRecapStore } from '../../stores/recapStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { colors } from '../../config/colors';
import { Trophy, Award, Flame, Zap, Navigation, Flag, Users } from 'lucide-react-native';

export const YearlyRecapScreen = ({ navigation }: any) => {
  const { recapData, fetchRecap, isLoading } = useRecapStore();

  useEffect(() => {
    fetchRecap();
  }, []);

  if (isLoading && !recapData) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const m = recapData?.metrics;

  return (
    <View style={styles.container}>
      <ApexHeader title="APEX RECAP 2026" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner */}
        <GlassCard style={styles.bannerCard}>
          <Text style={styles.bannerYear}>2026 YEAR IN REVIEW</Text>
          <Text style={styles.bannerTitle}>{m?.milesDriven ? m.milesDriven.toLocaleString() : '1,240'} MILES DRIVEN</Text>
          <Text style={styles.bannerSub}>{m?.roadsDiscovered || 84} ROADS DISCOVERED · {m?.districtsExplored || 12} DISTRICTS EXPLORED</Text>
        </GlassCard>

        {/* Stats Grid */}
        <SectionHeader title="DRIVER STATS" />
        <View style={styles.grid}>
          <GlassCard style={styles.gridCard}>
            <Text style={styles.gridVal}>{m?.ghostCreditsEarned?.toLocaleString() || '3,500'}</Text>
            <Text style={styles.gridLab}>GC EARNED</Text>
          </GlassCard>

          <GlassCard style={styles.gridCard}>
            <Text style={styles.gridVal}>{m?.meetsAttended || 8}</Text>
            <Text style={styles.gridLab}>MEETS ATTENDED</Text>
          </GlassCard>

          <GlassCard style={styles.gridCard}>
            <Text style={styles.gridVal}>{m?.wins || 7}W - {m?.losses || 3}L</Text>
            <Text style={styles.gridLab}>RACE RECORD</Text>
          </GlassCard>

          <GlassCard style={styles.gridCard}>
            <Text style={styles.gridVal}>{m?.bountiesClaimed || 12}</Text>
            <Text style={styles.gridLab}>BOUNTIES CLAIMED</Text>
          </GlassCard>
        </View>

        {/* Yearly Awards */}
        <SectionHeader title="2026 DRIVER AWARDS" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(recapData?.awards || ['EXPLORER', 'GHOST HUNTER', 'SURVIVOR', 'MEET REGULAR', 'APEX VETERAN']).map((award) => (
            <GlassCard key={award} style={styles.awardChip}>
              <Award size={14} color={colors.primary} />
              <Text style={styles.awardText}>{award}</Text>
            </GlassCard>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepSpace },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.deepSpace },
  content: { padding: 16, paddingBottom: 40 },
  bannerCard: { padding: 20, alignItems: 'center', marginBottom: 16, borderColor: colors.primary },
  bannerYear: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  bannerTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 4 },
  bannerSub: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  gridCard: { width: '48%', padding: 14, alignItems: 'center' },
  gridVal: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  gridLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 2 },
  awardChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  awardText: { color: colors.text, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});
