import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { colors } from '../../config/colors';

interface AccelerationGraphProps {
  data: number[];
  height?: number;
  width?: number;
}

export const AccelerationGraph: React.FC<AccelerationGraphProps> = ({
  data = [0, 20, 45, 60, 85, 110, 135, 142, 120, 85, 40, 0],
  height = 120,
  width = 320,
}) => {
  const maxVal = Math.max(...data, 160);
  const minVal = 0;

  const points = data.map((val, index) => {
    const divider = data.length > 1 ? data.length - 1 : 1;
    const x = (index / divider) * (width - 20) + 10;
    const y = height - 20 - ((val - minVal) / (maxVal - minVal)) * (height - 30);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PULL ACCELERATION CURVE</Text>
        <Text style={styles.maxText}>MAX {Math.max(...data)} MPH</Text>
      </View>

      <Svg width={width} height={height}>
        {/* Horizontal Gridlines */}
        <Line x1={10} y1={20} x2={width - 10} y2={20} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
        <Line x1={10} y1={height / 2} x2={width - 10} y2={height / 2} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
        <Line x1={10} y1={height - 20} x2={width - 10} y2={height - 20} stroke="rgba(255, 255, 255, 0.15)" />

        {/* Speed Line */}
        <Path d={pathD} fill="none" stroke={colors.primary} strokeWidth={2.5} />

        {/* Data points */}
        {points.map((p, idx) => (
          <Circle key={`p-${idx}`} cx={p.x} cy={p.y} r={3} fill={colors.background} stroke={colors.primary} strokeWidth={2} />
        ))}
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
    alignItems: 'center',
    marginVertical: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 6,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  maxText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
});
