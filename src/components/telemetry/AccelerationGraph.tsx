import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedProps, withTiming } from 'react-native-reanimated';
import { colors } from '../../config/colors';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AccelerationGraphProps {
  data: number[];
  height?: number;
  width?: number;
}

export const AccelerationGraph: React.FC<AccelerationGraphProps> = ({
  data = [0],
  height = 140,
  width = 340,
}) => {
  const safeData = data.length > 0 ? data : [0];
  const maxVal = Math.max(...safeData, 160);
  const minVal = 0;

  const points = safeData.map((val, index) => {
    const divider = safeData.length > 1 ? safeData.length - 1 : 1;
    const x = (index / divider) * (width - 40) + 20;
    const y = height - 30 - ((val - minVal) / (maxVal - minVal)) * (height - 50);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, point, index) => {
    return index === 0 ? `M ${point.x} ${point.y}` : `${acc} L ${point.x} ${point.y}`;
  }, '');

  // Reanimated path to smooth out the graph updates
  const pathData = useSharedValue(pathD);

  useEffect(() => {
    pathData.value = withTiming(pathD, { duration: 300 });
  }, [pathD]);

  const animatedProps = useAnimatedProps(() => {
    return {
      d: pathData.value,
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PULL ACCELERATION CURVE</Text>
        <Text style={styles.maxText}>MAX {Math.round(Math.max(...safeData))} MPH</Text>
      </View>

      <Svg width={width} height={height}>
        {/* Horizontal Gridlines */}
        <Line x1={20} y1={20} x2={width - 20} y2={20} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
        <Line x1={20} y1={height / 2} x2={width - 20} y2={height / 2} stroke="rgba(255, 255, 255, 0.08)" strokeDasharray="4 4" />
        <Line x1={20} y1={height - 30} x2={width - 20} y2={height - 30} stroke="rgba(255, 255, 255, 0.2)" />

        {/* Speed Line */}
        <AnimatedPath fill="none" stroke={colors.primary} strokeWidth={3} animatedProps={animatedProps} />

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
    backgroundColor: 'rgba(10, 15, 20, 0.5)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 102, 0.1)',
    alignItems: 'center',
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 10,
  },
  title: {
    color: colors.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  maxText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
