import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { RaceChallenge } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { Flag, Trophy, Clock, MapPin, ShieldAlert } from 'lucide-react-native';

interface RaceChallengeCardProps {
  challenge: RaceChallenge;
  onAccept?: () => void;
  onDecline?: () => void;
  onViewDispute?: () => void;
}

export const RaceChallengeCard: React.FC<RaceChallengeCardProps> = ({
  challenge,
  onAccept,
  onDecline,
  onViewDispute,
}) => {
  const challenger = challenge.challenger_profile;
  const isPending = challenge.status === 'open';

  return (
    <GlassCard activeGlow={isPending} style={styles.card}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.raceTypeGroup}>
          <Flag size={14} color={colors.primary} />
          <Text style={styles.raceTypeTitle}>{challenge.race_type}</Text>
        </View>
        <MatrixBadge label={`WAGER: $${challenge.wager_credits.toLocaleString()} CR`} variant="gold" size="sm" />
      </View>

      {/* Racers vs Row */}
      <View style={styles.racersContainer}>
        <View style={styles.racerBox}>
          <Image
            source={{ uri: challenger?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
            style={styles.avatar}
          />
          <Text style={styles.username} numberOfLines={1}>{challenger?.display_name || 'Challenger'}</Text>
          <Text style={styles.repText}>{challenger?.reputation_level || 'Racer'}</Text>
        </View>

        <View style={styles.vsCircle}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        <View style={styles.racerBox}>
          <View style={styles.avatarPlaceholder}>
            {challenge.opponent_profile ? (
              <Image source={{ uri: challenge.opponent_profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Trophy size={18} color={colors.textMuted} />
            )}
          </View>
          <Text style={styles.username} numberOfLines={1}>
            {challenge.opponent_profile?.display_name || 'Open Challenge'}
          </Text>
          <Text style={styles.repText}>{challenge.opponent_profile?.reputation_level || 'Awaiting Racer'}</Text>
        </View>
      </View>

      {/* Race Location & Distance */}
      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <MapPin size={12} color={colors.primary} />
          <Text style={styles.infoText}>{challenge.route_name} ({challenge.distance_miles} mi)</Text>
        </View>
        <View style={styles.infoItem}>
          <Clock size={12} color={colors.textSecondary} />
          <Text style={styles.infoText}>{challenge.start_time}</Text>
        </View>
      </View>

      {/* Rules */}
      <Text style={styles.rulesText}>Rules: {challenge.rules}</Text>

      {/* Action Footer */}
      <View style={styles.actionRow}>
        {isPending && onAccept && (
          <View style={{ flexDirection: 'row', width: '100%', gap: 8 }}>
            <ApexButton
              title="DECLINE"
              variant="danger"
              size="sm"
              style={{ flex: 1 }}
              onPress={onDecline || (() => {})}
            />
            <ApexButton
              title="ACCEPT WAGER"
              variant="primary"
              size="sm"
              style={{ flex: 2 }}
              onPress={onAccept}
            />
          </View>
        )}

        {challenge.status === 'accepted' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusBannerText}>STATUS: ACCEPTED • STAGED FOR RACE</Text>
          </View>
        )}

        {challenge.status === 'disputed' && (
          <TouchableOpacity style={styles.disputeBanner} onPress={onViewDispute}>
            <ShieldAlert size={14} color={colors.warning} />
            <Text style={styles.disputeBannerText}>UNDER REFEREE REVIEW • VIEW VOTING</Text>
          </TouchableOpacity>
        )}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  raceTypeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  raceTypeTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  racersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  racerBox: {
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  username: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 6,
  },
  repText: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
  },
  vsCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginLeft: 4,
    fontWeight: '700',
  },
  rulesText: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionRow: {
    marginTop: 12,
  },
  statusBanner: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderColor: colors.primary,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusBannerText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  disputeBanner: {
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    borderColor: colors.warning,
    borderWidth: 1,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disputeBannerText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});
