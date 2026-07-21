import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet } from 'react-native';

import { DashboardScreen } from '../screens/main/DashboardScreen';
import { GarageScreen } from '../screens/main/GarageScreen';
import { MapScreen } from '../screens/main/MapScreen';
import { RaceHubScreen } from '../screens/main/RaceHubScreen';
import { MarketplaceScreen } from '../screens/main/MarketplaceScreen';
import { FeedScreen } from '../screens/main/FeedScreen';
import { LeaderboardsScreen } from '../screens/main/LeaderboardsScreen';

import { colors } from '../config/colors';
import { Gauge, Car, MapPin, Flag, ShoppingBag, Tv, Trophy } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'HUD',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Gauge size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="Garage"
        component={GarageScreen}
        options={{
          tabBarLabel: 'GARAGE',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Car size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'RADAR',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <MapPin size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="RaceHub"
        component={RaceHubScreen}
        options={{
          tabBarLabel: 'WAGERS',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Flag size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="Marketplace"
        component={MarketplaceScreen}
        options={{
          tabBarLabel: 'PARTS',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <ShoppingBag size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarLabel: 'FEED',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Tv size={size - 2} color={color} />,
        }}
      />

      <Tab.Screen
        name="Leaderboards"
        component={LeaderboardsScreen}
        options={{
          tabBarLabel: 'RANKS',
          tabBarIcon: ({ color, size }: { color: string; size: number }) => <Trophy size={size - 2} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.glassHeader,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    height: 60,
    paddingBottom: 6,
    paddingTop: 6,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
