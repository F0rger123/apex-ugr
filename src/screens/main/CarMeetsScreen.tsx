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
import { MapPin, Calendar, Users, Navigation, Plus, Shield, Check, X } from 'lucide-react-native';

export const CarMeetsScreen = ({ navigation }: any) => {
  const { meets, addMeet } = useMapStore();
  const { user } = useAuthStore();

  const [rsvpState, setRsvpState] = useState<Record<string, boolean>>({ 'meet-1': true });
  const [modalVisible, setModalVisible] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [startTime, setStartTime] = useState('Saturday 10:00 PM');
  const [meetType, setMeetType] = useState<'Meet' | 'Cruise' | 'Show' | 'Track Day'>('Meet');

  const toggleRsvp = (meetId: string) => {
    setRsvpState((prev) => ({ ...prev, [meetId]: !prev[meetId] }));
  };

  const handleCreateMeet = () => {
    if (!title || !locationName) return;
    addMeet({
      host_id: user?.id || '00000000-0000-0000-0000-000000000001',
      title,
      description: description || 'High horsepower underground meet.',
      meet_type: meetType,
      start_time: startTime,
      latitude: 34.0522,
      longitude: -118.2437,
      location_name: locationName,
      max_attendance: 100,
      vehicle_requirements: 'All Performance Builds',
      rules: 'Respect the spot. No burnouts in main lot.',
      cover_image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop'
    });
    setModalVisible(false);
    setTitle(''); setLocationName('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>CAR MEETS & CRUISES</Text>
            <Text style={styles.subTitle}>COMMUNITY EVENTS • SCENIC RUNS • TRACK DAYS</Text>
          </View>

          <ApexButton
            title="HOST EVENT"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => setModalVisible(true)}
          />
        </View>

        {/* Meets List */}
        {meets.map((m) => {
          const isRsvped = !!rsvpState[m.id];

          return (
            <GlassCard key={m.id} style={styles.meetCard}>
              <Image source={{ uri: m.cover_image_url }} style={styles.coverImage} resizeMode="cover" />

              <View style={styles.cardBody}>
                <View style={styles.headerRow}>
                  <MatrixBadge label={m.meet_type} variant="green" size="sm" />
                  <View style={styles.attendeesBox}>
                    <Users size={12} color={colors.primary} />
                    <Text style={styles.attendeesText}>{m.attendees_count || 40} ATTENDING</Text>
                  </View>
                </View>

                <Text style={styles.meetTitle}>{m.title}</Text>
                <Text style={styles.meetDesc}>{m.description}</Text>

                <View style={styles.infoRow}>
                  <MapPin size={14} color={colors.primary} />
                  <Text style={styles.infoText}>{m.location_name}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Calendar size={14} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{m.start_time}</Text>
                </View>

                <Text style={styles.reqText}>Requirements: {m.vehicle_requirements}</Text>

                {/* Actions */}
                <View style={styles.actionRow}>
                  <ApexButton
                    title={isRsvped ? "RSVP'D (GOING)" : "RSVP GOING"}
                    variant={isRsvped ? "secondary" : "primary"}
                    size="sm"
                    style={{ flex: 1 }}
                    icon={isRsvped ? <Check size={14} color={colors.primary} /> : undefined}
                    onPress={() => toggleRsvp(m.id)}
                  />

                  <ApexButton
                    title="NAVIGATE"
                    variant="outline"
                    size="sm"
                    style={{ flex: 1, marginLeft: 8 }}
                    icon={<Navigation size={14} color={colors.primary} />}
                    onPress={() => navigation.navigate('Map')}
                  />
                </View>
              </View>
            </GlassCard>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Host Event Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>HOST CAR MEET OR CRUISE</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }}>
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
              <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Midnight Roll Sprint" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>LOCATION NAME</Text>
              <TextInput style={styles.input} value={locationName} onChangeText={setLocationName} placeholder="e.g. LA Port Warehouse District" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>START TIME</Text>
              <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="e.g. Friday 11:00 PM" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>DESCRIPTION & RULES</Text>
              <TextInput style={[styles.input, { height: 70 }]} value={description} onChangeText={setDescription} multiline placeholder="Describe the meet guidelines and pace..." placeholderTextColor={colors.textMuted} />
            </ScrollView>

            <ApexButton title="PUBLISH EVENT" onPress={handleCreateMeet} style={{ marginTop: 12 }} />
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
  meetCard: { padding: 0, marginBottom: 16 },
  coverImage: { height: 140, width: '100%', backgroundColor: colors.surface },
  cardBody: { padding: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  attendeesBox: { flexDirection: 'row', alignItems: 'center' },
  attendeesText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 4 },
  meetTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
  meetDesc: { color: colors.textSecondary, fontSize: 12, marginTop: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  infoText: { color: colors.text, fontSize: 12, fontWeight: '700', marginLeft: 6 },
  reqText: { color: colors.textMuted, fontSize: 10, marginTop: 6, fontStyle: 'italic' },
  actionRow: { flexDirection: 'row', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
  typeChip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  typeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typeChipText: { color: colors.text, fontSize: 11, fontWeight: '800' },
});
