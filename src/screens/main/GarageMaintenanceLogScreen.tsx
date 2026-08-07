import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useMaintenanceStore, MaintenanceRecord } from '../../stores/maintenanceStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import {
  Wrench,
  Plus,
  Calendar,
  DollarSign,
  CheckCircle2,
  Trash2,
  AlertCircle,
  FileText,
  Car,
} from 'lucide-react-native';

export const GarageMaintenanceLogScreen = ({ navigation }: any) => {
  const { getActiveVehicle } = useGarageStore();
  const { records, addRecord, deleteRecord, getVehicleRecords, getTotalMaintenanceCost } = useMaintenanceStore();

  const activeVehicle = getActiveVehicle() || {
    id: '11111111-1111-1111-1111-111111111111',
    make: 'Nissan',
    model: 'GT-R',
    year: 2024,
  };

  const vehicleRecords = getVehicleRecords(activeVehicle.id);
  const totalCost = getTotalMaintenanceCost(activeVehicle.id);

  const [modalVisible, setModalVisible] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [category, setCategory] = useState<MaintenanceRecord['category']>('Oil Service');
  const [cost, setCost] = useState('');
  const [odometerMiles, setOdometerMiles] = useState('');
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');

  const handleAddService = () => {
    if (!serviceName || !cost) {
      Alert.alert('Required', 'Service name and cost are required.');
      return;
    }

    addRecord({
      vehicleId: activeVehicle.id,
      serviceName,
      category,
      date: new Date().toISOString().split('T')[0],
      odometerMiles: parseInt(odometerMiles) || 15000,
      cost: parseFloat(cost) || 0,
      provider: provider || 'Self Installed',
      notes,
      nextDueDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      nextDueMiles: (parseInt(odometerMiles) || 15000) + 3000,
    });

    setModalVisible(false);
    setServiceName(''); setCost(''); setOdometerMiles(''); setProvider(''); setNotes('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="MAINTENANCE LOG"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Vehicle Header & Total Maintenance Spend */}
        <GlassCard activeGlow style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summarySub}>SERVICE & FLUID HISTORY</Text>
              <Text style={styles.summaryTitle}>{activeVehicle.year} {activeVehicle.make} {activeVehicle.model}</Text>
            </View>
            <MatrixBadge label="HEALTHY" variant="green" />
          </View>

          <View style={styles.costRow}>
            <View style={styles.costBox}>
              <Text style={styles.costLab}>TOTAL SERVICE SPEND</Text>
              <Text style={styles.costVal}>${totalCost.toLocaleString()}</Text>
            </View>
            <View style={styles.costBox}>
              <Text style={styles.costLab}>SERVICES LOGGED</Text>
              <Text style={styles.costValGreen}>{vehicleRecords.length} LOGS</Text>
            </View>
          </View>
        </GlassCard>

        {/* Action Button */}
        <View style={{ marginVertical: 10 }}>
          <ApexButton
            title="LOG NEW MAINTENANCE SERVICE"
            variant="primary"
            size="lg"
            icon={<Plus size={18} color={colors.background} />}
            onPress={() => setModalVisible(true)}
          />
        </View>

        {/* Maintenance Log Feed */}
        <SectionHeader title="SERVICE HISTORY & INVOICE RECORDS" />
        {vehicleRecords.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 24 }}>
            <Wrench size={32} color={colors.textMuted} style={{ marginBottom: 8 }} />
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '800' }}>
              NO MAINTENANCE RECORDS LOGGED YET
            </Text>
          </GlassCard>
        ) : (
          vehicleRecords.map((rec) => (
            <GlassCard key={rec.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <View style={{ flex: 1 }}>
                  <MatrixBadge label={rec.category.toUpperCase()} variant="silver" size="sm" />
                  <Text style={styles.recordTitle}>{rec.serviceName}</Text>
                  <Text style={styles.recordProvider}>Provider: {rec.provider}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recordCost}>${rec.cost.toLocaleString()}</Text>
                  <Text style={styles.recordDate}>{rec.date}</Text>
                </View>
              </View>

              {rec.notes ? <Text style={styles.recordNotes}>"{rec.notes}"</Text> : null}

              <View style={styles.recordFooter}>
                <Text style={styles.odometerText}>Odometer: {rec.odometerMiles.toLocaleString()} mi</Text>
                <TouchableOpacity onPress={() => deleteRecord(rec.id)}>
                  <Trash2 size={14} color={colors.danger} />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* New Maintenance Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.modalContent}>
            <Text style={styles.modalTitle}>LOG MAINTENANCE SERVICE</Text>

            <TextInput
              style={styles.input}
              placeholder="Service Name (e.g. Motul 300V Oil Change)"
              placeholderTextColor={colors.textMuted}
              value={serviceName}
              onChangeText={setServiceName}
            />

            <TextInput
              style={styles.input}
              placeholder="Cost ($ USD)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
            />

            <TextInput
              style={styles.input}
              placeholder="Current Odometer Miles"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={odometerMiles}
              onChangeText={setOdometerMiles}
            />

            <TextInput
              style={styles.input}
              placeholder="Service Shop / Provider (e.g. Self / AMS)"
              placeholderTextColor={colors.textMuted}
              value={provider}
              onChangeText={setProvider}
            />

            <TextInput
              style={[styles.input, { height: 60 }]}
              placeholder="Notes & oil viscosity details..."
              placeholderTextColor={colors.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <ApexButton
                title="CANCEL"
                variant="secondary"
                size="md"
                style={{ flex: 1 }}
                onPress={() => setModalVisible(false)}
              />
              <ApexButton
                title="SAVE LOG"
                variant="primary"
                size="md"
                style={{ flex: 1 }}
                onPress={handleAddService}
              />
            </View>
          </GlassCard>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },

  summaryCard: { padding: 18, marginVertical: 12 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summarySub: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  summaryTitle: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 2 },

  costRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  costBox: { flex: 1 },
  costLab: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  costVal: { color: colors.primary, fontSize: 22, fontWeight: '900', marginTop: 2 },
  costValGreen: { color: colors.text, fontSize: 22, fontWeight: '900', marginTop: 2 },

  recordCard: { padding: 14, marginBottom: 10 },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  recordTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 4 },
  recordProvider: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  recordCost: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  recordDate: { color: colors.textSecondary, fontSize: 10, fontWeight: '700', marginTop: 2 },
  recordNotes: { color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: 8 },

  recordFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  odometerText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', paddingHorizontal: 20 },
  modalContent: { padding: 20 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  input: { backgroundColor: colors.surface, borderRadius: 8, padding: 12, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder, marginVertical: 6 },
});
