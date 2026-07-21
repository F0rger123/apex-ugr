import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useMapStore } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Calendar, MapPin, Users, Plus, Navigation, Clock, ShieldCheck, CheckCircle2, X } from 'lucide-react-native';

export const CarMeetsScreen = ({ navigation }: any) => {
  const { meets } = useMapStore();
  const { user } = useAuthStore();

  const [rsvpState, setRsvpState] = useState<{ [meetId: string]: 'going' | 'maybe' | 'none' }>({
    'meet-1': 'going',
  });
  const [selectedMeetDetails, setSelectedMeetDetails] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [meetType, setMeetType] = useState<'Meet' | 'Cruise' | 'Show' | 'Track Day'>('Cruise');

  const toggleRsvp = (meetId: string, status: 'going' | 'maybe') => {
    setRsvpState((prev) => ({
      ...prev,
      [meetId]: prev[meetId] === status ? 'none' : status,
    }));
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="CAR MEETS & CRUISES"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Action Bar */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>CAR MEETS & CRUISES</Text>
            <Text style={styles.subTitle}>LOCAL EVENTS • CRUISE ROUTES • TRACK DAYS</Text>
          </View>

          <ApexButton
            title="HOST EVENT"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => setShowCreateModal(true)}
          />
        </View>

        {/* Meets List */}
        {meets.map((meet) => {
          const userRsvp = rsvpState[meet.id] || 'none';

          return (
            <GlassCard key={meet.id} style={styles.meetCard}>
              <View style={styles.imageBox}>
                <Image source={{ uri: meet.cover_image_url }} style={styles.meetImage} resizeMode="cover" />
                <View style={styles.badgeTop}>
                  <MatrixBadge label={meet.meet_type} variant="green" size="sm" />
                </View>
              </View>

              <View style={styles.meetInfo}>
                <Text style={styles.meetTitle}>{meet.title}</Text>
                <Text style={styles.meetDesc} numberOfLines={2}>{meet.description}</Text>

                <View style={styles.metaRow}>
                  <MapPin size={12} color={colors.primary} />
                  <Text style={styles.metaText}>{meet.location_name}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Clock size={12} color={colors.warning} />
                  <Text style={styles.metaText}>
                    {new Date(meet.start_time).toLocaleDateString()} @ {new Date(meet.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <View style={styles.metaRow}>
                  <Users size={12} color={colors.textSecondary} />
                  <Text style={styles.metaText}>{meet.attendees_count || 48} Racers Attending • Max {meet.max_attendance}</Text>
                </View>

                {/* Requirements Tag */}
                <View style={styles.reqPill}>
                  <ShieldCheck size={10} color={colors.primary} />
                  <Text style={styles.reqText}>REQ: {meet.vehicle_requirements}</Text>
                </View>

                {/* RSVP Controls */}
                <View style={styles.rsvpRow}>
                  <TouchableOpacity
                    style={[styles.rsvpBtn, userRsvp === 'going' && styles.rsvpBtnActive]}
                    onPress={() => toggleRsvp(meet.id, 'going')}
                  >
                    <CheckCircle2 size={12} color={userRsvp === 'going' ? colors.background : colors.primary} />
                    <Text style={[styles.rsvpBtnText, userRsvp === 'going' && { color: colors.background }]}>
                      {userRsvp === 'going' ? 'RSVP: GOING' : 'RSVP GOING'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.rsvpBtn, userRsvp === 'maybe' && styles.rsvpBtnActiveGold]}
                    onPress={() => toggleRsvp(meet.id, 'maybe')}
                  >
                    <Text style={[styles.rsvpBtnText, userRsvp === 'maybe' && { color: colors.background }]}>MAYBE</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navBtn}
                    onPress={() => navigation.navigate('Map')}
                  >
                    <Navigation size={12} color={colors.text} />
                    <Text style={styles.navBtnText}>GPS NAV</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </GlassCard>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Host Event Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>HOST CAR MEET OR CRUISE</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.label}>EVENT TYPE</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                {(['Meet', 'Cruise', 'Show', 'Track Day'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeChip, meetType === t && styles.typeChipActive]}
                    onPress={() => setMeetType(t)}
                  >
                    <Text style={[styles.typeChipText, meetType === t && { color: colors.background }]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>EVENT TITLE</Text>
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. LA Midnight Highway Roll" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>LOCATION / START POINT</Text>
              <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. Angeles Crest Highway Mile 14" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>EVENT DESCRIPTION & RULES</Text>
              <TextInput style={[styles.input, { height: 70 }]} value={description} onChangeText={setDescription} multiline placeholder="No burnouts, respect location..." placeholderTextColor={colors.textMuted} />
            </ScrollView>

            <ApexButton title="PUBLISH CAR MEET" onPress={() => setShowCreateModal(false)} style={{ marginTop: 12 }} />
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

  meetCard: { padding: 0, marginBottom: 14 },
  imageBox: { height: 140, width: '100%', backgroundColor: colors.surface },
  meetImage: { width: '100%', height: '100%' },
  badgeTop: { position: 'absolute', top: 10, left: 10 },
  meetInfo: { padding: 12 },
  meetTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  meetDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4, lineHeight: 16 },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { color: colors.textSecondary, fontSize: 11, fontWeight: '700', marginLeft: 6 },

  reqPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0, 255, 102, 0.1)', borderColor: 'rgba(0, 255, 102, 0.3)', borderWidth: 1, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6, marginTop: 8, alignSelf: 'flex-start' },
  reqText: { color: colors.primary, fontSize: 9, fontWeight: '800', marginLeft: 4 },

  rsvpRow: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.06)' },
  rsvpBtn: { flex: 1, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rsvpBtnActive: { backgroundColor: colors.primary },
  rsvpBtnActiveGold: { backgroundColor: colors.warning, borderColor: colors.warning },
  rsvpBtnText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 4 },
  navBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.card, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center' },
  navBtnText: { color: colors.text, fontSize: 10, fontWeight: '800', marginLeft: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  typeChip: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { color: colors.text, fontSize: 10, fontWeight: '800' },
});
