import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { colors } from '../../config/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface SpeedometerGaugeProps {
  currentSpeed: number;
  maxSpeed?: number;
  size?: number;
}

export const SpeedometerGauge: React.FC<SpeedometerGaugeProps> = ({
  currentSpeed,
  maxSpeed = 240,
  size = 280,
}) => {
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  
  const circleCircumference = 2 * Math.PI * radius;
  // We want a 270 degree sweep
  const arcLength = (270 / 360) * circleCircumference;
  const gapLength = circleCircumference - arcLength;
  
  // Create shared value for speed
  const speedProgress = useSharedValue(0);

  useEffect(() => {
    // Clamp the percentage
    const targetProgress = Math.min(1, Math.max(0, currentSpeed / maxSpeed));
    speedProgress.value = withSpring(targetProgress, {
      damping: 12,
      stiffness: 90,
    });
  }, [currentSpeed, maxSpeed]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = arcLength - (speedProgress.value * arcLength);
    return {
      strokeDashoffset,
      stroke: interpolateColor(
        speedProgress.value,
        [0, 0.5, 0.8, 1],
        [colors.primary, colors.primary, colors.warning, colors.danger]
      ),
    };
  });

  const animatedNeedleProps = useAnimatedProps(() => {
    // -135deg to +135deg (0 is top)
    const angle = -135 + speedProgress.value * 270;
    const angleRad = (angle * Math.PI) / 180;
    
    // Needle tip
    const needleR = radius - 24;
    const x2 = center + needleR * Math.sin(angleRad);
    const y2 = center - needleR * Math.cos(angleRad);
    
    return {
      x2,
      y2,
      stroke: interpolateColor(
        speedProgress.value,
        [0, 0.5, 0.8, 1],
        [colors.primary, colors.primary, colors.warning, colors.danger]
      ),
    };
  });

  // Generate tick marks
  const ticks = [];
  const totalTicks = 12;
  for (let i = 0; i <= totalTicks; i++) {
    // from -135 to +135
    const tickAngle = -135 + (i / totalTicks) * 270;
    const tickRad = (tickAngle * Math.PI) / 180;
    
    const p1 = {
      x: center + (radius - 20) * Math.sin(tickRad),
      y: center - (radius - 20) * Math.cos(tickRad),
    };
    const p2 = {
      x: center + (radius - 8) * Math.sin(tickRad),
      y: center - (radius - 8) * Math.cos(tickRad),
    };

    ticks.push(
      <Line
        key={`tick-${i}`}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke="rgba(255,255,255,0.3)"
        strokeWidth={i % 2 === 0 ? 3 : 1}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Rotate SVG so 0 is at bottom (gap is at bottom) */}
      <View style={{ transform: [{ rotate: '135deg' }] }}>
        <Svg width={size} height={size}>
          {/* Background Track Arc */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${gapLength}`}
            strokeLinecap="round"
          />

          {/* Active Speed Arc (Animated) */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${gapLength}`}
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>
      </View>

      {/* Overlay Ticks and Needle (Not Rotated) */}
      <View style={StyleSheet.absoluteFill}>
        <Svg width={size} height={size}>
          <G>{ticks}</G>

          {/* Center Dot */}
          <Circle cx={center} cy={center} r={14} fill={colors.card} stroke={colors.primary} strokeWidth={4} />

          {/* Animated Needle */}
          <AnimatedLine
            x1={center}
            y1={center}
            strokeWidth={4}
            strokeLinecap="round"
            animatedProps={animatedNeedleProps}
          />
        </Svg>
      </View>

      {/* Speedometer Center Digital Display */}
      <View style={styles.readoutOverlay}>
        <Text style={styles.speedNumber}>{Math.round(currentSpeed)}</Text>
        <Text style={styles.unitText}>MPH</Text>
        <View style={styles.statusPill}>
          <Text style={styles.statusText}>LIVE TELEMETRY</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  readoutOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 20,
  },
  speedNumber: {
    fontSize: 64,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -2,
  },
  unitText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 3,
    marginTop: -8,
  },
  statusPill: {
    backgroundColor: 'rgba(0, 255, 102, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});
