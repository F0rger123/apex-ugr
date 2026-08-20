import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { GlassCard } from '../common/GlassCard';
import { colors } from '../../config/colors';
import { QrCode, ShieldCheck, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  apexId?: string;
  username?: string;
  rank?: string;
}

export const ApexIDModal: React.FC<Props> = ({
  visible,
  onClose,
  apexId = 'AK-7F29',
  username = 'APEX PILOT',
  rank = 'MASTER',
}) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <GlassCard style={styles.modalCard}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>MY APEX ID</Text>
          <Text style={styles.apexIdText}>{apexId}</Text>
          <Text style={styles.driverSub}>{username} · {rank} RANK</Text>

          {/* QR Matrix SVG Simulation */}
          <View style={styles.qrContainer}>
            <Svg width={160} height={160} viewBox="0 0 100 100">
              <Rect x="0" y="0" width="100" height="100" fill="#000" />
              {/* Outer corner markers */}
              <Rect x="10" y="10" width="25" height="25" fill={colors.primary} />
              <Rect x="15" y="15" width="15" height="15" fill="#000" />
              <Rect x="65" y="10" width="25" height="25" fill={colors.primary} />
              <Rect x="70" y="15" width="15" height="15" fill="#000" />
              <Rect x="10" y="65" width="25" height="25" fill={colors.primary} />
              <Rect x="15" y="70" width="15" height="15" fill="#000" />
              {/* Data matrix blocks */}
              <Rect x="42" y="12" width="6" height="6" fill={colors.primary} />
              <Rect x="52" y="18" width="6" height="6" fill={colors.primary} />
              <Rect x="42" y="42" width="16" height="16" fill={colors.primary} />
              <Rect x="65" y="65" width="20" height="20" fill={colors.primary} />
            </Svg>
          </View>

          <Text style={styles.scanHint}>SCAN TO VIEW DRIVER CARD, VEHICLE BUILD & CREW STATS</Text>
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 320, padding: 20, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 12, right: 12 },
  headerTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
  apexIdText: { color: colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
  driverSub: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  qrContainer: { padding: 16, backgroundColor: '#000', borderRadius: 12, borderWidth: 1, borderColor: colors.primary, marginVertical: 20 },
  scanHint: { color: colors.textMuted, fontSize: 9, fontWeight: '800', textAlign: 'center', letterSpacing: 0.5 },
});
