import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { ModificationItem } from '../../components/garage/ModificationItem';
import { DynoChart } from '../../components/garage/DynoChart';
import { playEngineSound } from '../../utils/soundSynthesizer';
import { colors } from '../../config/colors';
import { Wrench, Plus, ArrowLeft, Flame, Gauge, DollarSign, Activity, X, Volume2 } from 'lucide-react-native';

export const VehicleDetailScreen = ({ route, navigation }: any) => {
  const vehicleId = route.params?.vehicleId || '11111111-1111-1111-1111-111111111111';
  const { vehicles, getVehicleModifications, getTotalBuildValue, getTotalHpGain, addModification, deleteModification } = useGarageStore();

  const vehicle = vehicles.find((v) => v.id === vehicleId) || vehicles[0];
  const modifications = getVehicleModifications(vehicle.id);
  const totalBuildValue = getTotalBuildValue(vehicle.id);
  const totalHpGain = getTotalHpGain(vehicle.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [partName, setPartName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState<string>('Turbo');
  const [price, setPrice] = useState('');
  const [hpGain, setHpGain] = useState('');
  const [torqueGain, setTorqueGain] = useState('');

  const handleAddMod = () => {
    if (!partName || !brand || !price) return;
    addModification({
      vehicle_id: vehicle.id,
      category,
      brand,
      part_name: partName,
      price: parseFloat(price) || 0,
      hp_gain: parseInt(hpGain) || 0,
      torque_gain: parseInt(torqueGain) || 0,
      purchase_source: 'Apex Marketplace',
      notes: 'Added from garage screen'
    } as any);
    setModalVisible(false);
    setPartName(''); setBrand(''); setPrice(''); setHpGain('');
  };

  const [customAudio, setCustomAudio] = useState<string | null>(null);

  const handlePlaySound = () => {
    if (customAudio) {
      // In a real app, use expo-av to play the customAudio URI
      console.log('Playing uploaded audio clip:', customAudio);
    } else {
      playEngineSound(vehicle.engine);
    }
  };

  const handleUploadSound = () => {
    // In a real app, use DocumentPicker to select an audio file and upload to Supabase Storage
    console.log('Opening audio picker...');
    setCustomAudio('uploaded_exhaust_clip.mp3');
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="VEHICLE PROFILE"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.heroImageContainer}>
          <Image source={{ uri: vehicle.photos[0] }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.heroOverlay}>
            <Text style={styles.heroMake}>{vehicle.year} {vehicle.make}</Text>
            <Text style={styles.heroModel}>{vehicle.model} {vehicle.trim}</Text>
          </View>
        </View>

        {/* Audio Sound Control */}
        <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
          <TouchableOpacity style={[styles.revSoundBanner, { flex: 1 }]} onPress={handlePlaySound}>
            <Flame size={18} color={colors.primary} />
            <Text style={styles.revSoundText}>
              {customAudio ? 'PLAY CUSTOM EXHAUST CLIP' : 'PLAY AUDIO SYNTHESIZER'}
            </Text>
            <Volume2 size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.revSoundBanner, { backgroundColor: colors.surface }]} onPress={handleUploadSound}>
            <Plus size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Build Summary Metrics */}
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLab}>TOTAL POWER</Text>
            <Text style={styles.metricValGreen}>{vehicle.horsepower} WHP</Text>
            <Text style={styles.metricSub}>+{totalHpGain} HP MOD GAIN</Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLab}>BUILD VALUE</Text>
            <Text style={styles.metricVal}>${totalBuildValue.toLocaleString()}</Text>
            <Text style={styles.metricSub}>{modifications.length} MODS LOGGED</Text>
          </GlassCard>
        </View>

        {/* Interactive Dyno Chart */}
        <SectionHeader title="DYNO POWER & TORQUE CURVE" />
        <DynoChart maxHp={vehicle.horsepower} maxTorque={vehicle.torque} engineName={vehicle.engine} />

        {/* Specs Table */}
        <SectionHeader title="VEHICLE FACTORY & DYNO SPECS" />
        <GlassCard>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Engine</Text>
            <Text style={styles.specValText}>{vehicle.engine}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Transmission</Text>
            <Text style={styles.specValText}>{vehicle.transmission}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Drivetrain</Text>
            <Text style={styles.specValText}>{vehicle.drivetrain}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Fuel System</Text>
            <Text style={styles.specValText}>{vehicle.fuel_type}</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>0-60 MPH Sprint</Text>
            <Text style={styles.specValText}>{vehicle.zero_to_sixty_sec || 2.5} seconds</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>1/4 Mile Sprint</Text>
            <Text style={styles.specValText}>{vehicle.quarter_mile_sec || 9.5} seconds</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specKey}>Top Speed</Text>
            <Text style={styles.specValText}>{vehicle.top_speed_mph} MPH</Text>
          </View>
        </GlassCard>

        {/* Aftermarket Modifications Section */}
        <View style={styles.modHeader}>
          <SectionHeader title="AFTERMARKET MODIFICATIONS" />
          <ApexButton
            title="LOG MOD"
            variant="outline"
            size="sm"
            icon={<Plus size={14} color={colors.primary} />}
            onPress={() => setModalVisible(true)}
          />
        </View>

        {modifications.map((mod) => (
          <ModificationItem
            key={mod.id}
            modification={mod}
            onDelete={() => deleteModification(mod.id)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Modification Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG AFTERMARKET PART</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 }}>
                {(['Turbo', 'Exhaust', 'Tune', 'Intake', 'Brakes', 'Suspension', 'Supercharger', 'Nitrous'] as const).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.catChip, category === c && styles.catChipActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={[styles.catChipText, category === c && { color: colors.background }]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>BRAND (e.g. Akrapovič, HKS, AMS)</Text>
              <TextInput style={styles.input} value={brand} onChangeText={setBrand} placeholder="e.g. Akrapovič" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>PART NAME</Text>
              <TextInput style={styles.input} value={partName} onChangeText={setPartName} placeholder="e.g. Titanium Evolution Exhaust" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>PRICE ($)</Text>
              <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholder="e.g. 3500" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>ESTIMATED HP GAIN (+WHP)</Text>
              <TextInput style={styles.input} value={hpGain} onChangeText={setHpGain} keyboardType="numeric" placeholder="e.g. 35" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>ESTIMATED TORQUE GAIN (+LB-FT)</Text>
              <TextInput style={styles.input} value={torqueGain} onChangeText={setTorqueGain} keyboardType="numeric" placeholder="e.g. 40" placeholderTextColor={colors.textMuted} />
            </ScrollView>

            <ApexButton title="ADD TO BUILD" onPress={handleAddMod} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  heroImageContainer: { height: 200, width: '100%', borderRadius: 16, overflow: 'hidden', marginVertical: 8 },
  heroImage: { width: '100%', height: '100%' },
  heroOverlay: { position: 'absolute', bottom: 12, left: 16, right: 16 },
  heroMake: { color: colors.primary, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  heroModel: { color: colors.text, fontSize: 24, fontWeight: '900' },

  revSoundBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0, 255, 102, 0.12)', borderColor: colors.primary, borderWidth: 1, paddingVertical: 10, borderRadius: 12, marginVertical: 6 },
  revSoundText: { color: colors.primary, fontSize: 11, fontWeight: '900', marginHorizontal: 8, letterSpacing: 0.5 },

  metricsRow: { flexDirection: 'row', gap: 10, marginVertical: 8 },
  metricCard: { flex: 1, alignItems: 'center', padding: 12 },
  metricLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  metricVal: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 4 },
  metricValGreen: { color: colors.primary, fontSize: 16, fontWeight: '900', marginTop: 4 },
  metricSub: { color: colors.textSecondary, fontSize: 9, fontWeight: '700', marginTop: 2 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  specKey: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  specValText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  modHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
  catChip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { color: colors.text, fontSize: 11, fontWeight: '800' },
});
