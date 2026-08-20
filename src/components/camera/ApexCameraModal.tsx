import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, ScrollView, Switch, Alert } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { Camera, Image as ImageIcon, Share2, Check, X, Shield, Sparkles } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  driverName?: string;
  apexId?: string;
  vehicleTitle?: string;
}

export const ApexCameraModal: React.FC<Props> = ({
  visible,
  onClose,
  driverName = 'APEX PILOT',
  apexId = 'AK-7F29',
  vehicleTitle = '1998 NISSAN SKYLINE GT-R',
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('UNDERGROUND');
  const [showDriverOverlay, setShowDriverOverlay] = useState<boolean>(true);
  const [showApexIdOverlay, setShowApexIdOverlay] = useState<boolean>(true);
  const [showVehicleOverlay, setShowVehicleOverlay] = useState<boolean>(true);
  const [showBrandingOverlay, setShowBrandingOverlay] = useState<boolean>(true);

  const templates = [
    'CLEAN', 'DRIVER CARD', 'MEET', 'BUILD',
    'GHOST', 'TRACK', 'CONVOY', 'UNDERGROUND'
  ];

  const handleSaveOrPost = (action: string) => {
    Alert.alert('Apex Camera', `Photo captured with [${selectedTemplate}] template! Action: ${action}`);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>APEX CAMERA MODE</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Viewfinder Preview */}
          <View style={styles.viewfinder}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop' }}
              style={styles.previewImage}
              resizeMode="cover"
            />

            {/* Dynamic Overlays */}
            <View style={styles.overlayLayer}>
              {showBrandingOverlay ? (
                <View style={styles.topBranding}>
                  <Text style={styles.brandText}>APEX // {selectedTemplate}</Text>
                </View>
              ) : null}

              <View style={styles.bottomInfoArea}>
                {showDriverOverlay ? <Text style={styles.overlayDriver}>{driverName}</Text> : null}
                {showApexIdOverlay ? <Text style={styles.overlayId}>APEX ID // {apexId}</Text> : null}
                {showVehicleOverlay ? <Text style={styles.overlayCar}>{vehicleTitle}</Text> : null}
              </View>
            </View>
          </View>

          {/* Template Selector */}
          <Text style={styles.sectionLabel}>TEMPLATE STYLE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {templates.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tempChip, selectedTemplate === t && styles.tempChipSelected]}
                onPress={() => setSelectedTemplate(t)}
              >
                <Text style={[styles.tempChipText, selectedTemplate === t && styles.tempChipTextSelected]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Overlay Toggles */}
          <Text style={styles.sectionLabel}>HUD OVERLAYS</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Driver Name</Text>
            <Switch value={showDriverOverlay} onValueChange={setShowDriverOverlay} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Apex ID</Text>
            <Switch value={showApexIdOverlay} onValueChange={setShowApexIdOverlay} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Vehicle Specs</Text>
            <Switch value={showVehicleOverlay} onValueChange={setShowVehicleOverlay} trackColor={{ true: colors.primary }} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Ghost Branding</Text>
            <Switch value={showBrandingOverlay} onValueChange={setShowBrandingOverlay} trackColor={{ true: colors.primary }} />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <ApexButton title="POST TO FEED" onPress={() => handleSaveOrPost('Posted to Feed')} style={{ flex: 1 }} />
            <ApexButton title="SAVE PHOTO" variant="secondary" onPress={() => handleSaveOrPost('Saved to Device')} style={{ flex: 1 }} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.deepSpace, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, height: '90%' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  viewfinder: { width: '100%', height: 220, borderRadius: 12, overflow: 'hidden', marginBottom: 12 },
  previewImage: { width: '100%', height: '100%' },
  overlayLayer: { ...StyleSheet.absoluteFillObject, padding: 12, justifyContent: 'space-between' },
  topBranding: { backgroundColor: 'rgba(0,0,0,0.6)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  brandText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  bottomInfoArea: { backgroundColor: 'rgba(0,0,0,0.6)', padding: 8, borderRadius: 6 },
  overlayDriver: { color: '#FFF', fontSize: 13, fontWeight: '900' },
  overlayId: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  overlayCar: { color: colors.textSecondary, fontSize: 10, fontWeight: '800' },
  sectionLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 8, marginBottom: 4 },
  tempChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 6 },
  tempChipSelected: { backgroundColor: colors.primary },
  tempChipText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  tempChipTextSelected: { color: '#000', fontWeight: '900' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 2 },
  toggleLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
