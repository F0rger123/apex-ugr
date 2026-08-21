import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Settings, Shield, Bell, Radio, Gauge, Eye, Save } from 'lucide-react-native';

export const SettingsScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();

  const [unitPreference, setUnitPreference] = useState<'MPH' | 'KMH'>('MPH');
  const [meetRadius, setMeetRadius] = useState<number>(25);
  const [meetNotifs, setMeetNotifs] = useState(true);
  const [convoyRadio, setConvoyRadio] = useState(true);
  const [seasonNotifs, setSeasonNotifs] = useState(true);
  const [cotwNotifs, setCotwNotifs] = useState(true);
  const [publicPerf, setPublicPerf] = useState(true);
  const [publicRace, setPublicRace] = useState(true);
  const [apexIdVis, setApexIdVis] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (res.ok && data.settings) {
        const s = data.settings;
        setUnitPreference(s.unit_preference || 'MPH');
        setMeetRadius(s.meet_notif_radius_miles || 25);
        setMeetNotifs(Boolean(s.meet_notifs_enabled));
        setConvoyRadio(Boolean(s.convoy_radio_enabled));
        setSeasonNotifs(Boolean(s.season_notifs_enabled));
        setCotwNotifs(Boolean(s.cotw_notifs_enabled));
        setPublicPerf(Boolean(s.public_performance_visibility));
        setPublicRace(Boolean(s.public_race_records));
        setApexIdVis(Boolean(s.apex_id_visibility));
      }
    } catch (e) {}
  };

  const handleSave = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unit_preference: unitPreference,
          meet_notif_radius_miles: meetRadius,
          meet_notifs_enabled: meetNotifs,
          convoy_radio_enabled: convoyRadio,
          season_notifs_enabled: seasonNotifs,
          cotw_notifs_enabled: cotwNotifs,
          public_performance_visibility: publicPerf,
          public_race_records: publicRace,
          apex_id_visibility: apexIdVis,
        }),
      });
      if (res.ok) {
        Alert.alert('Settings Saved', 'Your Apex settings and privacy controls have been updated.');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  return (
    <View style={styles.container}>
      <ApexHeader title="SETTINGS & PRIVACY" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Unit Preference */}
        <SectionHeader title="SPEED & TELEMETRY UNITS" />
        <GlassCard style={styles.card}>
          <Text style={styles.label}>SPEEDOMETER & PERFORMANCE UNIT</Text>
          <View style={styles.segmentedRow}>
            <TouchableOpacity
              style={[styles.segmentBtn, unitPreference === 'MPH' && styles.segmentBtnActive]}
              onPress={() => setUnitPreference('MPH')}
            >
              <Text style={[styles.segmentText, unitPreference === 'MPH' && styles.segmentTextActive]}>MPH (IMPERIAL)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.segmentBtn, unitPreference === 'KMH' && styles.segmentBtnActive]}
              onPress={() => setUnitPreference('KMH')}
            >
              <Text style={[styles.segmentText, unitPreference === 'KMH' && styles.segmentTextActive]}>KM/H (METRIC)</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Notifications & Radius */}
        <SectionHeader title="NOTIFICATIONS & MEET RADIUS" />
        <GlassCard style={styles.card}>
          <Text style={styles.label}>MEET NOTIFICATION RADIUS ({meetRadius} MILES)</Text>
          <View style={styles.segmentedRow}>
            {[10, 25, 50, 100].map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.segmentBtn, meetRadius === r && styles.segmentBtnActive]}
                onPress={() => setMeetRadius(r)}
              >
                <Text style={[styles.segmentText, meetRadius === r && styles.segmentTextActive]}>{r} MI</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Local Meet Notifications</Text>
            <Switch value={meetNotifs} onValueChange={setMeetNotifs} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Convoy Radio Active</Text>
            <Switch value={convoyRadio} onValueChange={setConvoyRadio} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Season Progression Alerts</Text>
            <Switch value={seasonNotifs} onValueChange={setSeasonNotifs} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Car of the Week Voting Alerts</Text>
            <Switch value={cotwNotifs} onValueChange={setCotwNotifs} trackColor={{ true: colors.primary }} />
          </View>
        </GlassCard>

        {/* Privacy Controls */}
        <SectionHeader title="PRIVACY & PUBLIC VISIBILITY" />
        <GlassCard style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Public Performance Telemetry Visibility</Text>
            <Switch value={publicPerf} onValueChange={setPublicPerf} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Public Race & Head-to-Head Records</Text>
            <Switch value={publicRace} onValueChange={setPublicRace} trackColor={{ true: colors.primary }} />
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Apex ID & QR Public Scanning</Text>
            <Switch value={apexIdVis} onValueChange={setApexIdVis} trackColor={{ true: colors.primary }} />
          </View>
        </GlassCard>

        <ApexButton title="SAVE APEX SETTINGS" onPress={handleSave} style={{ marginTop: 16 }} />

        <View style={{ marginTop: 24, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 }}>
            APEX UGR BUILD // 51992a8 (6-TAB NAVIGATION ACTIVE)
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepSpace },
  content: { padding: 16, paddingBottom: 40 },
  card: { padding: 14, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginBottom: 8, letterSpacing: 0.5 },
  segmentedRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  segmentBtn: { flex: 1, paddingVertical: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  segmentTextActive: { color: '#000', fontWeight: '900' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  rowLabel: { color: colors.text, fontSize: 11, fontWeight: '800' },
});
