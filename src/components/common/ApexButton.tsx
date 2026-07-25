import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle, Animated, Platform, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRef } from 'react';
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
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
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

  const getStyle = () => {
    switch (variant) {
      case 'secondary':
        return { bg: 'rgba(25, 37, 64, 0.4)', border: colors.cardBorder, text: colors.text };
      case 'outline':
        return { bg: 'rgba(0, 255, 102, 0.1)', border: colors.primary, text: colors.primary };
      case 'danger':
        return { bg: 'rgba(255, 51, 102, 0.2)', border: colors.danger, text: colors.danger };
      case 'primary':
      default:
        return { bg: 'rgba(0, 255, 102, 0.3)', border: colors.primary, text: '#FFFFFF' };
    }
  };

  const buttonStyle = getStyle();

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled || isLoading}
    >
      <Animated.View
        style={[
          styles.button,
          {
            backgroundColor: buttonStyle.bg,
            borderColor: buttonStyle.border,
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: scaleAnim }],
          },
          style,
        ]}
      >
        <BlurView intensity={20} tint="dark" style={[
          styles.blurContainer,
          {
            paddingVertical: size === 'sm' ? 8 : size === 'lg' ? 16 : 12,
            paddingHorizontal: size === 'sm' ? 12 : size === 'lg' ? 24 : 16,
          }
        ]}>
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
        </BlurView>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  blurContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
