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
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Lock, Mail, User, AtSign, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react-native';

export const SignUpScreen = ({ navigation }: any) => {
  const { signUp, isLoading, authError, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.';
    if (!username.trim()) return 'Username is required.';
    if (username.length < 3) return 'Username must be at least 3 characters.';
    if (!/^[a-z0-9_]+$/.test(username.toLowerCase())) return 'Username can only contain letters, numbers, and underscores.';
    if (!displayName.trim()) return 'Display name is required.';
    if (!password) return 'Password is required.';
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSignUp = async () => {
    clearError();
    const validationError = validate();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);

    const { error } = await signUp(email.trim().toLowerCase(), password, username.trim().toLowerCase(), displayName.trim());
    if (error) {
      setLocalError(error);
    }
    // On success, the onAuthStateChange listener in authStore will update state
    // and the root navigator will redirect to the main app automatically.
  };

  const displayError = localError || authError;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.brandBox}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoText}>APEX</Text>
            </View>
            <Text style={styles.brandTitle}>UGR</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Text style={styles.pageTitle}>CREATE PILOT ACCOUNT</Text>
        <Text style={styles.pageSub}>Join the underground racing network</Text>

        {/* Error Banner */}
        {displayError && (
          <GlassCard style={styles.errorCard}>
            <AlertCircle size={16} color={colors.danger} />
            <Text style={styles.errorText}>{displayError}</Text>
          </GlassCard>
        )}

        {/* Form */}
        <GlassCard activeGlow style={styles.formCard}>
          <Text style={styles.label}>DISPLAY NAME</Text>
          <View style={styles.inputBox}>
            <User size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Ryder Vance"
              placeholderTextColor={colors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
            />
          </View>

          <Text style={styles.label}>USERNAME</Text>
          <View style={styles.inputBox}>
            <AtSign size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="phantom_gtr"
              placeholderTextColor={colors.textMuted}
              value={username}
              onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputBox}>
            <Mail size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="pilot@apexugr.com"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputBox}>
            <Lock size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Min. 8 characters"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>

          <Text style={styles.label}>CONFIRM PASSWORD</Text>
          <View style={[
            styles.inputBox,
            (confirmPassword && password !== confirmPassword) ? styles.inputError : null,
            (confirmPassword && password === confirmPassword) ? styles.inputSuccess : null,
          ] as any}>
            <Lock size={16} color={
              confirmPassword
                ? (password === confirmPassword ? colors.primary : colors.danger)
                : colors.textMuted
            } />
            <TextInput
              style={styles.input}
              placeholder="Repeat password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {confirmPassword && password === confirmPassword && (
              <CheckCircle size={16} color={colors.primary} />
            )}
          </View>

          <ApexButton
            title={isLoading ? 'CREATING ACCOUNT...' : 'CREATE PILOT ACCOUNT'}
            variant="primary"
            size="lg"
            style={{ marginTop: 20 }}
            onPress={handleSignUp}
            disabled={isLoading}
          />
        </GlassCard>

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginLink}>SIGN IN</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 20 },

  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder },
  brandBox: { alignItems: 'center' },
  logoBadge: { backgroundColor: colors.primary, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
  logoText: { color: colors.background, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  brandTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 4, marginTop: 2 },

  pageTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  pageSub: { color: colors.textMuted, fontSize: 11, fontWeight: '700', textAlign: 'center', marginTop: 4, marginBottom: 20 },

  errorCard: { flexDirection: 'row', alignItems: 'center', borderColor: colors.danger, borderWidth: 1, padding: 12, marginBottom: 12 },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: '700', marginLeft: 8, flex: 1 },

  formCard: { padding: 20 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 14, marginBottom: 5, letterSpacing: 0.8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    minHeight: 46,
  },
  inputError: { borderColor: colors.danger },
  inputSuccess: { borderColor: colors.primary },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14, marginLeft: 8 },

  loginRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  loginText: { color: colors.textMuted, fontSize: 12 },
  loginLink: { color: colors.primary, fontSize: 12, fontWeight: '900' },
});
