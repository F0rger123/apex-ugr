import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors } from '../../config/colors';

interface AppErrorBoundaryState {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('[Apex UGR] App startup error:', error);
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>APEX UGR / RECOVERABLE ERROR</Text>
        <Text style={styles.title}>Apex UGR needs a quick reload.</Text>
        <Text style={styles.body}>One screen hit an unexpected error. Your garage, radar, and account data are safe.</Text>
        <Text selectable style={styles.debug}>{this.state.error.message || 'Unknown runtime error'}</Text>
        <Pressable style={styles.button} onPress={this.handleReload}>
          <Text style={styles.buttonText}>RELOAD APP</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: 24 },
  kicker: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 12 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  body: { color: colors.textSecondary, fontSize: 13, lineHeight: 20, maxWidth: 560, marginTop: 12, textAlign: 'center' },
  debug: { color: colors.textMuted, fontSize: 11, lineHeight: 16, maxWidth: 560, marginTop: 10, textAlign: 'center' },
  button: { backgroundColor: colors.primary, borderRadius: 8, marginTop: 22, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: colors.buttonTextDark, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
