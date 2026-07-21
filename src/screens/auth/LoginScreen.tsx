import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { PhoneOtpModal } from '../../components/auth/PhoneOtpModal';
import { colors } from '../../config/colors';
import { Lock, Mail, ArrowRight, AlertCircle, Smartphone } from 'lucide-react-native';

export const LoginScreen = ({ navigation }: any) => {
  const { signIn, isLoading, authError, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleLogin = async () => {
    clearError();
    setLocalError(null);

    if (!email.trim() || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    const { error } = await signIn(email.trim().toLowerCase(), password);
    if (error) {
      setLocalError(error);
    }
    // On success, onAuthStateChange listener redirects automatically.
  };

  const displayError = localError || authError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>APEX</Text>
          </View>
          <Text style={styles.brandTitle}>UGR</Text>
          <Text style={styles.brandSub}>UNDERGROUND RACING TELEMETRY NETWORK</Text>
        </View>

        {/* Error Banner */}
        {displayError && (
          <GlassCard style={styles.errorCard}>
            <AlertCircle size={16} color={colors.danger} />
            <Text style={styles.errorText}>{displayError}</Text>
          </GlassCard>
        )}

        {/* Auth Card */}
        <GlassCard activeGlow style={styles.authCard}>
          <Text style={styles.cardTitle}>PILOT AUTHENTICATION</Text>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputBox}>
            <Mail size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="pilot@apexugr.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(t) => { setLocalError(null); setEmail(t); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputBox}>
            <Lock size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={(t) => { setLocalError(null); setPassword(t); }}
            />
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>FORGOT PASSWORD?</Text>
          </TouchableOpacity>

          <ApexButton
            title={isLoading ? 'AUTHENTICATING...' : 'ENTER THE NETWORK'}
            variant="primary"
            size="lg"
            style={{ marginTop: 16 }}
            icon={<ArrowRight size={16} color={colors.background} />}
            onPress={handleLogin}
            disabled={isLoading}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Auth Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity
              style={styles.socialBtn}
              onPress={() => setShowOtpModal(true)}
            >
              <Smartphone size={16} color={colors.primary} />
              <Text style={styles.socialText}>PHONE SMS</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Sign Up Link */}
        <View style={styles.signupRow}>
          <Text style={styles.signupText}>New to Apex UGR? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLink}>CREATE ACCOUNT</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PhoneOtpModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },

  brandBox: { alignItems: 'center', marginBottom: 28 },
  logoBadge: { backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  logoText: { color: colors.background, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  brandTitle: { color: colors.text, fontSize: 40, fontWeight: '900', letterSpacing: 6, marginTop: 6 },
  brandSub: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },

  errorCard: { flexDirection: 'row', alignItems: 'center', borderColor: colors.danger, borderWidth: 1, padding: 12, marginBottom: 12 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1 },

  authCard: { padding: 22 },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '900', letterSpacing: 1, marginBottom: 14 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 5, letterSpacing: 0.8 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.cardBorder, minHeight: 46 },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14, marginLeft: 8 },

  forgotBtn: { alignSelf: 'flex-end', marginTop: 6 },
  forgotText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 18 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  dividerText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginHorizontal: 10 },

  socialRow: { flexDirection: 'row', gap: 8 },
  socialBtn: { flex: 1, paddingVertical: 12, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  socialText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  signupRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  signupText: { color: colors.textMuted, fontSize: 12 },
  signupLink: { color: colors.primary, fontSize: 12, fontWeight: '900' },
});
