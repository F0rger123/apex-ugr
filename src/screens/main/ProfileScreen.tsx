import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { ReportUserModal } from '../../components/common/ReportUserModal';
import { colors } from '../../config/colors';
import { ShieldCheck, Award, Coins, MapPin, Settings, LogOut, CheckCircle2, ShieldAlert, UserCheck } from 'lucide-react-native';

export const ProfileScreen = ({ navigation }: any) => {
  const { user, logout, togglePrivacyMode } = useAuthStore();
  const { vehicles } = useGarageStore();

  const [showReportModal, setShowReportModal] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="PILOT PROFILE"
        onBackPress={() => navigation.goBack()}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Hero Banner */}
        <GlassCard activeGlow style={styles.profileHero}>
          <View style={styles.heroRow}>
            <Image
              source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
              style={styles.avatar}
            />
            <View style={{ flex: 1, marginLeft: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.displayName}>{user?.display_name}</Text>
                {user?.is_verified && <CheckCircle2 size={16} color={colors.primary} style={{ marginLeft: 6 }} />}
              </View>
              <Text style={styles.username}>@{user?.username}</Text>
              <Text style={styles.homeCity}>📍 {user?.home_city}</Text>
            </View>

            <TouchableOpacity style={styles.reportBtn} onPress={() => setShowReportModal(true)}>
              <ShieldAlert size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.bioText}>{user?.bio}</Text>

          {/* Followers / Following Row */}
          <View style={styles.followStatsRow}>
            <View style={styles.followCol}>
              <Text style={styles.followVal}>1,420</Text>
              <Text style={styles.followLab}>FOLLOWERS</Text>
            </View>
            <View style={styles.followCol}>
              <Text style={styles.followVal}>389</Text>
              <Text style={styles.followLab}>FOLLOWING</Text>
            </View>

            <ApexButton
              title={isFollowing ? "FOLLOWING" : "FOLLOW RACER"}
              variant={isFollowing ? "secondary" : "primary"}
              size="sm"
              icon={isFollowing ? <UserCheck size={14} color={colors.primary} /> : undefined}
              onPress={() => setIsFollowing(!isFollowing)}
            />
          </View>

          {/* Specialties Pills */}
          <View style={styles.specialtiesRow}>
            {user?.racing_specialties.map((spec, idx) => (
              <MatrixBadge key={idx} label={spec} variant="silver" size="sm" style={{ marginRight: 6 }} />
            ))}
          </View>
        </GlassCard>

        {/* Balance & Stats Cards */}
        <View style={styles.statsRow}>
          <GlassCard style={styles.statBox}>
            <Text style={styles.statLab}>CREDITS BALANCE</Text>
            <Text style={styles.statValGold}>${user?.credits_balance.toLocaleString()} CR</Text>
          </GlassCard>

          <GlassCard style={styles.statBox}>
            <Text style={styles.statLab}>REPUTATION TIER</Text>
            <Text style={styles.statValGreen}>{user?.reputation_level}</Text>
          </GlassCard>
        </View>

        {/* Achievements Section */}
        <SectionHeader title="UNLOCKED ACHIEVEMENTS" />
        <GlassCard>
          {user?.achievements.map((ach) => (
            <View key={ach.id} style={styles.achRow}>
              <Award size={18} color={colors.primary} />
              <Text style={styles.achName}>{ach.name}</Text>
              <MatrixBadge label="UNLOCKED" variant="green" size="sm" />
            </View>
          ))}
        </GlassCard>

        {/* Privacy & Safety Settings */}
        <SectionHeader title="GPS & RADAR PRIVACY" />
        <GlassCard>
          <Text style={styles.privacySub}>Current Radar Visibility: <Text style={{ color: colors.primary }}>{user?.privacy_mode.toUpperCase()}</Text></Text>
          <View style={styles.privacyBtnGrid}>
            {(['all', 'friends', 'meet_only', 'invisible'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.pBtn, user?.privacy_mode === m && styles.pBtnActive]}
                onPress={() => togglePrivacyMode(m)}
              >
                <Text style={[styles.pBtnText, user?.privacy_mode === m && { color: colors.background }]}>
                  {m.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Logout Button */}
        <ApexButton
          title="LOGOUT FROM APEX OS"
          variant="danger"
          size="md"
          icon={<LogOut size={16} color={colors.danger} />}
          style={{ marginVertical: 20 }}
          onPress={logout}
        />

        <View style={{ height: 40 }} />
      </ScrollView>

      <ReportUserModal
        visible={showReportModal}
        targetUsername={user?.username}
        onClose={() => setShowReportModal(false)}
        onSubmitReport={(reason) => console.log('Report submitted:', reason)}
        onBlockUser={() => setShowReportModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  profileHero: { marginVertical: 8 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: colors.primary },
  displayName: { color: colors.text, fontSize: 18, fontWeight: '900' },
  username: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  homeCity: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  reportBtn: { padding: 8 },
  bioText: { color: colors.textSecondary, fontSize: 12, marginTop: 10, lineHeight: 16 },

  followStatsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  followCol: { alignItems: 'center' },
  followVal: { color: colors.text, fontSize: 14, fontWeight: '900' },
  followLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },

  specialtiesRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },

  statsRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  statBox: { flex: 1, alignItems: 'center', padding: 12 },
  statLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  statValGold: { color: colors.warning, fontSize: 16, fontWeight: '900', marginTop: 4 },
  statValGreen: { color: colors.primary, fontSize: 14, fontWeight: '900', marginTop: 4 },

  achRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  achName: { color: colors.text, fontSize: 12, fontWeight: '800', flex: 1, marginLeft: 8 },

  privacySub: { color: colors.textMuted, fontSize: 11, fontWeight: '800', marginBottom: 8 },
  privacyBtnGrid: { flexDirection: 'row', gap: 6 },
  pBtn: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  pBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pBtnText: { color: colors.text, fontSize: 9, fontWeight: '900' },
});
