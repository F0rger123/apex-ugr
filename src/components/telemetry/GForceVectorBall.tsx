import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../../config/colors';

interface GForceVectorBallProps {
  gLat: number; // Lateral G (-1.5 to +1.5)
  gLong: number; // Longitudinal G (-1.5 to +1.5)
  maxG?: number;
  size?: number;
}

export const GForceVectorBall: React.FC<GForceVectorBallProps> = ({
  gLat = 0,
  gLong = 0,
  maxG = 1.5,
  size = 220,
}) => {
  const center = size / 2;
  const radius = (size - 30) / 2;

  // Convert G-force to pixel displacement
  const clampGLat = Math.min(maxG, Math.max(-maxG, gLat));
  const clampGLong = Math.min(maxG, Math.max(-maxG, gLong));

  const ballX = center + (clampGLat / maxG) * radius;
  const ballY = center - (clampGLong / maxG) * radius;

  // Total Vector magnitude
  const totalG = Math.sqrt(gLat * gLat + gLong * gLong).toFixed(2);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Outer Friction Ring */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(0, 255, 102, 0.15)"
          strokeWidth={2}
          strokeDasharray="4 4"
        />

        {/* 1.0G Inner Ring */}
        <Circle
          cx={center}
          cy={center}
          r={(1.0 / maxG) * radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={1}
        />

        {/* 0.5G Inner Ring */}
        <Circle
          cx={center}
          cy={center}
          r={(0.5 / maxG) * radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth={1}
        />

        {/* Axis Crosshairs */}
        <Line x1={15} y1={center} x2={size - 15} y2={center} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
        <Line x1={center} y1={15} x2={center} y2={size - 15} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />

        {/* Axis Labels */}
        <SvgText x={center} y={22} fill={colors.textMuted} fontSize="9" fontWeight="800" textAnchor="middle">ACCEL</SvgText>
        <SvgText x={center} y={size - 10} fill={colors.textMuted} fontSize="9" fontWeight="800" textAnchor="middle">BRAKE</SvgText>
        <SvgText x={22} y={center + 3} fill={colors.textMuted} fontSize="9" fontWeight="800" textAnchor="middle">LEFT</SvgText>
        <SvgText x={size - 22} y={center + 3} fill={colors.textMuted} fontSize="9" fontWeight="800" textAnchor="middle">RIGHT</SvgText>

        {/* Live G Vector Ball Marker */}
        <Circle
          cx={ballX}
          cy={ballY}
          r={12}
          fill="rgba(0, 255, 102, 0.25)"
          stroke={colors.primary}
          strokeWidth={2}
        />
        <Circle cx={ballX} cy={ballY} r={4} fill={colors.primary} />
      </Svg>

      {/* Numerical Vector Display */}
      <View style={styles.readoutBox}>
        <Text style={styles.readoutVal}>{totalG} G</Text>
        <Text style={styles.readoutSub}>VECTOR TOTAL</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
    position: 'relative',
  },
  readoutBox: {
    position: 'absolute',
    bottom: 25,
    alignItems: 'center',
    backgroundColor: 'rgba(8,9,12,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  readoutVal: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  readoutSub: {
    color: colors.textMuted,
    fontSize: 8,
    fontWeight: '800',
  },
});
