import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert } from 'react-native';
import { useBountyStore } from '../../stores/bountyStore';
import { BountyDevControlsPanel } from '../../components/bounty/BountyDevControlsPanel';

interface Props {
  navigation?: any;
}

export const BountyHuntScreen: React.FC<Props> = ({ navigation }) => {
  const {
    activeRole,
    activeSession,
    signalStrengthPct,
    approxDistanceMiles,
    approxDirection,
    proximityLockSeconds,
    inClaimRange,
    targetVerified,
    sendSignalUpdate,
    claimBounty,
    leaveHunt,
    progressBounty,
  } = useBountyStore();

  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [showDevControls, setShowDevControls] = useState<boolean>(false);

  useEffect(() => {
    if (!activeSession?.stage_ends_at) return;

    const interval = setInterval(() => {
      const endsAt = Date.parse(activeSession.stage_ends_at);
      const remaining = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      if (remaining === 0 && activeSession.id) {
        progressBounty(activeSession.id);
      }

      // Periodically update signal if in hunter mode
      if (activeRole === 'hunter' && activeSession.id) {
        sendSignalUpdate(activeSession.id, {});
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.stage_ends_at, activeRole]);

  const handleClaim = async () => {
    if (!activeSession) return;
    try {
      const res = await claimBounty(activeSession.id);
      Alert.alert(
        'BOUNTY CLAIMED!',
        `Congratulations! You claimed the ★${res.starLevel} Bounty!\n\nRewards Issued:\n+${res.rewardGc} Ghost Credits\n+${res.rewardRep} REP`,
        [{ text: 'OK', onPress: () => navigation?.goBack?.() }]
      );
    } catch (err: any) {
      Alert.alert('Claim Failed', err?.message || 'Could not claim bounty.');
    }
  };

  const handleLeave = async () => {
    if (!activeSession) return;
    const success = await leaveHunt(activeSession.id);
    if (success) {
      navigation?.goBack?.();
    }
  };

  if (!activeSession) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>NO ACTIVE HUNT SESSION</Text>
        <Text style={styles.emptySubtitle}>You are not currently target or hunting a Bounty.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack?.()}>
          <Text style={styles.backButtonText}>RETURN TO DASHBOARD</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mins = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  const starsStr = '★'.repeat(activeSession.star_level);

  const vehicle = activeSession.target_vehicle;
  const vehicleTitle = vehicle
    ? `${(vehicle.color || 'WHITE').toUpperCase()} ${vehicle.year} ${vehicle.make.toUpperCase()} ${vehicle.model.toUpperCase()}${vehicle.trim ? ` ${vehicle.trim.toUpperCase()}` : ''}`
    : 'TARGET VEHICLE';

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={styles.contentContainer}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => navigation?.goBack?.()}>
          <Text style={styles.backIconText}>‹ BACK</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeRole === 'target' ? 'BOUNTY TARGET HUD' : 'BOUNTY HUNT HUD'}
        </Text>
        <TouchableOpacity style={styles.devToggleBtn} onPress={() => setShowDevControls(!showDevControls)}>
          <Text style={styles.devToggleText}>DEV</Text>
        </TouchableOpacity>
      </View>

      {showDevControls ? <BountyDevControlsPanel /> : null}

      <View style={styles.cardHeader}>
        <View style={styles.badgeBox}>
          <Text style={styles.badgeTitle}>
            {activeRole === 'target' ? 'YOU ARE THE TARGET' : 'TARGET DETECTED'}
          </Text>
          <Text style={styles.starsText}>{starsStr}</Text>
        </View>

        <View style={styles.timerBadge}>
          <Text style={styles.timerLabel}>SURVIVE</Text>
          <Text style={styles.timerVal}>{timeStr}</Text>
        </View>
      </View>

      <View style={styles.vehicleSection}>
        {vehicle?.photo_url ? (
          <Image source={{ uri: vehicle?.photo_url }} style={styles.vehiclePhoto} resizeMode="cover" />
        ) : null}

        <Text style={styles.vehicleTitleText}>{vehicleTitle}</Text>
        <Text style={styles.rankText}>
          DRIVER RANK // {(activeSession.target_rank || 'GOLD').toUpperCase()}
        </Text>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>SIGNAL STRENGTH</Text>
          <Text style={styles.metricValue}>{signalStrengthPct || 67}%</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>APPROX DISTANCE</Text>
          <Text style={styles.metricValue}>{approxDistanceMiles || 1.4} MI</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>DIRECTION</Text>
          <Text style={styles.metricValue}>{approxDirection || 'NW'}</Text>
        </View>
      </View>

      <View style={styles.rewardSection}>
        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>GHOST CREDITS</Text>
          <Text style={styles.rewardVal}>+{activeSession.reward_gc} GC</Text>
        </View>

        <View style={styles.rewardBox}>
          <Text style={styles.rewardLabel}>REPUTATION</Text>
          <Text style={styles.rewardVal}>+{activeSession.reward_rep} REP</Text>
        </View>
      </View>

      {activeRole === 'hunter' ? (
        <View style={styles.actionSection}>
          {targetVerified ? (
            <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
              <Text style={styles.claimButtonText}>TARGET VERIFIED // CLAIM BOUNTY</Text>
            </TouchableOpacity>
          ) : inClaimRange ? (
            <View style={styles.lockBox}>
              <Text style={styles.lockTitle}>TARGET SIGNAL LOCKED</Text>
              <Text style={styles.lockCountdown}>00:{String(20 - proximityLockSeconds).padStart(2, '0')}</Text>
              <Text style={styles.lockSubtitle}>REMAIN IN PROXIMITY TO VERIFY</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.leaveButton} onPress={handleLeave}>
              <Text style={styles.leaveButtonText}>LEAVE HUNT</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.targetBanner}>
          <Text style={styles.targetBannerText}>SURVIVE UNTIL TIMER EXPIRES TO ESCAPE & ESCALATE</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#0A0D14',
  },
  contentContainer: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0A0D14',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    color: '#00FF66',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#A0A8B0',
    fontSize: 13,
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backIconButton: {
    padding: 6,
  },
  backIconText: {
    color: '#00FF66',
    fontSize: 14,
    fontWeight: '800',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  devToggleBtn: {
    backgroundColor: 'rgba(255,0,85,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  devToggleText: {
    color: '#FF0055',
    fontSize: 10,
    fontWeight: '900',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,255,102,0.3)',
    padding: 14,
    marginBottom: 16,
  },
  badgeBox: {
    gap: 4,
  },
  badgeTitle: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  starsText: {
    color: '#FFCC00',
    fontSize: 18,
    fontWeight: '900',
  },
  timerBadge: {
    alignItems: 'flex-end',
  },
  timerLabel: {
    color: '#808890',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  timerVal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  vehicleSection: {
    backgroundColor: '#0F131A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    marginBottom: 16,
  },
  vehiclePhoto: {
    width: '100%',
    height: 160,
    borderRadius: 10,
    marginBottom: 12,
  },
  vehicleTitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rankText: {
    color: '#00FF66',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#0F131A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 10,
    alignItems: 'center',
  },
  metricLabel: {
    color: '#808890',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  rewardSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  rewardBox: {
    flex: 1,
    backgroundColor: 'rgba(0,255,102,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF66',
    padding: 12,
    alignItems: 'center',
  },
  rewardLabel: {
    color: '#00FF66',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  rewardVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  actionSection: {
    marginTop: 8,
  },
  claimButton: {
    backgroundColor: '#00FF66',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  claimButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lockBox: {
    backgroundColor: 'rgba(255,204,0,0.15)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCC00',
    padding: 16,
    alignItems: 'center',
  },
  lockTitle: {
    color: '#FFCC00',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 4,
  },
  lockCountdown: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 2,
  },
  lockSubtitle: {
    color: '#A0A8B0',
    fontSize: 10,
    fontWeight: '700',
  },
  leaveButton: {
    borderWidth: 1,
    borderColor: '#FF3366',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveButtonText: {
    color: '#FF3366',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  targetBanner: {
    backgroundColor: 'rgba(0,255,102,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00FF66',
    padding: 16,
    alignItems: 'center',
  },
  targetBannerText: {
    color: '#00FF66',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
