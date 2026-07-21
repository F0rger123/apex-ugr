import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useRaceStore } from '../../stores/raceStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { ArrowLeft, Flag, Coins, MapPin, Clock } from 'lucide-react-native';

export const CreateChallengeScreen = ({ navigation }: any) => {
  const { createChallenge } = useRaceStore();
  const { user } = useAuthStore();

  const [raceType, setRaceType] = useState<'Drag Race' | 'Roll Race' | 'Circuit Race' | 'Time Attack' | 'Highway Pull' | 'Custom'>('Roll Race');
  const [wagerCredits, setWagerCredits] = useState('1000');
  const [routeName, setRouteName] = useState('Industrial Strip Sector 7');
  const [distanceMiles, setDistanceMiles] = useState('0.50');
  const [startTime, setStartTime] = useState('Tonight, 11:30 PM');
  const [rules, setRules] = useState('60 MPH Roll Start. Finish at 1/2 Mile mark. GPS verified telemetry required.');

  const handleSubmit = () => {
    if (!wagerCredits || !routeName) return;
    createChallenge({
      challenger_id: user?.id || '00000000-0000-0000-0000-000000000001',
      race_type: raceType,
      wager_credits: parseFloat(wagerCredits) || 500,
      start_time: startTime,
      rules,
      route_name: routeName,
      distance_miles: parseFloat(distanceMiles) || 0.25,
      challenger_profile: user || undefined
    });
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.primary} />
          <Text style={styles.backText}>CANCEL</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>CREATE RACE CHALLENGE</Text>

        <GlassCard>
          <Text style={styles.label}>RACE TYPE</Text>
          <View style={styles.chipGrid}>
            {(['Drag Race', 'Roll Race', 'Circuit Race', 'Time Attack', 'Highway Pull', 'Custom'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, raceType === t && styles.chipActive]}
                onPress={() => setRaceType(t)}
              >
                <Text style={[styles.chipText, raceType === t && { color: colors.background }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>WAGER AMOUNT (APEX CREDITS)</Text>
          <TextInput
            style={styles.input}
            value={wagerCredits}
            onChangeText={setWagerCredits}
            keyboardType="numeric"
            placeholder="e.g. 1000"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>ROUTE / LOCATION NAME</Text>
          <TextInput
            style={styles.input}
            value={routeName}
            onChangeText={setRouteName}
            placeholder="e.g. Industrial Strip Sector 7"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>RACE DISTANCE (MILES)</Text>
          <TextInput
            style={styles.input}
            value={distanceMiles}
            onChangeText={setDistanceMiles}
            keyboardType="numeric"
            placeholder="e.g. 0.25"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>START TIME</Text>
          <TextInput
            style={styles.input}
            value={startTime}
            onChangeText={setStartTime}
            placeholder="e.g. Tonight, 11:30 PM"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>RULES & DISPUTE POLICIES</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={rules}
            onChangeText={setRules}
            multiline
            placeholder="State launch speed, lane rules, and proof requirements..."
            placeholderTextColor={colors.textMuted}
          />

          <ApexButton
            title="PUBLISH WAGER CHALLENGE"
            variant="primary"
            size="lg"
            style={{ marginTop: 16 }}
            onPress={handleSubmit}
          />
        </GlassCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  backText: { color: colors.primary, fontSize: 11, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
  pageTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 12, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 4 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontSize: 11, fontWeight: '800' },
});
