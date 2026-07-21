import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { PhoneOtpModal } from '../../components/auth/PhoneOtpModal';
import { colors } from '../../config/colors';
import { Lock, Mail, Shield, Smartphone, ArrowRight } from 'lucide-react-native';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);

  const handleLogin = () => {
    login(email || 'pilot@apexugr.com', password || 'password123');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Brand Header */}
        <View style={styles.brandBox}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>APEX</Text>
          </View>
          <Text style={styles.brandTitle}>UGR</Text>
          <Text style={styles.brandSub}>UNDERGROUND RACING TELEMETRY NETWORK</Text>
        </View>

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
              onChangeText={setEmail}
              autoCapitalize="none"
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
              onChangeText={setPassword}
            />
          </View>

          <ApexButton
            title="AUTHENTICATE & ENTER OS"
            variant="primary"
            size="lg"
            style={{ marginTop: 16 }}
            icon={<ArrowRight size={16} color={colors.background} />}
            onPress={handleLogin}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR LOGIN WITH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Auth Buttons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => setShowOtpModal(true)}>
              <Smartphone size={16} color={colors.primary} />
              <Text style={styles.socialText}>PHONE SMS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={handleLogin}>
              <Text style={styles.socialText}>GOOGLE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={handleLogin}>
              <Text style={styles.socialText}>APPLE ID</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PhoneOtpModal
        visible={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onVerified={handleLogin}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  brandBox: { alignItems: 'center', marginBottom: 24 },
  logoBadge: { backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6 },
  logoText: { color: colors.background, fontSize: 16, fontWeight: '900', letterSpacing: 2 },
  brandTitle: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: 4, marginTop: 4 },
  brandSub: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 2 },

  authCard: { padding: 20 },
  cardTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.cardBorder },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 13, marginLeft: 8 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginHorizontal: 8 },

  socialRow: { flexDirection: 'row', gap: 8 },
  socialBtn: { flex: 1, paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  socialText: { color: colors.text, fontSize: 9, fontWeight: '900', marginLeft: 4 },
});
