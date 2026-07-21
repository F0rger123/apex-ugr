import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
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
  const cardStyle: ViewStyle[] = [
    styles.card,
    activeGlow ? styles.activeGlowBorder : styles.standardBorder,
    style || {},
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} activeOpacity={0.82} onPress={onPress}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  standardBorder: {
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  activeGlowBorder: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
});
