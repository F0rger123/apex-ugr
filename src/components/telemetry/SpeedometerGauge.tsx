import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G, Line, Text as SvgText } from 'react-native-svg';
import { colors } from '../../config/colors';

interface SpeedometerGaugeProps {
  currentSpeed: number;
  maxSpeed?: number;
  size?: number;
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  currentSpeed,
  maxSpeed = 240,
  size = 240,
}) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Gauge Arc starts at 135deg and ends at 405deg (270deg total sweep)
  const startAngle = 135;
  const totalSweep = 270;
  
  const percentage = Math.min(1, Math.max(0, currentSpeed / maxSpeed));
  const currentAngle = startAngle + percentage * totalSweep;

  // Polar to Cartesian conversion
  const polarToCartesian = (centerX: number, centerY: number, r: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + r * Math.cos(angleInRadians),
      y: centerY + r * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x: number, y: number, r: number, start: number, end: number) => {
    const startPt = polarToCartesian(x, y, r, end);
    const endPt = polarToCartesian(x, y, r, start);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return [
      'M', startPt.x, startPt.y,
      'A', r, r, 0, largeArcFlag, 0, endPt.x, endPt.y
    ].join(' ');
  };

  const backgroundPath = describeArc(center, center, radius, startAngle, startAngle + totalSweep);
  const activePath = describeArc(center, center, radius, startAngle, currentAngle);

  // Generate tick marks
  const ticks = [];
  const totalTicks = 12;
  for (let i = 0; i <= totalTicks; i++) {
    const angle = startAngle + (i / totalTicks) * totalSweep;
    const p1 = polarToCartesian(center, center, radius - 18, angle);
    const p2 = polarToCartesian(center, center, radius - 8, angle);
    const speedVal = Math.round((i / totalTicks) * maxSpeed);
    const isMajor = i % 2 === 0;

    ticks.push(
      <Line
        key={`tick-${i}`}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={i <= (percentage * totalTicks) ? colors.primary : colors.textMuted}
        strokeWidth={isMajor ? 3 : 1.5}
      />
    );
  }

  // Calculate Needle tip
  const needleTip = polarToCartesian(center, center, radius - 26, currentAngle);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background Track Arc */}
        <Path
          d={backgroundPath}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Active Speed Arc (Matrix Green Glow) */}
        {percentage > 0 && (
          <Path
            d={activePath}
            fill="none"
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        )}

        {/* Ticks */}
        <G>{ticks}</G>

        {/* Center Needle Dot */}
        <Circle cx={center} cy={center} r={12} fill={colors.card} stroke={colors.primary} strokeWidth={3} />

        {/* Needle Line */}
        <Line
          x1={center}
          y1={center}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={colors.primary}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </Svg>

      {/* Speedometer Center Digital Display */}
      <View style={styles.readoutOverlay}>
        <Text style={styles.speedNumber}>{Math.round(currentSpeed)}</Text>
        <Text style={styles.unitText}>MPH</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>READY • TELEMETRY ACTIVE</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  readoutOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '40%',
  },
  speedNumber: {
    fontSize: 54,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -1,
  },
  unitText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 2,
    marginTop: -6,
  },
  statusPill: {
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
  },
  statusText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
