import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useBountyStore } from '../../stores/bountyStore';

export const BountyDevControlsPanel: React.FC = () => {
  const { activeSession, devOverride, sendSignalUpdate } = useBountyStore();
  const [starLevel, setStarLevel] = useState<number>(1);

  const handleForceTrigger = async () => {
    try {
      await devOverride('force_trigger', { starLevel });
      Alert.alert('Dev Override', `Bounty session created at ★${starLevel}!`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to force trigger bounty.');
    }
  };

  const handleShortenTimer = async () => {
    if (!activeSession) return Alert.alert('Error', 'No active session.');
    try {
      await devOverride('shorten_timer', { sessionId: activeSession.id });
      Alert.alert('Dev Override', 'Timer shortened to 5 seconds!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to shorten timer.');
    }
  };

  const handleSimulateProximity = async () => {
    if (!activeSession) return Alert.alert('Error', 'No active session.');
    try {
      await sendSignalUpdate(activeSession.id, { simulatedDistanceMiles: 0.2, forceInRange: true });
      Alert.alert('Dev Override', 'Simulated Hunter in claim range (0.2 mi)! Proximity lock active.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to simulate signal.');
    }
  };

  const handleForceClaim = async () => {
    if (!activeSession) return Alert.alert('Error', 'No active session.');
    try {
      await devOverride('force_claim', { sessionId: activeSession.id });
      Alert.alert('Dev Override', 'Bounty session forcibly claimed!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to force claim.');
    }
  };

  const handleForceEscape = async () => {
    if (!activeSession) return Alert.alert('Error', 'No active session.');
    try {
      await devOverride('force_escape', { sessionId: activeSession.id });
      Alert.alert('Dev Override', 'Bounty session forcibly escaped!');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to force escape.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>DEV / TESTER BOUNTY CONTROLS</Text>

      <View style={styles.starRow}>
        <Text style={styles.label}>Select Stars:</Text>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            style={[styles.starBtn, starLevel === star && styles.starBtnActive]}
            onPress={() => setStarLevel(star)}
          >
            <Text style={styles.starBtnText}>★{star}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonGrid}>
        <TouchableOpacity style={styles.devBtn} onPress={handleForceTrigger}>
          <Text style={styles.devBtnText}>FORCE BOUNTY</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.devBtn} onPress={handleShortenTimer}>
          <Text style={styles.devBtnText}>SHORTEN TIMER (5s)</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.devBtn} onPress={handleSimulateProximity}>
          <Text style={styles.devBtnText}>SIMULATE CLOSE DISTANCE</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.devBtnDanger} onPress={handleForceClaim}>
          <Text style={styles.devBtnText}>FORCE CLAIM</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.devBtnSuccess} onPress={handleForceEscape}>
          <Text style={styles.devBtnText}>FORCE ESCAPE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#141A24',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0055',
    padding: 14,
    marginVertical: 12,
  },
  title: {
    color: '#FF0055',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  label: {
    color: '#A0A8B0',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  starBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  starBtnActive: {
    backgroundColor: '#FFCC00',
  },
  starBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  devBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  devBtnDanger: {
    backgroundColor: '#FF3366',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  devBtnSuccess: {
    backgroundColor: '#00FF66',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  devBtnText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
