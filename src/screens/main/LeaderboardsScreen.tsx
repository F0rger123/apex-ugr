import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { Trophy, Award, Flame, Coins, Zap, ShieldCheck } from 'lucide-react-native';

interface LeaderboardUser {
  rank: number;
  username: string;
  display_name: string;
  avatar_url: string;
  vehicle: string;
  reputation_points: number;
  horsepower: number;
  credits_balance: number;
  wins: number;
  badge: 'Drag Specialist' | 'Street Specialist' | 'Veteran' | 'Meet Organizer';
}

const LEADERBOARD_DATA: LeaderboardUser[] = [
  { rank: 1, username: 'ryder_vance', display_name: 'Ryder Vance', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop', vehicle: 'Nissan GT-R Nismo', reputation_points: 9840, horsepower: 1150, credits_balance: 42500, wins: 48, badge: 'Drag Specialist' },
  { rank: 2, username: 'elena_gt3', display_name: 'Elena Rostova', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop', vehicle: 'Porsche 911 GT3 RS', reputation_points: 8420, horsepower: 518, credits_balance: 38900, wins: 39, badge: 'Street Specialist' },
  { rank: 3, username: 'phantom_2jz', display_name: 'Kenji Sato', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', vehicle: 'Toyota Supra 2JZ', reputation_points: 7910, horsepower: 950, credits_balance: 29400, wins: 34, badge: 'Veteran' },
  { rank: 4, username: 'marcus_m4', display_name: 'Marcus Vance', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop', vehicle: 'BMW M4 Competition', reputation_points: 6850, horsepower: 720, credits_balance: 21500, wins: 29, badge: 'Meet Organizer' },
];

export const LeaderboardsScreen = ({ navigation }: any) => {
  const [scopeTab, setScopeTab] = useState<'global' | 'local' | 'friends'>('global');
  const [category, setCategory] = useState<'reputation' | 'horsepower' | 'credits' | 'wins'>('reputation');

  const getMetricText = (u: LeaderboardUser) => {
    if (category === 'reputation') return `${u.reputation_points} PTS`;
    if (category === 'horsepower') return `${u.horsepower} WHP`;
    if (category === 'credits') return `$${u.credits_balance.toLocaleString()} CR`;
    return `${u.wins} WINS`;
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="GLOBAL LEADERBOARDS"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Scope Tabs (Global vs Local vs Friends) */}
        <View style={styles.tabBar}>
          {(['global', 'local', 'friends'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, scopeTab === tab && styles.tabItemActive]}
              onPress={() => setScopeTab(tab)}
            >
              <Text style={[styles.tabText, scopeTab === tab && { color: colors.background }]}>
                {tab.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Metric Category Selector */}
        <View style={styles.catRow}>
          {(['reputation', 'horsepower', 'credits', 'wins'] as const).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.catChip, category === cat && styles.catChipActive]}
              onPress={() => setCategory(cat)}
            >
              <Text style={[styles.catChipText, category === cat && { color: colors.background }]}>
                {cat.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Podium Highlights (Top 3) */}
        <View style={styles.podiumRow}>
          {LEADERBOARD_DATA.slice(0, 3).map((u) => (
            <GlassCard key={u.rank} activeGlow={u.rank === 1} style={styles.podiumCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankBadgeText}>#{u.rank}</Text>
              </View>
              <Image source={{ uri: u.avatar_url }} style={styles.podiumAvatar} />
              <Text style={styles.podiumName} numberOfLines={1}>{u.display_name}</Text>
              <Text style={styles.podiumCar} numberOfLines={1}>{u.vehicle}</Text>
              <Text style={styles.podiumVal}>{getMetricText(u)}</Text>
            </GlassCard>
          ))}
        </View>

        {/* Ranked Leaderboard Table List */}
        <SectionHeader title="FULL PILOT RANKINGS" />
        {LEADERBOARD_DATA.map((u) => (
          <GlassCard key={u.rank} style={styles.listCard}>
            <View style={styles.listRow}>
              <Text style={styles.listRank}>#{u.rank}</Text>
              <Image source={{ uri: u.avatar_url }} style={styles.listAvatar} />

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.listName}>{u.display_name}</Text>
                <Text style={styles.listSub}>@{u.username} • {u.vehicle}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.listVal}>{getMetricText(u)}</Text>
                <MatrixBadge label={u.badge} variant="green" size="sm" />
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
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginVertical: 10 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  catRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  catChip: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.text, fontSize: 9, fontWeight: '800' },

  podiumRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  podiumCard: { flex: 1, alignItems: 'center', padding: 10 },
  rankBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  rankBadgeText: { color: colors.background, fontSize: 9, fontWeight: '900' },
  podiumAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary, marginTop: 12 },
  podiumName: { color: colors.text, fontSize: 11, fontWeight: '900', marginTop: 4 },
  podiumCar: { color: colors.textMuted, fontSize: 8, marginTop: 2 },
  podiumVal: { color: colors.primary, fontSize: 12, fontWeight: '900', marginTop: 4 },

  listCard: { marginBottom: 8, padding: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center' },
  listRank: { color: colors.primary, fontSize: 14, fontWeight: '900', width: 30 },
  listAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder },
  listName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  listSub: { color: colors.textMuted, fontSize: 10 },
  listVal: { color: colors.primary, fontSize: 13, fontWeight: '900', marginBottom: 2 },
});
