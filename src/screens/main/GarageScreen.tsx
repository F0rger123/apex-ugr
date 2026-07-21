import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { VehicleCard } from '../../components/garage/VehicleCard';
import { colors } from '../../config/colors';
import { Plus, Car, Wrench, Shield, Check, X } from 'lucide-react-native';

export const GarageScreen = ({ navigation }: any) => {
  const { vehicles, setPrimaryVehicle, getTotalBuildValue, getTotalHpGain, addVehicle } = useGarageStore();
  const [modalVisible, setModalVisible] = useState(false);

  // Form State for Adding Vehicle
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [trim, setTrim] = useState('');
  const [engine, setEngine] = useState('');
  const [transmission, setTransmission] = useState('');
  const [horsepower, setHorsepower] = useState('');
  const [torque, setTorque] = useState('');
  const [drivetrain, setDrivetrain] = useState<'AWD' | 'RWD' | 'FWD'>('AWD');

  const handleAddVehicle = () => {
    if (!make || !model || !horsepower) return;
    addVehicle({
      user_id: '00000000-0000-0000-0000-000000000001',
      year: parseInt(year) || 2024,
      make,
      model,
      trim: trim || undefined,
      color: 'Custom Stealth',
      nickname: model.toUpperCase(),
      engine: engine || 'Twin-Turbo V6',
      transmission: transmission || 'Sequential Dual Clutch',
      horsepower: parseInt(horsepower) || 600,
      torque: parseInt(torque) || 550,
      weight_lbs: 3500,
      top_speed_mph: 190,
      zero_to_sixty_sec: 2.8,
      drivetrain,
      fuel_type: 'E85 Flex Fuel',
      photos: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop'],
      is_primary: false
    });
    setModalVisible(false);
    setMake(''); setModel(''); setHorsepower('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Garage Summary Header */}
        <View style={styles.summaryBar}>
          <View>
            <Text style={styles.summaryTitle}>DIGITAL GARAGE</Text>
            <Text style={styles.summarySub}>{vehicles.length} VEHICLES LOGGED</Text>
          </View>

          <ApexButton
            title="ADD RIDE"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => setModalVisible(true)}
          />
        </View>

        {/* Vehicles List */}
        <SectionHeader title="FLEET & VEHICLES" />
        {vehicles.map((v) => {
          const buildVal = getTotalBuildValue(v.id);
          const hpGain = getTotalHpGain(v.id);

          return (
            <View key={v.id} style={styles.vehicleWrapper}>
              <VehicleCard
                vehicle={v}
                totalBuildValue={buildVal}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
              />

              {/* Quick Action Strip */}
              <View style={styles.actionStrip}>
                {!v.is_primary && (
                  <TouchableOpacity
                    style={styles.setPrimaryBtn}
                    onPress={() => setPrimaryVehicle(v.id)}
                  >
                    <Check size={12} color={colors.primary} />
                    <Text style={styles.setPrimaryText}>SET PRIMARY</Text>
                  </TouchableOpacity>
                )}
                {hpGain > 0 && (
                  <MatrixBadge label={`BUILD HP GAIN: +${hpGain} WHP`} variant="green" size="sm" />
                )}
                <TouchableOpacity
                  style={styles.viewBuildBtn}
                  onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
                >
                  <Wrench size={12} color={colors.textSecondary} />
                  <Text style={styles.viewBuildText}>MOD LOGS</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Vehicle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG NEW VEHICLE</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }}>
              <Text style={styles.label}>YEAR</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" />

              <Text style={styles.label}>MAKE (e.g. Nissan, Porsche, Toyota)</Text>
              <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="e.g. Nissan" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>MODEL (e.g. GT-R, 911 GT3, Supra)</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. GT-R" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>TRIM (optional)</Text>
              <TextInput style={styles.input} value={trim} onChangeText={setTrim} placeholder="e.g. Nismo / Track Edition" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>HORSEPOWER (WHP)</Text>
              <TextInput style={styles.input} value={horsepower} onChangeText={setHorsepower} keyboardType="numeric" placeholder="e.g. 850" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>TORQUE (LB-FT)</Text>
              <TextInput style={styles.input} value={torque} onChangeText={setTorque} keyboardType="numeric" placeholder="e.g. 780" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>DRIVETRAIN</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
                {(['AWD', 'RWD', 'FWD'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.driveBtn, drivetrain === d && styles.driveBtnActive]}
                    onPress={() => setDrivetrain(d)}
                  >
                    <Text style={[styles.driveBtnText, drivetrain === d && { color: colors.background }]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <ApexButton title="SAVE TO GARAGE" onPress={handleAddVehicle} style={{ marginTop: 12 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  summaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 12,
  },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  summarySub: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  vehicleWrapper: { marginBottom: 16 },
  actionStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 8,
    borderRadius: 8,
    marginTop: -10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  setPrimaryBtn: { flexDirection: 'row', alignItems: 'center' },
  setPrimaryText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 4 },
  viewBuildBtn: { flexDirection: 'row', alignItems: 'center' },
  viewBuildText: { color: colors.textSecondary, fontSize: 10, fontWeight: '800', marginLeft: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
  driveBtn: { flex: 1, paddingVertical: 8, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  driveBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  driveBtnText: { color: colors.text, fontSize: 12, fontWeight: '900' },
});
