import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useBountyStore } from '../../stores/bountyStore';

interface Props {
  onOpenHuntScreen?: () => void;
}

export const BountyDriverHUD: React.FC<Props> = ({ onOpenHuntScreen }) => {
  const { activeRole, activeSession, progressBounty } = useBountyStore();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!activeSession?.stage_ends_at) return;

    const interval = setInterval(() => {
      const endsAt = Date.parse(activeSession.stage_ends_at);
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining === 0 && activeSession.id) {
        progressBounty(activeSession.id);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.stage_ends_at]);

  if (!activeRole || !activeSession) return null;

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timerStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const stars = '★'.repeat(activeSession.star_level);

  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onOpenHuntScreen}
    >
      <View style={styles.leftBadge}>
        <Text style={styles.roleLabel}>
          {activeRole === 'target' ? 'BOUNTY' : 'HUNT'}
        </Text>
        <Text style={styles.starsText}>{stars}</Text>
      </View>

      <View style={styles.centerInfo}>
        <Text style={styles.vehicleText} numberOfLines={1}>
          {activeSession.target_vehicle
            ? `${(activeSession.target_vehicle.color || 'WHITE').toUpperCase()} ${activeSession.target_vehicle.year} ${activeSession.target_vehicle.make.toUpperCase()} ${activeSession.target_vehicle.model.toUpperCase()}`
            : 'TARGET VEHICLE LOCKED'}
        </Text>
        <Text style={styles.rewardText}>
          REWARD // {activeSession.reward_gc} GC
        </Text>
      </View>

      <View style={styles.rightTimer}>
        <Text style={styles.timerText}>{timerStr}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15,19,26,0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00FF66',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  leftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,255,102,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 10,
  },
  roleLabel: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  starsText: {
    color: '#FFCC00',
    fontSize: 12,
    fontWeight: '800',
  },
  centerInfo: {
    flex: 1,
  },
  vehicleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  rewardText: {
    color: '#A0A8B0',
    fontSize: 10,
    fontWeight: '700',
  },
  rightTimer: {
    backgroundColor: '#00FF66',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  timerText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
