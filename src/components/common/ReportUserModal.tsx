import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { GlassCard } from './GlassCard';
import { ApexButton } from './ApexButton';
import { colors } from '../../config/colors';
import { ShieldAlert, X, CheckCircle2, UserX } from 'lucide-react-native';

interface ReportUserModalProps {
  visible: boolean;
  targetUsername?: string;
  onClose: () => void;
  onSubmitReport: (reason: string) => void;
  onBlockUser?: () => void;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  visible,
  targetUsername = 'racer',
  onClose,
  onSubmitReport,
  onBlockUser,
}) => {
  const [selectedReason, setSelectedReason] = useState('Fraudulent Telemetry Logs');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const reasons = [
    'Fraudulent Telemetry Logs',
    'Unsafe / Illegal Driving Behavior',
    'Disputed Wager Non-Payment',
    'Harassment or Offensive Language',
    'Fake Car Profile Specs',
  ];

  const handleSubmit = () => {
    onSubmitReport(`${selectedReason}: ${details}`);
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldAlert size={18} color={colors.warning} />
              <Text style={styles.modalTitle}>REPORT @{targetUsername}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isSubmitted ? (
            <View style={{ alignItems: 'center', paddingVertical: 24 }}>
              <CheckCircle2 size={40} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 10 }}>
                REPORT SUBMITTED TO REFEREE MODERATION
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>SELECT REPORT CATEGORY</Text>
              <View style={styles.reasonGrid}>
                {reasons.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.reasonChip, selectedReason === r && styles.reasonChipActive]}
                    onPress={() => setSelectedReason(r)}
                  >
                    <Text style={[styles.reasonText, selectedReason === r && { color: colors.background }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>ADDITIONAL DETAILS (OPTIONAL)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={details}
                onChangeText={setDetails}
                multiline
                placeholder="Provide telemetry proof link or timestamp details..."
                placeholderTextColor={colors.textMuted}
              />

              <ApexButton title="SUBMIT REPORT" variant="danger" onPress={handleSubmit} style={{ marginTop: 12 }} />

              {onBlockUser && (
                <TouchableOpacity style={styles.blockBtn} onPress={onBlockUser}>
                  <UserX size={14} color={colors.danger} />
                  <Text style={styles.blockText}>BLOCK @{targetUsername.toUpperCase()}</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.warning },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginLeft: 6, letterSpacing: 0.5 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  reasonGrid: { gap: 4 },
  reasonChip: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  reasonChipActive: { backgroundColor: colors.warning, borderColor: colors.warning },
  reasonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  blockBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingVertical: 8 },
  blockText: { color: colors.danger, fontSize: 11, fontWeight: '900', marginLeft: 6 },
});
