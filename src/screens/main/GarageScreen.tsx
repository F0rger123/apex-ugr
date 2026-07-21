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
import { Car, Plus, Shield, Flame, Wrench, X } from 'lucide-react-native';

export const GarageScreen = ({ navigation }: any) => {
  const { vehicles, activeVehicleId, setActiveVehicle, getTotalBuildValue, addVehicle } = useGarageStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2024');
  const [engine, setEngine] = useState('');
  const [hp, setHp] = useState('');
  const [topSpeed, setTopSpeed] = useState('');

  const handleCreateVehicle = () => {
    if (!make || !model) return;
    addVehicle({
      year: parseInt(year) || 2024,
      make,
      model,
      trim: 'Track Edition',
      color: 'Carbon Obsidian',
      engine: engine || '3.8L Twin-Turbo',
      transmission: '7-Speed Dual-Clutch',
      horsepower: parseInt(hp) || 750,
      torque: 700,
      weight_lbs: 3800,
      top_speed_mph: parseInt(topSpeed) || 205,
      drivetrain: 'AWD',
      fuel_type: 'E85',
      photos: ['https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop'],
      is_primary: false,
    });
    setModalVisible(false);
    setMake(''); setModel(''); setEngine(''); setHp('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Title */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>PILOT GARAGE</Text>
            <Text style={styles.subTitle}>VEHICLE FLEET • AFTERMARKET SPECS</Text>
          </View>

          <ApexButton
            title="ADD VEHICLE"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => setModalVisible(false)}
          />
        </View>

        {/* Vehicles Shelf List */}
        <SectionHeader title={`REGISTERED VEHICLES (${vehicles.length})`} />
        {vehicles.map((v) => {
          const isPrimary = v.id === activeVehicleId;
          const buildVal = getTotalBuildValue(v.id);

          return (
            <View key={v.id} style={{ marginBottom: 8 }}>
              <VehicleCard
                vehicle={v}
                totalBuildValue={buildVal}
                onPress={() => navigation.navigate('VehicleDetail', { vehicleId: v.id })}
              />

              {!isPrimary && (
                <TouchableOpacity
                  style={styles.setPrimaryBtn}
                  onPress={() => setActiveVehicle(v.id)}
                >
                  <Text style={styles.setPrimaryText}>SET AS ACTIVE RIDE</Text>
                </TouchableOpacity>
              )}
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
              <Text style={styles.modalTitle}>REGISTER NEW VEHICLE</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={styles.label}>MAKE (e.g. Porsche, Nissan, Ford)</Text>
              <TextInput style={styles.input} value={make} onChangeText={setMake} placeholder="e.g. Porsche" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>MODEL (e.g. 911 GT3 RS, Supra)</Text>
              <TextInput style={styles.input} value={model} onChangeText={setModel} placeholder="e.g. 911 GT3 RS" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>YEAR</Text>
              <TextInput style={styles.input} value={year} onChangeText={setYear} keyboardType="numeric" placeholder="2024" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>ENGINE</Text>
              <TextInput style={styles.input} value={engine} onChangeText={setEngine} placeholder="e.g. 4.0L High-RPM Flat-6" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>HORSEPOWER (WHP)</Text>
              <TextInput style={styles.input} value={hp} onChangeText={setHp} keyboardType="numeric" placeholder="e.g. 750" placeholderTextColor={colors.textMuted} />

              <Text style={styles.label}>TOP SPEED (MPH)</Text>
              <TextInput style={styles.input} value={topSpeed} onChangeText={setTopSpeed} keyboardType="numeric" placeholder="e.g. 210" placeholderTextColor={colors.textMuted} />
            </ScrollView>

            <ApexButton title="SAVE VEHICLE TO GARAGE" onPress={handleCreateVehicle} style={{ marginTop: 12 }} />
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
  setPrimaryBtn: { backgroundColor: 'rgba(0, 255, 102, 0.1)', borderColor: 'rgba(0, 255, 102, 0.3)', borderWidth: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', marginTop: -4, marginBottom: 8 },
  setPrimaryText: { color: colors.primary, fontSize: 9, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
});
