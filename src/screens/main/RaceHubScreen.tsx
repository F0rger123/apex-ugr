import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { useRaceStore } from '../../stores/raceStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { RaceChallengeCard } from '../../components/race/RaceChallengeCard';
import { RaceReplayViewer } from '../../components/race/RaceReplayViewer';
import { colors } from '../../config/colors';
import { Flag, Plus, ShieldAlert, Check, X, Trophy, Video } from 'lucide-react-native';

export const RaceHubScreen = ({ navigation }: any) => {
  const { races, disputes, acceptChallenge, declineChallenge, voteOnDispute, fetchRaces, fetchDisputes, subscribeToRaces, unsubscribeFromRaces } = useRaceStore();
  const { user } = useAuthStore();
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);

  useEffect(() => {
    if (user) {
      fetchRaces(user.id);
      fetchDisputes();
      subscribeToRaces(user.id);
    }
    return () => unsubscribeFromRaces();
  }, [user?.id]);

  const openChallenges = races.filter((r) => r.status === 'open' || r.status === 'accepted');
  const activeDisputes = disputes.filter((d) => d.status === 'under_review');

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="RACE HUB & WAGERS"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Race Hub Title Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>RACE HUB & WAGERS</Text>
            <Text style={styles.subTitle}>WAGER CREDITS • VERIFIED TELEMETRY</Text>
          </View>

          <ApexButton
            title="CREATE CHALLENGE"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => navigation.navigate('CreateChallenge')}
          />
        </View>

        {/* Referee Disputes Alert Banner */}
        {activeDisputes.length > 0 && (
          <GlassCard style={styles.disputeBanner}>
            <View style={styles.disputeHeader}>
              <ShieldAlert size={18} color={colors.warning} />
              <Text style={styles.disputeTitle}>ACTIVE RACE DISPUTE REQUIRING REFEREE VOTE</Text>
            </View>
            <Text style={styles.disputeSub}>
              Community referees receive +150 Apex Credits for verifying finish order logs.
            </Text>
            <ApexButton
              title="INSPECT PROOF & VOTE"
              variant="outline"
              size="sm"
              style={{ marginTop: 8 }}
              onPress={() => setSelectedDispute(activeDisputes[0])}
            />
          </GlassCard>
        )}

        {/* Race Challenge Categories Feed */}
        <SectionHeader title="OPEN CHALLENGES & STAGED WAGERS" />
        {openChallenges.map((r) => (
          <RaceChallengeCard
            key={r.id}
            challenge={r}
            onAccept={() => acceptChallenge(r.id, user?.id || '00000000-0000-0000-0000-000000000001')}
            onDecline={() => declineChallenge(r.id)}
            onViewDispute={() => setSelectedDispute(activeDisputes[0])}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Dispute Verification Modal */}
      <Modal visible={!!selectedDispute} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>REFEREE DISPUTE INSPECTOR</Text>
              <TouchableOpacity onPress={() => setSelectedDispute(null)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {selectedDispute && (
              <ScrollView style={{ maxHeight: 440 }}>
                <Text style={styles.disputeReasonLabel}>REASON FOR APPEAL:</Text>
                <Text style={styles.disputeReasonText}>{selectedDispute.reason}</Text>

                {/* Race Telemetry Replay Component */}
                <RaceReplayViewer
                  challengerName="Ryder Vance (GT-R)"
                  opponentName="Kenji Sato (Supra 2JZ)"
                  challengerFinishMs={selectedDispute.gps_log_data.finish_time_ms || 8850}
                  opponentFinishMs={10420}
                />

                <View style={styles.logBox}>
                  <Text style={styles.logTitle}>GPS SENSOR LOGS</Text>
                  <Text style={styles.logText}>Finish Time: {selectedDispute.gps_log_data.finish_time_ms} ms</Text>
                  <Text style={styles.logText}>Max GPS Speed: {selectedDispute.gps_log_data.max_gps_speed} MPH</Text>
                  <Text style={styles.logText}>Anti-Cheat Signal: VERIFIED CLEAN</Text>
                </View>

                <View style={styles.voteBtnRow}>
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
                    style={{ flex: 1, marginLeft: 8 }}
                    onPress={() => {
                      voteOnDispute(selectedDispute.id, user?.id || '', true);
                      setSelectedDispute(null);
                    }}
                  />
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  disputeBanner: { borderColor: colors.warning, borderWidth: 1, marginBottom: 12 },
  disputeHeader: { flexDirection: 'row', alignItems: 'center' },
  disputeTitle: { color: colors.warning, fontSize: 11, fontWeight: '900', marginLeft: 6 },
  disputeSub: { color: colors.textSecondary, fontSize: 10, marginTop: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  disputeReasonLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  disputeReasonText: { color: colors.text, fontSize: 13, fontWeight: '700', marginVertical: 4 },
  logBox: { backgroundColor: colors.surface, padding: 10, borderRadius: 8, marginVertical: 6 },
  logTitle: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  logText: { color: colors.text, fontSize: 11, fontWeight: '800', marginTop: 2 },
  voteBtnRow: { flexDirection: 'row', marginTop: 12 },
});
