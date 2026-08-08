import React, { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
  Image,
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
import { supabase } from '../../config/supabase';
import {
  Flag,
  Trophy,
  Coins,
  ShieldAlert,
  Navigation,
  Clock,
  Play,
  Video,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
  Camera,
} from 'lucide-react-native';

export const RaceDetailScreen = ({ route, navigation }: any) => {
  const { raceId } = route.params || {};
  const { races, acceptChallenge, submitRaceResult, submitDispute } = useRaceStore();
  const { user } = useAuthStore();

  const race = races.find((r) => r.id === raceId) || races[0];

  const [showReportModal, setShowReportModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showProofModal, setShowProofModal] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [proofVideoUri, setProofVideoUri] = useState<string | null>(null);
  const [proofVideoName, setProofVideoName] = useState('');
  const [claimedWinner, setClaimedWinner] = useState<'me' | 'opponent' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

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
  const myProfile = isChallenger ? race.challenger_profile : race.opponent_profile;
  const theirProfile = isChallenger ? race.opponent_profile : race.challenger_profile;
  const myDisplayName = myProfile?.display_name || user?.display_name || 'YOU';
  const theirDisplayName = theirProfile?.display_name || 'OPPONENT';

  const handleAcceptRace = async () => {
    if (!user) return;
    setIsAccepting(true);
    const { error } = await acceptChallenge(race.id, user.id);
    setIsAccepting(false);
    if (error) {
      Alert.alert('Error Accepting', error);
    } else {
      Alert.alert(
        '🏁 Race Staged!',
        `Wager of ${race.wager_credits} credits is now in escrow.\n\nBoth racers must run their telemetry and submit proof to settle the wager.`,
        [{ text: 'GO TO TELEMETRY', onPress: () => navigation.navigate('Telemetry') }, { text: 'OK' }]
      );
    }
  };

  const handlePickVideoProof = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*,image/*';
      input.onchange = (e: any) => {
        const file: File = e.target?.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) {
              setProofVideoUri(evt.target.result as string);
              setProofVideoName(file.name);
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        setProofVideoUri(result.assets[0].uri);
        setProofVideoName(`race-proof.${result.assets[0].type === 'video' ? 'mp4' : 'jpg'}`);
      }
    }
  };

  const handleSubmitProofAndResult = async () => {
    if (!claimedWinner) {
      Alert.alert('Required', 'Please select who you believe won the race.');
      return;
    }
    if (!proofVideoUri) {
      Alert.alert('Required', 'Upload video or photo proof of the finish before submitting.');
      return;
    }
    if (!user) return;

    setIsUploading(true);
    setUploadProgress(10);

    let proofUrl = proofVideoUri;

    // Attempt upload to Supabase Storage
    try {
      const ext = proofVideoName.split('.').pop() || 'mp4';
      const fileName = `race-proof/${race.id}/${user.id}_${Date.now()}.${ext}`;
      const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(ext.toLowerCase());
      const mimeType = isImage ? `image/${ext}` : 'video/mp4';

      setUploadProgress(30);

      // Convert base64 to blob for upload
      if (proofVideoUri.startsWith('data:')) {
        const base64Data = proofVideoUri.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
        const blob = new Blob([bytes], { type: mimeType });

        setUploadProgress(50);

        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('race-proofs')
          .upload(fileName, blob, { contentType: mimeType, upsert: true });

        if (!uploadErr && uploadData) {
          const { data: publicData } = supabase.storage.from('race-proofs').getPublicUrl(fileName);
          proofUrl = publicData.publicUrl;
        }
      }
    } catch (uploadErr) {
      console.log('[RaceDetail] proof upload error:', uploadErr);
      // Continue with base64 as fallback
    }

    setUploadProgress(75);

    const winnerId = claimedWinner === 'me' ? user.id : (isChallenger ? race.opponent_id : race.challenger_id);

    // Submit dispute with proof if both sides can verify
    const { error: disputeErr } = await submitDispute(
      {
        race_id: race.id,
        reason: `${myDisplayName} claims ${claimedWinner === 'me' ? 'I won' : `${theirDisplayName} won`} the race.`,
        video_proof_url: proofUrl,
        status: 'under_review',
        gps_log_data: {
          submitted_by: user.id,
          claimed_winner: winnerId,
          timestamp: Date.now(),
        },
        referee_votes: { valid_votes: 0, invalid_votes: 0 },
      },
      user.id
    );

    setUploadProgress(90);

    // Also attempt direct result submission (works if both agree)
    if (winnerId) {
      await submitRaceResult(race.id, winnerId);
    }

    setUploadProgress(100);
    setIsUploading(false);

    if (disputeErr) {
      Alert.alert('Submitted', 'Your proof has been submitted. Apex Referee Council is reviewing the telemetry.');
    } else {
      Alert.alert(
        '✅ Proof Submitted!',
        winnerId === user.id
          ? 'Your victory claim and proof have been sent to the Referee Council. Credits will be released once verified.'
          : `You've credited ${theirDisplayName} with the win. The wager will be settled shortly.`,
        [{ text: 'VIEW RESULTS', onPress: () => navigation.goBack() }]
      );
    }
    setShowProofModal(false);
  };

  const handleFileDispute = async () => {
    if (!disputeReason.trim() || !user) {
      Alert.alert('Required', 'Please enter a reason for your dispute.');
      return;
    }
    setIsSubmitting(true);
    const { error } = await submitDispute(
      {
        race_id: race.id,
        reason: disputeReason,
        video_proof_url: null,
        status: 'under_review',
        gps_log_data: { reported_by: user.id, reason: disputeReason },
        referee_votes: { valid_votes: 0, invalid_votes: 0 },
      },
      user.id
    );
    setIsSubmitting(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      Alert.alert('Dispute Filed', 'Sent to Apex Referee Council for telemetry and video review.');
      setShowDisputeModal(false);
    }
  };

  const statusColor = race.status === 'accepted' ? colors.primary : race.status === 'open' ? '#FFB800' : race.status === 'finished' ? '#00E5FF' : colors.danger;

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="RACE WAGER MATCH"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Race Hero Card */}
        <GlassCard activeGlow={race.status === 'accepted'} style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <MatrixBadge label={race.race_type?.toUpperCase() || 'RACE'} variant="green" />
            <MatrixBadge
              label={race.status.toUpperCase()}
              variant={race.status === 'accepted' ? 'gold' : race.status === 'finished' ? 'silver' : 'green'}
            />
          </View>

          {/* Wager Amount */}
          <View style={styles.wagerRow}>
            <Coins size={32} color="#FFD700" />
            <Text style={styles.wagerAmount}>{(race.wager_credits || 0).toLocaleString()} CR</Text>
            <Text style={styles.wagerLabel}>ESCROW WAGER</Text>
          </View>

          {/* VS Row */}
          <View style={styles.vsRow}>
            <View style={styles.vsRacer}>
              <Image
                source={{ uri: race.challenger_profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400' }}
                style={[styles.vsAvatar, race.winner_id === race.challenger_id && styles.vsAvatarWinner]}
              />
              <Text style={styles.vsName}>{race.challenger_profile?.display_name || 'CHALLENGER'}</Text>
              <Text style={styles.vsHandle}>@{race.challenger_profile?.username || 'challenger'}</Text>
              {race.winner_id === race.challenger_id && <Trophy size={14} color="#FFD700" />}
            </View>
            <View style={styles.vsCenter}>
              <Text style={styles.vsLabel}>VS</Text>
              <Text style={[styles.statusDot, { color: statusColor }]}>●</Text>
            </View>
            <View style={styles.vsRacer}>
              <Image
                source={{ uri: race.opponent_profile?.avatar_url || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400' }}
                style={[styles.vsAvatar, race.winner_id === race.opponent_id && styles.vsAvatarWinner]}
              />
              <Text style={styles.vsName}>{race.opponent_profile?.display_name || (race.opponent_id ? 'OPPONENT' : 'OPEN SLOT')}</Text>
              <Text style={styles.vsHandle}>@{race.opponent_profile?.username || 'anyone'}</Text>
              {race.winner_id === race.opponent_id && <Trophy size={14} color="#FFD700" />}
            </View>
          </View>

          {/* Route Info */}
          <View style={styles.routeBox}>
            <Navigation size={14} color={colors.primary} />
            <Text style={styles.routeName}>{race.route_name}</Text>
            <Text style={styles.routeDist}> · {race.distance_miles || 0.25} MI</Text>
          </View>
        </GlassCard>

        {/* Telemetry Replay (if race has started) */}
        {(race.status === 'finished' || race.status === 'in_progress') && (
          <GlassCard style={styles.replayCard}>
            <Text style={styles.sectionTitle}>TELEMETRY RUN REPLAY</Text>
            <RaceReplayViewer
              challengerName={race.challenger_profile?.display_name || 'Challenger'}
              opponentName={race.opponent_profile?.display_name || 'Opponent'}
            />
          </GlassCard>
        )}

        {/* Rules Card */}
        <GlassCard style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>MATCH RULES & PROTOCOL</Text>
          <Text style={styles.rulesText}>{race.rules || 'Standard Apex Underground racing rules apply. GPS telemetry required from both participants.'}</Text>
          <View style={styles.timeBox}>
            <Clock size={14} color={colors.textMuted} />
            <Text style={styles.timeText}>
              Start: {race.start_time ? new Date(race.start_time).toLocaleString() : 'TBD'}
            </Text>
          </View>
        </GlassCard>

        {/* Winner Banner */}
        {race.winner_id && (
          <GlassCard style={[styles.rulesCard, { borderColor: '#FFD700', borderWidth: 1.5 }] as any}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Trophy size={24} color="#FFD700" />
              <View>
                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>RACE RESULT</Text>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 }}>
                  {race.winner_id === race.challenger_id
                    ? race.challenger_profile?.display_name
                    : race.opponent_profile?.display_name} WON
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  Wager of {race.wager_credits} credits settled
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Action Buttons */}
        <View style={styles.actionBlock}>
          {/* ACCEPT — for open challenges without opponent */}
          {race.status === 'open' && !isChallenger && (
            <ApexButton
              title={isAccepting ? 'LOCKING ESCROW...' : 'ACCEPT RACE & LOCK ESCROW'}
              variant="primary"
              size="lg"
              icon={<Flag size={18} color="#000000" />}
              onPress={handleAcceptRace}
            />
          )}

          {/* GO TO TELEMETRY — once accepted */}
          {race.status === 'accepted' && isParticipant && (
            <>
              <ApexButton
                title="START LIVE TELEMETRY RUN"
                variant="primary"
                size="lg"
                icon={<Play size={18} color="#000000" />}
                onPress={() => navigation.navigate('Telemetry')}
              />
              <ApexButton
                title="SUBMIT RACE PROOF & CLAIM RESULT"
                variant="outline"
                size="lg"
                icon={<Video size={18} color={colors.primary} />}
                style={{ marginTop: 8 }}
                onPress={() => setShowProofModal(true)}
              />
            </>
          )}

          {/* SUBMIT PROOF — for in-progress or accepted */}
          {race.status === 'in_progress' && isParticipant && (
            <ApexButton
              title="SUBMIT PROOF & CLAIM RESULT"
              variant="primary"
              size="lg"
              icon={<Upload size={18} color="#000000" />}
              onPress={() => setShowProofModal(true)}
            />
          )}

          {/* FILE DISPUTE */}
          {isParticipant && !['cancelled', 'finished'].includes(race.status) && (
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

      {/* ── Submit Proof Modal ─────────────────────────────────────────────── */}
      <Modal visible={showProofModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SUBMIT RACE PROOF</Text>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Upload your dashcam or GoPro footage. Apex Referee Council will verify GPS telemetry and release the wager.
            </Text>

            {/* Who won selector */}
            <Text style={styles.proofLabel}>WHO WON THIS RACE?</Text>
            <View style={styles.winnerRow}>
              <TouchableOpacity
                style={[styles.winnerBtn, claimedWinner === 'me' && styles.winnerBtnActive]}
                onPress={() => setClaimedWinner('me')}
              >
                <CheckCircle2 size={16} color={claimedWinner === 'me' ? '#000000' : colors.textMuted} />
                <Text style={[styles.winnerBtnText, claimedWinner === 'me' && { color: '#000000' }]}>
                  I WON
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.winnerBtn, claimedWinner === 'opponent' && styles.winnerBtnActive]}
                onPress={() => setClaimedWinner('opponent')}
              >
                <AlertCircle size={16} color={claimedWinner === 'opponent' ? '#000000' : colors.textMuted} />
                <Text style={[styles.winnerBtnText, claimedWinner === 'opponent' && { color: '#000000' }]}>
                  THEY WON
                </Text>
              </TouchableOpacity>
            </View>

            {/* Video/Photo upload */}
            <Text style={styles.proofLabel}>RACE PROOF (VIDEO / PHOTO)</Text>
            <TouchableOpacity style={styles.uploadBox} onPress={handlePickVideoProof}>
              {proofVideoUri ? (
                <View style={{ alignItems: 'center' }}>
                  <CheckCircle2 size={32} color={colors.primary} />
                  <Text style={styles.uploadedText}>✓ {proofVideoName || 'PROOF SELECTED'}</Text>
                  <Text style={styles.uploadedSub}>Tap to change</Text>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Camera size={36} color={colors.textMuted} />
                  <Text style={styles.uploadPrompt}>TAP TO UPLOAD DASHCAM / GOPRO CLIP</Text>
                  <Text style={styles.uploadSub}>MP4, MOV, JPG accepted · Max 200MB</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Upload progress bar */}
            {isUploading && (
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${uploadProgress}%` as any }]} />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <ApexButton title="CANCEL" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setShowProofModal(false)} />
              <ApexButton
                title={isUploading ? `UPLOADING ${uploadProgress}%...` : 'SUBMIT PROOF'}
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                onPress={handleSubmitProofAndResult}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      {/* ── Dispute Modal ──────────────────────────────────────────────────── */}
      <Modal visible={showDisputeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>FILE REFEREE DISPUTE</Text>
              <TouchableOpacity onPress={() => setShowDisputeModal(false)}>
                <X size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              Apex Council will analyze GPS telemetry logs, speed data, and submitted video proof.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Reason for dispute (e.g. Early jump, lane cross, GPS tamper attempt...)"
              placeholderTextColor={colors.textMuted}
              value={disputeReason}
              onChangeText={setDisputeReason}
              multiline
              numberOfLines={3}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <ApexButton title="CANCEL" variant="secondary" size="md" style={{ flex: 1 }} onPress={() => setShowDisputeModal(false)} />
              <ApexButton
                title={isSubmitting ? 'FILING...' : 'SUBMIT DISPUTE'}
                variant="danger"
                size="md"
                style={{ flex: 1 }}
                onPress={handleFileDispute}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>

      <ReportUserModal
        visible={showReportModal}
        targetUsername={race.challenger_profile?.username || 'racer'}
        onClose={() => setShowReportModal(false)}
        onSubmitReport={() => Alert.alert('Report Submitted', 'Our moderation team will review this racer.')}
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
  wagerRow: { alignItems: 'center', marginVertical: 8 },
  wagerAmount: { color: '#FFD700', fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 4 },
  wagerLabel: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 2 },

  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  vsRacer: { flex: 1, alignItems: 'center', gap: 4 },
  vsCenter: { alignItems: 'center', paddingHorizontal: 12 },
  vsLabel: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  statusDot: { fontSize: 12, marginTop: 4 },
  vsAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: colors.cardBorder },
  vsAvatarWinner: { borderColor: '#FFD700', borderWidth: 3 },
  vsName: { color: colors.text, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  vsHandle: { color: colors.textMuted, fontSize: 10, fontWeight: '700', textAlign: 'center' },

  routeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.06)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    width: '100%',
  },
  routeName: { color: colors.text, fontSize: 13, fontWeight: '900', marginLeft: 6 },
  routeDist: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  replayCard: { padding: 16, marginBottom: 12 },
  rulesCard: { padding: 16, marginBottom: 12 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  rulesText: { color: colors.text, fontSize: 13, lineHeight: 20 },
  timeBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  timeText: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },

  actionBlock: { gap: 10, marginVertical: 16 },
  disputeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 184, 0, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  disputeBtnText: { color: colors.warning, fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'center', paddingHorizontal: 16 },
  modalContent: { padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  modalSub: { color: colors.textMuted, fontSize: 11, marginBottom: 16, lineHeight: 16 },

  proofLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8, marginTop: 8 },

  winnerRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  winnerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  winnerBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  winnerBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },

  uploadBox: {
    borderWidth: 2,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.02)',
  },
  uploadPrompt: { color: colors.textSecondary, fontSize: 12, fontWeight: '900', marginTop: 12, letterSpacing: 0.5 },
  uploadSub: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
  uploadedText: { color: colors.primary, fontSize: 13, fontWeight: '900', marginTop: 8 },
  uploadedSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },

  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginVertical: 4,
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
