import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useLiveNetworkStore, LiveDriver, LiveEvent } from './live/liveNetworkStore';
import { useContentStore } from './live/contentStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useMessageStore } from '../stores/messageStore';
import { hasLiveBackend, supabase } from '../config/supabase';
import {
  Activity,
  BadgeCheck,
  Bell,
  Bookmark,
  CalendarDays,
  CarFront,
  Check,
  ChevronRight,
  CircleDollarSign,
  Crosshair,
  Crown,
  Gauge,
  Gem,
  Gift,
  Heart,
  Layers3,
  ListFilter,
  LockKeyhole,
  Map,
  MapPin,
  Medal,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Navigation,
  PackageCheck,
  Play,
  Plus,
  Radio,
  ScanLine,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react-native';

const accent = '#91B985';
const paper = '#F3F5F3';
const muted = '#858E87';
const surface = 'rgba(6, 9, 7, 0.78)';
const border = 'rgba(255, 255, 255, 0.16)';
const { width: screenWidth } = Dimensions.get('window');

let NativeMap: any = null;
let NativeMarker: any = null;
let NativeCircle: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  NativeMap = maps.default;
  NativeMarker = maps.Marker;
  NativeCircle = maps.Circle;
}

type TabKey = 'command' | 'radar' | 'feed' | 'garage' | 'more' | 'race' | 'vault' | 'shop' | 'meets' | 'messages' | 'leaderboard';
type IconType = any;

interface Driver {
  id: string;
  alias: string;
  car: string;
  hp: number | null;
  record: string;
  rank: 'Bronze' | 'Silver' | 'Master' | 'Platinum';
  distance: string;
  mystery?: boolean;
  latitude: number;
  longitude: number;
  speedKph?: number;
  cruiseId?: string | null;
}

const tabs: { key: TabKey; label: string; icon: IconType }[] = [
  { key: 'command', label: 'COMMAND', icon: Activity },
  { key: 'radar', label: 'RADAR', icon: Crosshair },
  { key: 'feed', label: 'FEED', icon: Play },
  { key: 'garage', label: 'GARAGE', icon: CarFront },
  { key: 'more', label: 'MORE', icon: MoreHorizontal },
];

const rankColors: Record<Driver['rank'], string> = {
  Bronze: '#C98655',
  Silver: '#CED5CE',
  Master: accent,
  Platinum: '#FFFFFF',
};

function GridBackdrop() {
  const scan = useRef(new Animated.Value(-80)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scan, { toValue: 900, duration: 6200, useNativeDriver: true }),
        Animated.timing(scan, { toValue: -80, duration: 0, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [scan]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.gridVerticals}>{[0, 1, 2, 3, 4].map(line => <View key={line} style={styles.gridVertical} />)}</View>
      <View style={styles.gridHorizontals}>{Array.from({ length: 12 }, (_, line) => <View key={line} style={styles.gridHorizontal} />)}</View>
      <Animated.View style={[styles.scanline, { transform: [{ translateY: scan }] }]} />
    </View>
  );
}

function GlassPanel({ children, style, glow = false }: { children: React.ReactNode; style?: any; glow?: boolean }) {
  return (
    <View style={[styles.glassShell, glow && styles.glassGlow, style]}>
      <BlurView intensity={Platform.OS === 'web' ? 38 : 24} tint="dark" style={styles.glassBlur}>
        {children}
      </BlurView>
    </View>
  );
}

function GlassButton({
  label,
  icon: Icon,
  onPress,
  active = false,
  compact = false,
}: {
  label: string;
  icon: IconType;
  onPress: () => void;
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.glassButtonShell, compact && styles.glassButtonCompact, pressed && styles.pressed]}>
      <BlurView intensity={Platform.OS === 'web' ? 48 : 34} tint="dark" style={[styles.glassButton, active && styles.glassButtonActive]}>
        <View pointerEvents="none" style={styles.glassButtonShine} />
        <Icon size={compact ? 14 : 17} color={active ? accent : paper} strokeWidth={2.2} />
        <Text style={[styles.glassButtonText, active && styles.glassButtonTextActive]}>{label}</Text>
      </BlurView>
    </Pressable>
  );
}

function RankBadge({ rank = 'Master', compact = false }: { rank?: Driver['rank']; compact?: boolean }) {
  return (
    <View style={[styles.rankBadge, { borderColor: rankColors[rank] }, compact && styles.rankBadgeCompact]}>
      <Crown size={compact ? 11 : 14} color={rankColors[rank]} strokeWidth={2.4} />
      <Text style={[styles.rankBadgeText, { color: rankColors[rank] }]}>{rank.toUpperCase()}</Text>
    </View>
  );
}

function SectionTitle({ label, action }: { label: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {action ? <Text style={styles.sectionAction}>{action}</Text> : null}
    </View>
  );
}

function CreditsToken({ value, compact = false }: { value: number; compact?: boolean }) {
  const pulse = useRef(new Animated.Value(0.72)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0.72, duration: 1100, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.tokenWrap, compact && styles.tokenWrapCompact]}>
      <Animated.View style={[styles.tokenAura, { opacity: pulse }]} />
      <LinearGradient colors={['#E7FFD0', accent, '#62A51E']} style={[styles.token, compact && styles.tokenCompact]}>
        <Text style={[styles.tokenLetter, compact && styles.tokenLetterCompact]}>A</Text>
      </LinearGradient>
      <View>
        <Text style={styles.tokenValue}>{value.toLocaleString()}</Text>
        <Text style={styles.tokenLabel}>APEX CREDITS</Text>
      </View>
    </View>
  );
}

function CommandScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const { profile, rankings, vehicles, activeVehicleId } = useContentStore();
  const { drivers, events, cruises, networkStatus, isDriving, startDrive } = useLiveNetworkStore();
  const vehicle = vehicles.find(item => item.id === activeVehicleId);
  const rankIndex = profile ? rankings.findIndex(item => item.id === useContentStore.getState().userId) : -1;
  const liveCredits = profile?.credits ?? 0;
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.hero}>{vehicle?.photoUrl ? <Image source={{ uri: vehicle.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, styles.commandEmptyHero]}><CarFront size={68} color="rgba(255,255,255,.18)" /></View>}
        <LinearGradient colors={['rgba(3,4,3,0.05)', 'rgba(3,4,3,0.44)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.heroStatusText}>{networkStatus.replace('_', ' ').toUpperCase()} / {isDriving ? 'DRIVE ACTIVE' : 'SECURE'}</Text>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.eyebrow}>ACTIVE BUILD</Text>
          <Text style={styles.heroTitle}>{vehicle?.nickname.toUpperCase() || 'NO VEHICLE'}</Text>
          <Text style={styles.heroCarName}>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.toUpperCase() : 'ADD A VEHICLE IN GARAGE'}</Text>
          <View style={styles.heroActions}>
            <GlassButton label="OPEN GARAGE" icon={CarFront} onPress={() => onTab('garage')} active />
            <GlassButton label="LOCATE" icon={MapPin} onPress={() => onTab('radar')} />
          </View>
        </View>
      </View>

      <View style={styles.metricRail}>
        <View style={styles.metric}><Text style={styles.metricValue}>{vehicle?.horsepower || '—'}</Text><Text style={styles.metricLabel}>HP</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={styles.metricValue}>{profile ? `${profile.wins}–${Math.max(0, profile.entered - profile.wins)}` : '—'}</Text><Text style={styles.metricLabel}>RECORD</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={styles.metricValue}>{rankIndex >= 0 ? `#${String(rankIndex + 1).padStart(3, '0')}` : '—'}</Text><Text style={styles.metricLabel}>GLOBAL</Text></View>
      </View>

      <SectionTitle label="PILOT STATUS" action={profile ? 'LIVE RECORD' : 'OFFLINE'} />
      <GlassPanel glow>
        <View style={styles.statusTop}>
          <View>
            <Text style={styles.statusAlias}>{profile?.alias.toUpperCase() || 'SIGN IN REQUIRED'}</Text>
            {profile ? <RankBadge rank={(['Bronze','Silver','Master','Platinum'].includes(profile.tier) ? profile.tier : 'Bronze') as Driver['rank']} /> : null}
          </View>
          <CreditsToken value={liveCredits} compact />
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, ((profile?.points || 0) % 10000) / 100)}%` }]} /></View>
        <View style={styles.progressLabels}><Text style={styles.progressText}>{(profile?.points || 0).toLocaleString()} RP</Text><Text style={styles.progressText}>{profile?.tier?.toUpperCase() || 'UNRANKED'}</Text></View>
      </GlassPanel>

      <SectionTitle label="LIVE NETWORK" action={`${drivers.length} ONLINE`} />
      <Pressable onPress={() => onTab('race')} style={({ pressed }) => [styles.commandRow, pressed && styles.pressed]}>
        <View style={styles.commandIcon}><Swords size={20} color={accent} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>RACE CONTROL</Text><Text style={styles.commandMeta}>{drivers.length} nearby pilots available</Text></View>
        <ChevronRight size={18} color={muted} />
      </Pressable>
      <Pressable onPress={() => onTab('radar')} style={({ pressed }) => [styles.commandRow, pressed && styles.pressed]}>
        <View style={styles.commandIcon}><Radio size={20} color={paper} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>LIVE RADAR</Text><Text style={styles.commandMeta}>{events.length} events · {cruises.length} cruises</Text></View>
        <ChevronRight size={18} color={muted} />
      </Pressable>
      <Pressable onPress={startDrive} style={({ pressed }) => [styles.commandRow, styles.commandDriveRow, pressed && styles.pressed]}><View style={styles.commandIcon}><Navigation size={20} color={accent} /></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>ENTER DRIVE MODE</Text><Text style={styles.commandMeta}>Press Enter anywhere on web · live GPS speed and distance</Text></View><Play size={18} color={paper} /></Pressable>

    </ScrollView>
  );
}

function RewardBadge({ icon: Icon, label, detail }: { icon: IconType; label: string; detail: string }) {
  return (
    <GlassPanel style={styles.rewardBadge}>
      <View style={styles.rewardIcon}><Icon size={22} color={accent} strokeWidth={2} /></View>
      <Text style={styles.rewardLabel}>{label}</Text>
      <Text style={styles.rewardDetail}>{detail}</Text>
    </GlassPanel>
  );
}

function RadarMap({
  location,
  mode,
  selected,
  onSelect,
  drivers,
  events,
}: {
  location: { latitude: number; longitude: number } | null;
  mode: 'street' | 'satellite';
  selected: Driver | null;
  onSelect: (driver: Driver | null) => void;
  drivers: Driver[];
  events: LiveEvent[];
}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== 'apex-radar') return;
      const driver = drivers.find(item => item.id === event.data.driverId);
      if (driver) onSelect(driver);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [drivers, onSelect]);

  if (Platform.OS === 'web') {
    const tileUrl = mode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = mode === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap';
    const safeDrivers = JSON.stringify(drivers).replace(/</g, '\\u003c');
    const safeEvents = JSON.stringify(events).replace(/</g, '\\u003c');
    const center = location || { latitude: 20, longitude: 0 };
    const zoom = location ? 14 : 2;
    const selfMarker = location ? `L.marker([${location.latitude},${location.longitude}],{icon:L.divIcon({className:'',html:'<div class="self-pin"><span>▲</span><b>YOU</b></div>',iconSize:[58,36],iconAnchor:[29,18]})}).addTo(map);` : '';
    const mapDocument = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#050705}.leaflet-control-attribution{font:8px monospace;background:rgba(3,4,3,.72)!important;color:#aaa}.leaflet-control-attribution a{color:#91b985}.leaflet-control-zoom{display:none}.driver-pin,.self-pin{display:flex;align-items:center;justify-content:center;background:rgba(4,7,5,.94);border:2px solid #f3f5f3;color:#91b985;font:900 12px monospace;border-radius:50%;box-shadow:0 0 16px rgba(145,185,133,.38)}.driver-pin{width:34px;height:34px}.driver-pin.mystery{border-style:dashed}.driver-pin.cruise{box-shadow:0 0 0 7px rgba(145,185,133,.12),0 0 18px rgba(145,185,133,.55)}.self-pin{width:58px;height:30px;border-radius:18px;background:#dbe7d8;color:#071007;gap:5px}.self-pin b{font-size:9px}.event-core{width:14px;height:14px;border-radius:50%;background:#91b985;border:2px solid #eaf0e8;box-shadow:0 0 20px #91b985}@keyframes eventPulse{0%{stroke-opacity:.68;fill-opacity:.18}50%{stroke-opacity:.18;fill-opacity:.04}100%{stroke-opacity:.68;fill-opacity:.18}}.event-zone{animation:eventPulse 2.4s ease-in-out infinite}${mode === 'street' ? '#map{filter:grayscale(1) invert(.91) contrast(1.22) brightness(.50)}' : '#map{filter:saturate(.48) contrast(1.18) brightness(.55)}'}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([${center.latitude},${center.longitude}],${zoom});L.tileLayer('${tileUrl}',{maxZoom:19,attribution:'${attribution}'}).addTo(map);${selfMarker}const drivers=${safeDrivers};drivers.forEach(d=>{const label=d.mystery?'?':d.alias.slice(0,1);const classes='driver-pin '+(d.mystery?'mystery ':'')+(d.cruiseId?'cruise':'');L.marker([d.latitude,d.longitude],{icon:L.divIcon({className:'',html:'<div class="'+classes+'">'+label+'</div>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map).on('click',()=>parent.postMessage({source:'apex-radar',driverId:d.id},'*'));});const events=${safeEvents};events.forEach(e=>{L.circle([e.latitude,e.longitude],{radius:e.radiusM,color:'#91b985',weight:2,fillColor:'#91b985',fillOpacity:.12,className:'event-zone'}).addTo(map).bindTooltip(e.title);L.marker([e.latitude,e.longitude],{icon:L.divIcon({className:'',html:'<div class="event-core"></div>',iconSize:[18,18],iconAnchor:[9,9]})}).addTo(map);});</script></body></html>`;
    return (
      <View style={styles.mapFrame}>
        {React.createElement('iframe', {
          key: mode,
          srcDoc: mapDocument,
          title: 'Apex Radar',
          style: { width: '100%', height: '100%', border: 0 },
        })}
        <RadarScanner />
      </View>
    );
  }

  return (
    <View style={styles.mapFrame}>
      <NativeMap
        style={StyleSheet.absoluteFill}
        mapType={mode === 'satellite' ? 'satellite' : 'standard'}
        customMapStyle={darkMapStyle}
        initialRegion={{ latitude: location?.latitude || 20, longitude: location?.longitude || 0, latitudeDelta: location ? 0.04 : 90, longitudeDelta: location ? 0.04 : 90 }}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {drivers.map(driver => (
          <NativeMarker key={driver.id} coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} onPress={() => onSelect(driver)}>
            <View style={[styles.nativePin, driver.mystery && styles.mysteryPin]}>
              <Text style={styles.nativePinText}>{driver.mystery ? '?' : driver.alias.slice(0, 1)}</Text>
            </View>
          </NativeMarker>
        ))}
        {events.map(event => <NativeCircle key={event.id} center={{ latitude: event.latitude, longitude: event.longitude }} radius={event.radiusM} strokeColor="rgba(145,185,133,.75)" fillColor="rgba(145,185,133,.12)" />)}
      </NativeMap>
    </View>
  );
}

function RadarScanner() {
  const sweep = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(Animated.timing(sweep, { toValue: 1, duration: 3200, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [sweep]);
  const rotation = sweep.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  return (
    <View pointerEvents="none" style={styles.scannerField}>
      <View style={[styles.scannerRing, styles.scannerRingOuter]} />
      <View style={[styles.scannerRing, styles.scannerRingMiddle]} />
      <View style={[styles.scannerRing, styles.scannerRingInner]} />
      <View style={styles.scannerAxisHorizontal} />
      <View style={styles.scannerAxisVertical} />
      <Animated.View style={[styles.scannerSweep, { transform: [{ rotate: rotation }] }]}>
        <LinearGradient colors={['rgba(145,185,133,0)', 'rgba(145,185,133,.30)']} style={styles.scannerBeam} />
      </Animated.View>
    </View>
  );
}

function RadarScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const [selected, setSelected] = useState<Driver | null>(null);
  const [mode, setMode] = useState<'street' | 'satellite'>('street');
  const [filter, setFilter] = useState<'drivers' | 'events' | 'crews'>('drivers');
  const { location, drivers: liveDrivers, events, cruises, networkStatus, error, isDriving, unit, distanceKm, maxSpeedKph, lockLocation, startDrive, stopDrive, toggleUnit } = useLiveNetworkStore();
  const drivers = liveDrivers.map((driver: LiveDriver): Driver => ({
    id: driver.id, alias: driver.alias, car: driver.vehicle || 'VEHICLE PRIVATE', hp: null, record: driver.record,
    rank: driver.tier, distance: `${Math.round(driver.speedKph)} KPH`, mystery: driver.mystery,
    latitude: driver.latitude, longitude: driver.longitude, speedKph: driver.speedKph, cruiseId: driver.cruiseId,
  }));
  useEffect(() => { if (!location) lockLocation(); }, []);

  return (
    <View style={styles.radarScreen}>
      <RadarMap location={location} mode={mode} selected={selected} onSelect={setSelected} drivers={drivers} events={events} />
      <View style={styles.radarTopControls}>
        <View style={styles.segmentedControl}>
          {(['street', 'satellite'] as const).map(item => (
            <Pressable key={item} onPress={() => setMode(item)} style={[styles.segment, mode === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={lockLocation} style={styles.locateButton}><Crosshair size={16} color={accent} /><Text style={styles.locateText}>{location ? 'GPS LOCKED' : 'LOCK ON'}</Text></Pressable>
      </View>
      <View style={styles.networkPill}><View style={styles.liveDot} /><Text style={styles.networkPillText}>{drivers.length} DRIVERS / {events.length} EVENTS / {cruises.length} CRUISES</Text></View>
      <View style={styles.radarFilters}>
        {(['drivers', 'events', 'crews'] as const).map(item => (
          <Pressable key={item} onPress={() => setFilter(item)} style={[styles.radarFilter, filter === item && styles.radarFilterActive]}>
            <Text style={[styles.radarFilterText, filter === item && styles.radarFilterTextActive]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>

      {selected ? (
        <GlassPanel style={styles.driverSheet} glow>
          <View style={styles.driverSheetHeader}>
            <View style={[styles.driverAvatar, selected.mystery && styles.mysteryAvatar]}><Text style={styles.driverAvatarText}>{selected.mystery ? '?' : selected.alias.slice(0, 2)}</Text></View>
            <View style={styles.driverIdentity}><Text style={styles.driverAlias}>{selected.alias}</Text><Text style={styles.driverCar}>{selected.car}</Text></View>
            <Pressable onPress={() => setSelected(null)} style={styles.closeButton}><X size={17} color={paper} /></Pressable>
          </View>
          <View style={styles.driverStats}>
            <View><Text style={styles.driverStatValue}>{selected.hp || '—'}</Text><Text style={styles.driverStatLabel}>HP</Text></View>
            <View><Text style={styles.driverStatValue}>{selected.record}</Text><Text style={styles.driverStatLabel}>RECORD</Text></View>
            <View><Text style={styles.driverStatValue}>{selected.distance}</Text><Text style={styles.driverStatLabel}>DISTANCE</Text></View>
            <RankBadge rank={selected.rank} compact />
          </View>
          <View style={styles.sheetActions}>
            <GlassButton label="CHALLENGE" icon={Swords} onPress={() => onTab('race')} active />
            <GlassButton label="PROFILE" icon={UserRound} onPress={() => Alert.alert(selected.alias, selected.mystery ? 'This pilot is running in mystery mode.' : `${selected.car}\n${selected.record} career record`)} />
          </View>
        </GlassPanel>
      ) : (
        <GlassPanel style={styles.radarDock}>
          <Text style={styles.radarDockTitle}>RADAR ACTIVE</Text>
          <View style={styles.radarReadout}><Text style={styles.radarDockMeta}>{networkStatus.replace('_', ' ').toUpperCase()}</Text><Text style={styles.radarDockMeta}>{filter.toUpperCase()} CHANNEL</Text></View>
          {error ? <Text style={styles.networkError}>{error}</Text> : null}
          <View style={styles.driveDock}>
            <Pressable onPress={isDriving ? stopDrive : startDrive} style={[styles.driveEnter, isDriving && styles.driveEnterActive]}><Play size={16} color={isDriving ? accent : paper} /><Text style={styles.driveEnterText}>{isDriving ? 'END DRIVE' : 'ENTER DRIVE MODE'}</Text></Pressable>
            {isDriving ? <Pressable onPress={toggleUnit} style={styles.unitButton}><Text style={styles.unitText}>{unit.toUpperCase()}</Text></Pressable> : null}
          </View>
        </GlassPanel>
      )}
      {isDriving ? <View pointerEvents="none" style={styles.driveHud}><Text style={styles.driveSpeed}>{Math.round(unit === 'mph' ? (location?.speedKph || 0) * .621371 : location?.speedKph || 0)}</Text><Text style={styles.driveUnit}>{unit.toUpperCase()}</Text><Text style={styles.driveMeta}>{distanceKm.toFixed(2)} KM · MAX {Math.round(maxSpeedKph * (unit === 'mph' ? .621371 : 1))}</Text></View> : null}
    </View>
  );
}

function FeedScreen() {
  const { posts, loading, error, userId, toggleLike, toggleSave, addComment, createPost, loadFeed } = useContentStore();
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');

  const pickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: .88, allowsEditing: false });
    if (!result.canceled && result.assets[0]) {
      setDraftUri(result.assets[0].uri);
      setDraftType(result.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };
  const publish = async () => {
    if (!draftUri) return;
    if (await createPost(draftUri, caption, draftType)) {
      setComposerOpen(false); setDraftUri(null); setCaption('');
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false} decelerationRate="fast">
      <View style={styles.feedHeader}>
        <View><Text style={styles.eyebrow}>ENCRYPTED SOCIAL</Text><Text style={styles.feedTitle}>THE CURRENT</Text></View>
        <GlassButton label="POST" icon={Plus} compact onPress={() => setComposerOpen(value => !value)} active />
      </View>
      {composerOpen ? <GlassPanel style={styles.composerPanel} glow><Pressable onPress={pickMedia} style={styles.mediaPicker}>{draftUri ? <Image source={{ uri: draftUri }} style={styles.composerPreview} /> : <><Plus size={24} color={accent} /><Text style={styles.composerHint}>SELECT PHOTO OR VIDEO</Text></>}</Pressable><TextInput value={caption} onChangeText={setCaption} placeholder="Write a caption" placeholderTextColor={muted} style={styles.composerInput} multiline maxLength={1200} /><View style={styles.composerActions}><GlassButton label="CANCEL" icon={X} compact onPress={() => setComposerOpen(false)} /><GlassButton label={loading ? 'UPLOADING' : 'PUBLISH'} icon={Send} compact onPress={publish} active /></View></GlassPanel> : null}
      {!userId ? <GlassPanel style={styles.emptyState}><LockKeyhole size={28} color={accent} /><Text style={styles.emptyTitle}>LIVE FEED REQUIRES SIGN-IN</Text><Text style={styles.emptyCopy}>Connect the Apex backend and sign in. No demonstration posts are injected.</Text></GlassPanel> : null}
      {error ? <Pressable onPress={loadFeed} style={styles.inlineError}><Text style={styles.networkError}>{error}</Text><Text style={styles.sectionAction}>RETRY</Text></Pressable> : null}
      {userId && !loading && posts.length === 0 ? <GlassPanel style={styles.emptyState}><Radio size={28} color={accent} /><Text style={styles.emptyTitle}>NO TRANSMISSIONS YET</Text><Text style={styles.emptyCopy}>Your feed will contain only posts uploaded by real pilots.</Text></GlassPanel> : null}
      {posts.map(post => (
          <View key={post.id} style={styles.postCard}>
            <View style={styles.postHeader}>{post.avatarUrl ? <Image source={{ uri: post.avatarUrl }} style={styles.postAvatar} /> : <View style={styles.postAvatar}><Text style={styles.postAvatarText}>{post.alias.slice(0, 1)}</Text></View>}<View style={styles.commandCopy}><Text style={styles.postAlias}>{post.alias}</Text><Text style={styles.postMeta}>{new Date(post.createdAt).toLocaleString()}</Text></View></View>
            <Pressable onPress={() => post.videoUrl && Linking.openURL(post.videoUrl)} style={styles.postMedia}><Image source={{ uri: post.mediaUrl }} style={styles.postImage} /><LinearGradient colors={['transparent', 'rgba(1,2,1,.38)']} style={StyleSheet.absoluteFill} />{post.videoUrl ? <View style={styles.playDisc}><Play size={22} color={paper} fill={paper} /></View> : null}</Pressable>
            <View style={styles.postActions}>
              <View style={styles.postActionsLeft}><Pressable onPress={() => toggleLike(post.id)} style={styles.postAction}><Heart size={21} color={post.liked ? accent : paper} fill={post.liked ? accent : 'transparent'} /><Text style={styles.postActionText}>{post.likes}</Text></Pressable><Pressable onPress={() => setCommenting(commenting === post.id ? null : post.id)} style={styles.postAction}><MessageCircle size={21} color={paper} /><Text style={styles.postActionText}>{post.comments}</Text></Pressable><Pressable onPress={() => Linking.openURL(post.mediaUrl)} style={styles.postAction}><Send size={20} color={paper} /></Pressable></View>
              <Pressable onPress={() => toggleSave(post.id)} style={styles.postAction}><Bookmark size={21} color={post.saved ? accent : paper} fill={post.saved ? accent : 'transparent'} /></Pressable>
            </View>
            <Text style={styles.postCaption}><Text style={styles.postAlias}>{post.alias} </Text>{post.caption}</Text>
            {commenting === post.id ? <View style={styles.commentComposer}><TextInput value={comment} onChangeText={setComment} placeholder="Add a comment" placeholderTextColor={muted} style={styles.commentInput} maxLength={500} /><Pressable onPress={async () => { if (await addComment(post.id, comment)) { setComment(''); setCommenting(null); } }}><Send size={18} color={accent} /></Pressable></View> : null}
          </View>
      ))}
    </ScrollView>
  );
}

function ShopScreen() {
  const { vehicles, activeVehicleId, products, providers, loading, error, setActiveVehicle, searchParts } = useContentStore();
  const [query, setQuery] = useState('performance parts');
  const [saved, setSaved] = useState<string[]>([]);
  const activeVehicle = vehicles.find(vehicle => vehicle.id === activeVehicleId);
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shopHeader}><View><Text style={styles.eyebrow}>LIVE PROVIDER MARKET</Text><Text style={styles.feedTitle}>PARTS VAULT</Text></View><ShoppingBag size={23} color={paper} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleSelector}>{vehicles.map(vehicle => <Pressable key={vehicle.id} onPress={() => setActiveVehicle(vehicle.id)} style={[styles.vehicleOption, vehicle.id === activeVehicleId && styles.vehicleOptionActive]}><CarFront size={17} color={vehicle.id === activeVehicleId ? accent : muted} /><View><Text style={styles.vehicleName}>{vehicle.nickname.toUpperCase()}</Text><Text style={styles.vehicleMeta}>{vehicle.year} {vehicle.make} {vehicle.model}</Text></View>{vehicle.id === activeVehicleId ? <Check size={16} color={accent} /> : null}</Pressable>)}</ScrollView>
      <View style={styles.fitmentBanner}><PackageCheck size={21} color={accent} /><View style={styles.commandCopy}><Text style={styles.commandTitle}>{activeVehicle ? 'STRICT FITMENT ENABLED' : 'VEHICLE REQUIRED'}</Text><Text style={styles.commandMeta}>{activeVehicle ? `${activeVehicle.year} · ${activeVehicle.make} · ${activeVehicle.model} · ${activeVehicle.trim || 'TRIM NOT SET'} · ${activeVehicle.engine}` : 'Add a complete vehicle profile before searching inventory.'}</Text></View><ListFilter size={17} color={muted} /></View>
      <View style={styles.partsSearch}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => searchParts(query)} placeholder="Exhaust, brakes, intake..." placeholderTextColor={muted} style={styles.partsSearchInput} /><Pressable onPress={() => searchParts(query)} style={styles.partsSearchButton}><ScanLine size={19} color={accent} /></Pressable></View>
      {providers.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRail}>{providers.map(provider => <Pressable key={provider.name} onPress={() => provider.url && Linking.openURL(provider.url)} style={styles.providerChip}><View style={[styles.providerDot, provider.mode === 'live' && styles.providerDotLive]} /><Text style={styles.providerName}>{provider.name.toUpperCase()}</Text><Text style={styles.providerMode}>{provider.mode.replace('_', ' ').toUpperCase()}</Text></Pressable>)}</ScrollView> : null}
      {loading ? <GlassPanel style={styles.emptyState}><Activity size={26} color={accent} /><Text style={styles.emptyTitle}>QUERYING PROVIDERS</Text></GlassPanel> : null}
      {error ? <View style={styles.inlineError}><Text style={styles.networkError}>{error}</Text></View> : null}
      {!loading && !error && products.length === 0 ? <GlassPanel style={styles.emptyFitment}><ScanLine size={34} color={accent} /><Text style={styles.emptyTitle}>SEARCH LIVE INVENTORY</Text><Text style={styles.emptyCopy}>Results are returned directly by configured providers. No catalog samples or generated products are shown.</Text></GlassPanel> : null}
      {products.map(product => <View key={product.id} style={styles.productCard}>{product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <View style={[styles.productImage, styles.productImageMissing]}><ShoppingBag size={30} color={muted} /></View>}<View style={styles.productBody}><View style={styles.confirmedFit}><BadgeCheck size={13} color={accent} /><Text style={styles.confirmedFitText}>{product.compatibility.replace('_', ' ')} / {product.provider.toUpperCase()}</Text></View><Text style={styles.productName}>{product.title}</Text><Text style={styles.productMeta}>{product.seller || 'SELLER'} · {product.condition || 'CONDITION N/A'}{product.shipping ? ` · ${product.shipping}` : ''}</Text><View style={styles.productBottom}><Text style={styles.productPrice}>{product.currency} {product.price.toLocaleString()}</Text><View style={styles.productActions}><Pressable onPress={() => setSaved(current => current.includes(product.id) ? current.filter(id => id !== product.id) : [...current, product.id])} style={styles.productIconButton}><Bookmark size={18} color={saved.includes(product.id) ? accent : paper} fill={saved.includes(product.id) ? accent : 'transparent'} /></Pressable><Pressable onPress={() => Linking.openURL(product.purchaseUrl)} style={styles.addToCart}><ShoppingBag size={17} color={paper} /><Text style={styles.addToCartText}>VIEW</Text></Pressable></View></View></View></View>)}
    </ScrollView>
  );
}

function MoreScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const networkStatus = useLiveNetworkStore(state => state.networkStatus);
  const location = useLiveNetworkStore(state => state.location);
  const userId = useContentStore(state => state.userId);
  const modules: { tab: TabKey; label: string; meta: string; icon: IconType }[] = [
    { tab: 'race', label: 'RACE CONTROL', meta: 'Stage, track, spectate', icon: Swords }, { tab: 'meets', label: 'MEETS', meta: 'Routes and live locations', icon: MapPin },
    { tab: 'shop', label: 'PARTS VAULT', meta: 'Verified vehicle fitment', icon: ShoppingBag }, { tab: 'leaderboard', label: 'RANKINGS', meta: 'Season tiers and records', icon: Trophy },
    { tab: 'messages', label: 'COMMS', meta: 'Groups and direct messages', icon: MessagesSquare }, { tab: 'vault', label: 'CREDITS', meta: 'Rewards, wagers, badges', icon: WalletCards },
  ];
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.moreHeader}><Text style={styles.eyebrow}>PILOT SYSTEMS</Text><Text style={styles.feedTitle}>ACCESS GRID</Text><Text style={styles.moreCopy}>All network tools. One encrypted identity.</Text></View><View style={styles.moduleGrid}>{modules.map(module => { const Icon = module.icon; return <Pressable key={module.tab} onPress={() => onTab(module.tab)} style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}><View style={styles.moduleIcon}><Icon size={23} color={accent} /></View><Text style={styles.moduleTitle}>{module.label}</Text><Text style={styles.moduleMeta}>{module.meta}</Text><ChevronRight size={17} color={muted} style={styles.moduleChevron} /></Pressable>; })}</View><SectionTitle label="NETWORK HEALTH" /><GlassPanel><View style={styles.healthRow}><Text style={styles.identityLabel}>GPS PROOF</Text><Text style={location ? styles.healthGood : styles.healthOffline}>{location ? 'LOCKED' : 'NOT GRANTED'}</Text></View><View style={styles.identityDivider} /><View style={styles.healthRow}><Text style={styles.identityLabel}>ENCRYPTED COMMS</Text><Text style={userId ? styles.healthGood : styles.healthOffline}>{userId ? 'LIVE' : 'SIGN IN REQUIRED'}</Text></View><View style={styles.identityDivider} /><View style={styles.healthRow}><Text style={styles.identityLabel}>LIVE NETWORK</Text><Text style={networkStatus === 'live' ? styles.healthGood : styles.healthOffline}>{networkStatus.replace('_', ' ').toUpperCase()}</Text></View></GlassPanel></ScrollView>;
}

function UtilityScreen({ kind }: { kind: 'meets' | 'messages' | 'leaderboard' }) {
  const rankings = useContentStore(state => state.rankings);
  const events = useLiveNetworkStore(state => state.events);
  const userId = useContentStore(state => state.userId);
  const { conversations, messagesMap, fetchMessages, sendMessage, subscribeToConversation, unsubscribeFromConversation } = useMessageStore();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState('');
  const title = kind === 'meets' ? 'MEET CONTROL' : kind === 'messages' ? 'SECURE COMMS' : 'SEASON RANKINGS';
  const Icon = kind === 'meets' ? CalendarDays : kind === 'messages' ? MessagesSquare : Trophy;
  if (kind === 'leaderboard') return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.utilityHero}><Icon size={28} color={accent} /><Text style={styles.feedTitle}>{title}</Text></View>{rankings.map((row, index) => <View key={row.id} style={styles.utilityRow}><Text style={styles.utilityIndex}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.commandCopy}><Text style={styles.utilityText}>{row.alias.toUpperCase()} / {row.tier.toUpperCase()}</Text><Text style={styles.commandMeta}>{row.wins} WINS · {row.entered} RUNS · {row.points} RP · {Math.round(row.topSpeed)} MPH</Text></View></View>)}{rankings.length === 0 ? <GlassPanel style={styles.emptyState}><Trophy size={28} color={accent} /><Text style={styles.emptyTitle}>NO RANKED PILOTS YET</Text><Text style={styles.emptyCopy}>Verified race results will populate this leaderboard.</Text></GlassPanel> : null}</ScrollView>;
  if (kind === 'meets') return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.utilityHero}><Icon size={28} color={accent} /><Text style={styles.feedTitle}>{title}</Text></View>{events.map((event, index) => <View key={event.id} style={styles.utilityRow}><Text style={styles.utilityIndex}>{String(index + 1).padStart(2, '0')}</Text><View style={styles.commandCopy}><Text style={styles.utilityText}>{event.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{event.locationName} · {event.attendees} RSVP · {new Date(event.startTime).toLocaleString()}</Text></View></View>)}{events.length === 0 ? <GlassPanel style={styles.emptyState}><MapPin size={28} color={accent} /><Text style={styles.emptyTitle}>NO LIVE EVENTS</Text></GlassPanel> : null}</ScrollView>;
  if (conversationId) {
    const messages = messagesMap[conversationId] || [];
    return <View style={styles.messageScreen}><View style={styles.messageHeader}><Pressable onPress={() => { unsubscribeFromConversation(conversationId); setConversationId(null); }}><X size={20} color={paper} /></Pressable><Text style={styles.utilityText}>SECURE CHANNEL</Text></View><ScrollView contentContainerStyle={styles.messageList}>{messages.map(message => <View key={message.id} style={[styles.messageBubble, message.sender_id === userId && styles.messageBubbleOwn]}><Text style={styles.messageText}>{message.content}</Text><Text style={styles.messageTime}>{new Date(message.created_at).toLocaleTimeString()}</Text></View>)}</ScrollView><View style={styles.messageComposer}><TextInput value={messageDraft} onChangeText={setMessageDraft} placeholder="Encrypted message" placeholderTextColor={muted} style={styles.commentInput} /><Pressable onPress={async () => { if (!userId || !messageDraft.trim()) return; const result = await sendMessage(conversationId, userId, messageDraft.trim()); if (!result.error) setMessageDraft(''); }}><Send size={19} color={accent} /></Pressable></View></View>;
  }
  return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.utilityHero}><Icon size={28} color={accent} /><Text style={styles.feedTitle}>{title}</Text></View>{conversations.map(conversation => <Pressable key={conversation.id} onPress={async () => { await fetchMessages(conversation.id); subscribeToConversation(conversation.id); setConversationId(conversation.id); }} style={styles.utilityRow}><View style={styles.commandCopy}><Text style={styles.utilityText}>{(conversation.group_name || conversation.other_profile?.username || 'SECURE CHANNEL').toUpperCase()}</Text><Text style={styles.commandMeta}>{conversation.last_message || 'No messages yet'}</Text></View><ChevronRight size={17} color={muted} /></Pressable>)}{conversations.length === 0 ? <GlassPanel style={styles.emptyState}><MessagesSquare size={28} color={accent} /><Text style={styles.emptyTitle}>NO CONVERSATIONS</Text><Text style={styles.emptyCopy}>Challenge or follow a real pilot to start a secure channel.</Text></GlassPanel> : null}</ScrollView>;
}

function GarageScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const { vehicles, activeVehicleId, setActiveVehicle } = useContentStore();
  const car = vehicles.find(vehicle => vehicle.id === activeVehicleId);
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.garageSwitcher}>
        {vehicles.map(item => (
          <Pressable key={item.id} onPress={() => setActiveVehicle(item.id)} style={[styles.carChip, activeVehicleId === item.id && styles.carChipActive]}>
            <CarFront size={15} color={activeVehicleId === item.id ? accent : paper} />
            <Text style={[styles.carChipText, activeVehicleId === item.id && styles.carChipTextActive]}>{item.nickname.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      {!car ? <GlassPanel style={styles.emptyState}><CarFront size={30} color={accent} /><Text style={styles.emptyTitle}>ADD YOUR FIRST VEHICLE</Text><Text style={styles.emptyCopy}>Your garage will use only vehicles and photos you upload. No default car is substituted.</Text></GlassPanel> : <>
      <View style={styles.garageHero}>{car.photoUrl ? <Image source={{ uri: car.photoUrl }} style={styles.garageImage} /> : <View style={[styles.garageImage, styles.productImageMissing]}><CarFront size={54} color={muted} /></View>}
        <LinearGradient colors={['transparent', 'rgba(2,3,2,0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.garageHeroCopy}>
          <View><Text style={styles.eyebrow}>ACTIVE BUILD</Text><Text style={styles.garageName}>{car.nickname.toUpperCase()}</Text><Text style={styles.garageModel}>{car.year} {car.make} {car.model} {car.trim || ''}</Text></View>
          <BadgeCheck size={28} color={accent} fill="rgba(145,185,133,.12)" />
        </View>
      </View>

      <View style={styles.specGrid}>
        <SpecCell value={String(car.horsepower)} label="HORSEPOWER" />
        <SpecCell value={car.drivetrain} label="DRIVETRAIN" />
        <SpecCell value={car.engine} label="ENGINE" />
        <SpecCell value={car.trim || 'BASE'} label="TRIM" accentValue />
      </View>

      <SectionTitle label="BUILD IDENTITY" action="EDIT" />
      <GlassPanel>
        <View style={styles.identityRow}><Text style={styles.identityLabel}>COLOR</Text><Text style={styles.identityValue}>{car.color.toUpperCase()}</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>ENGINE</Text><Text style={styles.identityValue}>{car.engine.toUpperCase()}</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>VISIBILITY</Text><Text style={styles.identityValue}>PUBLIC SPECS</Text></View>
      </GlassPanel>

      <SectionTitle label="FITMENT VAULT" action="LIVE SEARCH" />
      <Pressable onPress={() => onTab('shop')} style={({ pressed }) => [styles.fitmentCard, pressed && styles.pressed]}>
        <View style={styles.fitmentIcon}><ScanLine size={24} color={accent} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>PARTS FOR THIS BUILD</Text><Text style={styles.commandMeta}>Year · trim · engine · drivetrain verified</Text></View>
        <ChevronRight size={18} color={accent} />
      </Pressable>
      </>}
    </ScrollView>
  );
}

function SpecCell({ value, label, accentValue = false }: { value: string; label: string; accentValue?: boolean }) {
  return <View style={styles.specCell}><Text style={[styles.specValue, accentValue && { color: accent }]}>{value}</Text><Text style={styles.specLabel}>{label}</Text></View>;
}

function RaceScreen() {
  const formats = ['0–60', '60–130', '45 SEC', 'TOP SPEED'];
  const [format, setFormat] = useState(formats[1]);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [wager, setWager] = useState(500);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('GPS STANDBY');
  const [schedule, setSchedule] = useState<'now' | 'later'>('now');
  const [contractStatus, setContractStatus] = useState('STAGE CONTRACT');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const liveDrivers = useLiveNetworkStore(state => state.drivers);
  const drivers: Driver[] = liveDrivers.map(driver => ({ id: driver.id, alias: driver.alias, car: driver.vehicle || 'VEHICLE PRIVATE', hp: null, record: driver.record, rank: driver.tier, distance: `${Math.round(driver.speedKph)} KPH`, mystery: driver.mystery, latitude: driver.latitude, longitude: driver.longitude }));

  useEffect(() => () => subscription.current?.remove(), []);

  const toggleOpponent = (id: string) => {
    setOpponents(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);
  };

  const toggleTracking = async () => {
    if (tracking) {
      subscription.current?.remove();
      subscription.current = null;
      setTracking(false);
      setGpsStatus('RUN SAVED');
      return;
    }
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setGpsStatus('GPS DENIED');
      Alert.alert('GPS permission required', 'Speed tracking needs precise foreground location access.');
      return;
    }
    setTracking(true);
    setSpeed(0);
    setMaxSpeed(0);
    setGpsStatus('GPS LOCKED');
    subscription.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 500, distanceInterval: 1 },
      update => {
        const mph = Math.max(0, (update.coords.speed || 0) * 2.23694);
        setSpeed(mph);
        setMaxSpeed(current => Math.max(current, mph));
      }
    );
  };

  const stageContract = async () => {
    if (!useContentStore.getState().userId) { setContractStatus('SIGN IN REQUIRED'); return; }
    if (opponents.length === 0) { setContractStatus('SELECT OPPONENTS'); return; }
    setContractStatus('ENCRYPTING');
    const type = format === '0–60' ? 'Drag Race' : format === 'TOP SPEED' ? 'Time Attack' : 'Roll Race';
    const { data, error } = await supabase.rpc('create_race_contract', {
      p_opponent_ids: opponents.map(id => liveDrivers.find(driver => driver.id === id)?.userId).filter(Boolean),
      p_race_type: type,
      p_route_name: format,
      p_distance_miles: format === '0–60' ? .25 : .5,
      p_rules: `${format} GPS-verified run`,
      p_starts_at: new Date(Date.now() + (schedule === 'later' ? 3600000 : 0)).toISOString(),
      p_wager_credits: wager,
    });
    setContractStatus(error ? error.message.toUpperCase().slice(0, 32) : `CONTRACT ${String(data).slice(0, 8).toUpperCase()}`);
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.raceHeader}>
        <View><Text style={styles.eyebrow}>NEW CONTRACT</Text><Text style={styles.raceTitle}>STAGE A RUN</Text></View>
        <View style={styles.secureMark}><LockKeyhole size={16} color={accent} /><Text style={styles.secureText}>SECURE</Text></View>
      </View>

      <SectionTitle label="FORMAT" />
      <View style={styles.formatGrid}>
        {formats.map(item => (
          <Pressable key={item} onPress={() => setFormat(item)} style={[styles.formatButton, format === item && styles.formatButtonActive]}>
            <Gauge size={18} color={format === item ? accent : paper} />
            <Text style={[styles.formatText, format === item && styles.formatTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>
      <SectionTitle label="START" />
      <View style={styles.segmentedControl}>{(['now', 'later'] as const).map(item => <Pressable key={item} onPress={() => setSchedule(item)} style={[styles.segment, schedule === item && styles.segmentActive]}><Text style={[styles.segmentText, schedule === item && styles.segmentTextActive]}>{item === 'now' ? 'RACE NOW' : 'SCHEDULE +1H'}</Text></Pressable>)}</View>

      <SectionTitle label="OPPONENTS" action={`${opponents.length} SELECTED`} />
      {drivers.map(driver => (
        <Pressable key={driver.id} onPress={() => toggleOpponent(driver.id)} style={[styles.opponentRow, opponents.includes(driver.id) && styles.opponentRowActive]}>
          <View style={[styles.opponentAvatar, driver.mystery && styles.mysteryAvatar]}><Text style={styles.opponentAvatarText}>{driver.mystery ? '?' : driver.alias.slice(0, 1)}</Text></View>
          <View style={styles.commandCopy}><Text style={styles.commandTitle}>{driver.alias}</Text><Text style={styles.commandMeta}>{driver.car}</Text></View>
          <View style={[styles.checkRing, opponents.includes(driver.id) && styles.checkRingActive]}>{opponents.includes(driver.id) ? <View style={styles.checkCore} /> : null}</View>
        </Pressable>
      ))}

      <SectionTitle label="CONTRACT WAGER" />
      <GlassPanel glow>
        <View style={styles.wagerRow}>
          <Pressable onPress={() => setWager(Math.max(0, wager - 100))} style={styles.wagerControl}><Text style={styles.wagerControlText}>−</Text></Pressable>
          <CreditsToken value={wager} compact />
          <Pressable onPress={() => setWager(wager + 100)} style={styles.wagerControl}><Plus size={19} color={paper} /></Pressable>
        </View>
        <Text style={styles.wagerFootnote}>VIRTUAL CREDITS · HELD WHEN ALL PILOTS ACCEPT</Text>
      </GlassPanel>

      <SectionTitle label="LIVE SPEED PROOF" />
      <GlassPanel style={styles.speedPanel} glow={tracking}>
        <View style={styles.speedHeader}><Text style={[styles.speedStatus, tracking && { color: accent }]}>{gpsStatus}</Text><View style={[styles.liveDot, tracking && styles.liveDotBright]} /></View>
        <Text style={styles.speedValue}>{Math.round(speed)}</Text>
        <Text style={styles.speedUnit}>MPH</Text>
        <View style={styles.speedMetaRow}><Text style={styles.speedMeta}>MAX {Math.round(maxSpeed)} MPH</Text><Text style={styles.speedMeta}>FORMAT {format}</Text></View>
        <Pressable onPress={toggleTracking} style={[styles.startRunButton, tracking && styles.stopRunButton]}>
          {tracking ? <X size={18} color={paper} /> : <Play size={18} color={accent} fill={accent} />}
          <Text style={[styles.startRunText, tracking && { color: paper }]}>{tracking ? 'END GPS RUN' : 'START GPS RUN'}</Text>
        </Pressable>
      </GlassPanel>
      <GlassButton label={contractStatus} icon={LockKeyhole} onPress={stageContract} active />
    </ScrollView>
  );
}

function VaultScreen() {
  const profile = useContentStore(state => state.profile);
  const balance = profile?.credits || 0;
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(145,185,133,.15)', 'rgba(9,12,10,.94)', 'rgba(2,3,2,.98)']} style={styles.vaultCard}>
        <View style={styles.vaultTop}><Text style={styles.eyebrow}>ENCRYPTED BALANCE</Text><ShieldCheck size={20} color={accent} /></View>
        <CreditsToken value={balance} />
        <View style={styles.vaultCodeRow}><Text style={styles.vaultCode}>AC / 88–021–UGR</Text><Text style={styles.vaultCode}>PILOT VERIFIED</Text></View>
      </LinearGradient>

      <SectionTitle label="BADGE VAULT" action={profile ? 'LIVE RECORD' : 'OFFLINE'} />
      <View style={styles.badgeGrid}>
        {profile ? <VaultBadge icon={Medal} title={profile.tier.toUpperCase()} subtitle="CURRENT TIER" /> : null}
      </View>
      {!profile ? <GlassPanel style={styles.emptyState}><LockKeyhole size={28} color={accent} /><Text style={styles.emptyTitle}>SIGN IN TO OPEN THE VAULT</Text></GlassPanel> : null}
    </ScrollView>
  );
}

function VaultBadge({ icon: Icon, title, subtitle, locked = false }: { icon: IconType; title: string; subtitle: string; locked?: boolean }) {
  return (
    <GlassPanel style={[styles.vaultBadge, locked && { opacity: 0.38 }]}>
      <Icon size={25} color={locked ? muted : accent} />
      <Text style={styles.vaultBadgeTitle}>{title}</Text>
      <Text style={styles.vaultBadgeSubtitle}>{subtitle}</Text>
    </GlassPanel>
  );
}

function LedgerRow({ icon: Icon, title, meta, value }: { icon: IconType; title: string; meta: string; value: string }) {
  const positive = value.startsWith('+');
  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerIcon}><Icon size={16} color={paper} /></View>
      <View style={styles.commandCopy}><Text style={styles.ledgerTitle}>{title}</Text><Text style={styles.ledgerMeta}>{meta}</Text></View>
      <Text style={[styles.ledgerValue, positive && { color: accent }]}>{value}</Text>
    </View>
  );
}

function NotificationCenter({ onClose, onOpen }: { onClose: () => void; onOpen: (tab: TabKey) => void }) {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const userId = useContentStore(state => state.userId);
  const routeFor = (type: string): TabKey => type === 'race_challenge' || type === 'dispute' || type === 'wager_won' ? 'race' : type === 'meet_rsvp' ? 'meets' : type === 'comment' || type === 'like' || type === 'new_follower' ? 'feed' : 'command';
  const iconFor = (type: string) => type === 'race_challenge' ? Swords : type === 'meet_rsvp' ? MapPin : type === 'comment' ? MessageCircle : Bell;
  return (
    <View style={styles.notificationOverlay}>
      <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
      <GlassPanel style={styles.notificationPanel} glow>
        <View style={styles.notificationHeader}><View><Text style={styles.eyebrow}>SECURE INBOX</Text><Text style={styles.notificationTitle}>NOTIFICATIONS</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={17} color={paper} /></Pressable></View>
        <Pressable onPress={() => userId && markAllAsRead(userId)}><Text style={styles.markRead}>MARK ALL READ</Text></Pressable>
        {notifications.map(notice => { const Icon = iconFor(notice.type); return <Pressable key={notice.id} onPress={async () => { if (!notice.read) await markAsRead(notice.id); onClose(); onOpen(routeFor(notice.type)); }} style={styles.notificationRow}><View style={styles.notificationIcon}><Icon size={17} color={!notice.read ? accent : muted} /></View><View style={styles.commandCopy}><Text style={styles.notificationRowTitle}>{notice.title}</Text><Text style={styles.notificationMeta}>{notice.body}</Text></View>{!notice.read ? <View style={styles.unreadDot} /> : null}</Pressable>; })}
        {notifications.length === 0 ? <View style={styles.emptyNotification}><Bell size={23} color={muted} /><Text style={styles.emptyCopy}>No notifications.</Text></View> : null}
      </GlassPanel>
    </View>
  );
}

function AuthPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const submit = async () => {
    if (!hasLiveBackend) { setStatus('APEX BACKEND HAS NOT BEEN PROVISIONED'); return; }
    setStatus('CONNECTING');
    const result = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
      : await supabase.auth.signUp({ email: email.trim(), password, options: { data: { username: email.split('@')[0] } } });
    if (result.error) { setStatus(result.error.message.toUpperCase()); return; }
    if (!result.data.session) { setStatus('CHECK EMAIL TO CONFIRM YOUR ACCOUNT'); return; }
    await Promise.all([useContentStore.getState().initialize(), useLiveNetworkStore.getState().initialize()]);
    onClose();
  };
  return <View style={styles.authOverlay}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><GlassPanel style={styles.authPanel} glow><View style={styles.notificationHeader}><View><Text style={styles.eyebrow}>PILOT IDENTITY</Text><Text style={styles.notificationTitle}>{mode === 'signin' ? 'ENTER NETWORK' : 'CREATE PILOT'}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={17} color={paper} /></Pressable></View>{hasLiveBackend ? <><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={muted} style={styles.authInput} /><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={muted} style={styles.authInput} onSubmitEditing={submit} /><GlassButton label={mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'} icon={LockKeyhole} onPress={submit} active /><Pressable onPress={() => setMode(value => value === 'signin' ? 'signup' : 'signin')}><Text style={styles.authSwitch}>{mode === 'signin' ? 'NEW PILOT / CREATE ACCOUNT' : 'EXISTING PILOT / SIGN IN'}</Text></Pressable></> : <View style={styles.emptyNotification}><Radio size={26} color={accent} /><Text style={styles.emptyTitle}>BACKEND CONNECTION REQUIRED</Text><Text style={styles.emptyCopy}>The app will not invent an account or local network data.</Text></View>}{status ? <Text style={styles.networkError}>{status}</Text> : null}</GlassPanel></View>;
}

export function ApexDesignPreview() {
  const [tab, setTab] = useState<TabKey>('command');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const userId = useContentStore(state => state.userId);
  const entrance = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const initialize = async () => {
      await Promise.all([useLiveNetworkStore.getState().initialize(), useContentStore.getState().initialize()]);
      const userId = useContentStore.getState().userId;
      if (userId) {
        await useNotificationStore.getState().fetchNotifications(userId);
        useNotificationStore.getState().subscribeToNotifications(userId);
        await useMessageStore.getState().fetchConversations(userId);
      }
    };
    initialize();
    if (Platform.OS !== 'web') return () => useLiveNetworkStore.getState().dispose();
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== 'Enter' || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      event.preventDefault();
      setTab('radar');
      useLiveNetworkStore.getState().startDrive();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); useLiveNetworkStore.getState().dispose(); useNotificationStore.getState().unsubscribeFromNotifications(); };
  }, []);

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [tab, entrance]);

  const content = useMemo(() => {
    if (tab === 'radar') return <RadarScreen onTab={setTab} />;
    if (tab === 'feed') return <FeedScreen />;
    if (tab === 'garage') return <GarageScreen onTab={setTab} />;
    if (tab === 'more') return <MoreScreen onTab={setTab} />;
    if (tab === 'race') return <RaceScreen />;
    if (tab === 'vault') return <VaultScreen />;
    if (tab === 'shop') return <ShopScreen />;
    if (tab === 'meets' || tab === 'messages' || tab === 'leaderboard') return <UtilityScreen kind={tab} />;
    return <CommandScreen onTab={setTab} />;
  }, [tab]);

  return (
    <SafeAreaView style={styles.app}>
      <GridBackdrop />
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
          <View><Text style={styles.brand}>APEX UGR</Text><Text style={styles.brandSub}>UNDERGROUND RACING NETWORK</Text></View>
        </View>
        <View style={styles.headerRight}>
          <Pressable onPress={() => setAuthOpen(true)} style={styles.signal}><View style={styles.liveDot} /><Text style={styles.signalText}>{userId ? 'ENCRYPTED' : 'SIGN IN'}</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => setNotificationsOpen(true)} style={styles.iconButton}><Bell size={18} color={paper} />{unreadCount > 0 ? <View style={styles.headerUnread} /> : null}</Pressable>
        </View>
      </View>

      <Animated.View style={[styles.main, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
        {content}
      </Animated.View>

      <View pointerEvents="box-none" style={styles.tabBarPositioner}>
        <View style={styles.tabBarShell}>
          <BlurView intensity={42} tint="dark" style={styles.tabBar}>
            {tabs.map(item => {
              const Icon = item.icon;
              const activeTab = tab === item.key || (item.key === 'more' && ['race', 'vault', 'shop', 'meets', 'messages', 'leaderboard'].includes(tab));
              return (
                <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.tabItem}>
                  <View style={[styles.tabIcon, activeTab && styles.tabIconActive]}><Icon size={19} color={activeTab ? accent : muted} strokeWidth={2.1} /></View>
                  <Text style={[styles.tabLabel, activeTab && styles.tabLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>
      </View>

      {notificationsOpen ? <NotificationCenter onClose={() => setNotificationsOpen(false)} onOpen={setTab} /> : null}
      {authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} /> : null}
    </SafeAreaView>
  );
}

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#101410' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#788078' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#080a08' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#252b25' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3b4639' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#050706' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
];

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#010201', overflow: 'hidden' },
  main: { flex: 1 },
  gridVerticals: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-around', opacity: 0.18 },
  gridVertical: { width: 1, height: '100%', backgroundColor: '#182019' },
  gridHorizontals: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-around', opacity: 0.14 },
  gridHorizontal: { width: '100%', height: 1, backgroundColor: '#182019' },
  scanline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: accent, shadowColor: accent, shadowRadius: 10, shadowOpacity: 0.35 },
  header: { height: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: border, backgroundColor: 'rgba(1,3,2,.95)', zIndex: 20 },
  brandLockup: { flexDirection: 'row', alignItems: 'center' },
  brandMark: { width: 34, height: 34, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 10, transform: [{ rotate: '45deg' }] },
  brandMarkText: { color: accent, fontSize: 18, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  brand: { color: paper, fontSize: 15, fontWeight: '900', letterSpacing: 1.8 },
  brandSub: { color: muted, fontSize: 7, fontWeight: '800', letterSpacing: 1.1, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  signalText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 7 },
  liveDotBright: { width: 8, height: 8, borderRadius: 4 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', backgroundColor: 'rgba(255,255,255,.07)', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 12 },
  screenContent: { padding: 14, paddingBottom: 116, width: '100%', maxWidth: 720, alignSelf: 'center' },
  glassShell: { borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: surface, shadowColor: '#000', shadowOpacity: .36, shadowRadius: 18 },
  glassGlow: { borderColor: 'rgba(145,185,133,.42)', shadowColor: accent, shadowOpacity: 0.12, shadowRadius: 20, elevation: 4 },
  glassBlur: { padding: 14, backgroundColor: 'rgba(4,7,5,.58)' },
  glassButtonShell: { minHeight: 43, borderRadius: 13, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', backgroundColor: 'rgba(255,255,255,.05)', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 12 },
  glassButton: { minHeight: 41, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.065)', position: 'relative', overflow: 'hidden' },
  glassButtonShine: { position: 'absolute', left: 10, right: 10, top: 1, height: 1, backgroundColor: 'rgba(255,255,255,.38)' },
  glassButtonActive: { backgroundColor: 'rgba(145,185,133,.16)' },
  glassButtonCompact: { minHeight: 36 },
  glassButtonText: { color: paper, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  glassButtonTextActive: { color: paper },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  hero: { height: 330, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', justifyContent: 'space-between' },
  heroImage: { resizeMode: 'cover', objectPosition: '50% 62%' } as any,
  heroStatus: { margin: 14, alignSelf: 'flex-start', backgroundColor: 'rgba(2,3,2,.64)', borderWidth: 1, borderColor: border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroStatusText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  heroBottom: { padding: 18 },
  eyebrow: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  heroTitle: { color: paper, fontSize: 35, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  heroCarName: { color: '#B4BAB4', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, marginTop: 3 },
  heroActions: { flexDirection: 'row', gap: 8, marginTop: 15 },
  metricRail: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#090B09', borderWidth: 1, borderColor: border, borderRadius: 11, marginTop: 9, paddingVertical: 13 },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { color: paper, fontSize: 17, fontWeight: '900' },
  metricLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  metricDivider: { width: 1, height: 24, backgroundColor: border },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  sectionAction: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusAlias: { color: paper, fontSize: 18, fontWeight: '900', letterSpacing: 0.8, marginBottom: 7 },
  rankBadge: { alignSelf: 'flex-start', height: 29, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, backgroundColor: 'rgba(255,255,255,.035)' },
  rankBadgeCompact: { height: 25, paddingHorizontal: 7 },
  rankBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.08)', marginTop: 18, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: accent, borderRadius: 3 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
  progressText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.5 },
  tokenWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  tokenWrapCompact: { gap: 8 },
  tokenAura: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(145,185,133,.12)' },
  token: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,.7)' },
  tokenCompact: { width: 36, height: 36, borderRadius: 18 },
  tokenLetter: { color: '#081006', fontSize: 22, fontWeight: '900', fontStyle: 'italic' },
  tokenLetterCompact: { fontSize: 17 },
  tokenValue: { color: paper, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  tokenLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 2 },
  commandRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(12,15,13,.80)', marginBottom: 8 },
  commandIcon: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  commandCopy: { flex: 1, minWidth: 0 },
  commandTitle: { color: paper, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  commandMeta: { color: muted, fontSize: 8, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
  badgeRail: { gap: 8, paddingRight: 14 },
  rewardBadge: { width: 145 },
  rewardIcon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(145,185,133,.28)', backgroundColor: 'rgba(145,185,133,.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  rewardLabel: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  rewardDetail: { color: accent, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  radarScreen: { flex: 1, backgroundColor: '#080A08' },
  mapFrame: { flex: 1, minHeight: 520, overflow: 'hidden', backgroundColor: '#0C0F0C' },
  radarTopControls: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segmentedControl: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: 'rgba(3,4,3,.85)', borderWidth: 1, borderColor: border },
  segment: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7 },
  segmentActive: { backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)' },
  segmentText: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  segmentTextActive: { color: paper },
  locateButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(3,4,3,.87)', borderWidth: 1, borderColor: 'rgba(145,185,133,.4)', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10 },
  locateText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  networkPill: { position: 'absolute', top: 66, left: 14, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(3,4,3,.84)', borderRadius: 20, borderWidth: 1, borderColor: border, paddingHorizontal: 10, paddingVertical: 7 },
  networkPillText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  youPin: { position: 'absolute', left: '46%', top: '43%', backgroundColor: accent, paddingHorizontal: 8, height: 31, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: paper, shadowColor: accent, shadowOpacity: 0.9, shadowRadius: 14 },
  youPinText: { color: '#050705', fontSize: 8, fontWeight: '900' },
  driverPin: { position: 'absolute', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0C0A', borderWidth: 2, borderColor: paper, shadowColor: '#000', shadowOpacity: 1, shadowRadius: 8 },
  driverPinSelected: { borderColor: accent, transform: [{ scale: 1.16 }] },
  mysteryPin: { backgroundColor: '#030403', borderStyle: 'dashed', borderColor: accent },
  driverPinText: { color: accent, fontSize: 13, fontWeight: '900' },
  nativePin: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#0A0C0A', borderWidth: 2, borderColor: paper, alignItems: 'center', justifyContent: 'center' },
  nativePinText: { color: accent, fontWeight: '900' },
  driverSheet: { position: 'absolute', left: 14, right: 14, bottom: 88 },
  driverSheetHeader: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 48, height: 48, borderRadius: 11, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  mysteryAvatar: { backgroundColor: '#0A0C0A', borderWidth: 1, borderColor: accent, borderStyle: 'dashed' },
  driverAvatarText: { color: '#050705', fontSize: 15, fontWeight: '900' },
  driverIdentity: { flex: 1 },
  driverAlias: { color: paper, fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  driverCar: { color: muted, fontSize: 8, fontWeight: '800', marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  driverStats: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: border, paddingTop: 12 },
  driverStatValue: { color: paper, fontSize: 13, fontWeight: '900' },
  driverStatLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  radarDock: { position: 'absolute', left: 14, right: 14, bottom: 88 },
  radarDockTitle: { color: paper, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  radarDockMeta: { color: muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  garageSwitcher: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  carChip: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: border, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,.04)' },
  carChipActive: { backgroundColor: 'rgba(145,185,133,.13)', borderColor: 'rgba(145,185,133,.4)' },
  carChipText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  carChipTextActive: { color: paper },
  addCarButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', alignItems: 'center', justifyContent: 'center' },
  garageHero: { height: 315, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: border },
  garageImage: { width: '100%', height: '100%', resizeMode: 'cover', objectPosition: '68% 50%' } as any,
  garageHeroCopy: { position: 'absolute', left: 16, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  garageName: { color: paper, fontSize: 30, fontWeight: '900', letterSpacing: 1.2, marginTop: 3 },
  garageModel: { color: '#B2BAB2', fontSize: 9, fontWeight: '800', marginTop: 3 },
  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  specCell: { width: screenWidth > 620 ? '23.8%' : '48.7%', minHeight: 76, padding: 13, borderWidth: 1, borderColor: border, borderRadius: 10, backgroundColor: 'rgba(12,15,13,.78)' },
  specValue: { color: paper, fontSize: 17, fontWeight: '900' },
  specLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 7 },
  identityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  identityLabel: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  identityValue: { color: paper, fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  identityDivider: { height: 1, backgroundColor: border, marginVertical: 10 },
  fitmentCard: { minHeight: 78, borderWidth: 1, borderColor: 'rgba(145,185,133,.36)', borderRadius: 11, backgroundColor: 'rgba(145,185,133,.07)', flexDirection: 'row', alignItems: 'center', padding: 12 },
  fitmentIcon: { width: 45, height: 45, borderRadius: 10, backgroundColor: 'rgba(145,185,133,.1)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  raceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  raceTitle: { color: paper, fontSize: 29, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  secureMark: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', backgroundColor: 'rgba(145,185,133,.07)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  secureText: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatButton: { width: '48.7%', minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  formatButtonActive: { backgroundColor: 'rgba(145,185,133,.12)', borderColor: 'rgba(145,185,133,.4)' },
  formatText: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  formatTextActive: { color: paper },
  opponentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, borderRadius: 10, padding: 9, marginBottom: 7, backgroundColor: 'rgba(255,255,255,.025)' },
  opponentRowActive: { borderColor: 'rgba(145,185,133,.42)', backgroundColor: 'rgba(145,185,133,.055)' },
  opponentAvatar: { width: 42, height: 42, borderRadius: 9, backgroundColor: '#1D231D', borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  opponentAvatarText: { color: accent, fontSize: 14, fontWeight: '900' },
  checkRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: muted, alignItems: 'center', justifyContent: 'center' },
  checkRingActive: { borderColor: accent },
  checkCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: accent },
  wagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wagerControl: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.04)' },
  wagerControlText: { color: paper, fontSize: 22, fontWeight: '700', marginTop: -2 },
  wagerFootnote: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center', marginTop: 14 },
  speedPanel: { marginBottom: 10 },
  speedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  speedStatus: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  speedValue: { color: paper, fontSize: 72, lineHeight: 78, textAlign: 'center', fontWeight: '300', marginTop: 8 },
  speedUnit: { color: accent, fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  speedMetaRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: border, marginTop: 18, paddingTop: 11 },
  speedMeta: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  startRunButton: { minHeight: 48, borderRadius: 11, backgroundColor: 'rgba(145,185,133,.15)', borderWidth: 1, borderColor: 'rgba(145,185,133,.44)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  stopRunButton: { backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: paper },
  startRunText: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  vaultCard: { minHeight: 230, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(145,185,133,.42)', padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  vaultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vaultCodeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vaultCode: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  vaultActions: { flexDirection: 'row', gap: 7, marginTop: 9 },
  rewardDrop: { minHeight: 78, borderRadius: 11, backgroundColor: 'rgba(145,185,133,.12)', borderWidth: 1, borderColor: 'rgba(145,185,133,.34)', padding: 12, flexDirection: 'row', alignItems: 'center' },
  rewardDropClaimed: { backgroundColor: 'rgba(145,185,133,.07)', borderWidth: 1, borderColor: 'rgba(145,185,133,.34)' },
  dropIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(5,7,5,.13)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  dropValue: { color: accent, fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vaultBadge: { width: '48.7%' },
  vaultBadgeTitle: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 14 },
  vaultBadgeSubtitle: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.6, marginTop: 4 },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  ledgerIcon: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  ledgerTitle: { color: paper, fontSize: 10, fontWeight: '900' },
  ledgerMeta: { color: muted, fontSize: 7, fontWeight: '800', marginTop: 3 },
  ledgerValue: { color: paper, fontSize: 11, fontWeight: '900' },
  tabBarPositioner: { position: 'absolute', left: 0, right: 0, bottom: 10, alignItems: 'center', zIndex: 50 },
  tabBarShell: { width: '95%', maxWidth: 700, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.20)', backgroundColor: 'rgba(2,4,3,.86)', shadowColor: '#000', shadowOpacity: .55, shadowRadius: 20 },
  tabBar: { height: 68, flexDirection: 'row', backgroundColor: 'rgba(3,6,4,.67)', paddingHorizontal: 5 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: 'rgba(145,185,133,.14)', borderWidth: 1, borderColor: 'rgba(145,185,133,.32)' },
  tabLabel: { color: muted, fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  tabLabelActive: { color: paper },
  rewardToast: { position: 'absolute', top: 78, alignSelf: 'center', backgroundColor: accent, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 100, shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 18 },
  rewardToastText: { color: '#050705', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  headerUnread: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: accent, right: 3, top: 2, borderWidth: 1, borderColor: '#020302' },
  scannerField: { position: 'absolute', width: 260, height: 260, left: '50%', top: '50%', marginLeft: -130, marginTop: -130, alignItems: 'center', justifyContent: 'center', opacity: .82 },
  scannerRing: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderColor: 'rgba(145,185,133,.28)' },
  scannerRingOuter: { width: 250, height: 250 },
  scannerRingMiddle: { width: 166, height: 166 },
  scannerRingInner: { width: 82, height: 82 },
  scannerAxisHorizontal: { position: 'absolute', width: 250, height: 1, backgroundColor: 'rgba(145,185,133,.18)' },
  scannerAxisVertical: { position: 'absolute', width: 1, height: 250, backgroundColor: 'rgba(145,185,133,.18)' },
  scannerSweep: { width: 250, height: 250, position: 'absolute' },
  scannerBeam: { position: 'absolute', left: 125, top: 0, width: 125, height: 125, borderTopRightRadius: 125 },
  radarFilters: { position: 'absolute', top: 103, left: 14, flexDirection: 'row', gap: 5 },
  radarFilter: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(2,4,3,.82)' },
  radarFilterActive: { borderColor: 'rgba(145,185,133,.40)', backgroundColor: 'rgba(145,185,133,.12)' },
  radarFilterText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: .6 },
  radarFilterTextActive: { color: paper },
  radarReadout: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  feedContent: { paddingBottom: 116, width: '100%', maxWidth: 720, alignSelf: 'center' },
  feedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingTop: 16, paddingBottom: 12 },
  feedTitle: { color: paper, fontSize: 27, fontWeight: '900', marginTop: 3 },
  storyRail: { paddingHorizontal: 14, gap: 14, paddingBottom: 14 },
  storyItem: { alignItems: 'center', width: 52 },
  storyRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: accent, backgroundColor: 'rgba(145,185,133,.10)', alignItems: 'center', justifyContent: 'center' },
  storyRingMuted: { borderColor: border, borderStyle: 'dashed' },
  storyInitial: { color: paper, fontSize: 13, fontWeight: '900' },
  storyLabel: { color: muted, fontSize: 6, fontWeight: '900', marginTop: 5 },
  postCard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: border, backgroundColor: 'rgba(3,6,4,.72)', marginBottom: 12 },
  postHeader: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  postAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: accent, backgroundColor: '#0B0E0C', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  postAvatarText: { color: accent, fontWeight: '900' },
  postAlias: { color: paper, fontSize: 10, fontWeight: '900' },
  postMeta: { color: muted, fontSize: 7, fontWeight: '800', marginTop: 3 },
  followButton: { borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', borderRadius: 9, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,.05)' },
  followButtonActive: { borderColor: 'rgba(145,185,133,.36)', backgroundColor: 'rgba(145,185,133,.12)' },
  followText: { color: paper, fontSize: 7, fontWeight: '900' },
  postMedia: { width: '100%', aspectRatio: 1.08, backgroundColor: '#030403', overflow: 'hidden' },
  postImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  proofPill: { position: 'absolute', left: 12, top: 12, flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(145,185,133,.38)', borderRadius: 14, backgroundColor: 'rgba(2,4,3,.76)', paddingHorizontal: 9, paddingVertical: 6 },
  proofText: { color: paper, fontSize: 7, fontWeight: '900' },
  playDisc: { position: 'absolute', left: '50%', top: '50%', marginLeft: -25, marginTop: -25, width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', backgroundColor: 'rgba(4,6,5,.48)', alignItems: 'center', justifyContent: 'center' },
  postActions: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 13, paddingTop: 12 },
  postActionsLeft: { flexDirection: 'row', gap: 17 },
  postAction: { flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 25, minHeight: 28 },
  postActionText: { color: muted, fontSize: 8, fontWeight: '900' },
  postCaption: { color: '#B9C0BA', fontSize: 10, lineHeight: 16, paddingHorizontal: 13, paddingBottom: 15, paddingTop: 7 },
  shopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  cartButton: { width: 45, height: 45, borderRadius: 14, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.06)', alignItems: 'center', justifyContent: 'center' },
  cartCount: { position: 'absolute', right: 4, top: 2, minWidth: 15, height: 15, borderRadius: 8, backgroundColor: accent, color: '#050705', fontSize: 8, fontWeight: '900', textAlign: 'center', lineHeight: 15 },
  vehicleSelector: { flexDirection: 'row', gap: 7 },
  vehicleOption: { flex: 1, minHeight: 58, borderWidth: 1, borderColor: border, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.035)', padding: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  vehicleOptionActive: { borderColor: 'rgba(145,185,133,.42)', backgroundColor: 'rgba(145,185,133,.09)' },
  vehicleName: { color: paper, fontSize: 8, fontWeight: '900' },
  vehicleMeta: { color: muted, fontSize: 6, fontWeight: '800', marginTop: 3 },
  fitmentBanner: { minHeight: 63, borderWidth: 1, borderColor: 'rgba(145,185,133,.33)', borderRadius: 11, backgroundColor: 'rgba(8,13,9,.84)', flexDirection: 'row', alignItems: 'center', gap: 10, padding: 11, marginTop: 9 },
  categoryRail: { gap: 6, paddingVertical: 12 },
  categoryChip: { borderWidth: 1, borderColor: border, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.035)', paddingHorizontal: 12, paddingVertical: 8 },
  categoryChipActive: { borderColor: 'rgba(255,255,255,.28)', backgroundColor: 'rgba(255,255,255,.12)' },
  categoryText: { color: muted, fontSize: 7, fontWeight: '900' },
  categoryTextActive: { color: paper },
  productCard: { borderWidth: 1, borderColor: border, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(4,7,5,.85)', marginBottom: 11 },
  productImage: { width: '100%', height: 226, resizeMode: 'cover', backgroundColor: '#030403' },
  productBody: { padding: 12 },
  confirmedFit: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  confirmedFitText: { color: accent, fontSize: 7, fontWeight: '900' },
  productName: { color: paper, fontSize: 14, fontWeight: '900', marginTop: 8 },
  productMeta: { color: muted, fontSize: 7, fontWeight: '800', marginTop: 5 },
  productBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  productPrice: { color: paper, fontSize: 18, fontWeight: '900' },
  productActions: { flexDirection: 'row', gap: 6 },
  productIconButton: { width: 39, height: 39, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' },
  addToCart: { height: 39, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  addToCartDone: { borderColor: 'rgba(145,185,133,.4)', backgroundColor: 'rgba(145,185,133,.10)' },
  addToCartText: { color: paper, fontSize: 8, fontWeight: '900' },
  emptyFitment: { alignItems: 'center', gap: 11, paddingVertical: 28 },
  emptyTitle: { color: paper, fontSize: 14, fontWeight: '900' },
  emptyCopy: { color: muted, fontSize: 9, lineHeight: 15, textAlign: 'center', maxWidth: 320 },
  moreHeader: { paddingTop: 8, paddingBottom: 16 },
  moreCopy: { color: muted, fontSize: 9, marginTop: 5 },
  moduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moduleCard: { width: '48.7%', minHeight: 142, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(5,8,6,.78)', padding: 13, position: 'relative' },
  moduleIcon: { width: 43, height: 43, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', backgroundColor: 'rgba(145,185,133,.08)', alignItems: 'center', justifyContent: 'center' },
  moduleTitle: { color: paper, fontSize: 10, fontWeight: '900', marginTop: 15 },
  moduleMeta: { color: muted, fontSize: 7, lineHeight: 11, marginTop: 4, paddingRight: 16 },
  moduleChevron: { position: 'absolute', right: 11, bottom: 12 },
  healthRow: { flexDirection: 'row', justifyContent: 'space-between' },
  healthGood: { color: accent, fontSize: 8, fontWeight: '900' },
  healthOffline: { color: muted, fontSize: 8, fontWeight: '900' },
  utilityHero: { paddingTop: 10, paddingBottom: 20, gap: 10 },
  utilityRow: { minHeight: 66, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center' },
  utilityIndex: { color: accent, fontSize: 9, fontWeight: '900', width: 34 },
  utilityText: { color: paper, fontSize: 9, fontWeight: '900', flex: 1 },
  notificationOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 120, backgroundColor: 'rgba(0,0,0,.56)', alignItems: 'flex-end', paddingTop: 58, paddingRight: 10 },
  notificationPanel: { width: '94%', maxWidth: 410 },
  notificationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  notificationTitle: { color: paper, fontSize: 18, fontWeight: '900', marginTop: 3 },
  markRead: { color: accent, fontSize: 7, fontWeight: '900', textAlign: 'right', paddingVertical: 12 },
  notificationRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: border },
  notificationIcon: { width: 37, height: 37, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  notificationRowTitle: { color: paper, fontSize: 9, fontWeight: '900' },
  notificationMeta: { color: muted, fontSize: 7, lineHeight: 11, marginTop: 4 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: accent, marginLeft: 7 },
  commandEmptyHero: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#050705' },
  commandDriveRow: { borderColor: 'rgba(255,255,255,.25)', backgroundColor: 'rgba(255,255,255,.055)' },
  networkError: { color: '#E8A7A7', fontSize: 8, fontWeight: '800', lineHeight: 13, marginTop: 7 },
  driveDock: { flexDirection: 'row', gap: 7, marginTop: 12 },
  driveEnter: { flex: 1, minHeight: 39, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  driveEnterActive: { borderColor: 'rgba(145,185,133,.5)', backgroundColor: 'rgba(145,185,133,.13)' },
  driveEnterText: { color: paper, fontSize: 8, fontWeight: '900' },
  unitButton: { width: 48, minHeight: 39, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  unitText: { color: accent, fontSize: 8, fontWeight: '900' },
  driveHud: { position: 'absolute', top: 140, right: 14, width: 122, minHeight: 118, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', backgroundColor: 'rgba(2,4,3,.82)', alignItems: 'center', justifyContent: 'center', shadowColor: '#fff', shadowOpacity: .1, shadowRadius: 18 },
  driveSpeed: { color: paper, fontSize: 48, lineHeight: 52, fontWeight: '300' },
  driveUnit: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  driveMeta: { color: muted, fontSize: 6, fontWeight: '900', marginTop: 8 },
  composerPanel: { marginHorizontal: 14, marginBottom: 12 },
  mediaPicker: { minHeight: 150, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(145,185,133,.4)', backgroundColor: 'rgba(145,185,133,.05)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  composerPreview: { width: '100%', height: 210, resizeMode: 'cover' },
  composerHint: { color: muted, fontSize: 8, fontWeight: '900', marginTop: 8 },
  composerInput: { minHeight: 76, color: paper, borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 12, fontSize: 11, textAlignVertical: 'top' },
  composerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 7, marginTop: 11 },
  emptyState: { margin: 14, alignItems: 'center', gap: 10, paddingVertical: 24 },
  inlineError: { marginHorizontal: 14, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(232,167,167,.24)', borderRadius: 10, padding: 10 },
  commentComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 1, borderTopColor: border, marginHorizontal: 13, paddingVertical: 9 },
  commentInput: { flex: 1, minHeight: 38, color: paper, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', paddingHorizontal: 11, fontSize: 10 },
  partsSearch: { flexDirection: 'row', gap: 7, marginTop: 10 },
  partsSearchInput: { flex: 1, minHeight: 45, color: paper, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.05)', paddingHorizontal: 12, fontSize: 10 },
  partsSearchButton: { width: 46, height: 45, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(145,185,133,.38)', backgroundColor: 'rgba(145,185,133,.09)', alignItems: 'center', justifyContent: 'center' },
  providerRail: { gap: 7, paddingVertical: 10 },
  providerChip: { minWidth: 128, minHeight: 55, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', padding: 9 },
  providerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: muted, position: 'absolute', right: 8, top: 8 },
  providerDotLive: { backgroundColor: accent, shadowColor: accent, shadowOpacity: .8, shadowRadius: 6 },
  providerName: { color: paper, fontSize: 8, fontWeight: '900' },
  providerMode: { color: muted, fontSize: 6, fontWeight: '800', marginTop: 6 },
  productImageMissing: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#060806' },
  emptyNotification: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  authOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 130, backgroundColor: 'rgba(0,0,0,.70)', alignItems: 'center', justifyContent: 'center', padding: 14 },
  authPanel: { width: '100%', maxWidth: 420 },
  authInput: { minHeight: 48, color: paper, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.05)', paddingHorizontal: 12, fontSize: 11, marginTop: 10 },
  authSwitch: { color: accent, fontSize: 8, fontWeight: '900', textAlign: 'center', paddingTop: 14 },
  messageScreen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 88 },
  messageHeader: { height: 54, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  messageList: { padding: 14, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '82%', borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.06)', padding: 10 },
  messageBubbleOwn: { alignSelf: 'flex-end', borderColor: 'rgba(145,185,133,.35)', backgroundColor: 'rgba(145,185,133,.11)' },
  messageText: { color: paper, fontSize: 11, lineHeight: 16 },
  messageTime: { color: muted, fontSize: 6, marginTop: 5 },
  messageComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: border },
});
