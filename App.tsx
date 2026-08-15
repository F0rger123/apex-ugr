import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApexDesignPreview } from './src/v2/ApexDesignPreview';

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: '#030403' }}>
      <StatusBar style="light" backgroundColor="#030403" />
      <ApexDesignPreview />
    </SafeAreaProvider>
  );
}
