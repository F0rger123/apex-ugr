import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../config/colors';

interface ApexButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const ApexButton: React.FC<ApexButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getStyle = () => {
    switch (variant) {
      case 'secondary':
        return { bg: colors.surface, border: colors.cardBorder, text: colors.text };
      case 'outline':
        return { bg: 'transparent', border: colors.primary, text: colors.primary };
      case 'danger':
        return { bg: 'rgba(255, 51, 102, 0.2)', border: colors.danger, text: colors.danger };
      case 'primary':
      default:
        return { bg: colors.primary, border: colors.primary, text: colors.background };
    }
  };

  const buttonStyle = getStyle();

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: buttonStyle.bg,
          borderColor: buttonStyle.border,
          paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
          paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator color={buttonStyle.text} size="small" />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.buttonText,
              {
                color: buttonStyle.text,
                fontSize: size === 'sm' ? 12 : size === 'lg' ? 16 : 14,
                marginLeft: icon ? 8 : 0,
              },
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
