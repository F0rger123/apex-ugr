import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { Trophy, Award, Zap, Flame, Shield, Medal } from 'lucide-react-native';

export const LeaderboardsScreen = ({ navigation }: any) => {
  const [filterCategory, setFilterCategory] = useState<'reputation' | 'horsepower' | 'credits' | 'wins'>('reputation');
  const [scopeTab, setScopeTab] = useState<'global' | 'local' | 'friends'>('global');

  const leaders = [
    { rank: 1, name: 'Ryder Vance', username: 'phantom_gtr', val: '4,850 PTS', sub: '1,150 WHP R35 GT-R', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop', badge: 'Community Favorite' },
    { rank: 2, name: 'Elena Rostova', username: 'apex_gt3', val: '3,920 PTS', sub: '518 WHP 911 GT3 RS', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop', badge: 'Street Specialist' },
    { rank: 3, name: 'Kenji Sato', username: 'boosted_2jz', val: '2,800 PTS', sub: '920 WHP Supra 2JZ', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', badge: 'Veteran' },
    { rank: 4, name: 'Marcus Vance', username: 'c8_z06_beast', val: '2,450 PTS', sub: '870 WHP Corvette Z06', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop', badge: 'Drag Specialist' },
    { rank: 5, name: 'Sarah Sterling', username: 'm4_competition', val: '2,100 PTS', sub: '740 WHP BMW M4', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop', badge: 'Rookie' },
  ];

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.title}>APEX LEADERBOARDS</Text>
          <Text style={styles.subTitle}>GLOBAL & LOCAL RACING RANKINGS</Text>
        </View>

        {/* Scope Selector: Global / Local / Friends */}
        <View style={styles.scopeBar}>
          {(['global', 'local', 'friends'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.scopeBtn, scopeTab === s && styles.scopeBtnActive]}
              onPress={() => setScopeTab(s)}
            >
              <Text style={[styles.scopeText, scopeTab === s && { color: colors.background }]}>{s.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Category Filter Pills */}
        <View style={styles.catRow}>
          {(['reputation', 'horsepower', 'credits', 'wins'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, filterCategory === cat && styles.catChipActive]}
              onPress={() => setFilterCategory(cat)}
            >
              <Text style={[styles.catChipText, filterCategory === cat && { color: colors.background }]}>{cat.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Leaders List */}
        <SectionHeader title="CURRENT TOP RACERS" />
        {leaders.map((item) => (
          <GlassCard key={item.rank} activeGlow={item.rank === 1} style={styles.leaderCard}>
            <View style={styles.rankBox}>
              <Text style={[styles.rankNumber, item.rank === 1 && { color: colors.warning }]}>#{item.rank}</Text>
            </View>

            <Image source={{ uri: item.avatar }} style={styles.avatar} />

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.racerName}>{item.name}</Text>
              <Text style={styles.racerSub}>{item.sub}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.valText}>{item.val}</Text>
              <MatrixBadge label={item.badge} variant={item.rank === 1 ? 'gold' : 'green'} size="sm" />
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
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  topBar: { marginVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },

  scopeBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginBottom: 8 },
  scopeBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  scopeBtnActive: { backgroundColor: colors.primary },
  scopeText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  catRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  catChip: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.text, fontSize: 9, fontWeight: '900' },

  leaderCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 8 },
  rankBox: { width: 30, alignItems: 'center' },
  rankNumber: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  avatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.primary },
  racerName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  racerSub: { color: colors.textSecondary, fontSize: 10 },
  valText: { color: colors.primary, fontSize: 13, fontWeight: '900', marginBottom: 2 },
});
