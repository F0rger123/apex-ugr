import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLeaderboardStore, LeaderboardUser } from '../../stores/leaderboardStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { Trophy, Award, Flame, Coins, Zap, ShieldCheck } from 'lucide-react-native';

export const LeaderboardsScreen = ({ navigation }: any) => {
  const { globalLeaderboard, fetchLeaderboard, isLoading } = useLeaderboardStore();

  useEffect(() => {
    fetchLeaderboard();
  }, []);
  const [scopeTab, setScopeTab] = useState<'global' | 'local' | 'friends'>('global');
  const [category, setCategory] = useState<'reputation' | 'horsepower' | 'credits' | 'wins'>('reputation');

  const getMetricText = (u: LeaderboardUser) => {
    if (category === 'reputation') return `${u.reputation_points} PTS`;
    if (category === 'horsepower') return `${u.top_speed_recorded || 0} MPH (Top)`;
    if (category === 'credits') return `$${(u.credits_balance || 0).toLocaleString()} CR`;
    return `${u.races_won || 0} WINS`;
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          <TouchableOpacity style={[styles.catChip, category === 'reputation' && styles.catChipActive]} onPress={() => setCategory('reputation')}>
            <Trophy size={14} color={category === 'reputation' ? colors.background : colors.primary} />
            <Text style={[styles.catText, category === 'reputation' && { color: colors.background }]}>REPUTATION</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.catChip, category === 'wins' && styles.catChipActive]} onPress={() => setCategory('wins')}>
            <Award size={14} color={category === 'wins' ? colors.background : colors.warning} />
            <Text style={[styles.catText, category === 'wins' && { color: colors.background }]}>WINS</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.catChip, category === 'horsepower' && styles.catChipActive]} onPress={() => setCategory('horsepower')}>
            <Zap size={14} color={category === 'horsepower' ? colors.background : '#00E5FF'} />
            <Text style={[styles.catText, category === 'horsepower' && { color: colors.background }]}>TOP SPEED</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.catChip, category === 'credits' && styles.catChipActive]} onPress={() => setCategory('credits')}>
            <Coins size={14} color={category === 'credits' ? colors.background : '#FFD700'} />
            <Text style={[styles.catText, category === 'credits' && { color: colors.background }]}>WEALTH</Text>
          </TouchableOpacity>
        </ScrollView>

        {isLoading && (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 10, marginBottom: 10 }} />
        )}

        {globalLeaderboard.map((user, idx) => (
          <GlassCard key={user.id} style={styles.boardCard}>
            {/* Rank Column */}
            <View style={styles.rankCol}>
              <Text style={[styles.rankNum, idx < 3 && { color: colors.primary }]}>
                {idx + 1}
              </Text>
            </View>

            {/* Avatar */}
            <Image source={{ uri: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }} style={styles.avatar} />

            {/* Details */}
            <View style={styles.infoCol}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.displayName}>{user.display_name}</Text>
                {idx < 3 && <ShieldCheck size={12} color={colors.primary} />}
              </View>
              <Text style={styles.username}>@{user.username}</Text>
              
              <View style={styles.badgeRow}>
                <MatrixBadge label={user.reputation_level || 'ROOKIE'} size="sm" variant={idx < 3 ? 'green' : 'silver'} />
              </View>
            </View>

            {/* Metric Column */}
            <View style={styles.metricCol}>
              <Text style={styles.metricVal}>{getMetricText(user)}</Text>
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

  catScroll: { paddingVertical: 10, marginBottom: 10, maxHeight: 50 },
  catChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginLeft: 6 },

  boardCard: { flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10 },
  rankCol: { width: 40, alignItems: 'center', justifyContent: 'center' },
  rankNum: { color: colors.textMuted, fontSize: 16, fontWeight: '900' },
  avatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.cardBorder, marginRight: 12 },
  infoCol: { flex: 1, justifyContent: 'center' },
  displayName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  username: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  metricCol: { alignItems: 'flex-end', justifyContent: 'center' },
  metricVal: { color: colors.primary, fontSize: 14, fontWeight: '900' },
});
