import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../common/GlassCard';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { X, Smartphone, AlertCircle, CheckCircle } from 'lucide-react-native';

interface PhoneOtpModalProps {
  visible: boolean;
  onClose: () => void;
}

type Step = 'phone' | 'otp';

export const PhoneOtpModal = ({ visible, onClose }: PhoneOtpModalProps) => {
  const { signInWithPhone, verifyOtp, isLoading, authError, clearError } = useAuthStore();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [localError, setLocalError] = useState<string | null>(null);
  const [codeSent, setCodeSent] = useState(false);

  const otpRefs = useRef<Array<TextInput | null>>([]);

  const handleClose = () => {
    setStep('phone');
    setPhone('');
    setOtp(['', '', '', '', '', '']);
    setLocalError(null);
    clearError();
    setCodeSent(false);
    onClose();
  };

  const formatPhoneForSupabase = (raw: string): string => {
    // Strip everything except digits and leading +
    const stripped = raw.replace(/[^\d+]/g, '');
    // Add +1 if no country code
    if (stripped.startsWith('+')) return stripped;
    if (stripped.startsWith('1') && stripped.length === 11) return `+${stripped}`;
    return `+1${stripped}`;
  };

  const handleSendCode = async () => {
    clearError();
    setLocalError(null);

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setLocalError('Enter a valid 10-digit phone number.');
      return;
    }

    const formatted = formatPhoneForSupabase(phone);
    const { error } = await signInWithPhone(formatted);
    if (error) {
      setLocalError(error);
    } else {
      setCodeSent(true);
      setStep('otp');
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value.replace(/\D/g, '').slice(0, 1);
    setOtp(newOtp);

    // Auto-advance to next field
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are filled
    if (newOtp.every((d) => d !== '') && newOtp.join('').length === 6) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    clearError();
    setLocalError(null);

    const token = code || otp.join('');
    if (token.length !== 6) {
      setLocalError('Enter the complete 6-digit code.');
      return;
    }

    const formatted = formatPhoneForSupabase(phone);
    const { error } = await verifyOtp(formatted, token);
    if (error) {
      setLocalError(error);
    } else {
      handleClose();
    }
  };

  const displayError = localError || authError;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <GlassCard activeGlow style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Smartphone size={18} color={colors.primary} />
              <Text style={styles.title}>
                {step === 'phone' ? 'PHONE VERIFICATION' : 'ENTER SMS CODE'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Error */}
          {displayError && (
            <View style={styles.errorRow}>
              <AlertCircle size={14} color={colors.danger} />
              <Text style={styles.errorText}>{displayError}</Text>
            </View>
          )}

          {step === 'phone' ? (
            <>
              <Text style={styles.sub}>
                Enter your phone number and we'll send a verification code via SMS.
              </Text>

              <Text style={styles.label}>PHONE NUMBER</Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇺🇸 +1</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={(t) => { setLocalError(null); setPhone(t); }}
                  keyboardType="phone-pad"
                  maxLength={14}
                />
              </View>

              <ApexButton
                title={isLoading ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'}
                variant="primary"
                size="lg"
                style={{ marginTop: 18 }}
                onPress={handleSendCode}
                disabled={isLoading}
              />
            </>
          ) : (
            <>
              <View style={styles.successRow}>
                <CheckCircle size={16} color={colors.primary} />
                <Text style={styles.successText}>Code sent to {phone}</Text>
              </View>
              <Text style={styles.sub}>Enter the 6-digit code from your SMS.</Text>

              {/* OTP Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref; }}
                    style={[styles.otpBox, digit !== '' && styles.otpBoxFilled]}
                    value={digit}
                    onChangeText={(v) => handleOtpChange(v, i)}
                    onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    selectTextOnFocus
                  />
                ))}
              </View>

              <ApexButton
                title={isLoading ? 'VERIFYING...' : 'VERIFY CODE'}
                variant="primary"
                size="lg"
                style={{ marginTop: 18 }}
                onPress={() => handleVerifyOtp()}
                disabled={isLoading || otp.some((d) => d === '')}
              />

              <TouchableOpacity style={styles.resendBtn} onPress={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); }}>
                <Text style={styles.resendText}>← CHANGE NUMBER / RESEND</Text>
              </TouchableOpacity>
            </>
          )}
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end', padding: 16, paddingBottom: 24 },
  modalCard: { padding: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 0.8 },
  closeBtn: { padding: 4 },

  sub: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 4 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 14, marginBottom: 6 },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,51,102,0.1)', padding: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,51,102,0.3)' },
  errorText: { color: colors.danger, fontSize: 11, fontWeight: '700', flex: 1 },

  successRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  successText: { color: colors.primary, fontSize: 12, fontWeight: '700' },

  phoneRow: { flexDirection: 'row', gap: 8 },
  countryCode: { backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 12, paddingVertical: 12, justifyContent: 'center' },
  countryCodeText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  phoneInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 14, paddingVertical: 12, color: colors.text, fontSize: 15, fontWeight: '700' },

  otpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  otpBox: { width: 46, height: 56, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBorder, color: colors.text, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  otpBoxFilled: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.06)' },

  resendBtn: { alignItems: 'center', marginTop: 16 },
  resendText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
});
