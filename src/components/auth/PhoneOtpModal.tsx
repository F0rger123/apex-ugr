import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { GlassCard } from '../common/GlassCard';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { Smartphone, X, CheckCircle2, ShieldCheck } from 'lucide-react-native';

interface PhoneOtpModalProps {
  visible: boolean;
  onClose: () => void;
  onVerified: () => void;
}

export const PhoneOtpModal: React.FC<PhoneOtpModalProps> = ({ visible, onClose, onVerified }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);

  const handleSendOtp = () => {
    if (!phoneNumber) return;
    setOtpSent(true);
  };

  const handleVerify = () => {
    if (code.length < 4) return;
    setVerified(true);
    setTimeout(() => {
      onVerified();
      onClose();
      setVerified(false);
      setOtpSent(false);
    }, 1000);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Smartphone size={18} color={colors.primary} />
              <Text style={styles.modalTitle}>SMS PHONE VERIFICATION</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {verified ? (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <CheckCircle2 size={40} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 8 }}>
                PHONE NUMBER VERIFIED!
              </Text>
            </View>
          ) : !otpSent ? (
            <>
              <Text style={styles.label}>ENTER MOBILE PHONE NUMBER</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 019-2834"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
              />
              <ApexButton title="SEND VERIFICATION CODE" onPress={handleSendOtp} style={{ marginTop: 12 }} />
            </>
          ) : (
            <>
              <Text style={styles.label}>ENTER 6-DIGIT SMS CODE</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={6}
                value={code}
                onChangeText={setCode}
              />
              <ApexButton title="VERIFY & SECURE ACCOUNT" onPress={handleVerify} style={{ marginTop: 12 }} />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginLeft: 6, letterSpacing: 0.5 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
});
