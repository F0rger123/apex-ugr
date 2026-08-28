import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { colors } from '../../config/colors';

interface AppErrorBoundaryState {
  error: Error | null;
  incidentId: string | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, incidentId: null };

  static getDerivedStateFromError(error: Error) {
    return { error, incidentId: `UI-${Date.now().toString(36).toUpperCase()}` };
  }

  componentDidCatch(error: Error) {
    console.error('[Apex UGR] UI boundary', { incidentId: this.state.incidentId, name: error.name, message: error.message });
  }

  handleReload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.reload();
      return;
    }
    this.setState({ error: null, incidentId: null });
  };

  handleHud = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.history.replaceState({}, '', '/app/command');
      window.location.reload();
      return;
    }
    this.setState({ error: null, incidentId: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.kicker}>APEX UGR / RECOVERY CHANNEL</Text>
        <Text style={styles.title}>SIGNAL INTERRUPTED</Text>
        <Text style={styles.body}>This screen lost its secure connection. Your account and saved progress remain intact.</Text>
        <Text selectable style={styles.debug}>INCIDENT // {this.state.incidentId}</Text>
        <View style={styles.actions}><Pressable accessibilityRole="button" style={styles.button} onPress={this.handleReload}><Text style={styles.buttonText}>RETRY</Text></Pressable><Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={this.handleHud}><Text style={styles.secondaryButtonText}>BACK TO HUD</Text></Pressable></View>
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  secondaryButton: { borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 12 },
  secondaryButtonText: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
});
