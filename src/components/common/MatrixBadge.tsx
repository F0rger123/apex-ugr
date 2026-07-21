import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../config/colors';

interface MatrixBadgeProps {
  label: string;
  variant?: 'green' | 'danger' | 'gold' | 'silver';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const MatrixBadge: React.FC<MatrixBadgeProps> = ({
  label,
  variant = 'green',
  size = 'md',
  style,
}) => {
  const getColors = () => {
    switch (variant) {
      case 'danger':
        return { bg: 'rgba(255, 51, 102, 0.15)', text: colors.danger, border: 'rgba(255, 51, 102, 0.4)' };
      case 'gold':
        return { bg: 'rgba(255, 184, 0, 0.15)', text: colors.warning, border: 'rgba(255, 184, 0, 0.4)' };
      case 'silver':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: colors.textSecondary, border: 'rgba(148, 163, 184, 0.3)' };
      case 'green':
      default:
        return { bg: 'rgba(0, 255, 102, 0.12)', text: colors.primary, border: 'rgba(0, 255, 102, 0.35)' };
    }
  };

  const badgeColors = getColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: badgeColors.bg,
          borderColor: badgeColors.border,
          paddingVertical: size === 'sm' ? 2 : 4,
          paddingHorizontal: size === 'sm' ? 6 : 10,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          {
            color: badgeColors.text,
            fontSize: size === 'sm' ? 10 : 12,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
