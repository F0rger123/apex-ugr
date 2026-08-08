import React from 'react';
import { View, StyleSheet, ViewStyle, Pressable, Platform } from 'react-native';
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
  const containerStyle = [
    styles.container,
    activeGlow ? styles.activeGlowBorder : styles.standardBorder,
    style || {},
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [containerStyle, pressed && styles.pressed]}>
        <View style={styles.blurContainer}>{children}</View>
      </Pressable>
    );
  }

  return <View style={containerStyle}><View style={styles.blurContainer}>{children}</View></View>;
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginVertical: 6,
    overflow: 'hidden',
    backgroundColor: colors.surfaceVariant,
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
  pressed: {
    opacity: 0.88,
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
