import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { colors } from '../../config/colors';

export const NebulaBackground = () => {
  return <View style={styles.container} pointerEvents="none"><View style={styles.overlay} /></View>;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    overflow: 'hidden',
    zIndex: -1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Platform.OS === 'web' ? 'rgba(6, 14, 32, 0.3)' : 'rgba(6, 14, 32, 0.18)',
  },
});
