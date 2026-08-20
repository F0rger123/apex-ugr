import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSeasonStore } from '../../stores/seasonStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { colors } from '../../config/colors';
import { Trophy, CheckCircle2, Lock, Gift, Zap } from 'lucide-react-native';

export const SeasonHubScreen = ({ navigation }: any) => {
  const { season, progress, challenges, fetchSeason, claimLevelReward, isLoading } = useSeasonStore();

  useEffect(() => {
    fetchSeason();
  }, []);

  const handleClaim = async (level: number) => {
    const ok = await claimLevelReward(level);
    if (ok) {
      Alert.alert('Reward Claimed!', `Level ${level} seasonal reward added to your inventory.`);
    }
  };

  if (isLoading && !season) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const level = progress?.level || 1;
  const xp = progress?.xp || 0;
  const currentLevelXp = xp % 1000;
  const progressPct = Math.min(100, Math.floor((currentLevelXp / 1000) * 100));

  return (
    <View style={styles.container}>
      <ApexHeader title={season?.name ? `${season.name} - ${season.theme}` : 'APEX SEASONS'} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Level & XP Banner */}
        <GlassCard style={styles.levelCard}>
          <View style={styles.levelHeader}>
            <View>
              <Text style={styles.levelNumLabel}>SEASON LEVEL</Text>
              <Text style={styles.levelNum}>{level}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.xpText}>{xp.toLocaleString()} TOTAL XP</Text>
              <Text style={styles.xpSub}>{1000 - currentLevelXp} XP TO LEVEL {level + 1}</Text>
            </View>
          </View>

          {/* XP Progress Bar */}
          <View style={styles.trackBg}>
            <View style={[styles.trackFill, { width: `${progressPct}%` }]} />
          </View>
        </GlassCard>

        {/* Reward Track */}
        <SectionHeader title="SEASON REWARD TRACK" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          {(season?.rewards || []).map((reward) => {
            const isUnlocked = level >= reward.level;
            const isClaimed = progress?.claimed_levels.includes(reward.level);

            return (
              <GlassCard key={reward.level} style={isUnlocked ? styles.rewardCardUnlocked : styles.rewardCard}>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelBadgeText}>LVL {reward.level}</Text>
                </View>

                <View style={{ marginVertical: 12, alignItems: 'center' }}>
                  {isClaimed ? (
                    <CheckCircle2 size={24} color={colors.primary} />
                  ) : isUnlocked ? (
                    <Gift size={24} color={colors.primary} />
                  ) : (
                    <Lock size={24} color={colors.textMuted} />
                  )}
                </View>

                <Text style={styles.rewardLabel} numberOfLines={2}>{reward.label}</Text>

                {isUnlocked && !isClaimed ? (
                  <TouchableOpacity style={styles.claimBtn} onPress={() => handleClaim(reward.level)}>
                    <Text style={styles.claimBtnText}>CLAIM</Text>
                  </TouchableOpacity>
                ) : isClaimed ? (
                  <Text style={styles.claimedText}>CLAIMED</Text>
                ) : (
                  <Text style={styles.lockedText}>LOCKED</Text>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>

        {/* Daily & Weekly Challenges */}
        <SectionHeader title="SEASONAL CHALLENGES" />
        {challenges.length === 0 ? (
          <GlassCard style={{ padding: 16, alignItems: 'center' }}>
            <Zap size={24} color={colors.primary} />
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>Complete driving, meets, and bounties to earn XP!</Text>
          </GlassCard>
        ) : (
          challenges.map((c) => (
            <GlassCard key={c.id} style={styles.challengeCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.challengeType}>{c.challenge_type.toUpperCase()} CHALLENGE</Text>
                <Text style={styles.challengeTitle}>{c.title}</Text>
                <Text style={styles.challengeDesc}>{c.description}</Text>
              </View>

              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.challengeReward}>+{c.xp_reward} XP</Text>
                <Text style={styles.challengeProgress}>{c.current_count} / {c.target_count}</Text>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepSpace },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.deepSpace },
  content: { padding: 16, paddingBottom: 40 },
  levelCard: { padding: 16, marginBottom: 16 },
  levelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  levelNumLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  levelNum: { color: colors.primary, fontSize: 32, fontWeight: '900' },
  xpText: { color: colors.text, fontSize: 14, fontWeight: '900' },
  xpSub: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  trackBg: { height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: colors.primary },
  rewardCard: { width: 110, padding: 10, marginRight: 10, alignItems: 'center', opacity: 0.7 },
  rewardCardUnlocked: { opacity: 1, borderColor: colors.primary },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  levelBadgeText: { color: colors.text, fontSize: 9, fontWeight: '900' },
  rewardLabel: { color: colors.text, fontSize: 10, fontWeight: '800', textAlign: 'center', height: 28 },
  claimBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 4, marginTop: 6 },
  claimBtnText: { color: '#000', fontSize: 9, fontWeight: '900' },
  claimedText: { color: colors.primary, fontSize: 9, fontWeight: '800', marginTop: 6 },
  lockedText: { color: colors.textMuted, fontSize: 9, marginTop: 6 },
  challengeCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, marginBottom: 8 },
  challengeType: { color: colors.primary, fontSize: 8, fontWeight: '900' },
  challengeTitle: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  challengeDesc: { color: colors.textMuted, fontSize: 10, marginTop: 1 },
  challengeReward: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  challengeProgress: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
});
