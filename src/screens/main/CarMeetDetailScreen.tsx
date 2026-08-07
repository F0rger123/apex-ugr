import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMapStore, CarMeetWithHost } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import {
  Users,
  MapPin,
  Clock,
  Navigation,
  ShieldCheck,
  CheckCircle,
  Share2,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';

export const CarMeetDetailScreen = ({ route, navigation }: any) => {
  const { meetId } = route.params || {};
  const { meets, joinMeet } = useMapStore();
  const { user } = useAuthStore();

  const meet = meets.find((m) => m.id === meetId) || meets[0] || {
    id: 'm1',
    title: 'Midnight Apex Underground Meet & Roll Sprint',
    description: 'Late night high-horsepower gathering followed by organized highway roll runs on closed industrial corridors.',
    meet_type: 'Meet',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    location_name: 'Los Angeles Port Warehouse District',
    max_attendance: 150,
    attendees_count: 42,
    rules: 'No burnouts in populated lots. Follow lead pace cars.',
    vehicle_requirements: 'Minimum 500+ WHP or Verified Sports Cars',
    cover_image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    host_profile: {
      username: 'phantom_gtr',
      display_name: 'Ryder Vance',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop',
    },
  };

  const [hasRsvped, setHasRsvped] = useState(false);

  const handleRsvp = async () => {
    if (!user) return;
    await joinMeet(meet.id, user.id);
    setHasRsvped(true);
    Alert.alert('RSVP Confirmed!', 'You are registered for this meet. Get your ride ready!');
  };

  const handleStartNavigation = () => {
    Alert.alert('GPS Navigation Started', `Routing to ${meet.location_name}`);
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="CAR MEET DETAILS"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cover Photo Hero */}
        <View style={styles.coverContainer}>
          <Image source={{ uri: meet.cover_image_url }} style={styles.coverImage} resizeMode="cover" />
          <View style={styles.coverOverlay} />
          <View style={styles.typeBadgeBox}>
            <MatrixBadge label={meet.meet_type.toUpperCase()} variant="green" />
          </View>
        </View>

        {/* Meet Header Info */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.meetTitle}>{meet.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <MapPin size={14} color={colors.primary} />
              <Text style={styles.metaText}>{meet.location_name}</Text>
            </View>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.textSecondary} />
              <Text style={styles.metaText}>{new Date(meet.start_time).toLocaleString()}</Text>
            </View>
          </View>

          {/* Host Info */}
          {meet.host_profile && (
            <View style={styles.hostRow}>
              <Image source={{ uri: meet.host_profile.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }} style={styles.hostAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.hostRole}>EVENT HOST & ORGANIZER</Text>
                <Text style={styles.hostName}>{meet.host_profile.display_name} (@{meet.host_profile.username})</Text>
              </View>
              <ShieldCheck size={18} color={colors.primary} />
            </View>
          )}
        </GlassCard>

        {/* RSVP & Navigation Buttons */}
        <View style={styles.actionRow}>
          <ApexButton
            title={hasRsvped ? 'RSVP CONFIRMED ✓' : 'RSVP FOR CAR MEET'}
            variant={hasRsvped ? 'secondary' : 'primary'}
            size="lg"
            style={{ flex: 1 }}
            icon={<CheckCircle size={18} color={hasRsvped ? colors.primary : colors.background} />}
            onPress={handleRsvp}
          />
          <TouchableOpacity style={styles.navBtn} onPress={handleStartNavigation}>
            <Navigation size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        {/* Description & Vehicle Requirements */}
        <GlassCard style={styles.descCard}>
          <Text style={styles.sectionTitle}>EVENT OVERVIEW</Text>
          <Text style={styles.descText}>{meet.description}</Text>

          <View style={styles.reqBox}>
            <AlertTriangle size={14} color={colors.warning} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.reqTitle}>VEHICLE REQUIREMENTS</Text>
              <Text style={styles.reqText}>{meet.vehicle_requirements || 'Open to all tuned & performance vehicles.'}</Text>
            </View>
          </View>
        </GlassCard>

        {/* Event Rules */}
        <GlassCard style={styles.rulesCard}>
          <Text style={styles.sectionTitle}>LOCATION & SAFETY RULES</Text>
          <Text style={styles.rulesText}>{meet.rules || 'Respect the spot. No excessive revving or reckless driving near entrance.'}</Text>
        </GlassCard>

        {/* Attendee Roster List */}
        <SectionHeader title={`CONFIRMED ATTENDEES (${meet.attendees_count || 1})`} />
        <GlassCard style={styles.attendeeCard}>
          {[
            { name: 'Ryder Vance', car: '2024 Nissan GT-R Nismo', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' },
            { name: 'Elena Rostova', car: '2023 Porsche 911 GT3 RS', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop' },
            { name: 'Kenji Sato', car: '1998 Toyota Supra 2JZ', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop' },
          ].map((att, idx) => (
            <View key={att.name} style={[styles.attendeeRow, idx > 0 && styles.attendeeRowBorder]}>
              <Image source={{ uri: att.avatar }} style={styles.attendeeAvatar} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.attendeeName}>{att.name}</Text>
                <Text style={styles.attendeeCar}>{att.car}</Text>
              </View>
              <MatrixBadge label="RSVP" variant="green" size="sm" />
            </View>
          ))}
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },

  coverContainer: { height: 200, borderRadius: 16, overflow: 'hidden', marginVertical: 12, position: 'relative' },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,9,12,0.4)' },
  typeBadgeBox: { position: 'absolute', top: 12, left: 12 },

  infoCard: { padding: 16, marginBottom: 12 },
  meetTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },

  metaRow: { marginTop: 12, gap: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },

  hostRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  hostAvatar: { width: 36, height: 36, borderRadius: 18 },
  hostRole: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hostName: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  navBtn: { width: 50, height: 50, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  descCard: { padding: 16, marginBottom: 12 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  descText: { color: colors.text, fontSize: 13, lineHeight: 20 },

  reqBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,184,0,0.06)', padding: 10, borderRadius: 8, marginTop: 12, borderWidth: 1, borderColor: 'rgba(255,184,0,0.2)' },
  reqTitle: { color: colors.warning, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  reqText: { color: colors.text, fontSize: 11, marginTop: 2 },

  rulesCard: { padding: 16, marginBottom: 12 },
  rulesText: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },

  attendeeCard: { padding: 12, marginBottom: 12 },
  attendeeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  attendeeRowBorder: { borderTopWidth: 1, borderTopColor: colors.cardBorder },
  attendeeAvatar: { width: 34, height: 34, borderRadius: 17 },
  attendeeName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  attendeeCar: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
});
