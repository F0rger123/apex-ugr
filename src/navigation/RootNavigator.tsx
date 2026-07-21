import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '../stores/authStore';

import { BottomTabNavigator } from './BottomTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { VehicleDetailScreen } from '../screens/main/VehicleDetailScreen';
import { CreateChallengeScreen } from '../screens/main/CreateChallengeScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { CarMeetsScreen } from '../screens/main/CarMeetsScreen';
import { TelemetryScreen } from '../screens/main/TelemetryScreen';
import { colors } from '../config/colors';

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.card,
          text: colors.text,
          border: colors.cardBorder,
          notification: colors.danger,
        },
      }}
    >
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade_from_bottom' }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen name="VehicleDetail" component={VehicleDetailScreen} />
            <Stack.Screen name="CreateChallenge" component={CreateChallengeScreen} />
            <Stack.Screen name="Cart" component={CartScreen} />
            <Stack.Screen name="Messages" component={MessagesScreen} />
            <Stack.Screen name="Profile" component={ProfileScreen} />
            <Stack.Screen name="CarMeets" component={CarMeetsScreen} />
            <Stack.Screen name="Telemetry" component={TelemetryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
