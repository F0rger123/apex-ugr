import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Shield, Lock, Mail, Smartphone, Globe } from 'lucide-react-native';

export const LoginScreen = ({ navigation }: any) => {
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('ryder@apexugr.com');
  const [password, setPassword] = useState('••••••••••••');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Brand Header */}
        <View style={styles.brandHeader}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>APEX UGR</Text>
          </View>
          <Text style={styles.tagline}>UNDERGROUND RACING OS</Text>
        </View>

        <GlassCard style={styles.card}>
          <Text style={styles.cardTitle}>PILOT AUTHENTICATION</Text>

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <View style={styles.inputBox}>
            <Mail size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="pilot@apexugr.com"
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <Text style={styles.label}>PASSWORD</Text>
          <View style={styles.inputBox}>
            <Lock size={16} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <ApexButton
            title="AUTHENTICATE & ENTER"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ marginTop: 16 }}
            onPress={() => login(email)}
          />

          {/* Social OAuth Buttons */}
          <View style={styles.socialDivider}>
            <View style={styles.line} />
            <Text style={styles.socialText}>OR CONNECT WITH</Text>
            <View style={styles.line} />
          </View>

          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => login('google')}>
              <Globe size={16} color={colors.text} />
              <Text style={styles.socialBtnText}>GOOGLE</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.socialBtn} onPress={() => login('apple')}>
              <Shield size={16} color={colors.text} />
              <Text style={styles.socialBtnText}>APPLE</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  brandHeader: { alignItems: 'center', marginBottom: 24 },
  logoPill: { backgroundColor: colors.primary, paddingVertical: 6, paddingHorizontal: 16, borderRadius: 8 },
  logoText: { color: colors.background, fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  tagline: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 6 },
  card: { padding: 20 },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1, marginBottom: 16, textAlign: 'center' },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.cardBorder },
  input: { flex: 1, color: colors.text, paddingVertical: 10, fontSize: 14, marginLeft: 8 },

  socialDivider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  line: { flex: 1, height: 1, backgroundColor: colors.cardBorder },
  socialText: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginHorizontal: 8 },
  socialRow: { flexDirection: 'row', gap: 10 },
  socialBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder },
  socialBtnText: { color: colors.text, fontSize: 11, fontWeight: '800', marginLeft: 6 },
});
