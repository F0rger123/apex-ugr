import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../stores/authStore';

import { BottomTabNavigator } from './BottomTabNavigator';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { SignUpScreen } from '../screens/auth/SignUpScreen';
import { VehicleDetailScreen } from '../screens/main/VehicleDetailScreen';
import { CreateChallengeScreen } from '../screens/main/CreateChallengeScreen';
import { CartScreen } from '../screens/main/CartScreen';
import { MessagesScreen } from '../screens/main/MessagesScreen';
import { ProfileScreen } from '../screens/main/ProfileScreen';
import { CarMeetsScreen } from '../screens/main/CarMeetsScreen';
import { TelemetryScreen } from '../screens/main/TelemetryScreen';
import { RaceHubScreen } from '../screens/main/RaceHubScreen';
import { colors } from '../config/colors';

const Stack = createNativeStackNavigator();

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color={colors.primary} />
  </View>
);

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, initializeAuth, user, savePushToken } = useAuthStore();

  // Initialize auth on mount — reads persisted session from AsyncStorage
  // and subscribes to Supabase auth state changes
  useEffect(() => {
    initializeAuth();
  }, []);

  // Register for Push Notifications when user is authenticated
  useEffect(() => {
    async function registerForPushNotificationsAsync() {
      let token;
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          return;
        }
        token = (await Notifications.getExpoPushTokenAsync({ projectId: 'YOUR_PROJECT_ID' })).data;
      }
      
      if (token && user?.id) {
        await savePushToken(user.id, token);
      }
    }
    
    if (isAuthenticated && user?.id) {
      registerForPushNotificationsAsync();
    }
  }, [isAuthenticated, user?.id]);

  // Show loading spinner while we check for an existing session
  if (isLoading) {
    return <LoadingScreen />;
  }

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
          // Auth stack — only shown to unauthenticated users
          <Stack.Group>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="SignUp"
              component={SignUpScreen}
              options={{ animation: 'slide_from_right' }}
            />
          </Stack.Group>
        ) : (
          // Main app stack — only shown to authenticated users
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={BottomTabNavigator} />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="CreateChallenge"
              component={CreateChallengeScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Cart"
              component={CartScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Messages"
              component={MessagesScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Profile"
              component={ProfileScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="CarMeets"
              component={CarMeetsScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Telemetry"
              component={TelemetryScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="RaceHub"
              component={RaceHubScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
