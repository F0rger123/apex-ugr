import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Check, ClipboardCopy, RefreshCw, Satellite } from 'lucide-react-native';
import { cloudflareApi } from '../config/cloudflareApi';
import { useLiveNetworkStore } from './live/liveNetworkStore';

const QA_DEBUG_KEY = 'apex.qa.gps-debug-enabled';
const APP_VERSION = '1.5.2';
const ANDROID_VERSION_CODE = 17;
const COMMIT_SHA = 'a28db448d55002341289602369a73cc5454718ee';
const accent = '#A7E59A';
const muted = '#929B95';

type Health = { status?: string; backend?: string; storage?: string };

function fmt(value: number | null | undefined, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—';
}

function age(timestamp: number | null | undefined) {
  if (!timestamp) return '—';
  return `${Math.max(0, Math.round((Date.now() - timestamp) / 1000))}s`;
}

export function DeviceDiagnosticsPanel() {
  const { location, networkStatus, isDriving, unit } = useLiveNetworkStore();
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [debugEnabled, setDebugEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const previousSampleRef = useRef<{ timestamp: number; receivedAt: number } | null>(null);
  const [intervalMs, setIntervalMs] = useState<number | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const next = await cloudflareApi.request<Health>('/api/health');
      setHealth(next);
      setHealthError(null);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : 'Health check unavailable');
    }
  }, []);

  useEffect(() => { void refreshHealth(); }, [refreshHealth]);
  useEffect(() => {
    void AsyncStorage.getItem(QA_DEBUG_KEY).then(value => setDebugEnabled(value === 'true'));
  }, []);
  useEffect(() => {
    if (!location?.timestamp) return;
    const prior = previousSampleRef.current;
    if (prior && prior.timestamp !== location.timestamp) setIntervalMs(Math.max(0, Date.now() - prior.receivedAt));
    previousSampleRef.current = { timestamp: location.timestamp, receivedAt: Date.now() };
  }, [location?.timestamp]);

  const rawSpeedKph = location?.speedKph ?? null;
  // The live map currently displays the GPS speed directly; report that fact to QA rather than invent a smoothing value.
  const displaySpeedKph = rawSpeedKph;
  const { width, height } = Dimensions.get('window');
  const diagnostics = useMemo(() => [
    `APEX UGR DEVICE DIAGNOSTICS`,
    `App: ${APP_VERSION} (${ANDROID_VERSION_CODE})`,
    `Commit: ${COMMIT_SHA}`,
    `Platform: ${Platform.OS} ${Device.osVersion || 'unknown'}`,
    `Device: ${Device.modelName || 'unknown'}`,
    `Screen: ${Math.round(width)}x${Math.round(height)}`,
    `GPS permission/state: ${networkStatus}`,
    `GPS accuracy: ${fmt(location?.accuracy)} m`,
    `GPS sample age: ${age(location?.timestamp)}`,
    `Raw GPS speed: ${fmt(rawSpeedKph)} km/h`,
    `Display speed: ${fmt(displaySpeedKph)} km/h`,
    `Heading: ${fmt(location?.heading, 0)} deg`,
    `Location update interval: ${intervalMs === null ? '—' : `${intervalMs} ms`}`,
    `Drive Mode: ${isDriving ? 'active' : 'inactive'}`,
    `Units: ${unit.toUpperCase()}`,
    `API health: ${health ? `${health.status || 'unknown'} (${health.backend || 'unknown'})` : healthError || 'not checked'}`,
    `D1/R2 health: ${health?.storage || 'not reported by health endpoint'}`,
  ].join('\n'), [displaySpeedKph, health, healthError, height, intervalMs, isDriving, location?.accuracy, location?.heading, location?.timestamp, networkStatus, rawSpeedKph, unit, width]);

  const setDebug = async (value: boolean) => {
    setDebugEnabled(value);
    await AsyncStorage.setItem(QA_DEBUG_KEY, String(value));
  };
  const copyDiagnostics = async () => {
    await Clipboard.setStringAsync(diagnostics);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  const row = (label: string, value: string) => <View key={label} style={styles.row}><Text style={styles.label}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;

  return <View style={styles.panel}>
    <View style={styles.header}><View><Text style={styles.title}>DEVICE DIAGNOSTICS</Text><Text style={styles.meta}>LOCAL QA TOOLING · NO TOKENS OR PRECISE COORDINATES</Text></View><Satellite size={19} color={accent}/></View>
    {row('APP', `${APP_VERSION} · BUILD ${ANDROID_VERSION_CODE}`)}
    {row('SOURCE', COMMIT_SHA.slice(0, 12))}
    {row('DEVICE', `${Platform.OS.toUpperCase()} · ${Device.osVersion || 'UNKNOWN'} · ${Math.round(width)}×${Math.round(height)}`)}
    {row('GPS STATE', networkStatus.toUpperCase())}
    {row('API / STORAGE', health ? `${(health.status || 'LIVE').toUpperCase()} · ${(health.storage || 'NOT REPORTED').toUpperCase()}` : healthError || 'CHECKING…')}
    <Pressable accessibilityRole="button" onPress={() => void refreshHealth()} style={styles.action}><RefreshCw size={15} color={accent}/><Text style={styles.actionText}>REFRESH HEALTH</Text></Pressable>
    <View style={styles.divider}/>
    <View style={styles.toggleRow}><View><Text style={styles.label}>GPS DEBUG OVERLAY</Text><Text style={styles.meta}>Visible only on this device until you turn it off.</Text></View><Switch value={debugEnabled} onValueChange={value => void setDebug(value)} trackColor={{ false: '#292E2A', true: 'rgba(167,229,154,.48)' }} thumbColor={debugEnabled ? accent : '#E4E9E4'}/></View>
    {debugEnabled ? <View style={styles.debugBox}>
      <Text style={styles.debugTitle}>GPS DEBUG</Text>
      {row('RAW SPEED', `${fmt(rawSpeedKph)} KM/H`)}
      {row('DISPLAY SPEED', `${fmt(displaySpeedKph)} KM/H`)}
      {row('ACCURACY', `${fmt(location?.accuracy)} M`)}
      {row('SAMPLE AGE', age(location?.timestamp))}
      {row('HEADING', `${fmt(location?.heading, 0)}°`)}
      {row('LOCATION INTERVAL', intervalMs === null ? 'AWAITING NEXT SAMPLE' : `${intervalMs} MS`)}
      <Text style={styles.debugNote}>Latency is approximated from the most recent local GPS sample. Exact coordinates are intentionally excluded.</Text>
    </View> : null}
    <Pressable accessibilityRole="button" onPress={() => void copyDiagnostics()} style={[styles.copy, copied && styles.copyDone]}><ClipboardCopy size={15} color={copied ? '#061006' : '#071009'}/><Text style={styles.copyText}>{copied ? 'DIAGNOSTICS COPIED' : 'COPY DIAGNOSTICS'}</Text>{copied ? <Check size={14} color="#061006"/> : null}</Pressable>
  </View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: 'rgba(6,10,7,.9)', borderColor: 'rgba(255,255,255,.15)', borderWidth: 1, borderRadius: 10, padding: 14, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { color: '#F7F9F7', fontSize: 13, fontWeight: '900', letterSpacing: 1.4 },
  meta: { color: muted, fontSize: 9, lineHeight: 14, letterSpacing: .65 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14 },
  label: { color: '#DDE3DD', fontSize: 11, fontWeight: '800', letterSpacing: .7, flex: 1 },
  value: { color: accent, fontSize: 10, fontWeight: '800', maxWidth: '58%', textAlign: 'right', letterSpacing: .45 },
  action: { minHeight: 40, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(167,229,154,.35)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  actionText: { color: accent, fontWeight: '900', fontSize: 10, letterSpacing: 1 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.1)' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  debugBox: { backgroundColor: 'rgba(167,229,154,.07)', borderLeftWidth: 2, borderLeftColor: accent, padding: 10, gap: 7 },
  debugTitle: { color: accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  debugNote: { color: muted, fontSize: 9, lineHeight: 13 },
  copy: { minHeight: 44, borderRadius: 7, backgroundColor: accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  copyDone: { backgroundColor: '#DFF4DC' },
  copyText: { color: '#071009', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
});
