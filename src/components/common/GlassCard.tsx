import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ViewStyle, TouchableWithoutFeedback, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../../config/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  activeGlow?: boolean;
  onPress?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  style,
  activeGlow = false,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const containerStyle: any[] = [
    styles.container,
    activeGlow ? styles.activeGlowBorder : styles.standardBorder,
    style || {},
  ];

  const content = (
    <BlurView intensity={40} tint="dark" style={styles.blurContainer}>
      {children}
    </BlurView>
  );

  if (onPress) {
    return (
      <TouchableWithoutFeedback onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={onPress}>
        <Animated.View style={[containerStyle, { opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: slideAnim }] }]}>
          {content}
        </Animated.View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <Animated.View style={[containerStyle, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      {content}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginVertical: 6,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 17, 23, 0.4)', // Base fallback translucent
    ...Platform.select({
      web: {
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.45)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 5,
      },
    }),
  },
  standardBorder: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderColor: colors.cardBorder,
  },
  blurContainer: {
    padding: 16,
  },
  activeGlowBorder: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
