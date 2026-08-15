import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import {
  Activity,
  BadgeCheck,
  Bell,
  CarFront,
  ChevronRight,
  CircleDollarSign,
  Crosshair,
  Crown,
  Gauge,
  Gem,
  Gift,
  LockKeyhole,
  Map,
  MapPin,
  Medal,
  Navigation,
  Play,
  Plus,
  Radio,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Swords,
  Trophy,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from 'lucide-react-native';

const heroCar = require('./assets/apex-underground-coupe-v2.png');
const commandHero = require('./assets/apex-command-hero.png');
const accent = '#B6FF4A';
const paper = '#F5F7F5';
const muted = '#899189';
const surface = 'rgba(13, 16, 14, 0.76)';
const border = 'rgba(255, 255, 255, 0.13)';
const { width: screenWidth } = Dimensions.get('window');

let NativeMap: any = null;
let NativeMarker: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  NativeMap = maps.default;
  NativeMarker = maps.Marker;
}

type TabKey = 'command' | 'radar' | 'garage' | 'race' | 'vault';
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
}

const drivers: Driver[] = [
  { id: 'void', alias: 'VOIDRUNNER', car: '2024 Nissan GT-R Nismo', hp: 710, record: '48–7', rank: 'Master', distance: '0.8 mi', latitude: 34.0442, longitude: -118.2661 },
  { id: 'ghost', alias: 'UNKNOWN_09', car: 'CLASSIFIED', hp: null, record: '—', rank: 'Platinum', distance: '1.4 mi', mystery: true, latitude: 34.0508, longitude: -118.2554 },
  { id: 'nova', alias: 'NOVA', car: '2021 Porsche 911 Turbo S', hp: 640, record: '31–11', rank: 'Silver', distance: '2.1 mi', latitude: 34.0388, longitude: -118.248 },
];

const tabs: { key: TabKey; label: string; icon: IconType }[] = [
  { key: 'command', label: 'COMMAND', icon: Activity },
  { key: 'radar', label: 'RADAR', icon: Crosshair },
  { key: 'garage', label: 'GARAGE', icon: CarFront },
  { key: 'race', label: 'RACE', icon: Swords },
  { key: 'vault', label: 'VAULT', icon: WalletCards },
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
    <Pressable onPress={onPress} style={({ pressed }) => [styles.glassButton, active && styles.glassButtonActive, compact && styles.glassButtonCompact, pressed && styles.pressed]}>
      <Icon size={compact ? 14 : 17} color={active ? '#050705' : paper} strokeWidth={2.2} />
      <Text style={[styles.glassButtonText, active && styles.glassButtonTextActive]}>{label}</Text>
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

function CommandScreen({ credits, onTab }: { credits: number; onTab: (tab: TabKey) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <ImageBackground source={commandHero} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient colors={['rgba(3,4,3,0.05)', 'rgba(3,4,3,0.44)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.heroStatusText}>PILOT LINK / SECURE</Text>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.eyebrow}>ACTIVE BUILD</Text>
          <Text style={styles.heroTitle}>NIGHTSHIFT</Text>
          <Text style={styles.heroCarName}>2024 NISSAN GT-R NISMO</Text>
          <View style={styles.heroActions}>
            <GlassButton label="OPEN GARAGE" icon={CarFront} onPress={() => onTab('garage')} active />
            <GlassButton label="LOCATE" icon={MapPin} onPress={() => onTab('radar')} />
          </View>
        </View>
      </ImageBackground>

      <View style={styles.metricRail}>
        <View style={styles.metric}><Text style={styles.metricValue}>710</Text><Text style={styles.metricLabel}>HP</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={styles.metricValue}>48–7</Text><Text style={styles.metricLabel}>RECORD</Text></View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}><Text style={styles.metricValue}>#018</Text><Text style={styles.metricLabel}>GLOBAL</Text></View>
      </View>

      <SectionTitle label="PILOT STATUS" action="SEASON 04" />
      <GlassPanel glow>
        <View style={styles.statusTop}>
          <View>
            <Text style={styles.statusAlias}>CIPHER_24</Text>
            <RankBadge />
          </View>
          <CreditsToken value={credits} compact />
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: '72%' }]} /></View>
        <View style={styles.progressLabels}><Text style={styles.progressText}>7,240 RP</Text><Text style={styles.progressText}>10,000 TO PLATINUM</Text></View>
      </GlassPanel>

      <SectionTitle label="LIVE NETWORK" action="18 ONLINE" />
      <Pressable onPress={() => onTab('race')} style={({ pressed }) => [styles.commandRow, pressed && styles.pressed]}>
        <View style={styles.commandIcon}><Swords size={20} color={accent} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>OPEN CHALLENGE</Text><Text style={styles.commandMeta}>3 drivers · 60–130 · 500 AC</Text></View>
        <ChevronRight size={18} color={muted} />
      </Pressable>
      <Pressable onPress={() => onTab('radar')} style={({ pressed }) => [styles.commandRow, pressed && styles.pressed]}>
        <View style={styles.commandIcon}><Radio size={20} color={paper} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>MIDNIGHT ASSEMBLY</Text><Text style={styles.commandMeta}>1.8 mi · 42 pilots locked in</Text></View>
        <ChevronRight size={18} color={muted} />
      </Pressable>

      <SectionTitle label="RECENT REWARDS" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRail}>
        <RewardBadge icon={Zap} label="QUICKDRAW" detail="0–60" />
        <RewardBadge icon={ShieldCheck} label="PROOF LOCKED" detail="VERIFIED" />
        <RewardBadge icon={Trophy} label="NIGHT KING" detail="12 WINS" />
      </ScrollView>
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
}: {
  location: { latitude: number; longitude: number };
  mode: 'street' | 'satellite';
  selected: Driver | null;
  onSelect: (driver: Driver | null) => void;
}) {
  if (Platform.OS === 'web') {
    const tileUrl = mode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = mode === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap';
    const mapDocument = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#090b09}.leaflet-control-attribution{font:8px monospace;background:rgba(3,4,3,.72)!important;color:#aaa}.leaflet-control-attribution a{color:#b6ff4a}.leaflet-control-zoom{display:none}${mode === 'street' ? '#map{filter:grayscale(1) invert(.91) contrast(1.22) brightness(.57)}' : '#map{filter:saturate(.65) contrast(1.16) brightness(.68)}'}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{zoomControl:false,attributionControl:true}).setView([${location.latitude},${location.longitude}],14);L.tileLayer('${tileUrl}',{maxZoom:19,attribution:'${attribution}'}).addTo(map);</script></body></html>`;
    return (
      <View style={styles.mapFrame}>
        {React.createElement('iframe', {
          srcDoc: mapDocument,
          title: 'Apex Radar',
          style: { width: '100%', height: '100%', border: 0 },
        })}
        <MapOverlays selected={selected} onSelect={onSelect} />
      </View>
    );
  }

  return (
    <View style={styles.mapFrame}>
      <NativeMap
        style={StyleSheet.absoluteFill}
        mapType={mode === 'satellite' ? 'satellite' : 'standard'}
        customMapStyle={darkMapStyle}
        region={{ ...location, latitudeDelta: 0.04, longitudeDelta: 0.04 }}
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
      </NativeMap>
    </View>
  );
}

function MapOverlays({ selected, onSelect }: { selected: Driver | null; onSelect: (driver: Driver | null) => void }) {
  const positions = [{ top: '29%', left: '64%' }, { top: '48%', left: '25%' }, { top: '65%', left: '72%' }];
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={styles.youPin}><Navigation size={13} color="#050705" fill="#050705" /><Text style={styles.youPinText}>YOU</Text></View>
      {drivers.map((driver, index) => (
        <Pressable key={driver.id} onPress={() => onSelect(driver)} style={[styles.driverPin, positions[index] as any, driver.mystery && styles.mysteryPin, selected?.id === driver.id && styles.driverPinSelected]}>
          <Text style={[styles.driverPinText, driver.mystery && { color: paper }]}>{driver.mystery ? '?' : driver.alias.slice(0, 1)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RadarScreen() {
  const [selected, setSelected] = useState<Driver | null>(null);
  const [mode, setMode] = useState<'street' | 'satellite'>('street');
  const [location, setLocation] = useState({ latitude: 34.045, longitude: -118.258 });
  const [gpsLabel, setGpsLabel] = useState('LOCK ON');

  const locate = async () => {
    setGpsLabel('SCANNING');
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      setGpsLabel('DENIED');
      Alert.alert('Location permission required', 'Enable location to lock the radar onto your current position.');
      return;
    }
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    setGpsLabel('LOCKED');
  };

  return (
    <View style={styles.radarScreen}>
      <RadarMap location={location} mode={mode} selected={selected} onSelect={setSelected} />
      <View style={styles.radarTopControls}>
        <View style={styles.segmentedControl}>
          {(['street', 'satellite'] as const).map(item => (
            <Pressable key={item} onPress={() => setMode(item)} style={[styles.segment, mode === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={locate} style={styles.locateButton}><Crosshair size={16} color={accent} /><Text style={styles.locateText}>{gpsLabel}</Text></Pressable>
      </View>
      <View style={styles.networkPill}><View style={styles.liveDot} /><Text style={styles.networkPillText}>18 DRIVERS / 3 EVENTS</Text></View>

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
            <GlassButton label="CHALLENGE" icon={Swords} onPress={() => Alert.alert('Challenge staged', `${selected.alias} was added to a new race lobby.`)} active />
            <GlassButton label="PROFILE" icon={UserRound} onPress={() => Alert.alert(selected.alias, selected.mystery ? 'This pilot is running in mystery mode.' : `${selected.car}\n${selected.record} career record`)} />
          </View>
        </GlassPanel>
      ) : (
        <GlassPanel style={styles.radarDock}>
          <Text style={styles.radarDockTitle}>RADAR ACTIVE</Text>
          <Text style={styles.radarDockMeta}>Tap a signal to inspect the pilot.</Text>
        </GlassPanel>
      )}
    </View>
  );
}

function GarageScreen() {
  const [carIndex, setCarIndex] = useState(0);
  const cars = [
    { name: 'NIGHTSHIFT', model: '2024 Nissan GT-R Nismo', hp: '710', drive: 'AWD', fit: '38' },
    { name: 'BLACK ICE', model: '2020 BMW M4 Competition', hp: '503', drive: 'RWD', fit: '64' },
  ];
  const car = cars[carIndex];
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.garageSwitcher}>
        {cars.map((item, index) => (
          <Pressable key={item.name} onPress={() => setCarIndex(index)} style={[styles.carChip, carIndex === index && styles.carChipActive]}>
            <CarFront size={15} color={carIndex === index ? '#050705' : paper} />
            <Text style={[styles.carChipText, carIndex === index && styles.carChipTextActive]}>{item.name}</Text>
          </Pressable>
        ))}
        <Pressable style={styles.addCarButton}><Plus size={18} color={accent} /></Pressable>
      </View>

      <View style={styles.garageHero}>
        <Image source={heroCar} style={styles.garageImage} />
        <LinearGradient colors={['transparent', 'rgba(2,3,2,0.95)']} style={StyleSheet.absoluteFill} />
        <View style={styles.garageHeroCopy}>
          <View><Text style={styles.eyebrow}>PRIMARY BUILD</Text><Text style={styles.garageName}>{car.name}</Text><Text style={styles.garageModel}>{car.model}</Text></View>
          <BadgeCheck size={28} color={accent} fill="rgba(182,255,74,.12)" />
        </View>
      </View>

      <View style={styles.specGrid}>
        <SpecCell value={car.hp} label="HORSEPOWER" />
        <SpecCell value={car.drive} label="DRIVETRAIN" />
        <SpecCell value="6" label="MODS" />
        <SpecCell value="MASTER" label="CLASS" accentValue />
      </View>

      <SectionTitle label="BUILD IDENTITY" action="EDIT" />
      <GlassPanel>
        <View style={styles.identityRow}><Text style={styles.identityLabel}>COLOR</Text><Text style={styles.identityValue}>MIDNIGHT OBSIDIAN</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>ENGINE</Text><Text style={styles.identityValue}>3.8L TWIN-TURBO V6</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>VISIBILITY</Text><Text style={styles.identityValue}>PUBLIC SPECS</Text></View>
      </GlassPanel>

      <SectionTitle label="FITMENT VAULT" action={`${car.fit} MATCHES`} />
      <Pressable onPress={() => Alert.alert('Fitment locked', `${car.fit} confirmed-fit parts for ${car.model}. Universal parts are shown separately.`)} style={({ pressed }) => [styles.fitmentCard, pressed && styles.pressed]}>
        <View style={styles.fitmentIcon}><ScanLine size={24} color={accent} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>PARTS FOR THIS BUILD</Text><Text style={styles.commandMeta}>Year · trim · engine · drivetrain verified</Text></View>
        <ChevronRight size={18} color={accent} />
      </Pressable>
    </ScrollView>
  );
}

function SpecCell({ value, label, accentValue = false }: { value: string; label: string; accentValue?: boolean }) {
  return <View style={styles.specCell}><Text style={[styles.specValue, accentValue && { color: accent }]}>{value}</Text><Text style={styles.specLabel}>{label}</Text></View>;
}

function RaceScreen() {
  const formats = ['0–60', '60–130', '45 SEC', 'TOP SPEED'];
  const [format, setFormat] = useState(formats[1]);
  const [opponents, setOpponents] = useState<string[]>(['void']);
  const [wager, setWager] = useState(500);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('GPS STANDBY');
  const subscription = useRef<Location.LocationSubscription | null>(null);

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
            <Gauge size={18} color={format === item ? '#050705' : paper} />
            <Text style={[styles.formatText, format === item && styles.formatTextActive]}>{item}</Text>
          </Pressable>
        ))}
      </View>

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
          {tracking ? <X size={18} color={paper} /> : <Play size={18} color="#050705" fill="#050705" />}
          <Text style={[styles.startRunText, tracking && { color: paper }]}>{tracking ? 'END GPS RUN' : 'START GPS RUN'}</Text>
        </Pressable>
      </GlassPanel>
    </ScrollView>
  );
}

function VaultScreen({ credits, onClaim }: { credits: number; onClaim: () => void }) {
  const [claimed, setClaimed] = useState(false);
  const claim = () => {
    if (claimed) return;
    setClaimed(true);
    onClaim();
  };
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={['rgba(182,255,74,.19)', 'rgba(15,18,15,.90)', 'rgba(4,5,4,.96)']} style={styles.vaultCard}>
        <View style={styles.vaultTop}><Text style={styles.eyebrow}>ENCRYPTED BALANCE</Text><ShieldCheck size={20} color={accent} /></View>
        <CreditsToken value={credits} />
        <View style={styles.vaultCodeRow}><Text style={styles.vaultCode}>AC / 88–021–UGR</Text><Text style={styles.vaultCode}>PILOT VERIFIED</Text></View>
      </LinearGradient>

      <View style={styles.vaultActions}>
        <GlassButton label="ADD" icon={Plus} onPress={() => Alert.alert('Preview only', 'Credit purchases will be connected after design approval.')} active />
        <GlassButton label="SEND" icon={Navigation} onPress={() => Alert.alert('Send credits', 'Select a pilot from Radar to open a transfer.')} />
        <GlassButton label="HISTORY" icon={Activity} onPress={() => Alert.alert('Ledger verified', 'All virtual credit movements are visible below.')} />
      </View>

      <SectionTitle label="REWARD DROP" />
      <Pressable onPress={claim} style={({ pressed }) => [styles.rewardDrop, claimed && styles.rewardDropClaimed, pressed && styles.pressed]}>
        <View style={styles.dropIcon}>{claimed ? <BadgeCheck size={25} color={accent} /> : <Gift size={25} color="#050705" />}</View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>{claimed ? 'DROP CLAIMED' : 'DAILY SIGNAL DROP'}</Text><Text style={styles.commandMeta}>{claimed ? '+250 AC added to encrypted balance' : 'Encrypted reward · expires in 04:18:22'}</Text></View>
        <Text style={styles.dropValue}>{claimed ? 'LOCKED' : '+250'}</Text>
      </Pressable>

      <SectionTitle label="BADGE VAULT" action="8 / 24" />
      <View style={styles.badgeGrid}>
        <VaultBadge icon={Medal} title="MASTER" subtitle="CURRENT TIER" />
        <VaultBadge icon={Zap} title="QUICKDRAW" subtitle="0–60 PROOF" />
        <VaultBadge icon={Gem} title="CLEAN STREAK" subtitle="10 VERIFIED" />
        <VaultBadge icon={Sparkles} title="FOUNDER" subtitle="SEASON 01" locked />
      </View>

      <SectionTitle label="LEDGER" />
      <GlassPanel>
        <LedgerRow icon={Trophy} title="Race payout" meta="VOIDRUNNER · 60–130" value="+1,000" />
        <View style={styles.identityDivider} />
        <LedgerRow icon={Users} title="Spectator wager" meta="MIDNIGHT ASSEMBLY" value="−250" />
        <View style={styles.identityDivider} />
        <LedgerRow icon={Gift} title="Season reward" meta="MASTER TIER" value="+750" />
      </GlassPanel>
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

export function ApexDesignPreview() {
  const [tab, setTab] = useState<TabKey>('command');
  const [credits, setCredits] = useState(12480);
  const [reward, setReward] = useState<string | null>(null);
  const entrance = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 340, useNativeDriver: true }).start();
  }, [tab, entrance]);

  const claimReward = () => {
    setCredits(value => value + 250);
    setReward('+250 AC / SIGNAL DROP');
    setTimeout(() => setReward(null), 2200);
  };

  const content = useMemo(() => {
    if (tab === 'radar') return <RadarScreen />;
    if (tab === 'garage') return <GarageScreen />;
    if (tab === 'race') return <RaceScreen />;
    if (tab === 'vault') return <VaultScreen credits={credits} onClaim={claimReward} />;
    return <CommandScreen credits={credits} onTab={setTab} />;
  }, [tab, credits]);

  return (
    <SafeAreaView style={styles.app}>
      <GridBackdrop />
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <View style={styles.brandMark}><Text style={styles.brandMarkText}>A</Text></View>
          <View><Text style={styles.brand}>APEX UGR</Text><Text style={styles.brandSub}>UNDERGROUND RACING NETWORK</Text></View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.signal}><View style={styles.liveDot} /><Text style={styles.signalText}>ENCRYPTED</Text></View>
          <Pressable style={styles.iconButton}><Bell size={18} color={paper} /></Pressable>
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
              const activeTab = tab === item.key;
              return (
                <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.tabItem}>
                  <View style={[styles.tabIcon, activeTab && styles.tabIconActive]}><Icon size={19} color={activeTab ? '#050705' : muted} strokeWidth={2.1} /></View>
                  <Text style={[styles.tabLabel, activeTab && styles.tabLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </BlurView>
        </View>
      </View>

      {reward ? (
        <Animated.View style={styles.rewardToast}><CircleDollarSign size={18} color="#050705" /><Text style={styles.rewardToastText}>{reward}</Text></Animated.View>
      ) : null}
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
  app: { flex: 1, backgroundColor: '#030403', overflow: 'hidden' },
  main: { flex: 1 },
  gridVerticals: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-around', opacity: 0.18 },
  gridVertical: { width: 1, height: '100%', backgroundColor: '#273027' },
  gridHorizontals: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-around', opacity: 0.14 },
  gridHorizontal: { width: '100%', height: 1, backgroundColor: '#273027' },
  scanline: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: accent, shadowColor: accent, shadowRadius: 12, shadowOpacity: 0.8 },
  header: { height: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: border, backgroundColor: 'rgba(3,4,3,.92)', zIndex: 20 },
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
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)' },
  screenContent: { padding: 14, paddingBottom: 116, width: '100%', maxWidth: 720, alignSelf: 'center' },
  glassShell: { borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: surface },
  glassGlow: { borderColor: 'rgba(182,255,74,.36)', shadowColor: accent, shadowOpacity: 0.14, shadowRadius: 18, elevation: 4 },
  glassBlur: { padding: 14, backgroundColor: 'rgba(10,13,11,.56)' },
  glassButton: { minHeight: 43, paddingHorizontal: 14, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.055)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  glassButtonActive: { backgroundColor: accent, borderColor: accent },
  glassButtonCompact: { minHeight: 36, paddingHorizontal: 10 },
  glassButtonText: { color: paper, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  glassButtonTextActive: { color: '#050705' },
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
  tokenAura: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(182,255,74,.14)' },
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
  rewardIcon: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(182,255,74,.28)', backgroundColor: 'rgba(182,255,74,.07)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  rewardLabel: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  rewardDetail: { color: accent, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 4 },
  radarScreen: { flex: 1, backgroundColor: '#080A08' },
  mapFrame: { flex: 1, minHeight: 520, overflow: 'hidden', backgroundColor: '#0C0F0C' },
  radarTopControls: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  segmentedControl: { flexDirection: 'row', padding: 3, borderRadius: 10, backgroundColor: 'rgba(3,4,3,.85)', borderWidth: 1, borderColor: border },
  segment: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 7 },
  segmentActive: { backgroundColor: paper },
  segmentText: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  segmentTextActive: { color: '#050705' },
  locateButton: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(3,4,3,.87)', borderWidth: 1, borderColor: 'rgba(182,255,74,.4)', paddingHorizontal: 11, paddingVertical: 9, borderRadius: 10 },
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
  carChipActive: { backgroundColor: accent, borderColor: accent },
  carChipText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  carChipTextActive: { color: '#050705' },
  addCarButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(182,255,74,.3)', alignItems: 'center', justifyContent: 'center' },
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
  fitmentCard: { minHeight: 78, borderWidth: 1, borderColor: 'rgba(182,255,74,.36)', borderRadius: 11, backgroundColor: 'rgba(182,255,74,.07)', flexDirection: 'row', alignItems: 'center', padding: 12 },
  fitmentIcon: { width: 45, height: 45, borderRadius: 10, backgroundColor: 'rgba(182,255,74,.1)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  raceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  raceTitle: { color: paper, fontSize: 29, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  secureMark: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(182,255,74,.3)', backgroundColor: 'rgba(182,255,74,.07)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  secureText: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatButton: { width: '48.7%', minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  formatButtonActive: { backgroundColor: accent, borderColor: accent },
  formatText: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  formatTextActive: { color: '#050705' },
  opponentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, borderRadius: 10, padding: 9, marginBottom: 7, backgroundColor: 'rgba(255,255,255,.025)' },
  opponentRowActive: { borderColor: 'rgba(182,255,74,.42)', backgroundColor: 'rgba(182,255,74,.055)' },
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
  startRunButton: { minHeight: 48, borderRadius: 10, backgroundColor: accent, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14 },
  stopRunButton: { backgroundColor: 'rgba(255,255,255,.06)', borderWidth: 1, borderColor: paper },
  startRunText: { color: '#050705', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  vaultCard: { minHeight: 230, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(182,255,74,.42)', padding: 18, justifyContent: 'space-between', overflow: 'hidden' },
  vaultTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  vaultCodeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vaultCode: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
  vaultActions: { flexDirection: 'row', gap: 7, marginTop: 9 },
  rewardDrop: { minHeight: 78, borderRadius: 11, backgroundColor: accent, padding: 12, flexDirection: 'row', alignItems: 'center' },
  rewardDropClaimed: { backgroundColor: 'rgba(182,255,74,.07)', borderWidth: 1, borderColor: 'rgba(182,255,74,.34)' },
  dropIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(5,7,5,.13)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  dropValue: { color: '#050705', fontSize: 13, fontWeight: '900', letterSpacing: 0.6 },
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
  tabBarShell: { width: '95%', maxWidth: 700, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', backgroundColor: 'rgba(4,5,4,.88)' },
  tabBar: { height: 68, flexDirection: 'row', backgroundColor: 'rgba(4,5,4,.72)', paddingHorizontal: 5 },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: accent },
  tabLabel: { color: muted, fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  tabLabelActive: { color: paper },
  rewardToast: { position: 'absolute', top: 78, alignSelf: 'center', backgroundColor: accent, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 100, shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 18 },
  rewardToastText: { color: '#050705', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
});
