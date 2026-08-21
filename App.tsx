import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: '#030403' }}>
      <StatusBar style="light" backgroundColor="#030403" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}
