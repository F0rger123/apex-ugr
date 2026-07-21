import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { colors } from '../../config/colors';

interface GForceMeterProps {
  gLat: number;   // Lateral (-1.5 to +1.5)
  gLong: number;  // Longitudinal (-1.5 to +1.5)
}

export const GForceMeter: React.FC<GForceMeterProps> = ({ gLat, gLong }) => {
  const size = 160;
  const center = size / 2;
  const maxG = 1.5;

  // Scale G values to SVG pixel offset
  const maxRadius = center - 20;
  const dotX = center + (gLat / maxG) * maxRadius;
  const dotY = center - (gLong / maxG) * maxRadius;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>G-FORCE TELEMETRY</Text>
      <View style={styles.meterBox}>
        <Svg width={size} height={size}>
          {/* Target concentric rings */}
          <Circle cx={center} cy={center} r={maxRadius} stroke="rgba(255, 255, 255, 0.1)" strokeWidth={1} fill="none" />
          <Circle cx={center} cy={center} r={maxRadius * 0.66} stroke="rgba(255, 255, 255, 0.1)" strokeWidth={1} fill="none" />
          <Circle cx={center} cy={center} r={maxRadius * 0.33} stroke="rgba(255, 255, 255, 0.1)" strokeWidth={1} fill="none" />
          
          {/* Axis Crosshairs */}
          <Line x1={20} y1={center} x2={size - 20} y2={center} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
          <Line x1={center} y1={20} x2={center} y2={size - 20} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />

          {/* Active G-Vector dot */}
          <Circle cx={dotX} cy={dotY} r={7} fill={colors.primary} />
          <Circle cx={dotX} cy={dotY} r={14} fill="none" stroke={colors.primary} strokeWidth={1.5} opacity={0.6} />
        </Svg>
      </View>

      <View style={styles.readoutRow}>
        <View style={styles.readoutCol}>
          <Text style={styles.label}>LATERAL</Text>
          <Text style={styles.value}>{gLat >= 0 ? `+${gLat} G` : `${gLat} G`}</Text>
        </View>
        <View style={styles.readoutCol}>
          <Text style={styles.label}>ACCEL / BRAKE</Text>
          <Text style={styles.value}>{gLong >= 0 ? `+${gLong} G` : `${gLong} G`}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 12,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  meterBox: {
    backgroundColor: colors.surface,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  readoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 12,
  },
  readoutCol: {
    alignItems: 'center',
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  value: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
});
