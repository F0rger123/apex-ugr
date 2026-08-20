import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Users, MapPin, Clock, Navigation, CheckCircle2, Calendar, ShieldCheck, Car } from 'lucide-react-native';

export const CarMeetDetailScreen = ({ route, navigation }: any) => {
  const { meetId } = route.params || {};
  const { meets, joinMeet, currentLocation } = useMapStore();
  const { user } = useAuthStore();

  const [attendees, setAttendees] = useState<any[]>([]);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [loadingCheckin, setLoadingCheckin] = useState(false);

  const meet = meets.find((m) => m.id === meetId) || meets[0] || {
    id: meetId || 'm1',
    title: 'Apex Underground Night Meet',
    description: 'Late night gathering followed by organized roll sprints.',
    meet_type: 'Meet',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    location_name: 'LA Industrial Corridor',
    max_attendance: 150,
    attendees_count: 42,
    cover_image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    host_profile: { username: 'phantom_gtr', reputation: 1850 },
  };

  useEffect(() => {
    fetchAttendees();
  }, [meetId]);

  const fetchAttendees = async () => {
    try {
      const res = await fetch(`/api/meets/${meet.id}/attendees`);
      const data = await res.json();
      if (res.ok) {
        setAttendees(data.attendees || []);
      }
    } catch (e) {}
  };

  const handleCheckIn = async () => {
    if (!currentLocation) {
      Alert.alert('GPS Required', 'Please enable GPS location to check in at this meet.');
      return;
    }
    setLoadingCheckin(true);
    try {
      const res = await fetch(`/api/meets/${meet.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setIsCheckedIn(true);
        Alert.alert('Check-In Verified!', `Checked in at ${meet.title}. +${data.repAwarded} REP & +${data.xpAwarded} Season XP earned!`);
      } else {
        Alert.alert('Check-In Failed', data.error || 'You are too far from the meet location.');
      }
    } catch (e) {
      Alert.alert('Check-In Error', 'Unable to verify location check-in.');
    } finally {
      setLoadingCheckin(false);
    }
  };

  return (
    <View style={styles.container}>
      <ApexHeader title={meet.title} showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {meet.cover_image_url ? (
          <Image source={{ uri: meet.cover_image_url }} style={styles.heroImage} resizeMode="cover" />
        ) : null}

        <GlassCard style={styles.detailsCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <MatrixBadge label={meet.meet_type?.toUpperCase() || 'MEET'} variant="gold" />
            <Text style={{ color: colors.textMuted, fontSize: 10 }}>ORGANIZER // {meet.host_profile?.username}</Text>
          </View>

          <Text style={styles.titleText}>{meet.title}</Text>

          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.primary} />
            <Text style={styles.infoText}>{meet.location_name}</Text>
          </View>

          <View style={styles.infoRow}>
            <Calendar size={14} color={colors.primary} />
            <Text style={styles.infoText}>{new Date(meet.start_time).toLocaleString()}</Text>
          </View>

          <View style={styles.infoRow}>
            <Users size={14} color={colors.primary} />
            <Text style={styles.infoText}>{meet.attendees_count || attendees.length} ATTENDING / {meet.max_attendance || 100} CAPACITY</Text>
          </View>

          <Text style={styles.descText}>{meet.description}</Text>

          {/* Location Verified Check-In Action */}
          <TouchableOpacity
            style={[styles.checkInBtn, isCheckedIn && styles.checkInBtnDone]}
            onPress={handleCheckIn}
            disabled={isCheckedIn || loadingCheckin}
          >
            {loadingCheckin ? (
              <ActivityIndicator color="#000" size="small" />
            ) : isCheckedIn ? (
              <>
                <CheckCircle2 size={16} color={colors.primary} />
                <Text style={styles.checkInBtnTextDone}>CHECKED IN AT MEET</Text>
              </>
            ) : (
              <>
                <Navigation size={16} color="#000" />
                <Text style={styles.checkInBtnText}>LOCATION CHECK-IN</Text>
              </>
            )}
          </TouchableOpacity>
        </GlassCard>

        {/* Attending Pilots & Vehicles */}
        <SectionHeader title="ATTENDING PILOTS & VEHICLES" />
        {attendees.length === 0 ? (
          <GlassCard style={{ padding: 16, alignItems: 'center' }}>
            <Car size={24} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 6 }}>No public attendee registrations listed yet.</Text>
          </GlassCard>
        ) : (
          attendees.map((att) => (
            <GlassCard key={att.user_id} style={styles.attCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {att.avatar_url ? (
                  <Image source={{ uri: att.avatar_url }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.attName}>{att.username}</Text>
                  {att.year ? (
                    <Text style={styles.attCar}>{att.color?.toUpperCase()} {att.year} {att.make?.toUpperCase()} {att.model?.toUpperCase()}</Text>
                  ) : (
                    <Text style={styles.attCar}>VEHICLE REGISTERED</Text>
                  )}
                </View>
                <MatrixBadge label={att.role?.toUpperCase() || 'ATTENDEE'} />
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
  content: { padding: 16, paddingBottom: 40 },
  heroImage: { width: '100%', height: 180, borderRadius: 12, marginBottom: 12 },
  detailsCard: { padding: 16, marginBottom: 16 },
  titleText: { color: colors.text, fontSize: 18, fontWeight: '900', marginVertical: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 },
  infoText: { color: colors.textSecondary, fontSize: 11, fontWeight: '800' },
  descText: { color: colors.text, fontSize: 12, marginTop: 10, lineHeight: 18 },
  checkInBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.primary, paddingVertical: 12, borderRadius: 8, marginTop: 16 },
  checkInBtnDone: { backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary },
  checkInBtnText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  checkInBtnTextDone: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  attCard: { padding: 12, marginBottom: 8 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)' },
  attName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  attCar: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2 },
});
