import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { colors } from '../../config/colors';

const { width, height } = Dimensions.get('window');

export const NebulaBackground = () => {
  const anim1 = useRef(new Animated.Value(0)).current;
  const anim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createLoop = (anim: Animated.Value, duration: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    };

    createLoop(anim1, 15000).start();
    createLoop(anim2, 20000).start();
  }, []);

  const translate1 = anim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  const translate2 = anim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  });

  const scale1 = anim1.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.2, 1],
  });

  const scale2 = anim2.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View
        style={[
          styles.orb1,
          {
            transform: [{ translateX: translate1 }, { translateY: translate1 }, { scale: scale1 }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb2,
          {
            transform: [{ translateX: translate2 }, { translateY: translate1 }, { scale: scale2 }],
          },
        ]}
      />
      <View style={styles.overlay} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.deepSpace,
    overflow: 'hidden',
    zIndex: -1,
  },
  orb1: {
    position: 'absolute',
    top: -height * 0.2,
    left: -width * 0.2,
    width: width * 1.5,
    height: width * 1.5,
    borderRadius: 9999,
    backgroundColor: colors.astralIndigo,
    opacity: 0.15,
    ...Platform.select({
      web: { filter: 'blur(80px)' as any },
      default: {},
    }),
  } as any,
  orb2: {
    position: 'absolute',
    bottom: -height * 0.1,
    right: -width * 0.3,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: 9999,
    backgroundColor: colors.astralPurple,
    opacity: 0.15,
    ...Platform.select({
      web: { filter: 'blur(100px)' as any },
      default: {},
    }),
  } as any,
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 14, 32, 0.6)', // deep space wash
  },
});
