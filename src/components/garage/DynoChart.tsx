import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { colors } from '../../config/colors';

interface DynoChartProps {
  maxHp: number;
  maxTorque: number;
  engineName?: string;
  width?: number;
  height?: number;
}

export const DynoChart: React.FC<DynoChartProps> = ({
  maxHp = 1150,
  maxTorque = 980,
  engineName = '3.8L VR38DETT Twin-Turbo',
  width = 330,
  height = 180,
}) => {
  const rpmPoints = [2000, 3000, 4000, 5000, 6000, 7000, 8000];

  // Generate WHP curve scaling up to peak at 6800 RPM
  const hpCurve = [
    { rpm: 2000, hp: Math.round(maxHp * 0.22) },
    { rpm: 3000, hp: Math.round(maxHp * 0.42) },
    { rpm: 4000, hp: Math.round(maxHp * 0.68) },
    { rpm: 5000, hp: Math.round(maxHp * 0.88) },
    { rpm: 6000, hp: Math.round(maxHp * 0.98) },
    { rpm: 6800, hp: maxHp },
    { rpm: 7500, hp: Math.round(maxHp * 0.94) },
    { rpm: 8000, hp: Math.round(maxHp * 0.86) },
  ];

  // Generate Torque curve scaling up to peak at 4500 RPM
  const tqCurve = [
    { rpm: 2000, tq: Math.round(maxTorque * 0.45) },
    { rpm: 3000, tq: Math.round(maxTorque * 0.72) },
    { rpm: 4000, tq: Math.round(maxTorque * 0.95) },
    { rpm: 4500, tq: maxTorque },
    { rpm: 5500, tq: Math.round(maxTorque * 0.92) },
    { rpm: 6500, tq: Math.round(maxTorque * 0.82) },
    { rpm: 7500, tq: Math.round(maxTorque * 0.70) },
    { rpm: 8000, tq: Math.round(maxTorque * 0.58) },
  ];

  const maxVal = Math.max(maxHp, maxTorque) * 1.15;
  const paddingLeft = 40;
  const paddingBottom = 26;
  const graphWidth = width - paddingLeft - 10;
  const graphHeight = height - paddingBottom - 20;

  const getX = (rpm: number) => paddingLeft + ((rpm - 2000) / 6000) * graphWidth;
  const getY = (val: number) => height - paddingBottom - (val / maxVal) * graphHeight;

  const hpPathD = hpCurve.reduce((acc, p, idx) => {
    const x = getX(p.rpm);
    const y = getY(p.hp);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const tqPathD = tqCurve.reduce((acc, p, idx) => {
    const x = getX(p.rpm);
    const y = getY(p.tq);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>DYNO JET POWER CURVE</Text>
          <Text style={styles.subText}>{engineName}</Text>
        </View>

        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendHpText}>{maxHp} WHP</Text>
          </View>

          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.warning }]} />
            <Text style={styles.legendTqText}>{maxTorque} TQ</Text>
          </View>
        </View>
      </View>

      <Svg width={width} height={height}>
        {/* Gridlines */}
        <Line x1={paddingLeft} y1={10} x2={paddingLeft} y2={height - paddingBottom} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />
        <Line x1={paddingLeft} y1={height - paddingBottom} x2={width - 10} y2={height - paddingBottom} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} />

        <Line x1={paddingLeft} y1={(height - paddingBottom) / 2} x2={width - 10} y2={(height - paddingBottom) / 2} stroke="rgba(255, 255, 255, 0.06)" strokeDasharray="3 3" />

        {/* RPM Labels */}
        {rpmPoints.map((rpm) => (
          <SvgText
            key={`rpm-${rpm}`}
            x={getX(rpm)}
            y={height - 8}
            fill={colors.textMuted}
            fontSize={8}
            fontWeight="bold"
            textAnchor="middle"
          >
            {rpm / 1000}k
          </SvgText>
        ))}

        {/* Torque Curve Line (Gold) */}
        <Path d={tqPathD} fill="none" stroke={colors.warning} strokeWidth={2.5} />

        {/* Horsepower Curve Line (Matrix Green) */}
        <Path d={hpPathD} fill="none" stroke={colors.primary} strokeWidth={3} />

        {/* Peak HP Point Marker */}
        <Circle cx={getX(6800)} cy={getY(maxHp)} r={4} fill={colors.background} stroke={colors.primary} strokeWidth={2} />

        {/* Peak TQ Point Marker */}
        <Circle cx={getX(4500)} cy={getY(maxTorque)} r={4} fill={colors.background} stroke={colors.warning} strokeWidth={2} />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  subText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendHpText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
  },
  legendTqText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '900',
  },
});
