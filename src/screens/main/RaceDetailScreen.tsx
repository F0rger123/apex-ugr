import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRaceStore } from '../../stores/raceStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { RaceReplayViewer } from '../../components/race/RaceReplayViewer';
import { ReportUserModal } from '../../components/common/ReportUserModal';
import { colors } from '../../config/colors';
import {
  Flag,
  Trophy,
  Coins,
  ShieldAlert,
  Navigation,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Share2,
} from 'lucide-react-native';

export const RaceDetailScreen = ({ route, navigation }: any) => {
  const { raceId } = route.params || {};
  const { races, acceptChallenge, submitDispute } = useRaceStore();
  const { user } = useAuthStore();

  const race = races.find((r) => r.id === raceId) || races[0];

  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [videoProofUrl, setVideoProofUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!race) {
    return (
      <View style={styles.container}>
        <ApexHeader showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>RACE CHALLENGE NOT FOUND</Text>
        </View>
      </View>
    );
  }

  const isChallenger = user?.id === race.challenger_id;
  const isOpponent = user?.id === race.opponent_id;
  const isParticipant = isChallenger || isOpponent;

  const handleAcceptRace = async () => {
    if (!user) return;
    const { error } = await acceptChallenge(race.id, user.id);
    if (error) {
      Alert.alert('Escrow Error', error);
    } else {
      Alert.alert('Race Staged!', 'Wager escrow locked. Get to the starting grid!');
    }
  };

  const handleFileDispute = async () => {
    if (!disputeReason.trim() || !user) {
      Alert.alert('Required', 'Please enter a dispute reason.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await submitDispute(
      {
        race_id: race.id,
        reason: disputeReason,
        video_proof_url: videoProofUrl || null,
        status: 'under_review',
        gps_log_data: { max_speed_mph: 142, finish_time_ms: 8850 },
        referee_votes: { valid_votes: 0, invalid_votes: 0 },
      },
      user.id
    );
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Dispute Filed', 'Sent to Apex Referee Council for telemetry review.');
      setShowDisputeModal(false);
    }
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="RACE WAGER MATCH"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Race Wager Header Banner */}
        <GlassCard activeGlow={race.status === 'accepted'} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <MatrixBadge label={race.race_type.toUpperCase()} variant="green" />
            <MatrixBadge
              label={race.status.toUpperCase()}
              variant={
                race.status === 'accepted'
                  ? 'gold'
                  : race.status === 'finished'
                  ? 'silver'
                  : 'green'
              }
            />
          </View>

          <View style={styles.wagerRow}>
            <Coins size={28} color="#FFD700" />
            <Text style={styles.wagerAmount}>${race.wager_credits.toLocaleString()} CR</Text>
            <Text style={styles.wagerLabel}>ESCROW LOCK</Text>
          </View>

          <View style={styles.routeBox}>
            <Navigation size={14} color={colors.primary} />
            <Text style={styles.routeName}>{race.route_name}</Text>
            <Text style={styles.routeDist}>({race.distance_miles} MILES)</Text>
          </View>
        </GlassCard>

        {/* Telemetry Replay Viewer if race is finished or accepted */}
        {(race.status === 'finished' || race.status === 'accepted' || race.status === 'in_progress') && (
          <GlassCard style={styles.replayCard}>
            <Text style={styles.sectionTitle}>TELEMETRY RUN REPLAY</Text>
            <RaceReplayViewer
              challengerName={race.challenger_profile?.display_name || 'Challenger'}
              opponentName={race.opponent_profile?.display_name || 'Opponent'}
            />
          </GlassCard>
        )}

        {/* Rules & Launch Specifications */}
        <GlassCard style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>MATCH RULES & PROTOCOL</Text>
          <Text style={styles.rulesText}>{race.rules || 'Standard Apex Underground rules apply.'}</Text>
          <View style={styles.timeBox}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={styles.timeText}>
              Start Time: {new Date(race.start_time).toLocaleString()}
            </Text>
          </View>
        </GlassCard>

        {/* Actions & Escrow Buttons */}
        <View style={styles.actionBlock}>
          {race.status === 'open' && !isChallenger && (
            <ApexButton
              title="ACCEPT RACE & ESCROW WAGER"
              variant="primary"
              size="lg"
              icon={<Flag size={18} color={colors.background} />}
              onPress={handleAcceptRace}
            />
          )}

          {race.status === 'accepted' && isParticipant && (
            <ApexButton
              title="START LIVE TELEMETRY RUN"
              variant="primary"
              size="lg"
              icon={<Play size={18} color={colors.background} />}
              onPress={() => navigation.navigate('Telemetry')}
            />
          )}

          {isParticipant && race.status !== 'cancelled' && (
            <TouchableOpacity
              style={styles.disputeBtn}
              onPress={() => setShowDisputeModal(true)}
            >
              <ShieldAlert size={16} color={colors.warning} />
              <Text style={styles.disputeBtnText}>FILE REFEREE DISPUTE</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Dispute Modal */}
      <Modal visible={showDisputeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>FILE REFEREE DISPUTE</Text>
            <Text style={styles.modalSub}>
              Apex Council will analyze GPS telemetry, camera feeds, and launch sensors.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Reason for dispute (e.g. Early jump, lane cross...)"
              placeholderTextColor={colors.textMuted}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
            />

            <TextInput
              style={styles.input}
              placeholder="Video proof URL (Dashcam / GoPro clip)"
              placeholderTextColor={colors.textMuted}
              value={videoProofUrl}
              onChangeText={setVideoProofUrl}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <ApexButton
                title="CANCEL"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                onPress={() => setShowDisputeModal(false)}
              />
              <ApexButton
                title="SUBMIT DISPUTE"
                variant="danger"
                size="md"
                style={{ flex: 1 }}
                onPress={handleFileDispute}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* Report User Modal */}
      <ReportUserModal
        visible={showReportModal}
        targetUsername={race.challenger_profile?.username || 'racer'}
        onClose={() => setShowReportModal(false)}
        onSubmitReport={(reason) => {
          Alert.alert('Report Submitted', 'Thank you. Our moderation team will review this racer.');
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 16 },

  heroCard: { padding: 20, marginVertical: 12, alignItems: 'center' },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 16 },
  wagerRow: { alignItems: 'center', marginVertical: 10 },
  wagerAmount: { color: colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  wagerLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 2 },

  routeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginTop: 16 },
  routeName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  routeDist: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  replayCard: { padding: 16, marginBottom: 12 },
  rulesCard: { padding: 16, marginBottom: 12 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  rulesText: { color: colors.text, fontSize: 13, lineHeight: 20 },

  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  timeText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  actionBlock: { gap: 12, marginVertical: 16 },
  disputeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, backgroundColor: 'rgba(255,184,0,0.1)', borderRadius: 10, borderWidth: 1, borderColor: colors.warning },
  disputeBtnText: { color: colors.warning, fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { padding: 20 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  modalSub: { color: colors.textMuted, fontSize: 11, marginVertical: 8 },
  input: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder, marginVertical: 6 },
});
