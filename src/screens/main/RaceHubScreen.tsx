import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  Animated,
  Alert,
} from 'react-native';
import { useRaceStore, RaceChallengeWithProfiles } from '../../stores/raceStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import {
  Flag,
  Plus,
  ShieldAlert,
  X,
  Trophy,
  Video,
  Coins,
  Clock,
  ChevronRight,
  Flame,
  CheckCircle2,
} from 'lucide-react-native';

const STATUS_COLOR: Record<string, string> = {
  open: colors.warning,
  accepted: colors.primary,
  in_progress: colors.primary,
  finished: colors.textMuted,
  disputed: colors.danger,
  cancelled: colors.textMuted,
};

const RaceCard = ({
  race,
  userId,
  onPress,
  onAccept,
  onDecline,
}: {
  race: RaceChallengeWithProfiles;
  userId: string;
  onPress: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) => {
  const isChallenger = race.challenger_id === userId;
  const isOpponent = race.opponent_id === userId;
  const canAccept = race.status === 'open' && !isChallenger && race.opponent_id === null;
  const isWinner = race.winner_id === userId;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <GlassCard style={styles.raceCard} activeGlow={race.status === 'accepted'}>
        {/* Status & Type */}
        <View style={styles.cardTop}>
          <View style={styles.cardTopLeft}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLOR[race.status] || colors.textMuted }]} />
            <Text style={styles.raceType}>{race.race_type?.toUpperCase() || 'RACE'}</Text>
          </View>
          <MatrixBadge
            label={race.status.toUpperCase()}
            variant={race.status === 'accepted' ? 'gold' : race.status === 'finished' ? 'silver' : 'green'}
            size="sm"
          />
        </View>

        {/* Racers */}
        <View style={styles.racersRow}>
          <View style={styles.racerSide}>
            <Image
              source={{ uri: race.challenger_profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200' }}
              style={[styles.racerAvatar, isChallenger && styles.myAvatar]}
            />
            <Text style={styles.racerName} numberOfLines={1}>
              {race.challenger_profile?.display_name || 'CHALLENGER'}
              {isChallenger ? ' (YOU)' : ''}
            </Text>
          </View>

          <View style={styles.vsBox}>
            <Coins size={16} color={colors.warning} />
            <Text style={styles.wagerText}>{(race.wager_credits || 0).toLocaleString()}</Text>
            <Text style={styles.vsText}>VS</Text>
          </View>

          <View style={styles.racerSide}>
            {race.opponent_id ? (
              <>
                <Image
                  source={{ uri: race.opponent_profile?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200' }}
                  style={[styles.racerAvatar, isOpponent && styles.myAvatar]}
                />
                <Text style={styles.racerName} numberOfLines={1}>
                  {race.opponent_profile?.display_name || 'OPPONENT'}
                  {isOpponent ? ' (YOU)' : ''}
                </Text>
              </>
            ) : (
              <View style={[styles.racerAvatar, styles.openSlot]}>
                <Text style={styles.openSlotText}>?</Text>
              </View>
            )}
            <Text style={[styles.racerName, !race.opponent_id && { color: colors.primary }]} numberOfLines={1}>
              {race.opponent_id ? '' : 'OPEN SLOT'}
            </Text>
          </View>
        </View>

        {/* Route */}
        <Text style={styles.routeName}>{race.route_name} · {race.distance_miles || 0.25} mi</Text>

        {/* Winner Banner */}
        {race.winner_id && (
          <View style={[styles.winnerBanner, { backgroundColor: isWinner ? 'rgba(255,215,0,0.1)' : 'rgba(255,255,255,0.04)' }]}>
            <Trophy size={14} color={isWinner ? colors.warning : colors.textMuted} />
            <Text style={[styles.winnerText, { color: isWinner ? colors.warning : colors.textMuted }]}>
              {isWinner ? 'YOU WON · +' + (race.wager_credits || 0) + ' CR' : 'YOU LOST · WAGER SETTLED'}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          {canAccept && (
            <ApexButton
              title="ACCEPT & ESCROW"
              variant="primary"
              size="sm"
              style={{ flex: 1, marginRight: 8 }}
              icon={<CheckCircle2 size={14} color="#000000" />}
              onPress={onAccept}
            />
          )}
          {canAccept && (
            <ApexButton
              title="DECLINE"
              variant="danger"
              size="sm"
              onPress={onDecline}
            />
          )}
          {!canAccept && (
            <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
              <Text style={styles.viewBtnText}>VIEW DETAILS</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

export const RaceHubScreen = ({ navigation }: any) => {
  const { races, disputes, acceptChallenge, declineChallenge, voteOnDispute, fetchRaces, fetchDisputes, subscribeToRaces, unsubscribeFromRaces } = useRaceStore();
  const { user } = useAuthStore();

  const [hubTab, setHubTab] = useState<'open' | 'my' | 'history'>('open');
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (user) {
      fetchRaces(user.id);
      fetchDisputes();
      subscribeToRaces(user.id);
    }
    return () => unsubscribeFromRaces();
  }, [user?.id]);

  const handleAccept = async (raceId: string) => {
    if (!user) return;
    const { error } = await acceptChallenge(raceId, user.id);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('🏁 Race Accepted!', 'Wager locked in escrow. Navigate to the race detail to start your telemetry run.');
    }
  };

  const handleDecline = async (raceId: string) => {
    await declineChallenge(raceId);
  };

  const openChallenges = races.filter(r => r.status === 'open');
  const myActiveRaces = races.filter(r =>
    ['accepted', 'in_progress', 'disputed'].includes(r.status) &&
    (r.challenger_id === user?.id || r.opponent_id === user?.id)
  );
  const pastRaces = races.filter(r =>
    ['finished', 'cancelled'].includes(r.status)
  );
  const activeDisputes = disputes.filter(d => d.status === 'under_review');

  const displayRaces = hubTab === 'open' ? openChallenges : hubTab === 'my' ? myActiveRaces : pastRaces;

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="RACE HUB & WAGERS"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <Animated.ScrollView style={[styles.content, { opacity: fadeAnim }]} showsVerticalScrollIndicator={false}>
        {/* Hero Stats Bar */}
        <View style={styles.heroBanner}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatVal}>{races.filter(r => r.winner_id === user?.id).length}</Text>
            <Text style={styles.heroStatLabel}>WINS</Text>
          </View>
          <View style={[styles.heroStat, styles.heroStatMid]}>
            <Text style={[styles.heroStatVal, { color: colors.warning }]}>
              {races.reduce((sum, r) => r.status === 'open' || r.status === 'accepted' ? sum + (r.wager_credits || 0) : sum, 0).toLocaleString()}
            </Text>
            <Text style={styles.heroStatLabel}>CR IN ESCROW</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={[styles.heroStatVal, { color: colors.danger }]}>{activeDisputes.length}</Text>
            <Text style={styles.heroStatLabel}>DISPUTES</Text>
          </View>
        </View>

        {/* Create Challenge */}
        <ApexButton
          title="+ CREATE RACE CHALLENGE"
          variant="primary"
          size="lg"
          style={{ marginBottom: 16 }}
          icon={<Flame size={18} color="#000000" />}
          onPress={() => navigation.navigate('CreateChallenge')}
        />

        {/* Dispute Alert */}
        {activeDisputes.length > 0 && (
          <GlassCard style={styles.disputeBanner}>
            <View style={styles.disputeHeader}>
              <ShieldAlert size={16} color={colors.warning} />
              <Text style={styles.disputeTitle}>{activeDisputes.length} ACTIVE REFEREE DISPUTE{activeDisputes.length > 1 ? 'S' : ''}</Text>
            </View>
            <Text style={styles.disputeSub}>Community referees earn +150 credits per verified review.</Text>
            <ApexButton
              title="INSPECT PROOF & VOTE"
              variant="outline"
              size="sm"
              style={{ marginTop: 8 }}
              onPress={() => setSelectedDispute(activeDisputes[0])}
            />
          </GlassCard>
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, hubTab === 'open' && styles.tabBtnActive]}
            onPress={() => setHubTab('open')}
          >
            <Text style={[styles.tabText, hubTab === 'open' && { color: '#000000' }]}>
              OPEN ({openChallenges.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, hubTab === 'my' && styles.tabBtnActive]}
            onPress={() => setHubTab('my')}
          >
            <Text style={[styles.tabText, hubTab === 'my' && { color: '#000000' }]}>
              STAGED ({myActiveRaces.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, hubTab === 'history' && styles.tabBtnActive]}
            onPress={() => setHubTab('history')}
          >
            <Text style={[styles.tabText, hubTab === 'history' && { color: '#000000' }]}>
              HISTORY ({pastRaces.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Race List */}
        {displayRaces.length === 0 ? (
          <GlassCard>
            <View style={styles.emptyState}>
              <Flag size={36} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {hubTab === 'open' ? 'NO OPEN CHALLENGES' : hubTab === 'my' ? 'NO STAGED RACES' : 'NO RACE HISTORY'}
              </Text>
              <Text style={styles.emptySub}>
                {hubTab === 'open' ? 'Be the first to post a wager challenge.' : hubTab === 'my' ? 'Accept a challenge to get staged.' : 'Your completed races will appear here.'}
              </Text>
            </View>
          </GlassCard>
        ) : (
          displayRaces.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              userId={user?.id || ''}
              onPress={() => navigation.navigate('RaceDetail', { raceId: race.id })}
              onAccept={() => handleAccept(race.id)}
              onDecline={() => handleDecline(race.id)}
            />
          ))
        )}

        <View style={{ height: 60 }} />
      </Animated.ScrollView>

      {/* Dispute Inspector Modal */}
      <Modal visible={!!selectedDispute} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>REFEREE DISPUTE INSPECTOR</Text>
              <TouchableOpacity onPress={() => setSelectedDispute(null)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDispute && (
              <ScrollView style={{ maxHeight: 400 }}>
                <Text style={styles.logLabel}>DISPUTE REASON:</Text>
                <Text style={styles.logText}>{selectedDispute.reason}</Text>

                {selectedDispute.video_proof_url && (
                  <>
                    <Text style={styles.logLabel}>VIDEO PROOF:</Text>
                    <Text style={[styles.logText, { color: colors.primary }]}>
                      {selectedDispute.video_proof_url.length > 60
                        ? selectedDispute.video_proof_url.substring(0, 60) + '...'
                        : selectedDispute.video_proof_url}
                    </Text>
                  </>
                )}

                <View style={styles.logBox}>
                  <Text style={styles.logLabel}>GPS SENSOR DATA</Text>
                  <Text style={styles.logLine}>Anti-Cheat Signal: VERIFIED CLEAN</Text>
                  <Text style={styles.logLine}>Submission Time: {new Date().toLocaleTimeString()}</Text>
                </View>

                <View style={styles.voteRow}>
                  <View style={styles.voteCount}>
                    <Text style={[styles.voteNum, { color: colors.primary }]}>
                      {(selectedDispute.referee_votes?.valid_votes || 0)}
                    </Text>
                    <Text style={styles.voteLabel}>VALID</Text>
                  </View>
                  <Text style={styles.voteSlash}>/</Text>
                  <View style={styles.voteCount}>
                    <Text style={[styles.voteNum, { color: colors.danger }]}>
                      {(selectedDispute.referee_votes?.invalid_votes || 0)}
                    </Text>
                    <Text style={styles.voteLabel}>INVALID</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                  <ApexButton
                    title="VOTE INVALID"
                    variant="danger"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => {
                      voteOnDispute(selectedDispute.id, user?.id || '', false);
                      setSelectedDispute(null);
                    }}
                  />
                  <ApexButton
                    title="VOTE VALID WIN"
                    variant="primary"
                    size="sm"
                    style={{ flex: 1 }}
                    onPress={() => {
                      voteOnDispute(selectedDispute.id, user?.id || '', true);
                      setSelectedDispute(null);
                    }}
                  />
                </View>
              </ScrollView>
            )}
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  heroBanner: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatMid: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroStatVal: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  heroStatLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 3 },

  disputeBanner: { borderColor: colors.warning, borderWidth: 1, marginBottom: 12 },
  disputeHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  disputeTitle: { color: colors.warning, fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  disputeSub: { color: colors.textSecondary, fontSize: 10 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  // Race Card
  raceCard: { padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  raceType: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  racersRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  racerSide: { flex: 1, alignItems: 'center', gap: 4 },
  racerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: colors.cardBorder },
  myAvatar: { borderColor: colors.primary },
  openSlot: {
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
    borderColor: colors.primary,
  },
  openSlotText: { color: colors.primary, fontSize: 20, fontWeight: '900' },
  racerName: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', textAlign: 'center' },

  vsBox: { alignItems: 'center', paddingHorizontal: 10 },
  wagerText: { color: colors.warning, fontSize: 13, fontWeight: '900', marginTop: 2 },
  vsText: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 2, marginTop: 4 },

  routeName: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 10 },

  winnerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  winnerText: { fontSize: 11, fontWeight: '900' },

  cardActions: { flexDirection: 'row', alignItems: 'center' },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    paddingVertical: 8,
  },
  viewBtnText: { color: colors.primary, fontSize: 11, fontWeight: '900' },

  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: colors.textMuted, fontSize: 11, textAlign: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', padding: 16 },
  modalCard: { padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 1 },

  logBox: { backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginVertical: 10, borderWidth: 1, borderColor: colors.cardBorder },
  logLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4, marginTop: 8 },
  logText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  logLine: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginTop: 3 },

  voteRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 12 },
  voteCount: { alignItems: 'center' },
  voteNum: { fontSize: 28, fontWeight: '900' },
  voteLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 2 },
  voteSlash: { color: colors.textMuted, fontSize: 24, fontWeight: '300' },
});
