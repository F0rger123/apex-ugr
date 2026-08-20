import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useCotwStore } from '../../stores/carOfTheWeekStore';
import { useGarageStore } from '../../stores/garageStore';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../common/GlassCard';
import { SectionHeader } from '../common/SectionHeader';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { Trophy, Award, ThumbsUp, Camera, Music, Wrench, X, Sparkles } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const CarOfTheWeekModal: React.FC<Props> = ({ visible, onClose }) => {
  const { weekIdentifier, submissions, myVotes, fetchActive, submitVehicle, vote, winnersArchive, fetchArchive, isLoading } = useCotwStore();
  const { vehicles, fetchVehicles } = useGarageStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'submissions' | 'submit' | 'archive'>('submissions');
  const [selectedCategory, setSelectedCategory] = useState<'appearance' | 'build' | 'sound'>('appearance');

  // Submit form state
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [description, setDescription] = useState('');
  const [buildInfo, setBuildInfo] = useState('');
  const [mediaUrlInput, setMediaUrlInput] = useState('');

  useEffect(() => {
    if (visible) {
      fetchActive();
      fetchArchive();
      if (user?.id) fetchVehicles(user.id);
    }
  }, [visible, user?.id]);

  const filteredSubmissions = submissions.filter((s) => s.category === selectedCategory);
  const userVotedInCat = myVotes.some((v) => v.category === selectedCategory);

  const handleSubmit = async () => {
    if (!selectedVehicleId) {
      Alert.alert('Vehicle Required', 'Select a vehicle from your garage to submit.');
      return;
    }

    const veh = vehicles.find((v) => v.id === selectedVehicleId);
    const title = veh ? `${veh.year} ${veh.make} ${veh.model}` : 'Registered Vehicle';
    const mediaUrls = mediaUrlInput.trim() ? [mediaUrlInput.trim()] : (veh?.photos?.[0] ? [veh.photos[0]] : []);

    const ok = await submitVehicle({
      category: selectedCategory,
      vehicleId: selectedVehicleId,
      yearMakeModel: title,
      mediaUrls,
      description,
      buildInfo,
    });

    if (ok) {
      Alert.alert('Submitted!', 'Your vehicle is now entered in Car of the Week.');
      setActiveTab('submissions');
    }
  };

  const handleVote = async (submissionId: string) => {
    const ok = await vote(submissionId, selectedCategory);
    if (ok) {
      Alert.alert('Vote Cast!', 'Your vote for Car of the Week has been counted.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.titleText}>CAR OF THE WEEK</Text>
              <Text style={styles.subText}>{weekIdentifier || 'WEEKLY COMPETITION'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Nav Tabs */}
          <View style={styles.tabRow}>
            <TouchableOpacity style={[styles.navTab, activeTab === 'submissions' && styles.navTabActive]} onPress={() => setActiveTab('submissions')}>
              <Text style={[styles.navTabText, activeTab === 'submissions' && styles.navTabTextActive]}>SUBMISSIONS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navTab, activeTab === 'submit' && styles.navTabActive]} onPress={() => setActiveTab('submit')}>
              <Text style={[styles.navTabText, activeTab === 'submit' && styles.navTabTextActive]}>SUBMIT CAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.navTab, activeTab === 'archive' && styles.navTabActive]} onPress={() => setActiveTab('archive')}>
              <Text style={[styles.navTabText, activeTab === 'archive' && styles.navTabTextActive]}>ARCHIVE</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'submissions' ? (
            <ScrollView style={{ flex: 1 }}>
              {/* Category selector */}
              <View style={styles.catSelector}>
                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'appearance' && styles.catBtnActive]} onPress={() => setSelectedCategory('appearance')}>
                  <Camera size={14} color={selectedCategory === 'appearance' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.catText, selectedCategory === 'appearance' && styles.catTextActive]}>APPEARANCE</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'build' && styles.catBtnActive]} onPress={() => setSelectedCategory('build')}>
                  <Wrench size={14} color={selectedCategory === 'build' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.catText, selectedCategory === 'build' && styles.catTextActive]}>BEST BUILD</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'sound' && styles.catBtnActive]} onPress={() => setSelectedCategory('sound')}>
                  <Music size={14} color={selectedCategory === 'sound' ? colors.primary : colors.textMuted} />
                  <Text style={[styles.catText, selectedCategory === 'sound' && styles.catTextActive]}>BEST SOUND</Text>
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
              ) : filteredSubmissions.length === 0 ? (
                <GlassCard style={{ padding: 20, alignItems: 'center', marginTop: 10 }}>
                  <Trophy size={32} color={colors.textMuted} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>No submissions in this category yet.</Text>
                  <TouchableOpacity onPress={() => setActiveTab('submit')} style={{ marginTop: 12 }}>
                    <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>BE THE FIRST TO SUBMIT</Text>
                  </TouchableOpacity>
                </GlassCard>
              ) : (
                filteredSubmissions.map((sub) => (
                  <GlassCard key={sub.id} style={styles.subCard}>
                    {sub.media_urls?.[0] ? (
                      <Image source={{ uri: sub.media_urls[0] }} style={styles.subImage} resizeMode="cover" />
                    ) : null}
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.carTitle}>{sub.year_make_model}</Text>
                        <Text style={styles.voteCount}>{sub.votes_count} VOTES</Text>
                      </View>
                      <Text style={styles.ownerText}>OWNER // {sub.username || 'APEX PILOT'}</Text>
                      {sub.description ? <Text style={styles.descText}>{sub.description}</Text> : null}
                      {sub.build_info ? <Text style={styles.buildText}>BUILD // {sub.build_info}</Text> : null}

                      <TouchableOpacity
                        style={[styles.voteBtn, userVotedInCat && styles.voteBtnDisabled]}
                        disabled={userVotedInCat}
                        onPress={() => handleVote(sub.id)}
                      >
                        <ThumbsUp size={14} color="#000" />
                        <Text style={styles.voteBtnText}>{userVotedInCat ? 'VOTED' : 'VOTE FOR THIS CAR'}</Text>
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                ))
              )}
            </ScrollView>
          ) : activeTab === 'submit' ? (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
              <SectionHeader title="SELECT VEHICLE" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {vehicles.map((v) => (
                  <TouchableOpacity
                    key={v.id}
                    style={[styles.vehChip, selectedVehicleId === v.id && styles.vehChipSelected]}
                    onPress={() => setSelectedVehicleId(v.id)}
                  >
                    <Text style={[styles.vehChipText, selectedVehicleId === v.id && styles.vehChipTextSelected]}>
                      {v.year} {v.make} {v.model}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <SectionHeader title="SUBMISSION CATEGORY" />
              <View style={styles.catSelector}>
                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'appearance' && styles.catBtnActive]} onPress={() => setSelectedCategory('appearance')}>
                  <Text style={[styles.catText, selectedCategory === 'appearance' && styles.catTextActive]}>APPEARANCE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'build' && styles.catBtnActive]} onPress={() => setSelectedCategory('build')}>
                  <Text style={[styles.catText, selectedCategory === 'build' && styles.catTextActive]}>BUILD</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.catBtn, selectedCategory === 'sound' && styles.catBtnActive]} onPress={() => setSelectedCategory('sound')}>
                  <Text style={[styles.catText, selectedCategory === 'sound' && styles.catTextActive]}>SOUND CLIP</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>DESCRIPTION / PRESENTATION</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Fitment, paint, stance, or sound clip details..."
                placeholderTextColor={colors.textMuted}
                value={description}
                onChangeText={setDescription}
                multiline
              />

              <Text style={styles.inputLabel}>MODIFICATIONS & BUILD LIST</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Turbo setup, suspension, wheels, tune..."
                placeholderTextColor={colors.textMuted}
                value={buildInfo}
                onChangeText={setBuildInfo}
                multiline
              />

              <Text style={styles.inputLabel}>MEDIA PHOTO / AUDIO URL (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputSingle}
                placeholder="https://..."
                placeholderTextColor={colors.textMuted}
                value={mediaUrlInput}
                onChangeText={setMediaUrlInput}
              />

              <ApexButton title="SUBMIT TO CAR OF THE WEEK" onPress={handleSubmit} style={{ marginTop: 16 }} />
            </ScrollView>
          ) : (
            <ScrollView style={{ flex: 1 }}>
              <SectionHeader title="PAST WEEKLY CHAMPIONS" />
              {winnersArchive.length === 0 ? (
                <GlassCard style={{ padding: 20, alignItems: 'center' }}>
                  <Award size={32} color={colors.primary} />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>Past weekly champions will appear here.</Text>
                </GlassCard>
              ) : (
                winnersArchive.map((w) => (
                  <GlassCard key={w.id} style={{ marginBottom: 10, padding: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '900' }}>{w.week_identifier} · {w.category.toUpperCase()}</Text>
                      <Sparkles size={14} color={colors.primary} />
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 4 }}>{w.year} {w.make} {w.model}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>CHAMPION // {w.username}</Text>
                  </GlassCard>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.deepSpace, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder, height: '88%', padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleText: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  subText: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  closeBtn: { padding: 4 },
  tabRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
  navTab: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  navTabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary },
  navTabText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  navTabTextActive: { color: colors.primary },
  catSelector: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  catBtn: { flex: 1, flexDirection: 'row', gap: 4, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  catBtnActive: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,102,0.05)' },
  catText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  catTextActive: { color: colors.primary },
  subCard: { marginBottom: 12, overflow: 'hidden' },
  subImage: { width: '100%', height: 160 },
  carTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  voteCount: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  ownerText: { color: colors.textSecondary, fontSize: 10, marginVertical: 2 },
  descText: { color: colors.text, fontSize: 11, marginTop: 4 },
  buildText: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  voteBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 6, paddingVertical: 8, marginTop: 10 },
  voteBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.2)' },
  voteBtnText: { color: '#000', fontSize: 11, fontWeight: '900' },
  vehChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginRight: 8 },
  vehChipSelected: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,102,0.1)' },
  vehChipText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  vehChipTextSelected: { color: colors.primary },
  inputLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  textInput: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: colors.text, padding: 10, fontSize: 12, height: 60, textAlignVertical: 'top' },
  textInputSingle: { backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: colors.text, padding: 10, fontSize: 12, height: 40 },
});
