import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Linking,
  Platform,
  PanResponder,
  Pressable,
  SafeAreaView,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLiveNetworkStore, LiveDriver, LiveEvent } from './live/liveNetworkStore';
import { useContentStore } from './live/contentStore';
import {useWorldStore,DeadDrop,RoadReport,Territory,MapReward,GhostReplay,SafeHouse} from './live/worldStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useMessageStore } from '../stores/messageStore';
import { cloudflareApi, hasCloudflareBackend } from '../config/cloudflareApi';
import {playEngineSound,playInterfaceSound,setInterfaceAudioEnabled} from '../utils/soundSynthesizer';
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
  Edit3,
  ExternalLink,
  Gauge,
  Gem,
  Gift,
  Heart,
  Layers3,
  ListFilter,
  LockKeyhole,
  Map,
  MapPin,
  Maximize2,
  Medal,
  MessageCircle,
  MessagesSquare,
  MoreHorizontal,
  Navigation,
  PackageCheck,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Route,
  Save,
  ScanLine,
  Send,
  ShieldCheck,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Swords,
  Trophy,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  WalletCards,
  X,
  Zap,
} from 'lucide-react-native';

let hapticsEnabled=true;
const setHapticsEnabled=(enabled:boolean)=>{hapticsEnabled=enabled;};
const hapticTick=()=>{if(hapticsEnabled&&Platform.OS!=='web')void Haptics.selectionAsync().catch(()=>undefined);};
const hapticResult=(kind:'success'|'error')=>{if(hapticsEnabled&&Platform.OS!=='web')void Haptics.notificationAsync(kind==='success'?Haptics.NotificationFeedbackType.Success:Haptics.NotificationFeedbackType.Error).catch(()=>undefined);};

const accent = '#A7E59A';
const paper = '#F7F9F7';
const muted = '#929B95';
const surface = 'rgba(4, 8, 5, 0.86)';
const border = 'rgba(255, 255, 255, 0.16)';
const { width: screenWidth } = Dimensions.get('window');
const ANDROID_DOWNLOAD_URL='https://github.com/F0rger123/apex-ugr/releases/latest/download/apex-ugr.apk';
const APP_VERSION='1.3.0';
const ANDROID_VERSION_CODE=12;
const SCRAMBLE_CHARS='ABCDEFGHJKLMNPQRSTUVWXYZ23456789#$%&';
const useNativeAnimations=Platform.OS!=='web';

let NativeMap: any = null;
let NativeMarker: any = null;
let NativeCircle: any = null;
let NativePolyline: any = null;
if (Platform.OS !== 'web') {
  const maps = require('react-native-maps');
  NativeMap = maps.default;
  NativeMarker = maps.Marker;
  NativeCircle = maps.Circle;
  NativePolyline = maps.Polyline;
}

type TabKey = 'command' | 'radar' | 'feed' | 'garage' | 'more' | 'race' | 'vault' | 'shop' | 'parts' | 'meets' | 'messages' | 'leaderboard' | 'access' | 'settings' | 'bounty' | 'world' | 'season' | 'crews' | 'achievements';
type IconType = any;

const tabPaths:Record<TabKey,string>={
  command:'/app/command',radar:'/app/map',feed:'/app/feed',garage:'/app/garage',more:'/app/more',
  race:'/app/competition/races',vault:'/app/rewards/vault',shop:'/app/shop',parts:'/app/garage/parts',meets:'/app/events/meets',
  messages:'/app/social/messages',leaderboard:'/app/competition/leaderboards',access:'/app/settings/access',settings:'/app/settings',bounty:'/app/map/bounty',world:'/app/map/world',season:'/app/season',crews:'/app/social/crews',achievements:'/app/profile/achievements',
};
const pathTabs=Object.entries(tabPaths).reduce<Record<string,TabKey>>((routes,[tab,path])=>({...routes,[path]:tab as TabKey}),{});
pathTabs['/app/radar']='radar';
pathTabs['/app/radar/bounty']='bounty';
function routeState(){
  if(Platform.OS!=='web'||typeof window==='undefined')return{tab:'command' as TabKey,started:false};
  const path=window.location.pathname.replace(/\/$/,'')||'/';
  const tab=pathTabs[path];
  return{tab:tab||'command',started:Boolean(tab)};
}

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
  isLive?: boolean;
}

const tabs: { key: TabKey; label: string; icon: IconType }[] = [
  { key: 'command', label: 'HUD', icon: Activity },
  { key: 'garage', label: 'GARAGE', icon: CarFront },
  { key: 'radar', label: 'MAP', icon: Map },
  { key: 'race', label: 'RACE', icon: Swords },
  { key: 'leaderboard', label: 'LEADERS', icon: Trophy },
  { key: 'meets', label: 'MEETS', icon: CalendarDays },
  { key: 'shop', label: 'SHOP', icon: ShoppingBag },
  { key: 'feed', label: 'SOCIAL', icon: Users },
];

const rankColors: Record<Driver['rank'], string> = {
  Bronze: '#C98655',
  Silver: '#CED5CE',
  Master: accent,
  Platinum: '#FFFFFF',
};

function AtmosphereBackdrop() {
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 14000, useNativeDriver: useNativeAnimations }),
        Animated.timing(drift, { toValue: 0, duration: 14000, useNativeDriver: useNativeAnimations }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [drift]);

  return (
    <View pointerEvents="none" style={styles.atmosphere}>
      <Animated.Image source={require('./assets/apex-access-scene.png')} style={[styles.atmosphereImage,{transform:[{scale:drift.interpolate({inputRange:[0,1],outputRange:[1.02,1.09]})},{translateX:drift.interpolate({inputRange:[0,1],outputRange:[-8,8]})}]}]}/>
      <LinearGradient colors={['rgba(0,0,0,.10)','rgba(1,3,2,.82)','#010201']} style={StyleSheet.absoluteFill}/>
      <Animated.View style={[styles.lightShard,styles.lightShardOne,{opacity:drift.interpolate({inputRange:[0,1],outputRange:[.08,.24]})}]}/>
      <Animated.View style={[styles.lightShard,styles.lightShardTwo,{opacity:drift.interpolate({inputRange:[0,1],outputRange:[.18,.05]})}]}/>
      <View style={styles.filmGrain}/>
    </View>
  );
}

function ApexLogo(){
  const glitch=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.sequence([Animated.delay(2600),Animated.timing(glitch,{toValue:1,duration:45,useNativeDriver:useNativeAnimations}),Animated.timing(glitch,{toValue:-1,duration:55,useNativeDriver:useNativeAnimations}),Animated.timing(glitch,{toValue:0,duration:35,useNativeDriver:useNativeAnimations}),Animated.delay(1100),Animated.timing(glitch,{toValue:1,duration:30,useNativeDriver:useNativeAnimations}),Animated.timing(glitch,{toValue:0,duration:30,useNativeDriver:useNativeAnimations})]));loop.start();return()=>loop.stop();},[glitch]);
  return <Animated.View style={[styles.apexLogo,{transform:[{translateX:glitch.interpolate({inputRange:[-1,0,1],outputRange:[-1,0,1]})}]}]}><Animated.View style={[styles.logoGhost,{opacity:glitch.interpolate({inputRange:[-1,0,1],outputRange:[.18,0,.22]}),transform:[{translateX:-2}]}]}><Text style={styles.logoGhostText}>A</Text></Animated.View><View style={styles.apexLogoOuter}><View style={styles.apexLogoInner}><Text style={styles.apexLogoLetter}>A</Text><View style={styles.apexLogoSlash}/></View></View><View style={styles.apexLogoSignal}/></Animated.View>;
}

function EmptyVehicleIdentity(){
  return <View style={styles.emptyBuildIdentity}><View style={styles.emptyBuildOrbitOuter}/><View style={styles.emptyBuildOrbitInner}/><View style={styles.emptyBuildCrosshairH}/><View style={styles.emptyBuildCrosshairV}/><ApexLogo/><View style={styles.emptyBuildSignal}><View style={styles.liveDot}/><Text style={styles.emptyBuildSignalText}>GARAGE SLOT 01 · UNBOUND</Text></View></View>;
}

function GlitchBrand({subtitle}:{subtitle:string}){
  const pulse=useRef(new Animated.Value(0)).current;useEffect(()=>{const loop=Animated.loop(Animated.sequence([Animated.delay(3200),Animated.timing(pulse,{toValue:1,duration:35,useNativeDriver:useNativeAnimations}),Animated.timing(pulse,{toValue:0,duration:55,useNativeDriver:useNativeAnimations}),Animated.delay(700),Animated.timing(pulse,{toValue:-1,duration:35,useNativeDriver:useNativeAnimations}),Animated.timing(pulse,{toValue:0,duration:45,useNativeDriver:useNativeAnimations})]));loop.start();return()=>loop.stop();},[pulse]);
  return <View style={styles.glitchBrand}><Animated.Text style={[styles.brand,styles.brandGhost,{opacity:pulse.interpolate({inputRange:[-1,0,1],outputRange:[.16,0,.2]}),transform:[{translateX:pulse.interpolate({inputRange:[-1,0,1],outputRange:[-2,0,2]})}]}]}>APEX UGR</Animated.Text><Animated.Text style={[styles.brand,{transform:[{translateX:pulse.interpolate({inputRange:[-1,0,1],outputRange:[1,0,-1]})}]}]}>APEX UGR</Animated.Text><Text style={styles.brandSub}>{subtitle}</Text></View>;
}

function ScrambleReadout({value,masked=false,label}:{value:string;masked?:boolean;label:string}){
  const target=masked?'•'.repeat(value.length):value.toUpperCase();
  const [display,setDisplay]=useState(target);
  useEffect(()=>{let frame=0;const timer=setInterval(()=>{frame+=1;setDisplay(target.split('').map((char,index)=>char===' '?' ':index<Math.max(0,target.length-frame)?SCRAMBLE_CHARS[Math.floor(Math.random()*SCRAMBLE_CHARS.length)]:char).join(''));if(frame>Math.min(8,target.length+2)){clearInterval(timer);setDisplay(target);}},28);return()=>clearInterval(timer);},[target]);
  return <View style={styles.scrambleReadout}><Text style={styles.scrambleLabel}>{label}</Text><Text numberOfLines={1} style={styles.scrambleValue}>{display||'AWAITING INPUT'}</Text></View>;
}

function TacticalGlobe(){
  const spin=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.timing(spin,{toValue:1,duration:6200,useNativeDriver:useNativeAnimations}));loop.start();return()=>loop.stop();},[spin]);
  return <View style={styles.tacticalGlobe}><View style={styles.globeHalo}/><View style={styles.globeSphere}><View style={[styles.globeLatitude,{top:'28%'}]}/><View style={[styles.globeLatitude,{top:'49%'}]}/><View style={[styles.globeLatitude,{top:'70%'}]}/><View style={[styles.globeMeridian,{transform:[{rotate:'24deg'}]}]}/><View style={[styles.globeMeridian,{transform:[{rotate:'-24deg'}]}]}/><View style={styles.globeCore}/></View><Animated.View style={[styles.globeOrbit,{transform:[{rotate:spin.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']})}]}]}><View style={styles.globeNode}/><View style={[styles.globeNode,{right:-3,bottom:24}]}/></Animated.View><View style={styles.globeCoordinates}><Text style={styles.globeCoordinateText}>WORLD GRID // ENCRYPTED</Text><Text style={styles.globeCoordinateLive}>LINK LIVE</Text></View></View>;
}

function VaporStory(){
  const messages=['WELCOME RACER TO THE UNDERGROUND','APEX UNDERGROUND RACING','YOUR CITY IS STILL SLEEPING','THE GRID REMEMBERS EVERY ROAD'];
  const [index,setIndex]=useState(0);const opacity=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const cycle=()=>{opacity.setValue(0);Animated.sequence([Animated.timing(opacity,{toValue:1,duration:380,useNativeDriver:useNativeAnimations}),Animated.delay(620),Animated.timing(opacity,{toValue:0,duration:360,useNativeDriver:useNativeAnimations})]).start(()=>setIndex(value=>(value+1)%messages.length));};cycle();},[index,opacity]);
  return <Animated.Text style={[styles.vaporStory,{opacity,transform:[{scale:opacity.interpolate({inputRange:[0,1],outputRange:[1.08,1]})}]}]}>{messages[index]}</Animated.Text>;
}

function AndroidDownloadButton(){
  const download=()=>void Linking.openURL(ANDROID_DOWNLOAD_URL);
  return <Pressable onPress={download} style={styles.androidDownload}><View style={styles.androidDownloadIcon}><PackageCheck size={19} color={paper}/></View><View style={{flex:1}}><Text style={styles.androidDownloadTitle}>DOWNLOAD ANDROID APK</Text><Text style={styles.androidDownloadMeta}>LATEST VERIFIED RELEASE · STABLE LINK</Text></View><ChevronRight size={17} color={muted}/></Pressable>;
}

function PlayTransition({carName,carImage,onComplete}:{carName:string;carImage?:string|null;onComplete:()=>void}){
  const progress=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const fallback=setTimeout(onComplete,24000);Animated.timing(progress,{toValue:1,duration:22000,useNativeDriver:useNativeAnimations}).start();return()=>clearTimeout(fallback);},[onComplete,progress]);
  return <View style={styles.playTransition}><Video source={require('./assets/apex-underground-intro.mp4')} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.CONTAIN} shouldPlay isMuted={false} onPlaybackStatusUpdate={status=>{if(status.isLoaded&&status.didJustFinish)onComplete();}}/>
      <Pressable onPress={onComplete} style={{ position: 'absolute', top: Platform.OS === 'web' ? 20 : 50, right: 20, zIndex: 999, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#00FF66' }}>
        <Text style={{ color: '#00FF66', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>SKIP INTRO ›</Text>
      </Pressable><LinearGradient colors={['rgba(0,0,0,.28)','rgba(0,0,0,.08)','rgba(0,0,0,.84)']} style={StyleSheet.absoluteFill}/>{carImage?<Animated.Image source={{uri:carImage}} resizeMode="contain" style={[styles.introCar,{opacity:progress.interpolate({inputRange:[0,.12,.72,1],outputRange:[0,.25,.10,0]}),transform:[{scale:progress.interpolate({inputRange:[0,1],outputRange:[.82,1.24]})},{translateX:progress.interpolate({inputRange:[0,1],outputRange:[36,-26]})}]}]}/>:null}<View style={styles.cinematicTop}><Text style={styles.characterIndex}>APEX NETWORK // SESSION INITIALIZATION</Text><View style={styles.livePill}><View style={styles.liveDot}/><Text style={styles.playTransitionLive}>ENCRYPTED</Text></View></View><View style={styles.cinematicStory}><VaporStory/><Text style={styles.playTransitionCar}>{carName.toUpperCase()}</Text><Text style={styles.playTransitionLabel}>ENTERING THE UNDERGROUND</Text><View style={styles.playTransitionTrack}><Animated.View style={[styles.playTransitionFill,{transform:[{scaleX:progress}]}]}/></View></View><Animated.View style={[styles.playTransitionSweep,{transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[-240,860]})}]}]}/></View>;
}

function CredentialTransition(){
  const progress=useRef(new Animated.Value(0)).current;const [welcome,setWelcome]=useState(false);const [stage,setStage]=useState('DECRYPTING PRIVATE COORDINATES');
  useEffect(()=>{const first=setTimeout(()=>setStage('TRUST VECTOR VERIFIED // 34.0522° N 118.2437° W'),720);const second=setTimeout(()=>setStage('GRID BREACH CONFIRMED // PRIVATE CHANNEL OPEN'),1450);const third=setTimeout(()=>setWelcome(true),2200);Animated.timing(progress,{toValue:1,duration:2150,useNativeDriver:useNativeAnimations}).start();return()=>{clearTimeout(first);clearTimeout(second);clearTimeout(third);};},[progress]);
  if(welcome)return <View style={styles.welcomeGate}><View style={styles.welcomeGlitch}/><Text style={styles.welcomeRacer}>WELCOME RACER</Text><Text style={styles.welcomeSub}>THE UNDERGROUND REMEMBERS YOUR NAME</Text><Animated.View style={[styles.playTransitionSweep,{transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[-180,720]})}]}]}/></View>;
  return <View style={styles.credentialTransition}><Image source={require('./assets/apex-lock-reference.png')} style={styles.credentialReference} resizeMode="cover"/><LinearGradient colors={['rgba(0,0,0,.38)','rgba(0,11,8,.76)','#010201']} style={StyleSheet.absoluteFill}/><Animated.View style={[styles.credentialCore,{opacity:progress,transform:[{scale:progress.interpolate({inputRange:[0,1],outputRange:[.86,1]})}]}]}><View style={styles.credentialSeal}><Animated.View style={[styles.credentialOrbit,{transform:[{rotate:progress.interpolate({inputRange:[0,1],outputRange:['0deg','540deg']})}]}]}/><View style={styles.credentialSealInner}><ShieldCheck size={46} color={accent} strokeWidth={1.35}/></View></View><Text style={styles.credentialAccepted}>CREDENTIAL ACCEPTED</Text><Text style={styles.credentialStage}>{stage}</Text><View style={styles.credentialTrack}><Animated.View style={[styles.credentialFill,{transform:[{scaleX:progress}]}]}/></View><View style={styles.credentialChecks}><Text style={styles.credentialCheck}>CIPHER // 4E 4F 44 45</Text><Text style={styles.credentialCheck}>LOCATION // LIVE</Text></View></Animated.View><Animated.View style={[styles.playTransitionSweep,{transform:[{translateY:progress.interpolate({inputRange:[0,1],outputRange:[-260,720]})}]}]}/></View>;
}

function GameLobby({onEnter}:{onEnter:(tab:TabKey)=>void}){
  const {vehicles,activeVehicleId,profile}=useContentStore();const car=vehicles.find(item=>item.id===activeVehicleId)||vehicles[0];const position=useRef(new Animated.ValueXY()).current;
  const [entering,setEntering]=useState(false);
  const pan=useMemo(()=>PanResponder.create({onStartShouldSetPanResponder:()=>true,onMoveShouldSetPanResponder:()=>true,onPanResponderGrant:()=>position.setOffset({x:(position.x as any)._value,y:(position.y as any)._value}),onPanResponderMove:Animated.event([null,{dx:position.x,dy:position.y}],{useNativeDriver:false}),onPanResponderRelease:()=>{position.flattenOffset();Animated.spring(position,{toValue:{x:0,y:0},friction:6,useNativeDriver:false}).start();}}),[position]);
  const enter=(tab:TabKey)=>{if(entering)return;setEntering(true);playInterfaceSound('unlock');playEngineSound(car?.engine||'V6');};
  const carImage=car?.digitalTwinUrl||car?.photoUrl;
  if(entering)return <PlayTransition carName={car?.nickname||'APEX PILOT'} carImage={carImage} onComplete={()=>onEnter('command')}/>;
  return <ImageBackground source={require('./assets/apex-play-screen.png')} style={styles.gameLobby} resizeMode="cover"><LinearGradient colors={['rgba(0,0,0,.05)','rgba(0,0,0,.08)','rgba(0,0,0,.82)']} style={StyleSheet.absoluteFill}/><View style={styles.lobbyHeader}><View style={styles.accessTop}><ApexLogo/><GlitchBrand subtitle="UNDERGROUND RACING"/></View><View style={styles.lobbyLevel}><Text style={styles.lobbyLevelText}>{profile?.tier?.toUpperCase()||'BRONZE'} · {profile?.points||0} RP</Text></View></View><View style={styles.playScreenCopy}><Text style={styles.characterIndex}>PRIVATE CHANNEL OPEN // {profile?.alias?.toUpperCase()}</Text><Text style={styles.playScreenTitle}>YOUR CITY. YOUR RULES.</Text><Text style={styles.playScreenMeta}>{car?`${car.year} ${car.make} ${car.model} · ${car.horsepower} HP`:'CREATE YOUR FIRST BUILD AFTER ENTRY'}</Text></View><View style={styles.lobbyActions}><Pressable onPress={()=>enter('command')} style={styles.playGameButton}><Text style={styles.playGameText}>ENTER THE UNDERGROUND</Text><ChevronRight size={28} color={accent}/></Pressable><Text style={styles.lobbyPlayHint}>TAP TO LAUNCH INTRO SEQUENCE</Text></View></ImageBackground>;
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
  grow = false,
}: {
  label: string;
  icon: IconType;
  onPress: () => void;
  active?: boolean;
  compact?: boolean;
  grow?: boolean;
}) {
  return (
    <Pressable onPress={()=>{playInterfaceSound();onPress();}} style={({ pressed }) => [styles.glassButtonShell, compact && styles.glassButtonCompact, grow && styles.glassButtonGrow, pressed && styles.pressed]}>
      <BlurView intensity={Platform.OS === 'web' ? 48 : 34} tint="dark" style={[styles.glassButton, active && styles.glassButtonActive]}>
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
      Animated.timing(pulse, { toValue: 1, duration: 1100, useNativeDriver: useNativeAnimations }),
      Animated.timing(pulse, { toValue: 0.72, duration: 1100, useNativeDriver: useNativeAnimations }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.tokenWrap, compact && styles.tokenWrapCompact]}>
      <Animated.View style={[styles.tokenAura, { opacity: pulse }]} />
      <Animated.View style={[styles.tokenOrbit,{transform:[{rotate:pulse.interpolate({inputRange:[.72,1],outputRange:['0deg','24deg']})}]}]} />
      <LinearGradient colors={['#FFFFFF', '#AEE8A0', '#3E6C39']} style={[styles.token, compact && styles.tokenCompact]}>
        <View style={styles.tokenInner}><Text style={[styles.tokenLetter, compact && styles.tokenLetterCompact]}>A</Text></View>
      </LinearGradient>
      <View>
        <Text style={styles.tokenValue}>{value.toLocaleString()}</Text>
        <Text style={styles.tokenLabel}>APEX CREDITS</Text>
      </View>
    </View>
  );
}

function CommandScreen({ onTab, onProfile }: { onTab: (tab: TabKey) => void; onProfile: () => void }) {
  const { profile, rankings, vehicles, activeVehicleId, races } = useContentStore();
  const { drivers, events, cruises, route, networkStatus, isDriving, distanceKm, maxSpeedKph, weeklyTopSpeedKph, startDrive } = useLiveNetworkStore();
  const {journeys,rewards,ghostReplays,heat}=useWorldStore();
  const [chest,setChest]=useState<{available:boolean;streakCount:number}|null>(null);
  const [chestError,setChestError]=useState('');
  const [claimingChest,setClaimingChest]=useState(false);
  const loadChest=async()=>{if(!profile)return;try{const data=await cloudflareApi.request<{available:boolean;streakCount:number}>('/api/daily-chest/status');setChest(data);setChestError('');}catch(error){setChestError(error instanceof Error?error.message:'Reward service unavailable.');}};
  useEffect(()=>{void loadChest();},[profile?.alias]);
  const claimChest=async()=>{if(!chest?.available||claimingChest)return;setClaimingChest(true);try{const response=await cloudflareApi.request<{claim:{gcReward:number;rarity:string;streakDay:number}}>('/api/daily-chest/claim',{method:'POST'}),reward=response.claim;setChest({available:false,streakCount:reward.streakDay});playInterfaceSound('reward');Alert.alert('Ghost Chest decrypted',`+${reward.gcReward} GC // ${reward.rarity.toUpperCase()}`);await useContentStore.getState().initialize();}catch(error){Alert.alert('Chest unavailable',error instanceof Error?error.message:'Try again in a moment.');}finally{setClaimingChest(false);}};
  const vehicle = vehicles.find(item => item.id === activeVehicleId);
  const rankIndex = profile ? rankings.findIndex(item => item.id === useContentStore.getState().userId) : -1;
  const liveCredits = profile?.credits ?? 0;
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.hero,!vehicle&&styles.heroEmpty]}>{vehicle?.photoUrl ? <Image source={{ uri: vehicle.photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <View style={[StyleSheet.absoluteFill, styles.commandEmptyHero]}><EmptyVehicleIdentity/></View>}
        <LinearGradient colors={['rgba(3,4,3,0.05)', 'rgba(3,4,3,0.44)']} style={StyleSheet.absoluteFill} />
        <View style={styles.heroStatus}>
          <View style={styles.liveDot} />
          <Text style={styles.heroStatusText}>{networkStatus.replace('_', ' ').toUpperCase()} / {isDriving ? 'DRIVE ACTIVE' : 'SECURE'}</Text>
        </View>
        <View style={styles.heroBottom}>
          <Text style={styles.eyebrow}>ACTIVE BUILD</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.64} style={styles.heroTitle}>{vehicle?.nickname.toUpperCase() || 'NO VEHICLE'}</Text>
          <Text numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.heroCarName}>{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ''}`.toUpperCase() : 'ADD A VEHICLE IN GARAGE'}</Text>
          <View style={styles.heroActions}>
            <GlassButton label="GARAGE" icon={CarFront} onPress={() => onTab('garage')} active grow />
            <GlassButton label="MAP" icon={MapPin} onPress={() => onTab('radar')} grow />
            <GlassButton label="DRIVE" icon={Play} onPress={startDrive} grow />
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

      <View style={styles.commandPulse}><View style={styles.commandPulseLive}><View style={styles.liveDot}/><Text style={styles.commandPulseLabel}>NETWORK PULSE</Text></View><View style={styles.commandPulseMetric}><Text style={styles.commandPulseValue}>{drivers.length}</Text><Text style={styles.commandPulseMeta}>PILOTS</Text></View><View style={styles.commandPulseMetric}><Text style={styles.commandPulseValue}>{events.length}</Text><Text style={styles.commandPulseMeta}>MEETS</Text></View><View style={styles.commandPulseMetric}><Text style={styles.commandPulseValue}>{cruises.length}</Text><Text style={styles.commandPulseMeta}>CRUISES</Text></View></View>

      <View style={styles.commandTelemetryRail}><View style={styles.commandTelemetryCell}><Gauge size={15} color={accent}/><Text style={styles.commandTelemetryValue}>{isDriving?Math.round(maxSpeedKph):Math.round(weeklyTopSpeedKph)}</Text><Text style={styles.commandTelemetryLabel}>{isDriving?'MAX KPH':'WEEKLY TOP'}</Text></View><View style={styles.commandTelemetryCell}><Route size={15} color={paper}/><Text style={styles.commandTelemetryValue}>{route?route.stops.length:ghostReplays.length}</Text><Text style={styles.commandTelemetryLabel}>{route?'ROUTE STOPS':'GHOSTS'}</Text></View><View style={styles.commandTelemetryCell}><CircleDollarSign size={15} color={paper}/><Text style={styles.commandTelemetryValue}>{rewards.length}</Text><Text style={styles.commandTelemetryLabel}>LIVE CACHES</Text></View><View style={styles.commandTelemetryCell}><Navigation size={15} color={paper}/><Text style={styles.commandTelemetryValue}>{distanceKm.toFixed(1)}</Text><Text style={styles.commandTelemetryLabel}>KM RUN</Text></View></View>

      <Pressable onPress={()=>void (chestError?loadChest():claimChest())} disabled={claimingChest||(!chestError&&chest!==null&&!chest.available)} style={[styles.ghostProtocol,Boolean(chest&&!chest.available)&&styles.worldClaimed]}><Gift size={21} color={chest?.available?accent:chestError?'#FF625F':muted}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>DAILY GHOST CHEST</Text><Text style={styles.commandMeta}>{chestError?'SIGNAL LOST · TAP TO RETRY':chest===null?'DECRYPTING DAILY SIGNAL':chest.available?'SIGNAL READY · TAP TO DECRYPT':`CLAIMED TODAY · ${chest.streakCount} DAY STREAK`}</Text></View><Text style={styles.sectionAction}>{claimingChest?'OPENING':chestError?'RETRY':chest?.available?'OPEN':chest?'SECURED':'SYNC'}</Text></Pressable>

      <SectionTitle label="PILOT STATUS" action={profile ? 'LIVE RECORD' : 'OFFLINE'} />
      <GlassPanel glow>
        <View style={styles.statusTop}>
          <View style={styles.statusIdentity}>
            <Text style={styles.statusAlias}>{profile?.alias.toUpperCase() || 'SIGN IN REQUIRED'}</Text>
            {profile ? <RankBadge rank={(['Bronze','Silver','Master','Platinum'].includes(profile.tier) ? profile.tier : 'Bronze') as Driver['rank']} /> : null}
          </View>
          <CreditsToken value={liveCredits} compact />
        </View>
        <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, ((profile?.points || 0) % 10000) / 100)}%` }]} /></View>
        <View style={styles.progressLabels}><Text style={styles.progressText}>{(profile?.points || 0).toLocaleString()} RP</Text><Text style={styles.progressText}>{profile?.tier?.toUpperCase() || 'UNRANKED'}</Text></View><GlassButton label="VIEW / EDIT PILOT" icon={UserRound} onPress={onProfile} compact/>
      </GlassPanel>

      <SectionTitle label="OPERATIONS" action={`${drivers.length} PILOTS LIVE`} />
      <View style={styles.operationGrid}>{[
        {label:'RACE',meta:`${drivers.length} available`,icon:Swords,tab:'race' as TabKey},
        {label:'BOUNTY',meta:'Opt-in private venue',icon:Star,tab:'bounty' as TabKey},
        {label:'MAP',meta:`${events.length} meet zones`,icon:Radio,tab:'radar' as TabKey},
        {label:'ROUTES',meta:'Favorites + saved',icon:Route,tab:'radar' as TabKey},
        {label:'MEETS',meta:'Host or join',icon:Users,tab:'meets' as TabKey},
      ].map(item=><Pressable key={item.label} onPress={()=>onTab(item.tab)} style={({pressed})=>[styles.operationTile,pressed&&styles.pressed]}><View style={styles.operationIcon}><item.icon size={20} color={item.label==='RACE'?accent:paper}/></View><Text style={styles.operationTitle}>{item.label}</Text><Text style={styles.operationMeta}>{item.meta.toUpperCase()}</Text><ChevronRight size={15} color={muted}/></Pressable>)}</View>

      <SectionTitle label="FIELD ACCESS" action="DEVICE + IDENTITY" />
      <GlassPanel><AndroidDownloadButton/><View style={styles.identityDivider}/><GlassButton label="VIEW / EDIT PILOT" icon={UserRound} onPress={onProfile}/><GlassButton label="LOCK YOURSELF OUT" icon={LockKeyhole} onPress={async()=>{await cloudflareApi.signOut();useLiveNetworkStore.getState().dispose();await Promise.all([useContentStore.getState().initialize(),useLiveNetworkStore.getState().initialize()]);}}/></GlassPanel>

      <SectionTitle label="ACTIVE GRID" action={`${races.filter(item=>['scheduled','live'].includes(item.status)).length+cruises.length+journeys.length} SIGNALS`} />
      <View style={styles.activeGrid}>{route?<Pressable onPress={()=>onTab('radar')} style={styles.activeGridRow}><View style={styles.activeGridIcon}><Navigation size={18} color={accent}/></View><View style={styles.commandCopy}><Text numberOfLines={1} style={styles.commandTitle}>{route.destination.toUpperCase()}</Text><Text style={styles.commandMeta}>{route.stops.length} STOPS · {route.distanceKm.toFixed(1)} KM · SHARED-ROUTE READY</Text></View><ChevronRight size={15} color={muted}/></Pressable>:null}{races.filter(item=>['scheduled','live'].includes(item.status)).slice(0,2).map(race=><Pressable key={race.id} onPress={()=>onTab('race')} style={styles.activeGridRow}><View style={styles.activeGridIcon}><Swords size={18} color={accent}/></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{race.raceMode.toUpperCase()} · {race.routeName.toUpperCase()}</Text><Text style={styles.commandMeta}>{race.status.toUpperCase()} · {race.prizePool.toLocaleString()} ACR POT · {race.entries.length} PILOTS</Text></View><ChevronRight size={15} color={muted}/></Pressable>)}{cruises.slice(0,2).map(convoy=><Pressable key={convoy.id} onPress={()=>onTab('radar')} style={styles.activeGridRow}><View style={styles.activeGridIcon}><Users size={18} color={paper}/></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{convoy.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{convoy.status.toUpperCase()} · {convoy.memberCount}/{convoy.maxMembers} PILOTS · {convoy.destinationName.toUpperCase()}</Text></View><ChevronRight size={15} color={muted}/></Pressable>)}{journeys.slice(0,2).map(journey=><Pressable key={journey.id} onPress={()=>onTab('world')} style={styles.activeGridRow}><View style={styles.activeGridIcon}><Crown size={18} color={accent}/></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{journey.title.toUpperCase()}</Text><Text style={styles.commandMeta}>SEASON JOURNEY · {journey.current_checkpoint||0}/{journey.route.length} MARKS · +{journey.reward_credits} ACR</Text></View><ChevronRight size={15} color={muted}/></Pressable>)}{!route&&!races.some(item=>['scheduled','live'].includes(item.status))&&!cruises.length&&!journeys.length?<Pressable onPress={()=>onTab('radar')} style={styles.activeGridEmpty}><Radio size={20} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>GRID QUIET</Text><Text style={styles.commandMeta}>BUILD A ROUTE, OPEN A CONVOY, OR STAGE A VERIFIED COURSE</Text></View></Pressable>:null}</View>

      <SectionTitle label="SEASON LEADERS" action="VIEW ALL" />
      <Pressable onPress={() => onTab('leaderboard')} style={styles.leaderPreview}>{rankings.slice(0,3).map((row,index)=><View key={row.id} style={styles.leaderPreviewRow}><Text style={styles.leaderPreviewRank}>{index+1}</Text><View style={styles.commandCopy}><Text style={styles.commandTitle}>{row.alias.toUpperCase()}</Text><Text style={styles.commandMeta}>{row.tier.toUpperCase()} · {row.points} RP · {row.wins} WINS</Text></View><Trophy size={17} color={index===0?accent:muted}/></View>)}{rankings.length===0?<View style={styles.leaderPreviewRow}><Trophy size={18} color={accent}/><Text style={styles.commandMeta}>THE FIRST VERIFIED RUN TAKES THE BOARD</Text></View>:null}<View style={styles.leaderPreviewOpen}><Text style={styles.sectionAction}>OPEN FULL LEADERBOARD</Text><ChevronRight size={16} color={accent}/></View></Pressable>

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
  revealOrigin,
  mode,
  onSelect,
  onSelectEvent,
  onSelectReward,
  drivers,
  events,
  routeCoordinates,
  driveTrace,
  routeStops,
  followRevision,
  focus,
  fitAll,
  discoveries,
  territories,
  drops,
  reports,
  rewards,
  safeHouses,
  ghostReplay,
  followLocation,
}: {
  location: { latitude: number; longitude: number } | null;
  revealOrigin: { latitude: number; longitude: number } | null;
  mode: 'street' | 'satellite';
  onSelect: (driver: Driver | null) => void;
  onSelectEvent: (event: LiveEvent | null) => void;
  onSelectReward: (reward: MapReward | null) => void;
  drivers: Driver[];
  events: LiveEvent[];
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  driveTrace: Array<{ latitude: number; longitude: number }>;
  routeStops: Array<{name:string;latitude:number;longitude:number}>;
  followRevision: number;
  focus: { latitude: number; longitude: number } | null;
  fitAll: boolean;
  discoveries: Array<{latitude:number;longitude:number}>;
  territories: Territory[];
  drops: DeadDrop[];
  reports: RoadReport[];
  rewards: MapReward[];
  safeHouses: SafeHouse[];
  ghostReplay: GhostReplay | null;
  followLocation?: boolean;
}) {
  const nativeMapRef=useRef<any>(null);
  const lastCameraLocation=useRef<{latitude:number;longitude:number}|null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const listener = (event: MessageEvent) => {
      if (event.data?.source !== 'apex-radar') return;
      if (event.data.eventId) {
        const meet = events.find(item => item.id === event.data.eventId);
        if (meet) onSelectEvent(meet);
        return;
      }
      if (event.data.rewardId) {
        const reward = rewards.find(item => item.id === event.data.rewardId);
        if (reward) onSelectReward(reward);
        return;
      }
      const driver = drivers.find(item => item.id === event.data.driverId);
      if (driver) onSelect(driver);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, [drivers, events, rewards, onSelect, onSelectEvent, onSelectReward]);

  if (Platform.OS === 'web') {
    const tileUrl = mode === 'satellite'
      ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = mode === 'satellite' ? 'Esri World Imagery' : 'OpenStreetMap';
    const safeDrivers = JSON.stringify(drivers).replace(/</g, '\\u003c');
    const safeEvents = JSON.stringify(events).replace(/</g, '\\u003c');
    const safeRoute = JSON.stringify(routeCoordinates).replace(/</g, '\\u003c');
    const safeDriveTrace=JSON.stringify(driveTrace).replace(/</g,'\\u003c');
    const safeRouteStops=JSON.stringify(routeStops).replace(/</g,'\\u003c');
    const revealZones=[...discoveries.map(point=>({...point,radiusM:'radiusM' in point?Number(point.radiusM):650})),...events.map(event=>({latitude:event.latitude,longitude:event.longitude,radiusM:Math.max(1600,event.radiusM*3)})),...drops.filter(drop=>!drop.claimed).map(drop=>({latitude:drop.latitude,longitude:drop.longitude,radiusM:Math.max(850,drop.radius_m*6)})),...rewards.map(reward=>({latitude:reward.latitude,longitude:reward.longitude,radiusM:Math.max(850,reward.radius_m*6)})),...(location?[{latitude:location.latitude,longitude:location.longitude,radiusM:16093.4,breach:true}]:[]),...(revealOrigin?[{latitude:revealOrigin.latitude,longitude:revealOrigin.longitude,radiusM:16093.4,breach:true}]:[])];
    const safeDiscoveries=JSON.stringify(revealZones).replace(/</g,'\\u003c');
    const safeTerritories=JSON.stringify(territories).replace(/</g,'\\u003c');
    const safeDrops=JSON.stringify(drops).replace(/</g,'\\u003c');
    const safeReports=JSON.stringify(reports).replace(/</g,'\\u003c');
    const safeRewards=JSON.stringify(rewards).replace(/</g,'\\u003c');
    const safeGhost=JSON.stringify(ghostReplay?.points||[]).replace(/</g,'\\u003c');
    const safeHousesData=JSON.stringify(safeHouses).replace(/</g,'\\u003c');
    const driveTraceOverlay=`<script>(function(){const trace=${safeDriveTrace};if(trace.length>1)L.polyline(trace.map(point=>[point.latitude,point.longitude]),{color:'#7dff69',weight:5,opacity:.92,lineCap:'round'}).addTo(map);})();<\/script>`;
    const smoothFogOverlay=`<script>(function(){let frame=0;const redraw=()=>{map.fire('zoom');frame=requestAnimationFrame(redraw);};map.on('zoomstart',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(redraw);});map.on('zoomend',()=>{cancelAnimationFrame(frame);map.fire('zoom');});})();<\/script>`;
    const worldOverlay=`<script>(function(){const discoveries=${safeDiscoveries},territories=${safeTerritories},drops=${safeDrops},reports=${safeReports},safeHouses=${safeHousesData};territories.forEach(t=>L.circle([t.latitude,t.longitude],{radius:t.radius_m,color:t.unlocked?'#dfffd7':'#778079',weight:t.unlocked?3:1,dashArray:t.unlocked?'':'7 8',fillColor:t.unlocked?'#8fca83':'#121712',fillOpacity:t.unlocked?.16:.28}).addTo(map).bindTooltip('['+t.tag+'] '+t.name+(t.unlocked?' · UNLOCKED':' · LOCKED')));safeHouses.forEach(h=>L.marker([h.latitude,h.longitude],{zIndexOffset:720,icon:L.divIcon({className:'',html:'<div style="width:30px;height:30px;border-radius:9px;border:2px solid #A7E59A;background:#071008;color:#A7E59A;font:900 15px monospace;text-align:center;line-height:27px;box-shadow:0 0 16px rgba(167,229,154,.46)">⌂</div>',iconSize:[30,30],iconAnchor:[15,15]})}).addTo(map).bindTooltip('SAFE HOUSE // '+h.name));drops.forEach(d=>L.marker([d.latitude,d.longitude],{icon:L.divIcon({className:'',html:'<div style="width:26px;height:26px;transform:rotate(45deg);border:2px solid '+(d.claimed?'#707770':'#dfffd7')+';background:rgba(3,7,4,.9);box-shadow:0 0 18px rgba(167,229,154,.45)"><b style="display:block;transform:rotate(-45deg);font:900 8px monospace;color:#fff;text-align:center;line-height:22px">'+(d.claimed?'✓':'ACR')+'</b></div>',iconSize:[28,28],iconAnchor:[14,14]})}).addTo(map).bindTooltip(d.title+' · '+d.credits+' ACR'));const icons={hazard:'!',closure:'×',fixed_camera:'◉',dangerous_road:'△'};reports.forEach(r=>L.marker([r.latitude,r.longitude],{icon:L.divIcon({className:'',html:'<div style="width:25px;height:25px;border-radius:7px;border:1px solid rgba(255,255,255,.65);background:#090c09;color:#fff;font:900 14px monospace;text-align:center;line-height:24px;box-shadow:0 0 13px rgba(255,255,255,.18)">'+icons[r.type]+'</div>',iconSize:[27,27],iconAnchor:[13,13]})}).addTo(map).bindTooltip(r.type.replace('_',' ').toUpperCase()+(r.note?' · '+r.note:'')));})();<\/script>`;
    const canvasFogOverlay=`<script>(function(){const zones=${safeDiscoveries},started=performance.now();const oldFog=Array.from(document.body.children).find(node=>node.tagName&&node.tagName.toLowerCase()==='svg'&&node.style.zIndex==='480');if(oldFog)oldFog.remove();const canvas=document.createElement('canvas');canvas.setAttribute('aria-hidden','true');canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;z-index:480;pointer-events:none;will-change:contents';document.body.appendChild(canvas);const ctx=canvas.getContext('2d');let frame=0;function radius(d,p){const longitude=d.longitude+(d.radiusM||650)/(111320*Math.max(.2,Math.cos(d.latitude*Math.PI/180)));return Math.max(3,Math.abs(map.latLngToContainerPoint([d.latitude,longitude]).x-p.x));}function draw(now){const size=map.getSize(),ratio=Math.min(window.devicePixelRatio||1,2),width=size.x,height=size.y;if(canvas.width!==Math.round(width*ratio)||canvas.height!==Math.round(height*ratio)){canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='rgba(105,112,109,.67)';ctx.fillRect(0,0,width,height);for(let index=0;index<22;index++){const x=(index*173%Math.max(1,width+180))-90,y=(index*97%Math.max(1,height+140))-70,r=95+(index%5)*34,g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(202,208,204,.16)');g.addColorStop(.55,'rgba(147,154,151,.11)');g.addColorStop(1,'rgba(86,93,90,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}ctx.globalCompositeOperation='destination-out';const progress=Math.min(1,Math.max(0,((now||performance.now())-started)/850)),ease=1-Math.pow(1-progress,3);zones.forEach(d=>{const p=map.latLngToContainerPoint([d.latitude,d.longitude]),r=radius(d,p)*(d.breach?.72+.28*ease:1),gradient=ctx.createRadialGradient(p.x,p.y,Math.max(0,r*.8),p.x,p.y,r);gradient.addColorStop(0,'rgba(0,0,0,1)');gradient.addColorStop(.8,'rgba(0,0,0,1)');gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();});ctx.globalCompositeOperation='source-over';if(progress<1){const breach=zones.filter(d=>d.breach).at(-1);if(breach){const p=map.latLngToContainerPoint([breach.latitude,breach.longitude]),r=radius(breach,p)*(.72+.28*ease);ctx.strokeStyle='rgba(184,255,169,'+(1-progress)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();}frame=requestAnimationFrame(draw);}}function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(draw);}map.on('zoom zoomend move moveend resize',schedule);window.addEventListener('resize',schedule);draw(started);})();<\/script>`;
    const rewardReplayOverlay=`<script>(function(){const rewards=${safeRewards},ghost=${safeGhost};const style=document.createElement('style');style.textContent='.reward-pin{display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer}.reward-coin{width:36px;height:36px;border-radius:12px;border:2px solid var(--coin);background:var(--coin-bg);color:var(--coin);font:900 9px monospace;display:flex;align-items:center;justify-content:center;animation:coinPulse 1.8s ease-in-out infinite;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}.reward-coin:after{content:"GC";position:absolute;margin-top:22px;font:900 6px monospace}.reward-timer{white-space:nowrap;border:1px solid rgba(44,255,131,.72);border-radius:7px;background:rgba(2,12,5,.94);color:#caffd8;padding:3px 6px;font:900 8px monospace;box-shadow:0 0 12px rgba(44,255,131,.46)}@keyframes coinPulse{0%,100%{transform:scale(1);filter:drop-shadow(0 0 5px var(--coin))}50%{transform:scale(1.1);filter:drop-shadow(0 0 13px var(--coin))}}';document.head.appendChild(style);function timer(expires){const seconds=Math.max(0,Math.ceil((Date.parse(expires)-Date.now())/1000));const h=Math.floor(seconds/3600),m=Math.floor((seconds%3600)/60),s=seconds%60;return h>0?h+'H '+String(m).padStart(2,'0')+'M':String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');}const timerNodes=[];rewards.forEach(r=>{const ghostCoin=/ghost/i.test(r.title),coin=ghostCoin?'#00F56A':'#2CFF83',fill=ghostCoin?'#07351B':'#0A2A16';L.circle([r.latitude,r.longitude],{radius:r.radius_m,color:coin,weight:2,fillColor:fill,fillOpacity:.15,dashArray:'4 6'}).addTo(map);const marker=L.marker([r.latitude,r.longitude],{zIndexOffset:700,icon:L.divIcon({className:'',html:'<div class="reward-pin" style="--coin:'+coin+';--coin-bg:'+fill+'"><div class="reward-coin">+'+r.credits+'</div><b class="reward-timer">'+timer(r.expires_at)+'</b></div>',iconSize:[58,58],iconAnchor:[29,29]})}).addTo(map).bindTooltip(r.title).on('click',()=>parent.postMessage({source:'apex-radar',rewardId:r.id},'*'));timerNodes.push({marker,r});});setInterval(()=>timerNodes.forEach(item=>{const node=item.marker.getElement()?.querySelector('.reward-timer');if(node)node.textContent=timer(item.r.expires_at);}),1000);if(ghost.length>1){const line=L.polyline(ghost.map(p=>[p.latitude,p.longitude]),{color:'#2CFF83',weight:4,opacity:.8,dashArray:'3 9',lineCap:'round'}).addTo(map);const runner=L.circleMarker([ghost[0].latitude,ghost[0].longitude],{radius:7,color:'#fff',weight:2,fillColor:'#2CFF83',fillOpacity:1}).addTo(map);let index=0;setInterval(()=>{index=(index+1)%ghost.length;runner.setLatLng([ghost[index].latitude,ghost[index].longitude]);},180);map.fitBounds(line.getBounds(),{padding:[54,54],maxZoom:15});}})();<\/script>`;
    const routeFitOverlay=`<script>(function(){const route=${safeRoute};if(route.length>1&&${focus||fitAll||ghostReplay?'false':'true'}){map.fitBounds(L.latLngBounds(route.map(point=>[point.latitude,point.longitude])),{padding:[58,58],maxZoom:16,animate:true,duration:.65});}})();<\/script>`;
    const center = focus || location || { latitude: 20, longitude: 0 };
    const zoom = focus ? 16 : location ? 14 : 2;
    const selfMarker = location ? `L.marker([${location.latitude},${location.longitude}],{zIndexOffset:1000,icon:L.divIcon({className:'',html:'<div class="self-anchor"><i class="radar-ring r1"></i><i class="radar-ring r2"></i><i class="radar-ring r3"></i><i class="radar-sweep"></i><div class="self-dot"></div><b class="self-label">YOU // ACTIVE DRIVER</b></div>',iconSize:[180,180],iconAnchor:[90,90]})}).addTo(map);` : '';
    const mapDocument = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><style>html,body,#map{height:100%;margin:0;background:#030503}.leaflet-control-attribution{font:8px monospace;background:rgba(3,4,3,.72)!important;color:#aaa}.leaflet-control-attribution a{color:#91b985}.leaflet-control-zoom{display:none}.basemap-tiles{${mode === 'street' ? 'filter:grayscale(1) invert(.91) contrast(1.25) brightness(.43)' : 'filter:saturate(.38) contrast(1.24) brightness(.43)'}}.driver-pin{display:flex;align-items:center;justify-content:center;background:rgba(3,10,5,.98);border:2px solid #2CFF83;color:#f5fff2;font:900 12px monospace;border-radius:50%;box-shadow:0 0 12px rgba(44,255,131,.78),0 0 28px rgba(44,255,131,.34);width:34px;height:34px;transition:transform .22s ease;cursor:pointer}.driver-pin:hover{transform:scale(1.14)}.driver-pin.mystery{border-style:dashed}.driver-pin.stale{opacity:.56;border-color:#4e7551;box-shadow:none}.driver-pin.cruise{box-shadow:0 0 0 7px rgba(44,255,131,.14),0 0 24px rgba(44,255,131,.74)}.self-anchor{position:relative;width:180px;height:180px;display:flex;align-items:center;justify-content:center}.self-dot{position:relative;z-index:5;width:20px;height:20px;border-radius:50%;background:#2CFF83;border:3px solid #fff;box-shadow:0 0 0 7px rgba(44,255,131,.18),0 0 28px #2CFF83}.self-label{position:absolute;z-index:6;top:108px;color:#2CFF83;background:rgba(2,5,3,.88);border:1px solid rgba(44,255,131,.58);border-radius:9px;padding:3px 7px;font:900 8px monospace}.radar-ring{position:absolute;left:50%;top:50%;border:1px solid rgba(44,255,131,.4);border-radius:50%;transform:translate(-50%,-50%)}.r1{width:72px;height:72px}.r2{width:116px;height:116px;opacity:.65}.r3{width:168px;height:168px;opacity:.36}.radar-sweep{position:absolute;left:50%;top:50%;width:84px;height:84px;transform-origin:0 0;background:conic-gradient(from -18deg,rgba(44,255,131,.34),transparent 48deg);animation:sweep 3.2s linear infinite}.event-core{width:16px;height:16px;border-radius:50%;background:#b9deb0;border:2px solid #fff;box-shadow:0 0 20px #91b985;cursor:pointer}.route-stop{width:27px;height:27px;border-radius:9px;background:#071008;border:2px solid #fff;color:#dfffd7;display:flex;align-items:center;justify-content:center;font:900 9px monospace;box-shadow:0 0 16px rgba(167,229,154,.55)}@keyframes sweep{to{transform:rotate(360deg)}}@keyframes eventPulse{0%{stroke-opacity:.74;fill-opacity:.2}50%{stroke-opacity:.16;fill-opacity:.04}100%{stroke-opacity:.74;fill-opacity:.2}}.event-zone{animation:eventPulse 2.4s ease-in-out infinite}</style></head><body><div id="map"></div><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script>const map=L.map('map',{zoomControl:true,attributionControl:true}).setView([${center.latitude},${center.longitude}],${zoom});L.tileLayer('${tileUrl}',{maxZoom:19,attribution:'${attribution}',className:'basemap-tiles'}).addTo(map);${selfMarker}const route=${safeRoute};if(route.length>1){map.createPane('routePane');map.getPane('routePane').style.zIndex='520';L.polyline(route.map(p=>[p.latitude,p.longitude]),{pane:'routePane',color:'#2CFF83',weight:4,opacity:.9,lineCap:'round'}).addTo(map);}const routeStops=${safeRouteStops};routeStops.forEach((stop,index)=>L.marker([stop.latitude,stop.longitude],{zIndexOffset:850,icon:L.divIcon({className:'',html:'<div class="route-stop">'+(index+1)+'</div>',iconSize:[29,29],iconAnchor:[14,14]})}).addTo(map).bindTooltip(stop.name));const drivers=${safeDrivers};drivers.forEach(d=>{const label=d.mystery?'?':d.alias.slice(0,1);const classes='driver-pin '+(d.mystery?'mystery ':'')+(d.cruiseId?'cruise ':'')+(!d.isLive?'stale':'');L.marker([d.latitude,d.longitude],{icon:L.divIcon({className:'',html:'<div class="'+classes+'">'+label+'</div>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(map).on('click',()=>{map.flyTo([d.latitude,d.longitude],16,{duration:.7});parent.postMessage({source:'apex-radar',driverId:d.id},'*')});});const events=${safeEvents};events.forEach(e=>{L.circle([e.latitude,e.longitude],{radius:e.radiusM,color:'#b9deb0',weight:2,fillColor:'#91b985',fillOpacity:.12,className:'event-zone'}).addTo(map).on('click',()=>{map.flyTo([e.latitude,e.longitude],15,{duration:.7});parent.postMessage({source:'apex-radar',eventId:e.id},'*')}).bindTooltip(e.title);L.marker([e.latitude,e.longitude],{icon:L.divIcon({className:'',html:'<div class="event-core"></div>',iconSize:[20,20],iconAnchor:[10,10]})}).addTo(map).on('click',()=>{map.flyTo([e.latitude,e.longitude],15,{duration:.7});parent.postMessage({source:'apex-radar',eventId:e.id},'*')});});const allPoints=[...drivers.map(d=>[d.latitude,d.longitude])${location ? `,[${location.latitude},${location.longitude}]` : ''}];if(${fitAll?'true':'false'}&&allPoints.length){map.fitBounds(allPoints,{padding:[42,42],maxZoom:12});}</script></body></html>`;
    return (
      <View style={styles.mapFrame}>
        {React.createElement('iframe', {
          key: `${mode}-${followRevision}-${fitAll}-${revealOrigin?.latitude.toFixed(4)||'none'}-${discoveries.length}-${rewards.length}-${drops.length}`,
          srcDoc: mapDocument.replace('</body>',worldOverlay.replace('t.unlocked?.16:.28','t.unlocked?0.16:0.28')+canvasFogOverlay+smoothFogOverlay+driveTraceOverlay+rewardReplayOverlay+routeFitOverlay+'</body>'),
          title: 'Apex Map',
          style: { width: '100%', height: '100%', border: 0 },
        })}
      </View>
    );
  }

  const routeFocused=routeCoordinates.length>1&&!focus;
  const allCoordinates=[...(routeFocused?routeCoordinates:location?[location]:[]),...drivers];
  const latitudes=allCoordinates.map(point=>point.latitude); const longitudes=allCoordinates.map(point=>point.longitude);
  const nativeCenter=(fitAll||routeFocused)&&allCoordinates.length?{latitude:(Math.min(...latitudes)+Math.max(...latitudes))/2,longitude:(Math.min(...longitudes)+Math.max(...longitudes))/2,latitudeDelta:Math.max(.04,(Math.max(...latitudes)-Math.min(...latitudes))*1.35),longitudeDelta:Math.max(.04,(Math.max(...longitudes)-Math.min(...longitudes))*1.35)}:{ latitude: focus?.latitude || location?.latitude || 20, longitude: focus?.longitude || location?.longitude || 0, latitudeDelta: focus ? 0.012 : location ? 0.04 : 90, longitudeDelta: focus ? 0.012 : location ? 0.04 : 90 };
  const shouldFollowLocation=followLocation??Boolean(focus&&location&&Math.abs(focus.latitude-location.latitude)<.000001&&Math.abs(focus.longitude-location.longitude)<.000001);
  useEffect(()=>{if(Platform.OS==='web'||!shouldFollowLocation||!location||!nativeMapRef.current)return;const previous=lastCameraLocation.current;const moved=!previous||Math.abs(previous.latitude-location.latitude)+Math.abs(previous.longitude-location.longitude)>.00012;if(!moved)return;lastCameraLocation.current={latitude:location.latitude,longitude:location.longitude};nativeMapRef.current.animateCamera({center:{latitude:location.latitude,longitude:location.longitude},zoom:17,pitch:42,heading:0},{duration:650});},[shouldFollowLocation,location?.latitude,location?.longitude]);
  return (
    <View style={styles.mapFrame}>
      <NativeMap
        ref={nativeMapRef}
        key={mode}
        style={StyleSheet.absoluteFill}
        mapType={mode === 'satellite' ? 'satellite' : 'standard'}
        customMapStyle={darkMapStyle}
        initialRegion={nativeCenter}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {location ? <NativeMarker coordinate={{ latitude: location.latitude, longitude: location.longitude }} anchor={{ x: .5, y: .5 }}><View style={styles.nativeSelfMarker}><View style={styles.nativeSelfPin}><View style={styles.nativeSelfCore} /></View><Text style={styles.nativeSelfLabel}>YOU // ACTIVE</Text></View></NativeMarker> : null}
        {revealOrigin ? <NativeCircle center={{latitude:revealOrigin.latitude,longitude:revealOrigin.longitude}} radius={16093.4} strokeColor="rgba(223,255,215,.28)" fillColor="rgba(167,229,154,.025)"/>:null}
        {drivers.map(driver => (
          <NativeMarker key={driver.id} coordinate={{ latitude: driver.latitude, longitude: driver.longitude }} onPress={() => onSelect(driver)}>
            <View style={[styles.nativePin, driver.mystery && styles.mysteryPin, !driver.isLive && styles.staleNativePin]}>
              <Text style={styles.nativePinText}>{driver.mystery ? '?' : driver.alias.slice(0, 1)}</Text>
            </View>
          </NativeMarker>
        ))}
        {events.map(event => <NativeCircle key={event.id} center={{ latitude: event.latitude, longitude: event.longitude }} radius={event.radiusM} strokeColor="rgba(145,185,133,.75)" fillColor="rgba(145,185,133,.12)" onPress={() => onSelectEvent(event)} />)}
        {discoveries.map((cell,index)=><NativeCircle key={`cell-${index}`} center={cell} radius={110} strokeColor="rgba(223,255,215,.18)" fillColor="rgba(223,255,215,.035)"/>)}
        {territories.map(item=><NativeCircle key={item.id} center={{latitude:item.latitude,longitude:item.longitude}} radius={item.radius_m} strokeColor={item.unlocked?'rgba(223,255,215,.85)':'rgba(120,128,121,.5)'} fillColor={item.unlocked?'rgba(145,185,133,.14)':'rgba(8,12,8,.28)'}/>)}
        {drops.map(item=><NativeMarker key={item.id} coordinate={{latitude:item.latitude,longitude:item.longitude}}><View style={styles.nativeTimedPin}><View style={[styles.nativeWorldPin,Boolean(item.claimed)&&styles.worldClaimed]}><Gift size={14} color={item.claimed?muted:accent}/></View><Text style={styles.nativeMapTimer}>{item.claimed?'CLAIMED':'OPEN'}</Text></View></NativeMarker>)}
        {rewards.map(item=>{const ghostCoin=/ghost/i.test(item.title),coin=ghostCoin?'#00F56A':'#2CFF83';return <NativeMarker key={item.id} coordinate={{latitude:item.latitude,longitude:item.longitude}} onPress={() => onSelectReward(item)}><View style={styles.nativeTimedPin}><View style={[styles.nativeRewardPin,{borderColor:coin,backgroundColor:ghostCoin?'#07351B':'#0A2A16'}]}><Text style={[styles.nativeRewardText,{color:coin}]}>GC</Text></View><Text style={styles.nativeMapTimer}>{Math.max(0,Math.ceil((Date.parse(item.expires_at)-Date.now())/60000))}M</Text></View></NativeMarker>;})}
        {safeHouses.map(item=><NativeMarker key={item.id} coordinate={{latitude:item.latitude,longitude:item.longitude}}><View style={styles.nativeTimedPin}><View style={styles.nativeWorldPin}><CarFront size={14} color={accent}/></View><Text style={styles.nativeMapTimer}>SAFE HOUSE</Text></View></NativeMarker>)}
        {reports.map(item=><NativeMarker key={item.id} coordinate={{latitude:item.latitude,longitude:item.longitude}}><View style={styles.nativeSafetyPin}><Text style={styles.nativeSafetyText}>{item.type==='closure'?'×':'!'}</Text></View></NativeMarker>)}
        {driveTrace.length > 1 ? <NativePolyline coordinates={driveTrace} strokeColor="#7DFF69" strokeWidth={5} /> : null}
        {routeCoordinates.length > 1 ? <><NativePolyline coordinates={routeCoordinates} strokeColor="rgba(245,255,242,.52)" strokeWidth={7} /><NativePolyline coordinates={routeCoordinates} strokeColor="#2CFF83" strokeWidth={4} /></> : null}
        {routeStops.map((stop,index)=><NativeMarker key={`route-stop-${index}`} coordinate={stop}><View style={styles.nativeRouteStop}><Text style={styles.nativeRouteStopText}>{index+1}</Text></View></NativeMarker>)}
        {ghostReplay&&ghostReplay.points.length>1?<NativePolyline coordinates={ghostReplay.points} strokeColor="#E7FFE1" strokeWidth={4} lineDashPattern={[4,9]}/>:null}
      </NativeMap>
    </View>
  );
}

function RadarScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const [selected, setSelected] = useState<Driver | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<LiveEvent | null>(null);
  const [selectedReward, setSelectedReward] = useState<MapReward | null>(null);
  const [selectedCrewId,setSelectedCrewId]=useState<string|null>(null);
  const [selectedReplayId,setSelectedReplayId]=useState<string|null>(null);
  const [ghostRaceStartedAt,setGhostRaceStartedAt]=useState<number|null>(null);
  const [mode, setMode] = useState<'street' | 'satellite'>('street');
  const [filter, setFilter] = useState<'drivers' | 'events' | 'crews' | 'ghosts'>('drivers');
  const [followRevision, setFollowRevision] = useState(0);
  const [fitAll, setFitAll] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [bountySignal,setBountySignal]=useState<any|null>(null);
  const [bountyCount,setBountyCount]=useState(0);
  const [destination, setDestination] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [favoriteDraft,setFavoriteDraft]=useState<{id?:string;name:string;latitude:number;longitude:number}|null>(null);
  const [favoriteLabel,setFavoriteLabel]=useState('');
  const [routeStops,setRouteStops]=useState<Array<{id:string;name:string;latitude:number;longitude:number;type:string}>>([]);
  const [alongPlaces,setAlongPlaces]=useState<Array<{id:string;name:string;latitude:number;longitude:number;type:string}>>([]);
  const [liveTrail,setLiveTrail]=useState<Array<{latitude:number;longitude:number}>>([]);
  const { location, revealOrigin, drivers: liveDrivers, events, cruises, route, navigationState, navigationStepIndex, navigationStopIndex, remainingDistanceKm, remainingDurationMinutes, savedPlaces, savedRoutes, suggestions, networkStatus, error, isDriving, unit, distanceKm, maxSpeedKph, shareMinutes, shareExpiresAt, driveTrace, lastDriveSummary, lockLocation, startDrive, stopDrive, startNavigation, endNavigation, recalculateRoute, toggleUnit, setShareMinutes, hideLocation, setRoute, setMultiStopRoute, setRouteToPoint, restoreRoute, createConvoy, joinConvoy, startConvoy, saveCurrentRoute, savePlace, renamePlace, deletePlace, deleteSavedRoute, suggestAddresses, clearDriveSummary, clearRoute } = useLiveNetworkStore();
  const {radarTargetId,setRadarTarget}=useContentStore();
  const {discoveries,crewDiscoveries,territories,drops,reports,rewards,ghostReplays,safeHouses,refresh:refreshWorld}=useWorldStore();
  const drivers = liveDrivers.map((driver: LiveDriver): Driver => ({
    id: driver.id, alias: driver.alias, car: driver.vehicle || 'VEHICLE PRIVATE', hp: null, record: driver.record,
    rank: driver.tier, distance: `${Math.round(driver.speedKph)} KPH`, mystery: driver.mystery,
    latitude: driver.latitude, longitude: driver.longitude, speedKph: driver.speedKph, cruiseId: driver.cruiseId, isLive: driver.isLive,
  }));
  const crewTracks=cruises.map(cruise=>{const members=drivers.filter(driver=>driver.cruiseId===cruise.id);if(!members.length)return null;return{id:cruise.id,title:cruise.title,members,latitude:members.reduce((sum,item)=>sum+item.latitude,0)/members.length,longitude:members.reduce((sum,item)=>sum+item.longitude,0)/members.length,status:cruise.status};}).filter(Boolean) as Array<{id:string;title:string;members:Driver[];latitude:number;longitude:number;status:string}>;
  const selectedCrew=crewTracks.find(crew=>crew.id===selectedCrewId)||null;
  const selectedReplay=ghostReplays.find(replay=>replay.sessionId===selectedReplayId)||null;
  const revealedCells=useMemo(()=>[...discoveries,...crewDiscoveries.map(point=>({...point,radiusM:420})),...liveTrail],[discoveries,crewDiscoveries,liveTrail]);
  const ghostProgress=useMemo(()=>{if(!selectedReplay||!location||!ghostRaceStartedAt)return null;let nearest=0,best=Infinity;selectedReplay.points.forEach((point,index)=>{const score=(point.latitude-location.latitude)**2+(point.longitude-location.longitude)**2;if(score<best){best=score;nearest=index;}});const point=selectedReplay.points[nearest],ghostElapsed=Date.parse(point.captured_at)-Date.parse(selectedReplay.startedAt),liveElapsed=Date.now()-ghostRaceStartedAt;return{progress:Math.round((nearest/Math.max(1,selectedReplay.points.length-1))*100),deltaSeconds:(liveElapsed-ghostElapsed)/1000};},[selectedReplay,location,ghostRaceStartedAt]);
  useEffect(() => { if (!location) lockLocation(); }, []);
  useEffect(()=>{void refreshWorld();const timer=setInterval(()=>void refreshWorld(),15000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{const refreshBounty=async()=>{try{const [activeData,wantedData]=await Promise.all([cloudflareApi.request<any>('/api/bounty/active'),cloudflareApi.request<any>('/api/bounty/most-wanted')]);setBountySignal(activeData?.session?activeData:null);setBountyCount((wantedData?.mostWanted||[]).length);}catch{setBountySignal(null);setBountyCount(0);}};void refreshBounty();const timer=setInterval(()=>void refreshBounty(),10000);return()=>clearInterval(timer);},[]);
  useEffect(()=>{if(!isDriving||!location)return;setLiveTrail(points=>{const last=points[points.length-1];if(last&&Math.abs(last.latitude-location.latitude)<.0007&&Math.abs(last.longitude-location.longitude)<.0007)return points;return[...points,{latitude:location.latitude,longitude:location.longitude}].slice(-400);});},[isDriving,location?.latitude,location?.longitude]);
  useEffect(() => { const timer=setTimeout(()=>void suggestAddresses(destination),280); return()=>clearTimeout(timer); }, [destination]);
  useEffect(()=>{if(!radarTargetId)return;const target=drivers.find(item=>item.id===radarTargetId);if(target){setSelected(target);setFitAll(false);setFollowRevision(value=>value+1);setRadarTarget(null);}},[radarTargetId,drivers.length]);
  useEffect(()=>{setSelected(current=>current?drivers.find(driver=>driver.id===current.id)||current:null);},[liveDrivers]);

  const recenter = async () => {
    await lockLocation();
    setSelected(null);
    setSelectedEvent(null);
    setSelectedCrewId(null);
    setSelectedReward(null);
    setSelectedReplayId(null);
    setFitAll(false);
    setFollowRevision(value => value + 1);
  };
  const submitRoute = async (target = destination) => {
    if (!target.trim()) return;
    setRouteLoading(true);
    const ready = await setRoute(target.trim());
    setRouteLoading(false);
    if (ready) { setRouteOpen(false); setFollowRevision(value => value + 1); }
  };
  const queueStop=(place:{id:string;name:string;latitude:number;longitude:number;type:string})=>{playInterfaceSound();setRouteStops(current=>current.some(item=>item.id===place.id)?current:[...current,place]);setAlongPlaces(current=>current.filter(item=>item.id!==place.id));setDestination('');};
  const selectDestination=async(place:{name:string;latitude:number;longitude:number})=>{setRouteLoading(true);const ready=await setRouteToPoint(place.name,place.latitude,place.longitude);setRouteLoading(false);if(ready){playInterfaceSound('drive');setDestination(place.name);setRouteOpen(false);setFollowRevision(value=>value+1);}};
  const moveStop=(index:number,direction:-1|1)=>setRouteStops(current=>{const target=index+direction;if(target<0||target>=current.length)return current;const next=[...current];[next[index],next[target]]=[next[target],next[index]];return next;});
  const buildItinerary=async()=>{if(!routeStops.length)return;setRouteLoading(true);const ready=await setMultiStopRoute(routeStops);setRouteLoading(false);if(ready){playInterfaceSound('drive');setRouteOpen(false);setAlongPlaces([]);setFollowRevision(value=>value+1);}};
  const saveFavorite=async()=>{if(!favoriteDraft)return;const label=favoriteLabel.trim()||favoriteDraft.name.split(',')[0];if(favoriteDraft.id){await renamePlace(favoriteDraft.id,label);setFavoriteDraft(null);setFavoriteLabel('');playInterfaceSound('unlock');return;}const saved=await savePlace({label,locationName:favoriteDraft.name,latitude:favoriteDraft.latitude,longitude:favoriteDraft.longitude});if(saved){setFavoriteDraft(null);setFavoriteLabel('');playInterfaceSound('unlock');}};
  const findAlongRoute=async(category:string)=>{if(!route)return;playInterfaceSound('toggle');setRouteLoading(true);try{const data=await cloudflareApi.request<{places:Array<{id:string;name:string;latitude:number;longitude:number;type:string}>}>('/api/route-places',{method:'POST',body:JSON.stringify({category,coordinates:route.coordinates})});setAlongPlaces(data.places||[]);setRouteOpen(true);}catch(reason){Alert.alert('Stop search failed',reason instanceof Error?reason.message:'Could not search this route.');}finally{setRouteLoading(false);}};
  const rsvpEvent = async () => {
    if (!selectedEvent) return;
    try {
      const result = await cloudflareApi.request<{ active: boolean; attendees: number }>(`/api/events/${selectedEvent.id}/rsvp`, { method: 'POST' });
      setSelectedEvent({ ...selectedEvent, attendees: result.attendees });
    } catch (error) {
      Alert.alert('RSVP failed', error instanceof Error ? error.message : 'Could not update RSVP.');
    }
  };
  const inviteToMeet=async()=>{if(!selected)return;const currentUserId=useContentStore.getState().userId;const meet=events.find(event=>event.hostId===currentUserId);if(!meet){Alert.alert('No hosted meet','Create a meet first, then you can invite this pilot directly from Map.');return;}try{const result=await cloudflareApi.request<{pilot:string;event:string}>(`/api/events/${meet.id}/invite`,{method:'POST',body:JSON.stringify({userId:selected.id})});Alert.alert('Invitation sent',`${result.pilot} was invited to ${result.event}.`);}catch(error){Alert.alert('Invite failed',error instanceof Error?error.message:'Could not invite this pilot.');}};
  const shownDrivers = filter === 'events'||filter==='ghosts' ? [] : filter === 'crews' ? drivers.filter(driver => driver.cruiseId) : drivers;
  const shownEvents = filter === 'ghosts' ? [] : events;
  const shownRewards = filter === 'ghosts' || filter === 'drivers' ? rewards : [];
  const cacheDistance = selectedReward && location ? Math.round(Math.sqrt((selectedReward.latitude - location.latitude) ** 2 + (selectedReward.longitude - location.longitude) ** 2) * 111_320) : null;
  const cacheMinutes = selectedReward ? Math.max(0, Math.ceil((Date.parse(selectedReward.expires_at) - Date.now()) / 60000)) : 0;
  const activeStep=route?.steps[navigationStepIndex]||null;
  const followingStep=route?.steps[navigationStepIndex+1]||null;
  const nextTurnKm=activeStep&&location?Math.max(0,Math.sqrt((activeStep.latitude-location.latitude)**2+(activeStep.longitude-location.longitude)**2)*111.32):0;
  const navDistance=remainingDistanceKm||route?.distanceKm||0;
  const navMinutes=Math.max(0,Math.ceil(remainingDurationMinutes||route?.durationMinutes||0));
  const navEta=new Date(Date.now()+navMinutes*60_000).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});
  const routeDistanceLabel=(kilometers:number)=>kilometers<.32?`${Math.max(50,Math.round(kilometers*3280.84/50)*50)} FT`:`${(kilometers*.621371).toFixed(kilometers<16?1:0)} MI`;
  const navTimeLabel=(minutes:number)=>minutes>=60?`${Math.floor(minutes/60)} HR ${minutes%60} MIN`:`${minutes} MIN`;

  return (
    <View style={styles.radarScreen}>
      <RadarMap location={location} revealOrigin={revealOrigin||location} mode={mode} onSelect={driver => { playInterfaceSound();setFitAll(false); setSelected(driver); setSelectedEvent(null);setSelectedReward(null);setSelectedCrewId(null);setSelectedReplayId(null); setFollowRevision(value => value + 1); }} onSelectEvent={event => { playInterfaceSound();setFitAll(false); setSelectedEvent(event); setSelected(null);setSelectedReward(null);setSelectedCrewId(null);setSelectedReplayId(null); setFollowRevision(value => value + 1); }} onSelectReward={reward => { playInterfaceSound('toggle'); setFitAll(false); setSelectedReward(reward); setSelected(null); setSelectedEvent(null); setSelectedCrewId(null); setSelectedReplayId(null); setFollowRevision(value => value + 1); }} drivers={shownDrivers} events={shownEvents} routeCoordinates={route?.coordinates || []} driveTrace={driveTrace} routeStops={route?.stops||[]} followRevision={followRevision} focus={navigationState==='navigating'&&location?{latitude:location.latitude,longitude:location.longitude}:selected ? { latitude: selected.latitude, longitude: selected.longitude } : selectedEvent ? { latitude: selectedEvent.latitude, longitude: selectedEvent.longitude } : selectedReward ? {latitude:selectedReward.latitude,longitude:selectedReward.longitude} : selectedCrew ? {latitude:selectedCrew.latitude,longitude:selectedCrew.longitude}:selectedReplay?.points[0]?{latitude:selectedReplay.points[0].latitude,longitude:selectedReplay.points[0].longitude}:null} fitAll={fitAll} discoveries={revealedCells} territories={territories} drops={drops} reports={reports} rewards={shownRewards} safeHouses={safeHouses} ghostReplay={selectedReplay} />
      <View style={styles.radarTopControls}>
        <View style={styles.segmentedControl}>
          {(['street', 'satellite'] as const).map(item => (
            <Pressable key={item} onPress={() => {playInterfaceSound('toggle');setMode(item);}} style={[styles.segment, mode === item && styles.segmentActive]}>
              <Text style={[styles.segmentText, mode === item && styles.segmentTextActive]}>{item.toUpperCase()}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={recenter} style={styles.locateButton}><Crosshair size={16} color={accent} /><Text style={styles.locateText}>{location ? 'CENTER ME' : 'LOCK ON'}</Text></Pressable>
      </View>
      <Pressable onPress={()=>{playInterfaceSound('toggle');setSelected(null);setSelectedEvent(null);setSelectedReward(null);setSelectedCrewId(null);setSelectedReplayId(null);setFitAll(true);setFollowRevision(value=>value+1);}} style={styles.networkPill}><Maximize2 size={13} color={accent}/><Text style={styles.networkPillText}>ALL PILOTS · {drivers.length} LOCATIONS / {drivers.filter(item=>item.isLive).length} LIVE</Text></Pressable>
      <View style={styles.radarFilters}>
        {(['drivers', 'events', 'crews','ghosts'] as const).map(item => (
          <Pressable key={item} onPress={() => {playInterfaceSound('toggle');setFilter(item);setSelected(null);setSelectedEvent(null);setSelectedReward(null);setSelectedCrewId(null);setSelectedReplayId(null);}} style={[styles.radarFilter, filter === item && styles.radarFilterActive]}>
            <Text style={[styles.radarFilterText, filter === item && styles.radarFilterTextActive]}>{item.toUpperCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radarRoster} style={styles.radarRosterViewport}>{filter==='drivers'?drivers.map(driver=><Pressable key={driver.id} onPress={()=>{playInterfaceSound();setSelected(driver);setSelectedEvent(null);setSelectedCrewId(null);setSelectedReplayId(null);setFitAll(false);setFollowRevision(value=>value+1);}} style={styles.radarRosterItem}><View style={[styles.rosterSignal,driver.isLive&&styles.rosterSignalLive]}/><View><Text style={styles.radarRosterTitle}>{driver.mystery?'UNKNOWN PILOT':driver.alias.toUpperCase()}</Text><Text style={styles.radarRosterMeta}>{driver.car} · {driver.distance}</Text></View></Pressable>):filter==='events'?events.map(event=><Pressable key={event.id} onPress={()=>{playInterfaceSound();setSelectedEvent(event);setSelected(null);setSelectedCrewId(null);setSelectedReplayId(null);setFitAll(false);setFollowRevision(value=>value+1);}} style={styles.radarRosterItem}><MapPin size={15} color={accent}/><View><Text style={styles.radarRosterTitle}>{event.title.toUpperCase()}</Text><Text style={styles.radarRosterMeta}>{event.attendees} GOING · {event.locationName}</Text></View></Pressable>):filter==='crews'?crewTracks.map(crew=><Pressable key={crew.id} onPress={()=>{playInterfaceSound();setSelectedCrewId(crew.id);setSelected(null);setSelectedEvent(null);setSelectedReplayId(null);setFitAll(false);setFollowRevision(value=>value+1);}} style={styles.radarRosterItem}><Users size={15} color={accent}/><View><Text style={styles.radarRosterTitle}>{crew.title.toUpperCase()}</Text><Text style={styles.radarRosterMeta}>{crew.members.length} TRACKED · {crew.status.toUpperCase()}</Text></View></Pressable>):ghostReplays.map(replay=><Pressable key={replay.sessionId} onPress={()=>{playInterfaceSound('drive');setSelectedReplayId(replay.sessionId);setSelected(null);setSelectedEvent(null);setSelectedCrewId(null);setFitAll(false);setFollowRevision(value=>value+1);}} style={styles.radarRosterItem}><Route size={15} color={accent}/><View><Text style={styles.radarRosterTitle}>{new Date(replay.startedAt).toLocaleDateString()} GHOST</Text><Text style={styles.radarRosterMeta}>{replay.distanceKm.toFixed(1)} KM · {Math.round(replay.maxSpeedKph)} KPH</Text></View></Pressable>)}</ScrollView>

      {selected ? (
        <GlassPanel style={styles.driverSheet} glow>
          <View style={styles.driverSheetHeader}>
            <View style={[styles.driverAvatar, selected.mystery && styles.mysteryAvatar]}><Text style={styles.driverAvatarText}>{selected.mystery ? '?' : selected.alias.slice(0, 2)}</Text></View>
            <View style={styles.driverIdentity}><Text style={styles.driverAlias}>{selected.alias}</Text><Text style={styles.driverCar}>{selected.car} · {selected.isLive?'LIVE NOW':'LAST KNOWN POSITION'}</Text></View>
            <Pressable onPress={() => { setSelected(null); setFollowRevision(value => value + 1); }} style={styles.closeButton}><X size={17} color={paper} /></Pressable>
          </View>
          <View style={styles.driverStats}>
            <View><Text style={styles.driverStatValue}>{selected.hp || '—'}</Text><Text style={styles.driverStatLabel}>HP</Text></View>
            <View><Text style={styles.driverStatValue}>{selected.record}</Text><Text style={styles.driverStatLabel}>RECORD</Text></View>
            <View><Text style={styles.driverStatValue}>{selected.distance}</Text><Text style={styles.driverStatLabel}>DISTANCE</Text></View>
            <RankBadge rank={selected.rank} compact />
          </View>
          <View style={styles.sheetActions}>
            <GlassButton label="CHALLENGE" icon={Swords} onPress={() => { useContentStore.getState().setChallengeTarget(selected.id); onTab('race'); }} active grow />
            <GlassButton label="ROUTE" icon={Navigation} onPress={() => void setRouteToPoint(selected.alias,selected.latitude,selected.longitude)} grow />
            <GlassButton label="INVITE" icon={CalendarDays} onPress={() => void inviteToMeet()} grow />
          </View>
        </GlassPanel>
      ) : selectedEvent ? (
        <GlassPanel style={styles.driverSheet} glow>
          <View style={styles.driverSheetHeader}><View style={styles.eventAvatar}><MapPin size={21} color={paper} /></View><View style={styles.driverIdentity}><Text style={styles.driverAlias}>{selectedEvent.title.toUpperCase()}</Text><Text style={styles.driverCar}>{selectedEvent.locationName}</Text></View><Pressable onPress={() => setSelectedEvent(null)} style={styles.closeButton}><X size={17} color={paper} /></Pressable></View>
          <View style={styles.driverStats}><View><Text style={styles.driverStatValue}>{selectedEvent.attendees}</Text><Text style={styles.driverStatLabel}>RSVP</Text></View><View><Text style={styles.driverStatValue}>{Math.round(selectedEvent.radiusM)} M</Text><Text style={styles.driverStatLabel}>EVENT ZONE</Text></View><View><Text style={styles.driverStatValue}>{new Date(selectedEvent.startTime).toLocaleDateString()}</Text><Text style={styles.driverStatLabel}>START</Text></View></View>
          <View style={styles.sheetActions}><GlassButton label="RSVP" icon={Check} onPress={() => void rsvpEvent()} active grow /><GlassButton label="ROUTE" icon={Navigation} onPress={() => { setDestination(selectedEvent.locationName); void submitRoute(selectedEvent.locationName); }} grow /><GlassButton label="DETAILS" icon={CalendarDays} onPress={() => Alert.alert(selectedEvent.title, `${selectedEvent.locationName}\n${new Date(selectedEvent.startTime).toLocaleString()}\n${selectedEvent.attendees} pilots attending`)} grow /></View>
        </GlassPanel>
      ) : selectedReward ? (
        <GlassPanel style={styles.driverSheet} glow>
          <View style={styles.driverSheetHeader}><View style={styles.cacheAvatar}><Gift size={21} color="#071009" /></View><View style={styles.driverIdentity}><Text style={styles.driverAlias}>{selectedReward.title.toUpperCase()}</Text><Text style={styles.driverCar}>GHOST CACHE // {selectedReward.claimed ? 'CLAIMED' : cacheMinutes > 0 ? 'AVAILABLE' : 'EXPIRED'}</Text></View><Pressable onPress={() => setSelectedReward(null)} style={styles.closeButton}><X size={17} color={paper} /></Pressable></View>
          <View style={styles.driverStats}><View><Text style={styles.driverStatValue}>+{Math.max(10, Math.floor(selectedReward.credits / 5))}</Text><Text style={styles.driverStatLabel}>GHOST CREDITS</Text></View><View><Text style={styles.driverStatValue}>+{selectedReward.credits}</Text><Text style={styles.driverStatLabel}>APEX CREDITS</Text></View><View><Text style={styles.driverStatValue}>{cacheDistance === null ? 'GPS' : cacheDistance < 1000 ? `${cacheDistance} M` : `${(cacheDistance / 1000).toFixed(1)} KM`}</Text><Text style={styles.driverStatLabel}>DISTANCE</Text></View></View>
          <View style={styles.cacheStatusRow}><Text style={styles.cacheStatus}>{cacheMinutes > 0 ? `EXPIRES // ${cacheMinutes} MIN` : 'SIGNAL EXPIRED'}</Text><Text style={styles.cacheEligibility}>{isDriving ? 'DRIVER MODE ACTIVE' : 'ENTER DRIVER MODE TO CLAIM'}</Text></View>
          <View style={styles.sheetActions}><GlassButton label={routeLoading?'ROUTING':isDriving ? 'DRIVE TO CACHE' : 'ROUTE TO CACHE'} icon={Navigation} onPress={() => { void (async()=>{setRouteLoading(true);const ready=await setRouteToPoint(selectedReward.title,selectedReward.latitude,selectedReward.longitude);if(ready){if(!isDriving)await startDrive();setSelectedReward(null);setFollowRevision(value=>value+1);}else Alert.alert('Cache route unavailable',useLiveNetworkStore.getState().error||'Choose another destination or retry in a moment.');setRouteLoading(false);})(); }} active grow /><GlassButton label="CLOSE" icon={X} onPress={() => setSelectedReward(null)} grow /></View>
        </GlassPanel>
      ) : selectedCrew ? (
        <GlassPanel style={styles.driverSheet} glow><View style={styles.driverSheetHeader}><View style={styles.eventAvatar}><Users size={21} color={paper}/></View><View style={styles.driverIdentity}><Text style={styles.driverAlias}>{selectedCrew.title.toUpperCase()}</Text><Text style={styles.driverCar}>{selectedCrew.members.length} LIVE MEMBERS · FOLLOWING CONVOY</Text></View><Pressable onPress={()=>setSelectedCrewId(null)} style={styles.closeButton}><X size={17} color={paper}/></Pressable></View><View style={styles.driverStats}><View><Text style={styles.driverStatValue}>{selectedCrew.members.length}</Text><Text style={styles.driverStatLabel}>TRACKED</Text></View><View><Text style={styles.driverStatValue}>{Math.round(Math.max(...selectedCrew.members.map(member=>member.speedKph||0)))}</Text><Text style={styles.driverStatLabel}>MAX KPH</Text></View><View><Text style={styles.driverStatValue}>{selectedCrew.status.toUpperCase()}</Text><Text style={styles.driverStatLabel}>STATUS</Text></View></View><View style={styles.sheetActions}><GlassButton label="JOIN ROUTE" icon={Navigation} onPress={()=>void joinConvoy(selectedCrew.id)} active grow/><GlassButton label="EXIT FOLLOW" icon={X} onPress={()=>setSelectedCrewId(null)} grow/></View></GlassPanel>
      ) : selectedReplay ? (
        <GlassPanel style={styles.driverSheet} glow><View style={styles.driverSheetHeader}><View style={styles.eventAvatar}><Route size={21} color={paper}/></View><View style={styles.driverIdentity}><Text style={styles.driverAlias}>GHOST COMPARISON</Text><Text style={styles.driverCar}>{new Date(selectedReplay.startedAt).toLocaleString()} · PRIVATE TRACE</Text></View><Pressable onPress={()=>{setSelectedReplayId(null);setGhostRaceStartedAt(null);}} style={styles.closeButton}><X size={17} color={paper}/></Pressable></View><View style={styles.driverStats}><View><Text style={styles.driverStatValue}>{ghostProgress?`${ghostProgress.deltaSeconds>=0?'+':''}${ghostProgress.deltaSeconds.toFixed(1)}S`:selectedReplay.distanceKm.toFixed(1)}</Text><Text style={styles.driverStatLabel}>{ghostProgress?'DELTA':'KM'}</Text></View><View><Text style={styles.driverStatValue}>{ghostProgress?`${ghostProgress.progress}%`:Math.round(selectedReplay.maxSpeedKph)}</Text><Text style={styles.driverStatLabel}>{ghostProgress?'PROGRESS':'MAX KPH'}</Text></View><View><Text style={styles.driverStatValue}>{selectedReplay.points.length}</Text><Text style={styles.driverStatLabel}>TRACE PTS</Text></View></View><View style={styles.sheetActions}><GlassButton label={ghostRaceStartedAt?'RESET GHOST':'RACE THIS GHOST'} icon={Play} onPress={()=>{playInterfaceSound('drive');setGhostRaceStartedAt(Date.now());if(!isDriving)void startDrive();setFollowRevision(value=>value+1);}} active grow/><GlassButton label="EXIT GHOST" icon={X} onPress={()=>{setSelectedReplayId(null);setGhostRaceStartedAt(null);}} grow/></View></GlassPanel>
      ) : (
        <GlassPanel style={styles.radarDock}>
          <Text style={styles.radarDockTitle}>MAP NETWORK ACTIVE</Text>
          <View style={styles.radarReadout}><Text style={styles.radarDockMeta}>{networkStatus.replace('_', ' ').toUpperCase()}</Text><Text style={styles.radarDockMeta}>{filter.toUpperCase()} CHANNEL</Text></View>
          {error ? <Text style={styles.networkError}>{error}</Text> : null}
          <Pressable onPress={()=>onTab('bounty')} style={styles.radarRewardBar}><Crosshair size={17} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{bountySignal?'BOUNTY SIGNAL ACTIVE':bountyCount?'MOST WANTED DETECTED':'BOUNTY NETWORK'}</Text><Text style={styles.commandMeta}>{bountySignal?.role==='hunter'?`${bountySignal.session.approxDistanceMiles??'—'} MI · ${bountySignal.session.approxDirection||'SEARCH ZONE UPDATING'} · APPROXIMATE SIGNAL`:bountySignal?'PRIVATE VENUE SESSION ACTIVE':bountyCount?`${bountyCount} PRIVACY-SAFE REGIONAL SIGNAL${bountyCount===1?'':'S'}`:'OPEN TO OPT IN, TRACK, OR VIEW YOUR RECORD'}</Text></View><ChevronRight size={16} color={accent}/></Pressable>
          {rewards.length?<View style={styles.radarRewardBar}><CircleDollarSign size={17} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{rewards.length} TIMED CACHE{rewards.length===1?'':'S'} ON GRID</Text><Text style={styles.commandMeta}>DRIVE INTO A COIN ZONE BEFORE THE SIGNAL EXPIRES</Text></View><Text style={styles.radarRewardTime}>{Math.max(0,Math.ceil((Math.min(...rewards.map(item=>Date.parse(item.expires_at)))-Date.now())/60000))}M</Text></View>:null}
          <View style={styles.shareTimer}><View style={styles.shareTimerTitle}><Text style={styles.eyebrow}>LOCATION VISIBILITY</Text><Text style={styles.shareTimerMeta}>{shareExpiresAt?`EXPIRES ${new Date(shareExpiresAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`:'NOT SHARING'}</Text></View><View style={styles.shareTimerOptions}>{[5,15,30,60].map(minutes=><Pressable key={minutes} onPress={()=>{playInterfaceSound('toggle');setShareMinutes(minutes);}} style={[styles.shareTimerOption,shareMinutes===minutes&&styles.shareTimerOptionActive]}><Text style={[styles.shareTimerOptionText,shareMinutes===minutes&&styles.shareTimerOptionTextActive]}>{minutes}M</Text></Pressable>)}<Pressable onPress={()=>{playInterfaceSound('toggle');void hideLocation();}} style={styles.ghostButton}><LockKeyhole size={12} color={paper}/><Text style={styles.ghostButtonText}>GHOST</Text></Pressable></View></View>
          {route ? <View style={styles.activeRoute}><Navigation size={15} color={accent} /><Pressable onPress={()=>{setRouteStops((route.stops||[]).map((stop,index)=>({id:`active-${index}`,type:'route',...stop})));setRouteOpen(true);}} style={styles.commandCopy}><Text numberOfLines={1} style={styles.activeRouteTitle}>{route.destination.toUpperCase()}</Text><Text style={styles.activeRouteMeta}>{navigationState==='navigating'?`${routeDistanceLabel(navDistance)} · ${navTimeLabel(navMinutes)} · ETA ${navEta}`:`${route.stops.length} STOP${route.stops.length===1?'':'S'} · ${routeDistanceLabel(route.distanceKm)} · ${navTimeLabel(Math.ceil(route.durationMinutes))}`}</Text></Pressable>{navigationState==='route_preview'?<Pressable onPress={()=>void startNavigation()} style={styles.routeStart}><Play size={13} color="#061008"/><Text style={styles.routeStartText}>START</Text></Pressable>:navigationState==='navigating'?<Pressable onPress={endNavigation} style={styles.routeClose}><X size={14} color={paper}/></Pressable>:<Pressable accessibilityLabel="Save route" onPress={()=>void saveCurrentRoute()} style={styles.routeClose}><Save size={14} color={accent}/></Pressable>}<Pressable onPress={clearRoute} style={styles.routeClose}><X size={14} color={paper} /></Pressable></View> : null}
          {route&&navigationState==='route_preview'?<View style={styles.previewLaunch}><Text style={styles.previewLaunchMeta}>{routeDistanceLabel(route.distanceKm)} · {navTimeLabel(Math.ceil(route.durationMinutes))} · ETA {navEta}</Text><GlassButton label="START NAVIGATION" icon={Navigation} onPress={()=>void startNavigation()} active grow/></View>:null}
          <View style={styles.driveDock}>
            <Pressable onPress={isDriving ? stopDrive : startDrive} style={[styles.driveEnter, isDriving && styles.driveEnterActive]}><Play size={16} color={isDriving ? accent : paper} /><Text style={styles.driveEnterText}>{isDriving ? 'END DRIVE' : 'ENTER DRIVE MODE'}</Text></Pressable>
            <Pressable onPress={() => setRouteOpen(value => !value)} style={styles.routeButton}><Navigation size={16} color={route ? accent : paper} /><Text style={styles.routeButtonText}>SET ROUTE</Text></Pressable>
            {isDriving ? <Pressable onPress={toggleUnit} style={styles.unitButton}><Text style={styles.unitText}>{unit.toUpperCase()}</Text></Pressable> : null}
          </View>
        </GlassPanel>
      )}
      {routeOpen && !selected && !selectedEvent && !selectedReplay ? <GlassPanel style={styles.routePanel} glow><ScrollView showsVerticalScrollIndicator={false} style={styles.routePlannerScroll}>
        <View style={styles.savedNavHeader}><Text style={styles.eyebrow}>ROUTE ITINERARY</Text><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={styles.sectionAction}>{routeStops.length} STOPS</Text><Pressable accessibilityLabel="Close route planner" onPress={()=>setRouteOpen(false)} style={styles.closeButton}><X size={15} color={paper}/></Pressable></View></View>
        {cruises.length?<View style={styles.convoyList}>{cruises.map(convoy=><View key={convoy.id} style={styles.convoyRouteRow}><Users size={17} color={convoy.joined?accent:paper}/><Pressable onPress={()=>{if(convoy.route)setRouteStops((convoy.route.stops||[]).map((stop,index)=>({id:`convoy-${convoy.id}-${index}`,type:'convoy',...stop})));}} style={styles.commandCopy}><Text numberOfLines={1} style={styles.commandTitle}>{convoy.title.toUpperCase()}</Text><Text numberOfLines={1} style={styles.commandMeta}>{convoy.memberCount}/{convoy.maxMembers} · {convoy.status.toUpperCase()} · {convoy.destinationName.toUpperCase()}</Text></Pressable>{convoy.hostId===useContentStore.getState().userId?<GlassButton label="LAUNCH" icon={Play} onPress={()=>void startConvoy(convoy.id)} active compact/>:<GlassButton label={convoy.joined?'JOINED':'JOIN'} icon={Check} onPress={()=>void joinConvoy(convoy.id)} active={!convoy.joined} compact/>}</View>)}</View>:null}
        {routeStops.map((stop,index)=><View key={stop.id} style={styles.itineraryStop}><View style={styles.itineraryIndex}><Text style={styles.itineraryIndexText}>{index+1}</Text></View><View style={styles.commandCopy}><Text numberOfLines={1} style={styles.commandTitle}>{stop.name.toUpperCase()}</Text><Text style={styles.commandMeta}>{index===routeStops.length-1?'FINAL DESTINATION':'WAYPOINT'}</Text></View><Pressable accessibilityLabel="Move stop up" onPress={()=>moveStop(index,-1)} style={styles.itineraryAction}><ChevronRight size={14} color={index?paper:muted} style={{transform:[{rotate:'-90deg'}]}}/></Pressable><Pressable accessibilityLabel="Move stop down" onPress={()=>moveStop(index,1)} style={styles.itineraryAction}><ChevronRight size={14} color={index<routeStops.length-1?paper:muted} style={{transform:[{rotate:'90deg'}]}}/></Pressable><Pressable accessibilityLabel="Remove stop" onPress={()=>setRouteStops(current=>current.filter((_,itemIndex)=>itemIndex!==index))} style={styles.itineraryAction}><X size={14} color={muted}/></Pressable></View>)}
        <View style={styles.routeComposer}><TextInput value={destination} onChangeText={setDestination} onSubmitEditing={() => void submitRoute()} placeholder="Search address or destination" placeholderTextColor={muted} style={styles.routeInput} autoFocus /><Pressable onPress={() => void submitRoute()} style={styles.routeSubmit}><Navigation size={17} color={accent} /><Text style={styles.routeSubmitText}>{routeLoading ? 'ROUTING' : 'GO'}</Text></Pressable></View>
        {error?<Text accessibilityRole="alert" style={styles.networkError}>{error.toUpperCase()}</Text>:null}
        {suggestions.length>0?<View style={styles.suggestionList}>{suggestions.slice(0,4).map(place=><View key={place.id} style={styles.suggestionRow}><Pressable style={styles.suggestionMain} onPress={()=>void selectDestination(place)}><MapPin size={14} color={accent}/><Text numberOfLines={2} style={styles.suggestionText}>{place.name}</Text></Pressable><Pressable accessibilityLabel="Add route stop" onPress={()=>queueStop(place)} style={styles.favoriteButton}><Plus size={15} color={accent}/></Pressable><Pressable accessibilityLabel="Favorite location" onPress={()=>{setFavoriteDraft(place);setFavoriteLabel(place.name.split(',')[0]);}} style={styles.favoriteButton}><Star size={15} color={accent}/></Pressable></View>)}</View>:null}
        {favoriteDraft?<View style={styles.favoriteNickname}><Text style={styles.eyebrow}>SAVE DESTINATION</Text><TextInput value={favoriteLabel} onChangeText={setFavoriteLabel} placeholder="Custom nickname" placeholderTextColor={muted} style={styles.routeInput}/><View style={styles.sheetActions}><GlassButton label="SAVE" icon={Star} onPress={()=>void saveFavorite()} active grow/><GlassButton label="CANCEL" icon={X} onPress={()=>setFavoriteDraft(null)} grow/></View></View>:null}
        {routeStops.length?<GlassButton label={routeLoading?'BUILDING ROUTE':`ROUTE ${routeStops.length} STOP${routeStops.length===1?'':'S'}`} icon={Route} onPress={()=>void buildItinerary()} active/>:null}
        {route?.steps.length?<><View style={styles.savedNavHeader}><Text style={styles.eyebrow}>TURN DIRECTIONS</Text><Text style={styles.sectionAction}>{route.steps.length} STEPS</Text></View><View style={styles.directionList}>{route.steps.map((step,index)=><View key={`${step.legIndex}-${index}`} style={[styles.directionRow,navigationState==='navigating'&&index===navigationStepIndex&&styles.directionRowActive]}><Text style={styles.directionIndex}>{index+1}</Text><View style={styles.commandCopy}><Text numberOfLines={2} style={styles.directionInstruction}>{step.instruction.toUpperCase()}</Text><Text style={styles.commandMeta}>{step.name.toUpperCase()}</Text></View><Text style={styles.directionDistance}>{routeDistanceLabel(step.distanceM/1000)}</Text></View>)}</View></>:null}
        {route?<><View style={styles.savedNavHeader}><Text style={styles.eyebrow}>CONVOY ROUTE</Text><Text style={styles.sectionAction}>SHARED GPS</Text></View><GlassButton label="OPEN CONVOY" icon={Users} onPress={async()=>{const ok=await createConvoy(`CONVOY TO ${route.destination.split(',')[0]}`,new Date(Date.now()+15*60000).toISOString());if(ok){Alert.alert('Convoy opened','The shared route is live for pilots to join.');setRouteOpen(false);}}} active/><View style={styles.savedNavHeader}><Text style={styles.eyebrow}>FIND ALONG ACTIVE ROUTE</Text><Text style={styles.sectionAction}>LIVE PLACES</Text></View><View style={styles.routeCategoryRow}>{['fuel','food','parking','service'].map(category=><Pressable key={category} onPress={()=>void findAlongRoute(category)} style={styles.routeCategory}><Text style={styles.routeCategoryText}>{category.toUpperCase()}</Text></Pressable>)}</View>{alongPlaces.length?<View style={styles.suggestionList}>{alongPlaces.slice(0,8).map(place=><View key={place.id} style={styles.suggestionRow}><Pressable style={styles.suggestionMain} onPress={()=>queueStop(place)}><Plus size={14} color={accent}/><Text numberOfLines={2} style={styles.suggestionText}>{place.name}</Text></Pressable></View>)}</View>:null}</>:null}
        <View style={styles.savedNavHeader}><Text style={styles.eyebrow}>FAVORITES</Text>{location?<Pressable onPress={()=>void savePlace({label:'CURRENT POSITION',locationName:`${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`,latitude:location.latitude,longitude:location.longitude})}><Text style={styles.sectionAction}>SAVE CURRENT</Text></Pressable>:null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedNavRail}>{savedPlaces.map(place=><View key={place.id} style={styles.savedNavChip}><Pressable style={styles.savedNavMain} onPress={()=>void selectDestination({name:place.location_name,latitude:Number(place.latitude),longitude:Number(place.longitude)})}><Star size={13} color={accent}/><Text numberOfLines={1} style={styles.savedNavText}>{place.label.toUpperCase()}</Text></Pressable><Pressable onPress={()=>{setFavoriteDraft({id:place.id,name:place.location_name,latitude:Number(place.latitude),longitude:Number(place.longitude)});setFavoriteLabel(place.label);}}><Edit3 size={12} color={muted}/></Pressable><Pressable onPress={()=>void deletePlace(place.id)}><X size={12} color={muted}/></Pressable></View>)}{!savedPlaces.length?<Text style={styles.savedNavEmpty}>STAR A RESULT TO SAVE IT</Text>:null}</ScrollView>
        {savedRoutes.length?<><View style={styles.savedNavHeader}><Text style={styles.eyebrow}>SAVED ROUTES</Text><Text style={styles.sectionAction}>{savedRoutes.length}</Text></View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.savedNavRail}>{savedRoutes.map(item=><View key={item.id} style={styles.savedNavChip}><Pressable style={styles.savedNavMain} onPress={()=>{restoreRoute(item);setRouteOpen(false);setFollowRevision(value=>value+1);}}><Route size={13} color={paper}/><View><Text numberOfLines={1} style={styles.savedNavText}>{item.name.toUpperCase()}</Text><Text style={styles.savedNavMeta}>{Number(item.distance_km).toFixed(1)} KM</Text></View></Pressable><Pressable onPress={()=>void deleteSavedRoute(item.id)}><X size={12} color={muted}/></Pressable></View>)}</ScrollView></>:null}
      </ScrollView></GlassPanel> : null}
      {navigationState==='arrived'&&route?<GlassPanel style={styles.arrivalSheet} glow><Text style={styles.eyebrow}>ROUTE COMPLETE</Text><Text style={styles.arrivalTitle}>ARRIVED</Text><Text numberOfLines={2} style={styles.arrivalDestination}>{route.destination.toUpperCase()}</Text><View style={styles.sheetActions}><GlassButton label="KEEP DRIVING" icon={Play} onPress={endNavigation} active grow/><GlassButton label="CLEAR ROUTE" icon={X} onPress={clearRoute} grow/></View></GlassPanel>:null}
      {navigationState==='navigating'&&route?<><View pointerEvents="none" style={styles.navigationTop}><Text style={styles.navigationManeuver}>{activeStep?.instruction.toUpperCase()||'CONTINUE ON ROUTE'}</Text><Text numberOfLines={1} style={styles.navigationRoad}>{activeStep?.name.toUpperCase()||route.destination.toUpperCase()}</Text><Text style={styles.navigationDistance}>{routeDistanceLabel(nextTurnKm)}</Text>{followingStep?<Text numberOfLines={1} style={styles.navigationThen}>THEN {followingStep.instruction.toUpperCase()}</Text>:null}</View><View style={styles.navigationBottom}><View><Text style={styles.navigationTime}>{navTimeLabel(navMinutes)}</Text><Text style={styles.navigationLabel}>REMAINING</Text></View><View><Text style={styles.navigationStat}>{routeDistanceLabel(navDistance)}</Text><Text style={styles.navigationLabel}>DISTANCE</Text></View><View><Text style={styles.navigationStat}>{navEta}</Text><Text style={styles.navigationLabel}>ETA</Text></View><Pressable onPress={endNavigation} style={styles.navigationEnd}><Text style={styles.navigationEndText}>END</Text></Pressable></View></>:null}
      {isDriving&&navigationState!=='navigating' ? <View pointerEvents="none" style={styles.driveHud}><Text style={styles.driveSpeed}>{Math.round(unit === 'mph' ? (location?.speedKph || 0) * .621371 : location?.speedKph || 0)}</Text><Text style={styles.driveUnit}>{unit.toUpperCase()}</Text><Text style={styles.driveMeta}>{distanceKm.toFixed(2)} KM · MAX {Math.round(maxSpeedKph * (unit === 'mph' ? .621371 : 1))}</Text></View> : null}
      {!isDriving&&lastDriveSummary&&!selected&&!selectedEvent?<GlassPanel style={styles.driveSummary} glow><View style={styles.driverSheetHeader}><View><Text style={styles.eyebrow}>DRIVE SECURED</Text><Text style={styles.commandTitle}>SESSION SUMMARY</Text></View><Pressable onPress={clearDriveSummary} style={styles.closeButton}><X size={16} color={paper}/></Pressable></View><View style={styles.driverStats}><View><Text style={styles.driverStatValue}>{lastDriveSummary.distanceKm.toFixed(2)}</Text><Text style={styles.driverStatLabel}>KM</Text></View><View><Text style={styles.driverStatValue}>{Math.round(lastDriveSummary.maxSpeedKph)}</Text><Text style={styles.driverStatLabel}>MAX KPH</Text></View><View><Text style={styles.driverStatValue}>{Math.floor(lastDriveSummary.durationSeconds/60)}M</Text><Text style={styles.driverStatLabel}>DRIVE TIME</Text></View><View><Text style={styles.driverStatValue}>{Math.round(lastDriveSummary.weeklyTopSpeedKph)}</Text><Text style={styles.driverStatLabel}>WEEK TOP</Text></View></View><Text style={styles.commandMeta}>{lastDriveSummary.points.length} GPS TRACE POINTS · YOUR ROUTE REMAINS DRAWN ON MAP</Text></GlassPanel>:null}
    </View>
  );
}

function FeedScreen({onTab}:{onTab:(tab:TabKey)=>void}) {
  const { posts, loading, error, userId, toggleLike, toggleSave, toggleFollow, addComment, createPost, loadFeed, setRadarTarget } = useContentStore();
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [draftType, setDraftType] = useState<'photo' | 'video'>('photo');
  const [caption, setCaption] = useState('');
  const [commenting, setCommenting] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [activeIndex,setActiveIndex]=useState(0);
  const [videoMuted,setVideoMuted]=useState(true);
  const feedPageHeight=Math.max(540,Dimensions.get('window').height-132);

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
    <View style={styles.feedScreen}>
        <View style={[styles.feedFloatingHeader,screenWidth<520&&styles.feedFloatingHeaderCompact]}>
        <View><Text style={styles.eyebrow}>ENCRYPTED SOCIAL</Text><Text style={styles.feedTitle}>THE CURRENT</Text></View>
        <View style={styles.feedHeaderActions}><GlassButton label="CREWS" icon={Users} compact onPress={()=>onTab('crews')}/><GlassButton label="COMMS" icon={MessagesSquare} compact onPress={()=>onTab('messages')}/><GlassButton label="POST" icon={Plus} compact onPress={() => setComposerOpen(value => !value)} active /></View>
      </View>
      {composerOpen ? <View style={styles.feedComposerOverlay}><GlassPanel style={styles.composerPanel} glow><Pressable onPress={pickMedia} style={styles.mediaPicker}>{draftUri ? <Image source={{ uri: draftUri }} style={styles.composerPreview} /> : <><Plus size={24} color={accent} /><Text style={styles.composerHint}>SELECT PHOTO OR VIDEO</Text></>}</Pressable><TextInput value={caption} onChangeText={setCaption} placeholder="Caption your run, build, or meet" placeholderTextColor={muted} style={styles.composerInput} multiline maxLength={1200} /><View style={styles.composerActions}><GlassButton label="CANCEL" icon={X} compact onPress={() => setComposerOpen(false)} /><GlassButton label={loading ? 'UPLOADING' : 'PUBLISH'} icon={Send} compact onPress={publish} active /></View></GlassPanel></View> : null}
      {!userId ? <GlassPanel style={styles.emptyState}><LockKeyhole size={28} color={accent} /><Text style={styles.emptyTitle}>LIVE FEED REQUIRES SIGN-IN</Text></GlassPanel> : null}
      {error ? <Pressable onPress={loadFeed} style={styles.inlineError}><Text style={styles.networkError}>{error}</Text><Text style={styles.sectionAction}>RETRY</Text></Pressable> : null}
      {userId&&posts.length?<ScrollView showsVerticalScrollIndicator={false} pagingEnabled snapToInterval={feedPageHeight} decelerationRate="fast" onMomentumScrollEnd={event=>setActiveIndex(Math.round(event.nativeEvent.contentOffset.y/feedPageHeight))}>{posts.map((post,index)=><View key={post.id} style={[styles.feedPage,{height:feedPageHeight}]}>
        <View style={styles.feedMedia}>{post.videoUrl?<FeedVideo uri={post.videoUrl} active={activeIndex===index} muted={videoMuted}/>:<Image source={{uri:post.mediaUrl}} style={StyleSheet.absoluteFill} resizeMode="cover"/>}<LinearGradient pointerEvents="none" colors={['rgba(0,0,0,.05)','rgba(0,0,0,.08)','rgba(0,0,0,.88)']} style={StyleSheet.absoluteFill}/></View>
        <View style={styles.feedCreator}>{post.avatarUrl?<Image source={{uri:post.avatarUrl}} style={styles.postAvatar}/>:<View style={styles.postAvatar}><Text style={styles.postAvatarText}>{post.alias.slice(0,1)}</Text></View>}<View style={styles.commandCopy}><Text style={styles.postAlias}>@{post.alias}</Text><Text style={styles.postMeta}>{new Date(post.createdAt).toLocaleString()}</Text></View>{post.userId!==userId?<Pressable onPress={()=>{playInterfaceSound();void toggleFollow(post.userId);}} style={[styles.followButton,post.following&&styles.followButtonActive]}><Text style={styles.followText}>{post.following?'FOLLOWING':'FOLLOW'}</Text></Pressable>:null}</View>
        <Text style={styles.feedCaption}>{post.caption||'Untitled transmission'}</Text>
        <View style={styles.feedActionRail}><Pressable onPress={()=>{playInterfaceSound();void toggleLike(post.id);}} style={styles.feedAction}><Heart size={25} color={post.liked?accent:paper} fill={post.liked?accent:'transparent'}/><Text style={styles.feedActionCount}>{post.likes}</Text></Pressable><Pressable onPress={()=>{playInterfaceSound();setCommenting(commenting===post.id?null:post.id);}} style={styles.feedAction}><MessageCircle size={25} color={paper}/><Text style={styles.feedActionCount}>{post.comments}</Text></Pressable><Pressable onPress={()=>{playInterfaceSound();void toggleSave(post.id);}} style={styles.feedAction}><Bookmark size={24} color={post.saved?accent:paper} fill={post.saved?accent:'transparent'}/></Pressable><Pressable onPress={()=>{playInterfaceSound('toggle');setRadarTarget(post.userId);onTab('radar');}} style={styles.feedAction}><MapPin size={24} color={paper}/><Text style={styles.feedActionLabel}>MAP</Text></Pressable>{post.videoUrl?<Pressable onPress={()=>{playInterfaceSound('toggle');setVideoMuted(value=>!value);}} style={styles.feedAction}>{videoMuted?<VolumeX size={23} color={paper}/>:<Volume2 size={23} color={accent}/>}</Pressable>:null}</View>
        {commenting===post.id?<View style={styles.feedCommentComposer}><TextInput value={comment} onChangeText={setComment} placeholder="Add a comment" placeholderTextColor={muted} style={styles.commentInput} maxLength={500}/><Pressable onPress={async()=>{if(await addComment(post.id,comment)){setComment('');setCommenting(null);}}}><Send size={19} color={accent}/></Pressable></View>:null}
      </View>)}</ScrollView>:null}
      {userId&&!loading&&!posts.length?<GlassPanel style={styles.emptyState}><Radio size={28} color={accent}/><Text style={styles.emptyTitle}>NO TRANSMISSIONS YET</Text><Text style={styles.emptyCopy}>Post the first photo or video to this network.</Text></GlassPanel>:null}
    </View>
  );
}

function ShopScreen() {
  const { vehicles, activeVehicleId, products, providers, loading, error, setActiveVehicle, searchParts } = useContentStore();
  const [query, setQuery] = useState('performance parts');
  const [saved, setSaved] = useState<string[]>([]);
  const activeVehicle = vehicles.find(vehicle => vehicle.id === activeVehicleId);
  const syncPart=async(product:any)=>{if(!activeVehicleId)return Alert.alert('Vehicle required','Select a garage vehicle before syncing a part.');try{await cloudflareApi.request(`/api/vehicles/${activeVehicleId}/wishlist`,{method:'POST',body:JSON.stringify({part:product.title,brand:product.seller||product.provider,category:'Marketplace',price:product.price,url:product.purchaseUrl,priority:'MEDIUM',notes:`${product.compatibility} · ${product.provider}`})});setSaved(current=>current.includes(product.id)?current:[...current,product.id]);playInterfaceSound('unlock');}catch(error){Alert.alert('Mod sync failed',error instanceof Error?error.message:'Could not save this part.');}};
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.shopHeader}><View><Text style={styles.eyebrow}>LIVE PROVIDER MARKET</Text><Text style={styles.feedTitle}>PARTS VAULT</Text></View><ShoppingBag size={23} color={paper} /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vehicleSelector}>{vehicles.map(vehicle => <Pressable key={vehicle.id} onPress={() => {playInterfaceSound('toggle');setActiveVehicle(vehicle.id);}} style={[styles.vehicleOption, vehicle.id === activeVehicleId && styles.vehicleOptionActive]}><CarFront size={17} color={vehicle.id === activeVehicleId ? accent : muted} /><View><Text style={styles.vehicleName}>{vehicle.nickname.toUpperCase()}</Text><Text style={styles.vehicleMeta}>{vehicle.year} {vehicle.make} {vehicle.model}</Text></View>{vehicle.id === activeVehicleId ? <Check size={16} color={accent} /> : null}</Pressable>)}</ScrollView>
      <View style={styles.fitmentBanner}><PackageCheck size={21} color={accent} /><View style={styles.commandCopy}><Text style={styles.commandTitle}>{activeVehicle ? 'STRICT FITMENT ENABLED' : 'VEHICLE REQUIRED'}</Text><Text style={styles.commandMeta}>{activeVehicle ? `${activeVehicle.year} · ${activeVehicle.make} · ${activeVehicle.model} · ${activeVehicle.trim || 'TRIM NOT SET'} · ${activeVehicle.engine}` : 'Add a complete vehicle profile before searching inventory.'}</Text></View><ListFilter size={17} color={muted} /></View>
      <View style={styles.partsSearch}><TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => searchParts(query)} placeholder="Exhaust, brakes, intake..." placeholderTextColor={muted} style={styles.partsSearchInput} /><Pressable onPress={() => searchParts(query)} style={styles.partsSearchButton}><ScanLine size={19} color={accent} /></Pressable></View>
      {providers.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.providerRail}>{providers.map(provider => <Pressable key={provider.name} onPress={() => provider.url && Linking.openURL(provider.url)} style={styles.providerChip}><View style={[styles.providerDot, provider.mode === 'live' && styles.providerDotLive]} /><Text style={styles.providerName}>{provider.name.toUpperCase()}</Text><Text style={styles.providerMode}>{provider.mode.replace('_', ' ').toUpperCase()}</Text></Pressable>)}</ScrollView> : null}
      {loading ? <GlassPanel style={styles.emptyState}><Activity size={26} color={accent} /><Text style={styles.emptyTitle}>QUERYING PROVIDERS</Text></GlassPanel> : null}
      {error ? <View style={styles.inlineError}><Text style={styles.networkError}>{error}</Text></View> : null}
      {!loading && !error && products.length === 0 ? <GlassPanel style={styles.emptyFitment}><ScanLine size={34} color={accent} /><Text style={styles.emptyTitle}>SEARCH LIVE INVENTORY</Text><Text style={styles.emptyCopy}>Results are returned directly by configured providers. No catalog samples or generated products are shown.</Text></GlassPanel> : null}
      {products.map(product => <View key={product.id} style={styles.productCard}>{product.imageUrl ? <Image source={{ uri: product.imageUrl }} style={styles.productImage} /> : <View style={[styles.productImage, styles.productImageMissing]}><ShoppingBag size={30} color={muted} /></View>}<View style={styles.productBody}><View style={styles.confirmedFit}><BadgeCheck size={13} color={accent} /><Text style={styles.confirmedFitText}>{product.compatibility.replace('_', ' ')} / {product.provider.toUpperCase()}</Text></View><Text style={styles.productName}>{product.title}</Text><Text style={styles.productMeta}>{product.seller || 'SELLER'} · {product.condition || 'CONDITION N/A'}{product.shipping ? ` · ${product.shipping}` : ''}</Text><View style={styles.productBottom}><Text style={styles.productPrice}>{product.currency} {product.price.toLocaleString()}</Text><View style={styles.productActions}><Pressable accessibilityLabel="Sync part to garage" onPress={() => void syncPart(product)} style={styles.productIconButton}><Bookmark size={18} color={saved.includes(product.id) ? accent : paper} fill={saved.includes(product.id) ? accent : 'transparent'} /></Pressable><Pressable onPress={() => Linking.openURL(product.purchaseUrl)} style={styles.addToCart}><ShoppingBag size={17} color={paper} /><Text style={styles.addToCartText}>VIEW</Text></Pressable></View></View></View></View>)}
    </ScrollView>
  );
}

function MoreScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const networkStatus = useLiveNetworkStore(state => state.networkStatus);
  const location = useLiveNetworkStore(state => state.location);
  const userId = useContentStore(state => state.userId);
  const isDeveloper = useContentStore(state => Boolean(state.profile?.isDeveloper));
  const modules: { tab: TabKey; label: string; meta: string; icon: IconType }[] = [
    { tab: 'world', label: 'WORLD DISCOVERY', meta: 'Safe Houses, drops, contracts, districts', icon: Map },
    { tab: 'season', label: 'SEASON HUB', meta: 'Current season and journeys', icon: Crown },
    { tab: 'crews', label: 'CREW NETWORK', meta: 'Members, approvals and territory', icon: Users },
    { tab: 'achievements', label: 'ACHIEVEMENTS', meta: 'Earned badges and progression', icon: BadgeCheck },
    { tab: 'bounty', label: 'BOUNTY NETWORK', meta: 'Opt-in venue sessions and Most Wanted', icon: Crosshair },
    { tab: 'race', label: 'RACE CONTROL', meta: 'Stage, track, spectate', icon: Swords }, { tab: 'meets', label: 'MEETS', meta: 'Routes and live locations', icon: MapPin },
    { tab: 'shop', label: 'GHOST SHOP', meta: 'Spend GC on digital cosmetics', icon: ShoppingBag }, { tab: 'parts', label: 'VEHICLE PARTS', meta: 'Live inventory matched to your build', icon: PackageCheck }, { tab: 'leaderboard', label: 'RANKINGS', meta: 'Season tiers and records', icon: Trophy },
    { tab: 'feed', label: 'SOCIAL', meta: 'Vertical feed, follows and posts', icon: Users }, { tab: 'messages', label: 'COMMS', meta: 'Groups and direct messages', icon: MessagesSquare },
    {tab:'access',label:isDeveloper?'ACCESS CONTROL':'INVITE NETWORK',meta:isDeveloper?'Codes, limits, new pilots':'Issue codes to trusted pilots',icon:LockKeyhole},
  ];
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.moreHeader}><Text style={styles.eyebrow}>PILOT SYSTEMS</Text><Text style={styles.feedTitle}>ACCESS GRID</Text><Text style={styles.moreCopy}>All network tools. One encrypted identity.</Text></View><View style={styles.moduleGrid}>{modules.map(module => { const Icon = module.icon; return <Pressable key={module.tab} onPress={() => onTab(module.tab)} style={({ pressed }) => [styles.moduleCard, pressed && styles.pressed]}><View style={styles.moduleIcon}><Icon size={23} color={accent} /></View><Text style={styles.moduleTitle}>{module.label}</Text><Text style={styles.moduleMeta}>{module.meta}</Text><ChevronRight size={17} color={muted} style={styles.moduleChevron} /></Pressable>; })}</View><SectionTitle label="NETWORK HEALTH" /><GlassPanel><View style={styles.healthRow}><Text style={styles.identityLabel}>GPS PROOF</Text><Text style={location ? styles.healthGood : styles.healthOffline}>{location ? 'LOCKED' : 'NOT GRANTED'}</Text></View><View style={styles.identityDivider} /><View style={styles.healthRow}><Text style={styles.identityLabel}>ENCRYPTED COMMS</Text><Text style={userId ? styles.healthGood : styles.healthOffline}>{userId ? 'LIVE' : 'SIGN IN REQUIRED'}</Text></View><View style={styles.identityDivider} /><View style={styles.healthRow}><Text style={styles.identityLabel}>LIVE NETWORK</Text><Text style={networkStatus === 'live' ? styles.healthGood : styles.healthOffline}>{networkStatus.replace('_', ' ').toUpperCase()}</Text></View></GlassPanel></ScrollView>;
}

type ApexSettings={unit_preference:'MPH'|'KMH';meet_notif_radius_miles:number;meet_notifs_enabled:number;convoy_radio_enabled:number;season_notifs_enabled:number;public_performance_visibility:number;public_race_records:number;apex_id_visibility:number;cotw_notifs_enabled:number;mod_sync_enabled:number;mod_price_alerts_enabled:number};
const LOCAL_SETTINGS_KEY='apex.local.settings';

function LegacySettingsScreen(){
  const [settings,setSettings]=useState<ApexSettings|null>(null);const [apexId,setApexId]=useState('');const [audio,setAudio]=useState(true);const [haptics,setHaptics]=useState(true);const [bounty,setBounty]=useState(false);const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');
  const load=async()=>{setBusy(true);try{const [data,bountyData,local]=await Promise.all([cloudflareApi.request<{settings:ApexSettings;apexId:string}>('/api/settings'),cloudflareApi.request<{settings:{bountyModeEnabled:boolean}}>('/api/bounty/settings'),AsyncStorage.getItem(LOCAL_SETTINGS_KEY)]);setSettings(data.settings);setApexId(data.apexId);setBounty(bountyData.settings.bountyModeEnabled);if(local){try{const parsed=JSON.parse(local),nextAudio=parsed.audio!==false,nextHaptics=parsed.haptics!==false;setAudio(nextAudio);setHaptics(nextHaptics);setInterfaceAudioEnabled(nextAudio);setHapticsEnabled(nextHaptics);}catch{await AsyncStorage.removeItem(LOCAL_SETTINGS_KEY);}}setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Settings unavailable.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const update=(key:keyof ApexSettings,value:string|number)=>setSettings(current=>current?{...current,[key]:value}:current);
  const save=async()=>{if(!settings||busy)return;setBusy(true);try{await Promise.all([cloudflareApi.request('/api/settings',{method:'PUT',body:JSON.stringify(settings)}),cloudflareApi.request('/api/bounty/settings',{method:'PUT',body:JSON.stringify({bountyModeEnabled:bounty,agreed:bounty,notificationsEnabled:true,showPublicPhoto:true,allowMostWanted:true})}),AsyncStorage.setItem(LOCAL_SETTINGS_KEY,JSON.stringify({audio,haptics}))]);setInterfaceAudioEnabled(audio);setHapticsEnabled(haptics);const liveUnit=useLiveNetworkStore.getState().unit.toUpperCase();if((settings.unit_preference==='KMH'?'KPH':'MPH')!==liveUnit)useLiveNetworkStore.getState().toggleUnit();playInterfaceSound('unlock');setStatus('SETTINGS SECURED');}catch(error){setStatus(error instanceof Error?error.message:'Settings could not be saved.');}finally{setBusy(false);}};
  const row=(label:string,key:keyof ApexSettings)=><View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{label}</Text></View><Switch value={Boolean(settings?.[key])} onValueChange={value=>update(key,value?1:0)} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={Boolean(settings?.[key])?accent:'#D5D9D5'}/></View>;
  if(!settings)return <ScrollView contentContainerStyle={styles.screenContent}><GlassPanel style={styles.emptyState}><Settings size={28} color={accent}/><Text style={styles.emptyTitle}>{busy?'DECRYPTING SETTINGS':'SETTINGS UNAVAILABLE'}</Text>{status?<Text style={styles.networkError}>{status}</Text>:null}<GlassButton label="RETRY" icon={Radio} onPress={()=>void load()} compact/></GlassPanel></ScrollView>;
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>PILOT CONTROL</Text><Text style={styles.feedTitle}>SETTINGS</Text></View><Settings size={27} color={paper}/></View><SectionTitle label="GENERAL"/><GlassPanel><View style={styles.healthRow}><Text style={styles.commandTitle}>SPEED UNITS</Text><View style={styles.durationRow}>{(['MPH','KMH'] as const).map(unit=><Pressable key={unit} onPress={()=>update('unit_preference',unit)} style={[styles.durationChoice,settings.unit_preference===unit&&styles.durationChoiceActive]}><Text style={[styles.segmentText,settings.unit_preference===unit&&styles.segmentTextActive]}>{unit==='KMH'?'KM/H':unit}</Text></Pressable>)}</View></View><View style={styles.identityDivider}/><View style={styles.healthRow}><Text style={styles.commandTitle}>AUDIO</Text><Switch value={audio} onValueChange={value=>{setAudio(value);setInterfaceAudioEnabled(value);}} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={audio?accent:'#D5D9D5'}/></View><View style={styles.identityDivider}/><View style={styles.healthRow}><Text style={styles.commandTitle}>HAPTIC FEEDBACK</Text><Switch value={haptics} onValueChange={value=>{setHaptics(value);setHapticsEnabled(value);}} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={haptics?accent:'#D5D9D5'}/></View></GlassPanel><SectionTitle label="NOTIFICATIONS"/><GlassPanel>{row('MEETS','meet_notifs_enabled')}<View style={styles.identityDivider}/>{row('SEASONS','season_notifs_enabled')}<View style={styles.identityDivider}/>{row('CAR OF THE WEEK','cotw_notifs_enabled')}</GlassPanel><SectionTitle label="GARAGE + MOD SYNC"/><GlassPanel>{row('SYNC MOD PLANNER','mod_sync_enabled')}<View style={styles.identityDivider}/>{row('PART PRICE ALERTS','mod_price_alerts_enabled')}<View style={styles.identityDivider}/><Text style={styles.commandMeta}>Your selected build parts, installed state, notes, and priorities follow your encrypted Apex account across devices.</Text></GlassPanel><SectionTitle label="PRIVACY + DRIVING"/><GlassPanel>{row('PUBLIC PERFORMANCE','public_performance_visibility')}<View style={styles.identityDivider}/>{row('PUBLIC RACE RECORDS','public_race_records')}<View style={styles.identityDivider}/>{row('APEX ID VISIBILITY','apex_id_visibility')}<View style={styles.identityDivider}/><View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>BOUNTY NETWORK</Text><Text style={styles.commandMeta}>OPT-IN · APPROXIMATE SIGNALS · SAFE AND LEGAL PARTICIPATION ONLY</Text></View><Switch value={bounty} onValueChange={setBounty} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={bounty?accent:'#D5D9D5'}/></View><View style={styles.identityDivider}/><View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>MEET RADIUS</Text><Text style={styles.commandMeta}>{settings.meet_notif_radius_miles} MILES</Text></View><Slider style={{width:150,height:36}} minimumValue={5} maximumValue={100} step={5} value={settings.meet_notif_radius_miles} minimumTrackTintColor={accent} maximumTrackTintColor="#343A35" thumbTintColor={paper} onValueChange={value=>update('meet_notif_radius_miles',value)}/></View></GlassPanel><SectionTitle label="ACCOUNT + ABOUT"/><GlassPanel><View style={styles.healthRow}><Text style={styles.identityLabel}>APEX ID</Text><Text style={styles.healthGood}>{apexId}</Text></View><View style={styles.identityDivider}/><View style={styles.healthRow}><Text style={styles.identityLabel}>CURRENT SOURCE</Text><Text style={styles.commandMeta}>{APP_VERSION} · NEXT ANDROID BUILD {ANDROID_VERSION_CODE}</Text></View><View style={styles.identityDivider}/><AndroidDownloadButton/></GlassPanel>{status?<Text style={status.includes('SECURED')?styles.healthGood:styles.networkError}>{status}</Text>:null}<GlassButton label={busy?'SAVING':'SAVE SETTINGS'} icon={Check} onPress={()=>void save()} active/></ScrollView>;
}

function FeedVideo({uri,active,muted}:{uri:string;active:boolean;muted:boolean}){
  const video=useRef<Video|null>(null);
  const [status,setStatus]=useState({loaded:false,playing:false,position:0,duration:0,finished:false});
  useEffect(()=>{const player=video.current;if(!player)return;if(active)void player.playAsync().catch(()=>undefined);else void player.pauseAsync().catch(()=>undefined);},[active]);
  const update=(next:AVPlaybackStatus)=>{
    if(!next.isLoaded){setStatus(current=>({...current,loaded:false,playing:false}));return;}
    setStatus({loaded:true,playing:next.isPlaying,position:next.positionMillis,duration:next.durationMillis||0,finished:Boolean(next.didJustFinish)});
  };
  const toggle=async()=>{const player=video.current;if(!player)return;playInterfaceSound('toggle');if(status.finished||status.position>=status.duration-120){await player.replayAsync();return;}if(status.playing)await player.pauseAsync();else await player.playAsync();};
  const replay=async()=>{playInterfaceSound('toggle');await video.current?.replayAsync();};
  const seek=async(value:number)=>{await video.current?.setPositionAsync(value);};
  const time=(value:number)=>`${Math.floor(value/60000)}:${String(Math.floor((value%60000)/1000)).padStart(2,'0')}`;
  return <View style={StyleSheet.absoluteFill}>
    <Video ref={video} source={{uri}} style={StyleSheet.absoluteFill} resizeMode={ResizeMode.COVER} shouldPlay={active} isLooping={false} isMuted={muted} progressUpdateIntervalMillis={250} onPlaybackStatusUpdate={update}/>
    <View style={styles.feedVideoControls}>
      <Pressable accessibilityLabel={status.playing?'Pause video':'Play video'} onPress={()=>void toggle()} style={styles.feedVideoButton}>{status.finished?<RotateCcw size={18} color={paper}/>:status.playing?<Pause size={18} color={paper}/>:<Play size={18} color={paper}/>}</Pressable>
      <Slider accessibilityLabel="Video position" style={styles.feedVideoSlider} minimumValue={0} maximumValue={Math.max(1,status.duration)} value={Math.min(status.position,Math.max(1,status.duration))} minimumTrackTintColor={accent} maximumTrackTintColor="rgba(255,255,255,.32)" thumbTintColor={paper} onSlidingComplete={value=>void seek(value)}/>
      <Text style={styles.feedVideoTime}>{time(status.position)} / {time(status.duration)}</Text>
      <Pressable accessibilityLabel="Replay video" onPress={()=>void replay()} style={styles.feedVideoButton}><RotateCcw size={16} color={paper}/></Pressable>
    </View>
  </View>;
}

type CompleteSettings=ApexSettings&{
  navigation_audio_enabled:number;driver_mode_autostart:number;ghost_frequency_enabled:number;
  bounty_notifs_enabled:number;ghost_notifs_enabled:number;social_notifs_enabled:number;
  profile_visibility:number;vehicle_visibility:number;meet_attendance_visibility:number;
  location_visibility:number;map_style_preference:'street'|'satellite';
};

function SettingsScreen(){
  const [settings,setSettings]=useState<CompleteSettings|null>(null);
  const [apexId,setApexId]=useState('');
  const [audio,setAudio]=useState(true);
  const [haptics,setHaptics]=useState(true);
  const [bounty,setBounty]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('');
  const load=async()=>{setBusy(true);try{const [data,bountyData,local]=await Promise.all([cloudflareApi.request<{settings:CompleteSettings;apexId:string}>('/api/settings'),cloudflareApi.request<{settings:{bountyModeEnabled:boolean}}>('/api/bounty/settings'),AsyncStorage.getItem(LOCAL_SETTINGS_KEY)]);setSettings(data.settings);setApexId(data.apexId);setBounty(Boolean(bountyData.settings.bountyModeEnabled));if(local){const parsed=JSON.parse(local);setAudio(parsed.audio!==false);setHaptics(parsed.haptics!==false);}setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Settings unavailable.');}finally{setBusy(false);}};
  useEffect(()=>{void load();},[]);
  const update=(key:keyof CompleteSettings,value:string|number)=>setSettings(current=>current?{...current,[key]:value}:current);
  const toggle=(label:string,key:keyof CompleteSettings,detail?:string)=><View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{label}</Text>{detail?<Text style={styles.commandMeta}>{detail}</Text>:null}</View><Switch value={Boolean(settings?.[key])} onValueChange={value=>update(key,value?1:0)} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={Boolean(settings?.[key])?accent:'#D5D9D5'}/></View>;
  const divider=<View style={styles.identityDivider}/>;
  const save=async()=>{if(!settings||busy)return;setBusy(true);try{await Promise.all([cloudflareApi.request('/api/settings',{method:'PUT',body:JSON.stringify(settings)}),cloudflareApi.request('/api/bounty/settings',{method:'PUT',body:JSON.stringify({bountyModeEnabled:bounty,agreed:bounty,notificationsEnabled:Boolean(settings.bounty_notifs_enabled),showPublicPhoto:Boolean(settings.profile_visibility),allowMostWanted:true})}),AsyncStorage.setItem(LOCAL_SETTINGS_KEY,JSON.stringify({audio,haptics}))]);setInterfaceAudioEnabled(audio);setHapticsEnabled(haptics);const liveUnit=useLiveNetworkStore.getState().unit.toUpperCase();if((settings.unit_preference==='KMH'?'KPH':'MPH')!==liveUnit)useLiveNetworkStore.getState().toggleUnit();playInterfaceSound('unlock');setStatus('SETTINGS SECURED');}catch(error){setStatus(error instanceof Error?error.message:'Settings could not be saved.');}finally{setBusy(false);}};
  const signOut=async()=>{setBusy(true);try{await cloudflareApi.signOut();useLiveNetworkStore.getState().dispose();await Promise.all([useContentStore.getState().initialize(),useLiveNetworkStore.getState().initialize()]);if(Platform.OS==='web'&&typeof window!=='undefined')window.location.assign('/');}finally{setBusy(false);}};
  if(!settings)return <ScrollView contentContainerStyle={styles.screenContent}><GlassPanel style={styles.emptyState}><Settings size={28} color={accent}/><Text style={styles.emptyTitle}>{busy?'DECRYPTING SETTINGS':'SETTINGS UNAVAILABLE'}</Text>{status?<Text style={styles.networkError}>{status}</Text>:null}<GlassButton label="RETRY" icon={Radio} onPress={()=>void load()} compact/></GlassPanel></ScrollView>;
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
    <View style={styles.raceHeader}><View><Text style={styles.eyebrow}>PILOT CONTROL</Text><Text style={styles.feedTitle}>SETTINGS</Text></View><Settings size={27} color={paper}/></View>
    <SectionTitle label="GENERAL"/><GlassPanel><View style={styles.healthRow}><Text style={styles.commandTitle}>SPEED UNITS</Text><View style={styles.durationRow}>{(['MPH','KMH'] as const).map(unit=><Pressable key={unit} onPress={()=>update('unit_preference',unit)} style={[styles.durationChoice,settings.unit_preference===unit&&styles.durationChoiceActive]}><Text style={[styles.segmentText,settings.unit_preference===unit&&styles.segmentTextActive]}>{unit==='KMH'?'KM/H':unit}</Text></Pressable>)}</View></View>{divider}<View style={styles.healthRow}><Text style={styles.commandTitle}>SOUND</Text><Switch value={audio} onValueChange={setAudio} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={audio?accent:'#D5D9D5'}/></View>{divider}<View style={styles.healthRow}><Text style={styles.commandTitle}>HAPTICS</Text><Switch value={haptics} onValueChange={setHaptics} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={haptics?accent:'#D5D9D5'}/></View></GlassPanel>
    <SectionTitle label="DRIVING"/><GlassPanel><View style={styles.healthRow}><Text style={styles.commandTitle}>MAP STYLE</Text><View style={styles.durationRow}>{(['street','satellite'] as const).map(mode=><Pressable key={mode} onPress={()=>update('map_style_preference',mode)} style={[styles.durationChoice,settings.map_style_preference===mode&&styles.durationChoiceActive]}><Text style={[styles.segmentText,settings.map_style_preference===mode&&styles.segmentTextActive]}>{mode.toUpperCase()}</Text></Pressable>)}</View></View>{divider}{toggle('NAVIGATION AUDIO','navigation_audio_enabled')}{divider}{toggle('DRIVER MODE AUTO-START','driver_mode_autostart')}{divider}{toggle('GHOST FREQUENCY','ghost_frequency_enabled','Show eligible caches, trails, and transmissions on Map.')}</GlassPanel>
    <SectionTitle label="NOTIFICATIONS"/><GlassPanel>{toggle('SEASON','season_notifs_enabled')}{divider}{toggle('BOUNTY','bounty_notifs_enabled')}{divider}{toggle('MEETS','meet_notifs_enabled')}{divider}{toggle('GHOST ACTIVITY','ghost_notifs_enabled')}{divider}{toggle('SOCIAL','social_notifs_enabled')}{divider}{toggle('CAR OF THE WEEK','cotw_notifs_enabled')}</GlassPanel>
    <SectionTitle label="GARAGE + MOD SYNC"/><GlassPanel>{toggle('SYNC MOD PLANNER','mod_sync_enabled')}{divider}{toggle('PART PRICE ALERTS','mod_price_alerts_enabled')}</GlassPanel>
    <SectionTitle label="PRIVACY"/><GlassPanel>{toggle('PROFILE VISIBLE','profile_visibility')}{divider}{toggle('VEHICLES VISIBLE','vehicle_visibility')}{divider}{toggle('APEX ID VISIBLE','apex_id_visibility')}{divider}{toggle('MEET ATTENDANCE VISIBLE','meet_attendance_visibility')}{divider}{toggle('LOCATION SHARING','location_visibility','Live location still expires automatically.')}{divider}<View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>BOUNTY PARTICIPATION</Text><Text style={styles.commandMeta}>OPT-IN · APPROXIMATE SIGNALS · AUTHORIZED VENUES</Text></View><Switch value={bounty} onValueChange={setBounty} trackColor={{false:'#252A26',true:'rgba(167,229,154,.46)'}} thumbColor={bounty?accent:'#D5D9D5'}/></View></GlassPanel>
    <SectionTitle label="ACCOUNT"/><GlassPanel><View style={styles.healthRow}><Text style={styles.identityLabel}>APEX ID</Text><Text style={styles.healthGood}>{apexId}</Text></View>{divider}<GlassButton label="LOCK YOURSELF OUT" icon={LockKeyhole} onPress={()=>void signOut()}/></GlassPanel>
    <SectionTitle label="ABOUT"/><GlassPanel><View style={styles.healthRow}><Text style={styles.identityLabel}>APP</Text><Text style={styles.commandMeta}>{APP_VERSION}</Text></View>{divider}<View style={styles.healthRow}><Text style={styles.identityLabel}>ANDROID BUILD</Text><Text style={styles.commandMeta}>{ANDROID_VERSION_CODE}</Text></View>{divider}<AndroidDownloadButton/></GlassPanel>
    {status?<Text style={status.includes('SECURED')?styles.healthGood:styles.networkError}>{status}</Text>:null}<GlassButton label={busy?'SAVING':'SAVE SETTINGS'} icon={Check} onPress={()=>void save()} active/>
  </ScrollView>;
}

function BountyScreen({onTab}:{onTab:(tab:TabKey)=>void}){
  const {isDriving,startDrive}=useLiveNetworkStore();
  const [settings,setSettings]=useState<any|null>(null),[active,setActive]=useState<any|null>(null),[mostWanted,setMostWanted]=useState<any[]>([]),[stats,setStats]=useState<any|null>(null),[venueName,setVenueName]=useState('PRIVATE TRACK'),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
  const load=async()=>{setBusy(true);try{const [settingsData,activeData,wantedData,statsData]=await Promise.all([cloudflareApi.request<any>('/api/bounty/settings'),cloudflareApi.request<any>('/api/bounty/active'),cloudflareApi.request<any>('/api/bounty/most-wanted'),cloudflareApi.request<any>('/api/bounty/stats')]);setSettings(settingsData.settings);setActive(activeData);setMostWanted(wantedData.mostWanted||[]);setStats(statsData.stats);setAccepted(Boolean(settingsData.settings?.agreedAt));setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Bounty network unavailable.');}finally{setBusy(false);}};
  useEffect(()=>{void load();const timer=setInterval(()=>void load(),10000);return()=>clearInterval(timer);},[]);
  const saveOptIn=async(enabled:boolean)=>{if(enabled&&!accepted){setStatus('ACCEPT THE SAFETY AGREEMENT FIRST');return;}setBusy(true);try{await cloudflareApi.request('/api/bounty/settings',{method:'PUT',body:JSON.stringify({bountyModeEnabled:enabled,agreed:accepted,notificationsEnabled:true,showPublicPhoto:true,allowMostWanted:true})});await load();setStatus(enabled?'BOUNTY NETWORK ARMED':'BOUNTY NETWORK DISARMED');}catch(error){setStatus(error instanceof Error?error.message:'Could not update Bounty Mode.');}finally{setBusy(false);}};
  const begin=async()=>{if(!settings?.bountyModeEnabled){setStatus('ENABLE BOUNTY MODE FIRST');return;}setBusy(true);try{if(!isDriving){setStatus('REQUESTING GPS · STARTING DRIVER MODE');await startDrive();if(!useLiveNetworkStore.getState().isDriving){setStatus('DRIVER MODE AND LOCATION ARE REQUIRED');return;}}setStatus('AUTHORIZING PRIVATE VENUE SESSION');await cloudflareApi.request('/api/bounty/trigger',{method:'POST',body:JSON.stringify({mode:'venue',venueName,starLevel:1})});await load();playInterfaceSound('unlock');}catch(error){setStatus(error instanceof Error?error.message:'Could not activate Bounty.');}finally{setBusy(false);}};
  const sessionAction=async(action:'signal'|'claim'|'progress'|'leave')=>{const id=active?.session?.id;if(!id)return;setBusy(true);try{await cloudflareApi.request(`/api/bounty/sessions/${id}/${action}`,{method:'POST'});await load();}catch(error){setStatus(error instanceof Error?error.message:'Bounty update failed.');}finally{setBusy(false);}};
  const join=async(id:string)=>{setBusy(true);try{await cloudflareApi.request(`/api/bounty/sessions/${id}/join`,{method:'POST'});await load();}catch(error){setStatus(error instanceof Error?error.message:'Could not join this Bounty.');}finally{setBusy(false);}};
  const session=active?.session,role=active?.role as 'target'|'hunter'|null,remaining=Math.max(0,Number(session?.remainingSeconds||0));
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>MAP PROTOCOL</Text><Text style={styles.feedTitle}>BOUNTY</Text><Text style={styles.moreCopy}>Consent-gated venue sessions. Approximate signals only.</Text></View><Pressable onPress={()=>onTab('radar')} style={styles.iconButton}><Map size={18} color={paper}/></Pressable></View><GlassPanel glow={Boolean(session)}><View style={styles.bountyTop}><View><Text style={styles.identityLabel}>NETWORK STATUS</Text><Text style={styles.commandTitle}>{session?`${role?.toUpperCase()} // ${'★'.repeat(session.starLevel)}`:settings?.bountyModeEnabled?'ARMED':'OPTED OUT'}</Text></View><View style={[styles.bountyBadge,settings?.bountyModeEnabled&&styles.bountyBadgeLive]}><Radio size={14} color={settings?.bountyModeEnabled?accent:muted}/><Text style={styles.bountyBadgeText}>{busy?'SYNC':'LIVE'}</Text></View></View>{session?<><Text style={styles.bountyTimer}>{Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}</Text><Text style={styles.commandMeta}>{role==='hunter'?`${session.approxDistanceMiles??'—'} MI · ${session.approxDirection||'SEARCH ZONE PENDING'} · SIGNAL ${session.signalStrengthPct||0}%`:`SURVIVE AUTHORIZED SESSION · ${session.rewardGc} GC`}</Text><View style={styles.sheetActions}>{role==='hunter'?<><GlassButton label="SYNC SIGNAL" icon={Radio} onPress={()=>void sessionAction('signal')} active grow/><GlassButton label="CLAIM" icon={BadgeCheck} onPress={()=>void sessionAction('claim')} grow/><GlassButton label="LEAVE" icon={X} onPress={()=>void sessionAction('leave')} grow/></>:<GlassButton label="SYNC PHASE" icon={Star} onPress={()=>void sessionAction('progress')} active grow/>}</View></>:<><Pressable onPress={()=>setAccepted(value=>!value)} style={styles.bountyConsent}><View style={[styles.bountyCheck,accepted&&styles.bountyCheckOn]}>{accepted?<Check size={13} color="#071009"/>:null}</View><Text style={styles.bountyConsentText}>I accept responsibility and will use Bounty only at an authorized private venue while following all laws and safety rules.</Text></Pressable><View style={styles.sheetActions}><GlassButton label={settings?.bountyModeEnabled?'DISABLE':'ENABLE'} icon={ShieldCheck} onPress={()=>void saveOptIn(!settings?.bountyModeEnabled)} active={!settings?.bountyModeEnabled} grow/><GlassButton label="SETTINGS" icon={Settings} onPress={()=>onTab('settings')} grow/></View>{settings?.bountyModeEnabled?<><TextInput value={venueName} onChangeText={setVenueName} placeholder="Authorized venue name" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label={isDriving?'ACTIVATE BOUNTY':'START DRIVE + ACTIVATE'} icon={Play} onPress={()=>void begin()} active/></>:null}</>}</GlassPanel>{status?<Text style={status.includes('ARMED')||status.includes('DISARMED')?styles.healthGood:styles.networkError}>{status}</Text>:null}<SectionTitle label="MOST WANTED" action={`${mostWanted.length} ACTIVE`}/>{mostWanted.length?mostWanted.map(item=><GlassPanel key={item.id}><View style={styles.healthRow}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{item.targetUsername?.toUpperCase()||'UNKNOWN PILOT'} · {'★'.repeat(item.starLevel)}</Text><Text style={styles.commandMeta}>{item.targetRank} · {item.rewardGc} GC · {Math.ceil(item.remainingSeconds/60)} MIN</Text></View><GlassButton label="TRACK" icon={Crosshair} onPress={()=>void join(item.id)} compact active/></View></GlassPanel>):<GlassPanel style={styles.emptyState}><Radio size={25} color={muted}/><Text style={styles.emptyTitle}>NO AUTHORIZED SIGNALS</Text><Text style={styles.emptyCopy}>Eligible venue Bounties will appear here without exposing exact coordinates.</Text></GlassPanel>}<SectionTitle label="PILOT RECORD"/><GlassPanel><View style={styles.driverStats}><View><Text style={styles.driverStatValue}>{stats?.successfulClaims||0}</Text><Text style={styles.driverStatLabel}>CLAIMS</Text></View><View><Text style={styles.driverStatValue}>{stats?.escapes||0}</Text><Text style={styles.driverStatLabel}>ESCAPES</Text></View><View><Text style={styles.driverStatValue}>{Math.max(stats?.highestStarClaimed||0,stats?.highestStarSurvived||0)}</Text><Text style={styles.driverStatLabel}>MAX STAR</Text></View></View></GlassPanel></ScrollView>;
}

function LegacyWorldScreen({onTab}:{onTab:(tab:TabKey)=>void}){
  const world=useWorldStore();const {location,lockLocation,hideLocation,setRouteToPoint}=useLiveNetworkStore();const profile=useContentStore(state=>state.profile);const userId=useContentStore(state=>state.userId);const activeVehicleId=useContentStore(state=>state.activeVehicleId);
  const [crewName,setCrewName]=useState('');const [crewTag,setCrewTag]=useState('');const [territoryName,setTerritoryName]=useState('');const [reportType,setReportType]=useState<RoadReport['type']>('hazard');const [reportNote,setReportNote]=useState('');const [dropTitle,setDropTitle]=useState('');const [safeHouseName,setSafeHouseName]=useState('');
  useEffect(()=>{void world.refresh();},[]);
  const ensureLocation=async()=>{if(location)return location;await lockLocation();return useLiveNetworkStore.getState().location;};
  const submitReport=async()=>{const point=await ensureLocation();if(!point)return Alert.alert('Location required','Lock your GPS before placing a safety report.');if(await world.report(reportType,reportNote,point.latitude,point.longitude))setReportNote('');};
  const ownedCrew=world.crews.find(crew=>crew.owner_id===userId);
  const createTerritory=async()=>{const point=await ensureLocation();if(!point||!ownedCrew)return;if(await world.createTerritory(ownedCrew.id,{name:territoryName||`${ownedCrew.tag} ZONE`,latitude:point.latitude,longitude:point.longitude,radiusM:1200,requiredCells:12}))setTerritoryName('');};
  const createDrop=async()=>{const point=await ensureLocation();if(!point||!dropTitle.trim())return;try{await cloudflareApi.request('/api/admin/dead-drops',{method:'POST',body:JSON.stringify({title:dropTitle,latitude:point.latitude,longitude:point.longitude,credits:500,radiusM:65})});setDropTitle('');await world.refresh();}catch(error){Alert.alert('Drop failed',error instanceof Error?error.message:'Could not create drop.');}};
  const createSafeHouse=async()=>{const point=await ensureLocation();if(!point)return;if(await world.createSafeHouse({name:safeHouseName.trim()||`SAFE HOUSE ${world.safeHouses.length+1}`,latitude:point.latitude,longitude:point.longitude,vehicleId:activeVehicleId})){setSafeHouseName('');Alert.alert('Safe house secured','This garage is private and visible only to your account.');}};
  const createSeason=async()=>{const startsAt=new Date().toISOString(),endsAt=new Date(Date.now()+30*86400000).toISOString();try{await cloudflareApi.request('/api/admin/seasons',{method:'POST',body:JSON.stringify({name:`UNDERGROUND // ${new Date().toLocaleString('en',{month:'short'}).toUpperCase()}`,startsAt,endsAt,rewardCredits:10000})});await world.refresh();}catch(error){Alert.alert('Season failed',error instanceof Error?error.message:'Could not create season.');}};
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.worldHero}><View><Text style={styles.eyebrow}>PERSISTENT WORLD</Text><Text style={styles.feedTitle}>THE UNDERGROUND</Text><Text style={styles.moreCopy}>{world.discoveries.length} CELLS DISCOVERED · {world.territories.filter(item=>item.unlocked).length} ZONES UNLOCKED</Text></View><Pressable onPress={()=>onTab('radar')} style={styles.worldMapButton}><Map size={22} color={paper}/></Pressable></View><View style={styles.worldStats}><SpecCell value={String(world.drops.filter(item=>!item.claimed).length)} label="LIVE DROPS"/><SpecCell value={String(world.crews.length)} label="CREWS"/><SpecCell value={String(world.reports.length)} label="SAFETY MARKS"/></View><View style={styles.heatPanel}><View style={styles.heatHeader}><View><Text style={styles.eyebrow}>NETWORK HEAT</Text><Text style={styles.heatLevel}>{world.heat<20?'GHOST':world.heat<50?'VISIBLE':world.heat<80?'INFAMOUS':'BLACKLIST'}</Text></View><Text style={styles.heatValue}>{world.heat}</Text></View><View style={styles.heatTrack}><View style={[styles.heatFill,{width:`${Math.max(2,world.heat)}%`}]} /></View><Text style={styles.commandMeta}>Heat rises with visible runs and new sectors, then decays while the network is quiet.</Text></View><Pressable onPress={()=>onTab('bounty')} style={styles.ghostProtocol}><Crosshair size={21} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>OPEN BOUNTY NETWORK</Text><Text style={styles.commandMeta}>Opt-in venue sessions, active signals, Most Wanted, rewards and record</Text></View><ChevronRight size={18} color={accent}/></Pressable><Pressable onPress={()=>void hideLocation()} style={styles.ghostProtocol}><VolumeX size={21} color={paper}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>EMERGENCY GHOST PROTOCOL</Text><Text style={styles.commandMeta}>Immediately remove your live location from every pilot map</Text></View><ChevronRight size={18} color={paper}/></Pressable>
  <SectionTitle label="ENCRYPTED CONTRACTS" action={`${world.contracts.filter(item=>item.progress_status==='completed').length} CLEARED`}/>{world.contracts.map(contract=><GlassPanel key={contract.id} style={styles.contractCard} glow={contract.progress_status==='completed'}><View style={styles.worldCardTop}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{contract.title}</Text><Text style={styles.commandMeta}>{contract.description}</Text></View><Text style={styles.contractReward}>+{contract.reward_credits} ACR</Text></View><View style={styles.contractTrack}><View style={[styles.contractFill,{width:`${Math.min(100,Math.round(((contract.progress||0)/contract.target)*100))}%`}]}/></View><View style={styles.contractFooter}><Text style={styles.commandMeta}>{contract.progress||0} / {contract.target}</Text>{!contract.progress_status?<GlassButton label="DECRYPT" icon={LockKeyhole} onPress={()=>void world.acceptContract(contract.id)} compact/>:<Text style={contract.progress_status==='completed'?styles.contractComplete:styles.contractActive}>{contract.progress_status.toUpperCase()}</Text>}</View></GlassPanel>)}
  <SectionTitle label="PRIVATE SAFE HOUSES" action={`${world.safeHouses.length}/8`}/><GlassPanel style={styles.worldCard}><TextInput value={safeHouseName} onChangeText={setSafeHouseName} placeholder="Safe-house garage name" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="SECURE CURRENT LOCATION" icon={ShieldCheck} onPress={()=>void createSafeHouse()} active/></GlassPanel>{world.safeHouses.map(house=><View key={house.id} style={styles.worldListRow}><CarFront size={21} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{house.name.toUpperCase()}</Text><Text style={styles.commandMeta}>PRIVATE GARAGE · {new Date(house.created_at).toLocaleDateString()}</Text></View><Pressable onPress={()=>{void setRouteToPoint(house.name,house.latitude,house.longitude);onTab('radar');}} style={styles.safeHouseAction}><Navigation size={16} color={paper}/></Pressable><Pressable onPress={()=>void world.deleteSafeHouse(house.id)} style={styles.safeHouseAction}><X size={16} color={muted}/></Pressable></View>)}
  <SectionTitle label="BADGE VAULT" action={`${world.badges.filter(item=>item.earned).length} EARNED`}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.progressionBadgeRail}>{world.badges.map(badge=><View key={badge.id} style={[styles.gameBadge,Boolean(badge.earned)&&styles.gameBadgeEarned]}><View style={styles.gameBadgeIcon}>{badge.earned?<BadgeCheck size={22} color={accent}/>:<LockKeyhole size={20} color={muted}/>}</View><Text style={styles.gameBadgeTitle}>{badge.name}</Text><Text style={styles.gameBadgeMeta}>{badge.description}</Text></View>)}</ScrollView>
  <SectionTitle label="UNDERGROUND SEASONS" action={`${world.seasons.length} ACTIVE`}/>{world.seasons.map(season=><GlassPanel key={season.id} style={styles.worldCard} glow><View style={styles.worldCardTop}><View><Text style={styles.commandTitle}>{season.name.toUpperCase()}</Text><Text style={styles.commandMeta}>ENDS {new Date(season.ends_at).toLocaleDateString()} · {season.reward_credits.toLocaleString()} ACR POOL</Text></View><Trophy size={21} color={accent}/></View><GlassButton label={season.joined?'SEASON ENTERED':'ENTER SEASON'} icon={season.joined?Check:Play} onPress={()=>void world.joinSeason(season.id)} active={!season.joined}/></GlassPanel>)}
  <SectionTitle label="SEASON JOURNEYS" action={`${world.journeys.filter(item=>item.progress_status==='completed').length} CLEARED`}/>{world.journeys.map(journey=>{const next=journey.route[Math.min(journey.current_checkpoint||0,Math.max(0,journey.route.length-1))];return <GlassPanel key={journey.id} style={styles.worldCard} glow={journey.progress_status==='active'}><View style={styles.worldCardTop}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{journey.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{journey.description||`${journey.route.length} CHECKPOINT SEASON ROUTE`} · +{journey.reward_credits} ACR</Text></View><Crown size={21} color={accent}/></View><View style={styles.journeyProgress}><View style={[styles.journeyProgressFill,{width:`${Math.min(100,((journey.current_checkpoint||0)/Math.max(1,journey.route.length))*100)}%`}]}/></View><View style={styles.sheetActions}>{!journey.joined?<GlassButton label="ENTER JOURNEY" icon={Play} onPress={()=>void world.joinJourney(journey.id)} active grow/>:journey.progress_status!=='completed'?<GlassButton label="CHECK GPS MARK" icon={MapPin} onPress={async()=>{const point=await ensureLocation();if(point){const result=await world.checkJourney(journey.id,point);if(result?.complete)Alert.alert('Journey cleared',`Reward secured: ${result.rewardCredits} ACR.`);}}} active grow/>:<GlassButton label="COMPLETED" icon={Check} onPress={()=>undefined} active grow/>}{next?<GlassButton label="ROUTE NEXT" icon={Navigation} onPress={()=>{void setRouteToPoint(next.name,next.latitude,next.longitude);onTab('radar');}} grow/>:null}</View></GlassPanel>;})}{!world.journeys.length?<GlassPanel style={styles.emptyState}><Crown size={28} color={accent}/><Text style={styles.emptyTitle}>NO JOURNEY SIGNAL</Text><Text style={styles.emptyCopy}>Season journeys appear here as timed, checkpoint-based routes.</Text></GlassPanel>:null}
  <SectionTitle label="CREW NETWORK" action="APPROVAL REQUIRED"/>{!ownedCrew?<GlassPanel style={styles.worldCard}><TextInput value={crewName} onChangeText={setCrewName} placeholder="Crew name" placeholderTextColor={muted} style={styles.authInput}/><TextInput value={crewTag} onChangeText={value=>setCrewTag(value.toUpperCase().slice(0,5))} placeholder="2-5 character tag" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="FOUND CREW" icon={Users} onPress={()=>void world.createCrew(crewName,crewTag)} active/></GlassPanel>:<GlassPanel style={styles.worldCard} glow><Text style={styles.commandTitle}>[{ownedCrew.tag}] {ownedCrew.name.toUpperCase()}</Text><Text style={styles.commandMeta}>{ownedCrew.member_count} APPROVED MEMBERS · TERRITORY AUTHORITY</Text><TextInput value={territoryName} onChangeText={setTerritoryName} placeholder="New territory name" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="CLAIM GPS TERRITORY" icon={MapPin} onPress={()=>void createTerritory()} active/></GlassPanel>}{world.crews.filter(crew=>crew.owner_id!==userId).map(crew=><View key={crew.id} style={styles.worldListRow}><View style={styles.crewSigil}><Text style={styles.crewSigilText}>{crew.tag}</Text></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{crew.name.toUpperCase()}</Text><Text style={styles.commandMeta}>{crew.member_count} MEMBERS · {(crew.member_status||'OPEN').toUpperCase()}</Text></View>{!crew.member_status?<GlassButton label="REQUEST" icon={LockKeyhole} onPress={()=>void world.joinCrew(crew.id)} compact/>:null}</View>)}{world.crewRequests.map(request=><View key={`${request.crew_id}-${request.user_id}`} style={styles.worldListRow}><UserRound size={20} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{request.username.toUpperCase()}</Text><Text style={styles.commandMeta}>REQUESTING CREW CLEARANCE</Text></View><GlassButton label="APPROVE" icon={Check} onPress={()=>void world.approveMember(request.crew_id,request.user_id)} compact/></View>)}
  <SectionTitle label="DEAD DROPS" action="DRIVE TO CLAIM"/>{world.drops.map(drop=><View key={drop.id} style={[styles.worldListRow,Boolean(drop.claimed)&&styles.worldClaimed]}><Gift size={21} color={drop.claimed?muted:accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{drop.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{drop.claimed?'RECOVERED':`${drop.credits} ACR · ENTER ${drop.radius_m}M ZONE`}</Text></View><Text style={styles.dropValue}>{drop.claimed?'✓':`+${drop.credits}`}</Text></View>)}
  <SectionTitle label="COMMUNITY ROAD INTEL" action="PERSISTENT"/><GlassPanel style={styles.worldCard}><View style={styles.reportTypes}>{(['hazard','closure','fixed_camera','dangerous_road'] as const).map(type=><Pressable key={type} onPress={()=>setReportType(type)} style={[styles.reportType,reportType===type&&styles.reportTypeActive]}><Text style={[styles.reportTypeText,reportType===type&&styles.reportTypeTextActive]}>{type.replace('_',' ').toUpperCase()}</Text></Pressable>)}</View><TextInput value={reportNote} onChangeText={setReportNote} placeholder="Road safety note" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="PIN AT MY LOCATION" icon={MapPin} onPress={()=>void submitReport()} active/></GlassPanel>
  {profile?.isDeveloper?<><SectionTitle label="WORLDMASTER TOOLS" action="OWNER"/><GlassPanel style={styles.worldCard}><TextInput value={dropTitle} onChangeText={setDropTitle} placeholder="Dead drop title" placeholderTextColor={muted} style={styles.authInput}/><View style={styles.lobbyQuickRow}><GlassButton label="PLACE 500 ACR DROP" icon={Gift} onPress={()=>void createDrop()} grow/><GlassButton label="START 30D SEASON" icon={Trophy} onPress={()=>void createSeason()} grow/></View></GlassPanel></>:null}{world.error?<Text style={styles.networkError}>{world.error}</Text>:null}</ScrollView>;
}

function WorldScreen({onTab}:{onTab:(tab:TabKey)=>void}){
  const world=useWorldStore();
  const {location,lockLocation,hideLocation,setRouteToPoint}=useLiveNetworkStore();
  const activeVehicleId=useContentStore(state=>state.activeVehicleId);
  const [safeHouseName,setSafeHouseName]=useState('');
  useEffect(()=>{void world.refresh();},[]);
  const ensureLocation=async()=>{if(location)return location;await lockLocation();return useLiveNetworkStore.getState().location;};
  const createSafeHouse=async()=>{const point=await ensureLocation();if(!point)return Alert.alert('Location required','Lock your GPS before securing a Safe House.');if(await world.createSafeHouse({name:safeHouseName.trim()||`SAFE HOUSE ${world.safeHouses.length+1}`,latitude:point.latitude,longitude:point.longitude,vehicleId:activeVehicleId})){setSafeHouseName('');Alert.alert('Safe House secured','This location is private to your account.');}};
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
    <View style={styles.worldHero}><View><Text style={styles.eyebrow}>MAP DISCOVERY</Text><Text style={styles.feedTitle}>WORLD</Text><Text style={styles.moreCopy}>{world.discoveries.length} CELLS DISCOVERED · {world.territories.filter(item=>item.unlocked).length} DISTRICTS CLEARED</Text></View><Pressable onPress={()=>onTab('radar')} style={styles.worldMapButton}><Map size={22} color={paper}/></Pressable></View>
    <View style={styles.worldStats}><SpecCell value={String(world.drops.filter(item=>!item.claimed).length)} label="LIVE DROPS"/><SpecCell value={String(world.safeHouses.length)} label="SAFE HOUSES"/><SpecCell value={String(world.reports.length)} label="ROAD INTEL"/></View>
    <View style={styles.moduleGrid}><Pressable onPress={()=>onTab('season')} style={styles.moduleCard}><Crown size={22} color={accent}/><Text style={styles.moduleTitle}>SEASON HUB</Text><Text style={styles.moduleMeta}>Season status and journeys</Text></Pressable><Pressable onPress={()=>onTab('crews')} style={styles.moduleCard}><Users size={22} color={accent}/><Text style={styles.moduleTitle}>CREW NETWORK</Text><Text style={styles.moduleMeta}>Approvals and territories</Text></Pressable><Pressable onPress={()=>onTab('achievements')} style={styles.moduleCard}><BadgeCheck size={22} color={accent}/><Text style={styles.moduleTitle}>ACHIEVEMENTS</Text><Text style={styles.moduleMeta}>Earned badges and progress</Text></Pressable><Pressable onPress={()=>onTab('bounty')} style={styles.moduleCard}><Crosshair size={22} color={accent}/><Text style={styles.moduleTitle}>BOUNTY NETWORK</Text><Text style={styles.moduleMeta}>Opt-in venue signals</Text></Pressable></View>
    <SectionTitle label="ENCRYPTED CONTRACTS" action={`${world.contracts.filter(item=>item.progress_status==='completed').length} CLEARED`}/>{world.contracts.map(contract=><GlassPanel key={contract.id} style={styles.contractCard} glow={contract.progress_status==='completed'}><View style={styles.worldCardTop}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{contract.title}</Text><Text style={styles.commandMeta}>{contract.description}</Text></View><Text style={styles.contractReward}>+{contract.reward_credits} ACR</Text></View><View style={styles.contractTrack}><View style={[styles.contractFill,{width:`${Math.min(100,Math.round(((contract.progress||0)/contract.target)*100))}%`}]}/></View><View style={styles.contractFooter}><Text style={styles.commandMeta}>{contract.progress||0} / {contract.target}</Text>{!contract.progress_status?<GlassButton label="DECRYPT" icon={LockKeyhole} onPress={()=>void world.acceptContract(contract.id)} compact/>:<Text style={contract.progress_status==='completed'?styles.contractComplete:styles.contractActive}>{contract.progress_status.toUpperCase()}</Text>}</View></GlassPanel>)}
    <SectionTitle label="PRIVATE SAFE HOUSES" action={`${world.safeHouses.length}/8`}/><GlassPanel style={styles.worldCard}><TextInput value={safeHouseName} onChangeText={setSafeHouseName} placeholder="Safe House name" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="SECURE CURRENT LOCATION" icon={ShieldCheck} onPress={()=>void createSafeHouse()} active/></GlassPanel>{world.safeHouses.map(house=><View key={house.id} style={styles.worldListRow}><CarFront size={21} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{house.name.toUpperCase()}</Text><Text style={styles.commandMeta}>PRIVATE GARAGE · {new Date(house.created_at).toLocaleDateString()}</Text></View><Pressable accessibilityLabel={`Directions to ${house.name}`} onPress={()=>{void setRouteToPoint(house.name,house.latitude,house.longitude);onTab('radar');}} style={styles.safeHouseAction}><Navigation size={16} color={paper}/></Pressable><Pressable accessibilityLabel={`Delete ${house.name}`} onPress={()=>void world.deleteSafeHouse(house.id)} style={styles.safeHouseAction}><X size={16} color={muted}/></Pressable></View>)}
    <SectionTitle label="DEAD DROPS" action="DRIVE TO CLAIM"/>{world.drops.map(drop=><View key={drop.id} style={[styles.worldListRow,Boolean(drop.claimed)&&styles.worldClaimed]}><Gift size={21} color={drop.claimed?muted:accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{drop.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{drop.claimed?'RECOVERED':`${drop.credits} ACR · ENTER ${drop.radius_m}M ZONE`}</Text></View><Text style={styles.dropValue}>{drop.claimed?'✓':`+${drop.credits}`}</Text></View>)}
    <Pressable onPress={()=>void hideLocation()} style={styles.ghostProtocol}><VolumeX size={21} color={paper}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>EMERGENCY GHOST PROTOCOL</Text><Text style={styles.commandMeta}>Immediately remove your live location from the Map network</Text></View><ChevronRight size={18} color={paper}/></Pressable>
    {world.error?<Text style={styles.networkError}>{world.error}</Text>:null}
  </ScrollView>;
}

function SeasonHubScreen({onTab}:{onTab:(tab:TabKey)=>void}){
  const world=useWorldStore();const {location,lockLocation,setRouteToPoint}=useLiveNetworkStore();
  useEffect(()=>{void world.refresh();},[]);
  const ensureLocation=async()=>{if(location)return location;await lockLocation();return useLiveNetworkStore.getState().location;};
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.worldHero}><View><Text style={styles.eyebrow}>UNDERGROUND PROGRESSION</Text><Text style={styles.feedTitle}>SEASON HUB</Text><Text style={styles.moreCopy}>ONE SEASON RECORD · JOURNEYS · REWARDS</Text></View><Crown size={28} color={accent}/></View><SectionTitle label="ACTIVE SEASON" action={`${world.seasons.length} LIVE`}/>{world.seasons.map(season=><GlassPanel key={season.id} style={styles.worldCard} glow><View style={styles.worldCardTop}><View><Text style={styles.commandTitle}>{season.name.toUpperCase()}</Text><Text style={styles.commandMeta}>ENDS {new Date(season.ends_at).toLocaleDateString()} · {season.reward_credits.toLocaleString()} ACR POOL</Text></View><Trophy size={21} color={accent}/></View><GlassButton label={season.joined?'SEASON ENTERED':'ENTER SEASON'} icon={season.joined?Check:Play} onPress={()=>void world.joinSeason(season.id)} active={!season.joined}/></GlassPanel>)}{!world.seasons.length?<GlassPanel style={styles.emptyState}><Crown size={28} color={muted}/><Text style={styles.emptyTitle}>NO ACTIVE SEASON</Text><Text style={styles.emptyCopy}>A verified season will appear here when its server window opens.</Text></GlassPanel>:null}<SectionTitle label="SEASON JOURNEYS" action={`${world.journeys.filter(item=>item.progress_status==='completed').length} CLEARED`}/>{world.journeys.map(journey=>{const next=journey.route[Math.min(journey.current_checkpoint||0,Math.max(0,journey.route.length-1))];return <GlassPanel key={journey.id} style={styles.worldCard} glow={journey.progress_status==='active'}><View style={styles.worldCardTop}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{journey.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{journey.description||`${journey.route.length} CHECKPOINT ROUTE`} · +{journey.reward_credits} ACR</Text></View><Crown size={21} color={accent}/></View><View style={styles.journeyProgress}><View style={[styles.journeyProgressFill,{width:`${Math.min(100,((journey.current_checkpoint||0)/Math.max(1,journey.route.length))*100)}%`}]}/></View><View style={styles.sheetActions}>{!journey.joined?<GlassButton label="ENTER JOURNEY" icon={Play} onPress={()=>void world.joinJourney(journey.id)} active grow/>:journey.progress_status!=='completed'?<GlassButton label="CHECK GPS MARK" icon={MapPin} onPress={async()=>{const point=await ensureLocation();if(point)await world.checkJourney(journey.id,point);}} active grow/>:<GlassButton label="COMPLETED" icon={Check} onPress={()=>undefined} active grow/>}{next?<GlassButton label="ROUTE NEXT" icon={Navigation} onPress={()=>{void setRouteToPoint(next.name,next.latitude,next.longitude);onTab('radar');}} grow/>:null}</View></GlassPanel>;})}</ScrollView>;
}

function CrewNetworkScreen({onTab}:{onTab:(tab:TabKey)=>void}){
  const world=useWorldStore();const userId=useContentStore(state=>state.userId);const {location,lockLocation}=useLiveNetworkStore();const [crewName,setCrewName]=useState('');const [crewTag,setCrewTag]=useState('');const [territoryName,setTerritoryName]=useState('');
  useEffect(()=>{void world.refresh();},[]);const ownedCrew=world.crews.find(crew=>crew.owner_id===userId);const createTerritory=async()=>{if(!ownedCrew)return;let point=location;if(!point){await lockLocation();point=useLiveNetworkStore.getState().location;}if(point&&await world.createTerritory(ownedCrew.id,{name:territoryName||`${ownedCrew.tag} ZONE`,latitude:point.latitude,longitude:point.longitude,radiusM:1200,requiredCells:12}))setTerritoryName('');};
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.worldHero}><View><Text style={styles.eyebrow}>SOCIAL NETWORK</Text><Text style={styles.feedTitle}>CREWS</Text><Text style={styles.moreCopy}>APPROVAL · MEMBERS · TERRITORY</Text></View><Pressable onPress={()=>onTab('feed')} style={styles.worldMapButton}><Users size={22} color={paper}/></Pressable></View>{!ownedCrew?<GlassPanel style={styles.worldCard}><TextInput value={crewName} onChangeText={setCrewName} placeholder="Crew name" placeholderTextColor={muted} style={styles.authInput}/><TextInput value={crewTag} onChangeText={value=>setCrewTag(value.toUpperCase().slice(0,5))} placeholder="2-5 character tag" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="FOUND CREW" icon={Users} onPress={()=>void world.createCrew(crewName,crewTag)} active/></GlassPanel>:<GlassPanel style={styles.worldCard} glow><Text style={styles.commandTitle}>[{ownedCrew.tag}] {ownedCrew.name.toUpperCase()}</Text><Text style={styles.commandMeta}>{ownedCrew.member_count} APPROVED MEMBERS · TERRITORY AUTHORITY</Text><TextInput value={territoryName} onChangeText={setTerritoryName} placeholder="New territory name" placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="CLAIM GPS TERRITORY" icon={MapPin} onPress={()=>void createTerritory()} active/></GlassPanel>}<SectionTitle label="CREW DIRECTORY" action={`${world.crews.length} CREWS`}/>{world.crews.filter(crew=>crew.owner_id!==userId).map(crew=><View key={crew.id} style={styles.worldListRow}><View style={styles.crewSigil}><Text style={styles.crewSigilText}>{crew.tag}</Text></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{crew.name.toUpperCase()}</Text><Text style={styles.commandMeta}>{crew.member_count} MEMBERS · {(crew.member_status||'OPEN').toUpperCase()}</Text></View>{!crew.member_status?<GlassButton label="REQUEST" icon={LockKeyhole} onPress={()=>void world.joinCrew(crew.id)} compact/>:null}</View>)}{world.crewRequests.map(request=><View key={`${request.crew_id}-${request.user_id}`} style={styles.worldListRow}><UserRound size={20} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{request.username.toUpperCase()}</Text><Text style={styles.commandMeta}>REQUESTING CREW CLEARANCE</Text></View><GlassButton label="APPROVE" icon={Check} onPress={()=>void world.approveMember(request.crew_id,request.user_id)} compact/></View>)}</ScrollView>;
}

function AchievementsScreen(){
  const world=useWorldStore();const [featured,setFeatured]=useState<string[]>([]);const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');
  const load=async()=>{try{const [,data]=await Promise.all([world.refresh(),cloudflareApi.request<{badges:Array<{id:string}>}>('/api/profile/featured-badges')]);setFeatured(data.badges.map(item=>item.id));setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Badge loadout unavailable.');}};
  useEffect(()=>{void load();},[]);
  const persist=async(next:string[])=>{setBusy(true);try{const data=await cloudflareApi.request<{badgeIds:string[]}>('/api/profile/featured-badges',{method:'PUT',body:JSON.stringify({badgeIds:next})});setFeatured(data.badgeIds);setStatus('FEATURED BADGES SECURED');playInterfaceSound('unlock');}catch(error){setStatus(error instanceof Error?error.message:'Badge loadout could not be saved.');}finally{setBusy(false);}};
  const toggle=async(id:string)=>{if(busy)return;const next=featured.includes(id)?featured.filter(item=>item!==id):featured.length<4?[...featured,id]:featured; if(next===featured){setStatus('FOUR FEATURED BADGES MAXIMUM');return;}await persist(next);};
  const move=async(index:number,direction:-1|1)=>{const target=index+direction;if(target<0||target>=featured.length||busy)return;const next=[...featured];[next[index],next[target]]=[next[target],next[index]];await persist(next);};
  const featuredBadges=featured.map(id=>world.badges.find(item=>item.id===id)).filter(Boolean) as typeof world.badges;
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.worldHero}><View><Text style={styles.eyebrow}>DRIVER PROFILE</Text><Text style={styles.feedTitle}>ACHIEVEMENTS</Text><Text style={styles.moreCopy}>{world.badges.filter(item=>item.earned).length} EARNED · {world.badges.length} TRACKED</Text></View><BadgeCheck size={28} color={accent}/></View><SectionTitle label="FEATURED BADGES" action={`${featured.length}/4`}/>{featuredBadges.length?<View style={styles.featuredBadgeList}>{featuredBadges.map((badge,index)=><View key={badge.id} style={styles.featuredBadgeRow}><Text style={styles.featuredBadgeSlot}>{index+1}</Text><BadgeCheck size={18} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{badge.name}</Text><Text numberOfLines={1} style={styles.commandMeta}>{badge.description}</Text></View><Pressable accessibilityLabel="Move badge up" onPress={()=>void move(index,-1)} style={styles.itineraryAction}><ChevronRight size={14} color={index?paper:muted} style={{transform:[{rotate:'-90deg'}]}}/></Pressable><Pressable accessibilityLabel="Move badge down" onPress={()=>void move(index,1)} style={styles.itineraryAction}><ChevronRight size={14} color={index<featured.length-1?paper:muted} style={{transform:[{rotate:'90deg'}]}}/></Pressable><Pressable accessibilityLabel="Remove featured badge" onPress={()=>void toggle(badge.id)} style={styles.itineraryAction}><X size={14} color={muted}/></Pressable></View>)}</View>:<GlassPanel style={styles.emptyState}><BadgeCheck size={24} color={muted}/><Text style={styles.emptyTitle}>NO FEATURED BADGES</Text><Text style={styles.emptyCopy}>Choose up to four earned achievements for your public Driver Card.</Text></GlassPanel>}{status?<Text style={status.includes('SECURED')?styles.healthGood:styles.networkError}>{status}</Text>:null}<SectionTitle label="BADGE GALLERY" action={`${world.badges.filter(item=>item.earned).length} EARNED`}/><View style={styles.moduleGrid}>{world.badges.map(badge=>{const selected=featured.includes(badge.id);return <View key={badge.id} style={[styles.gameBadge,Boolean(badge.earned)&&styles.gameBadgeEarned]}><View style={styles.gameBadgeIcon}>{badge.earned?<BadgeCheck size={22} color={accent}/>:<LockKeyhole size={20} color={muted}/>}</View><Text style={styles.gameBadgeTitle}>{badge.name}</Text><Text style={styles.gameBadgeMeta}>{badge.description}</Text>{badge.earned?<GlassButton label={selected?'FEATURED':featured.length>=4?'LIMIT REACHED':'FEATURE'} icon={selected?X:Star} onPress={()=>void toggle(badge.id)} active={!selected&&featured.length<4} compact/>:<Text style={styles.commandMeta}>LOCKED</Text>}</View>;})}</View></ScrollView>;
}

function MeetScreen() {
  const events=useLiveNetworkStore(state=>state.events); const refreshNetwork=useLiveNetworkStore(state=>state.refreshNetwork);
  const {vehicles,activeVehicleId,userId}=useContentStore();
  const [creating,setCreating]=useState(false); const [selectedId,setSelectedId]=useState<string|null>(null); const [details,setDetails]=useState<any|null>(null); const [busy,setBusy]=useState(false);
  const [role,setRole]=useState<'attendee'|'show_car'|'sponsor'>('attendee'); const [sponsorName,setSponsorName]=useState('');
  const [draft,setDraft]=useState({title:'',location:'',stops:'',description:'',rules:'',startsAt:new Date(Date.now()+3600000).toISOString().slice(0,16)});
  const updateDraft=(key:keyof typeof draft,value:string)=>setDraft(current=>({...current,[key]:value}));
  const openMeet=async(id:string)=>{setSelectedId(id);setBusy(true);try{setDetails(await cloudflareApi.request(`/api/events/${id}`));}catch(error){Alert.alert('Meet unavailable',error instanceof Error?error.message:'Could not load meet.');}finally{setBusy(false);}};
  const createMeet=async()=>{if(!userId){Alert.alert('Sign in required','Create a free pilot account before hosting a meet.');return;}setBusy(true);try{const locations=[{label:'MEET POINT',address:draft.location},...draft.stops.split('\n').map((address,index)=>({label:`STOP ${index+1}`,address:address.trim()})).filter(item=>item.address)];const result=await cloudflareApi.request<{id:string}>('/api/events',{method:'POST',body:JSON.stringify({title:draft.title,description:draft.description,rules:draft.rules,startsAt:new Date(draft.startsAt).toISOString(),locations,allowShowCars:true,allowSponsors:true})});await refreshNetwork();setCreating(false);await openMeet(result.id);}catch(error){Alert.alert('Meet creation failed',error instanceof Error?error.message:'Could not create meet.');}finally{setBusy(false);}};
  const joinMeet=async()=>{if(!selectedId)return;setBusy(true);try{await cloudflareApi.request(`/api/events/${selectedId}/join`,{method:'POST',body:JSON.stringify({role,vehicleId:role==='show_car'?activeVehicleId:null,sponsorName:role==='sponsor'?sponsorName:null})});await Promise.all([openMeet(selectedId),refreshNetwork()]);}catch(error){Alert.alert('Registration failed',error instanceof Error?error.message:'Could not register.');}finally{setBusy(false);}};
  if(selectedId&&details){const event=details.event;return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.meetDetailHeader}><Pressable onPress={()=>{setSelectedId(null);setDetails(null);}} style={styles.closeButton}><X size={17} color={paper}/></Pressable><View style={styles.commandCopy}><Text style={styles.eyebrow}>LIVE MEET</Text><Text style={styles.feedTitle}>{String(event.title).toUpperCase()}</Text></View></View><GlassPanel glow><Text style={styles.meetLocation}>{event.location_name}</Text><Text style={styles.emptyCopy}>{event.description||'No description supplied.'}</Text><View style={styles.identityDivider}/><Text style={styles.identityLabel}>RULES</Text><Text style={styles.meetRules}>{event.rules||'Host rules have not been posted.'}</Text></GlassPanel><SectionTitle label="ROUTE LOCATIONS" action={`${details.locations.length} STOPS`}/>{details.locations.map((point:any,index:number)=><View key={point.id} style={styles.utilityRow}><Text style={styles.utilityIndex}>{String(index+1).padStart(2,'0')}</Text><View style={styles.commandCopy}><Text style={styles.utilityText}>{point.label}</Text><Text style={styles.commandMeta}>{point.location_name}</Text></View><MapPin size={17} color={accent}/></View>)}<SectionTitle label="REGISTER AS"/><View style={styles.meetRoleGrid}>{(['attendee','show_car','sponsor'] as const).map(item=><Pressable key={item} onPress={()=>setRole(item)} style={[styles.meetRole,role===item&&styles.meetRoleActive]}><Text style={[styles.segmentText,role===item&&styles.segmentTextActive]}>{item.replace('_',' ').toUpperCase()}</Text></Pressable>)}</View>{role==='show_car'?<View style={styles.fitmentBanner}><CarFront size={19} color={accent}/><Text style={styles.commandTitle}>{vehicles.find(item=>item.id===activeVehicleId)?.nickname.toUpperCase()||'ADD A GARAGE VEHICLE FIRST'}</Text></View>:null}{role==='sponsor'?<TextInput value={sponsorName} onChangeText={setSponsorName} placeholder="Sponsor or brand name" placeholderTextColor={muted} style={styles.authInput}/>:null}<GlassButton label={busy?'REGISTERING':'JOIN MEET'} icon={Check} onPress={()=>void joinMeet()} active/><SectionTitle label="REGISTERED GRID" action={`${details.registrations.length} PILOTS`}/>{details.registrations.map((entry:any)=><View key={entry.user_id} style={styles.meetRegistration}><View style={styles.opponentAvatar}>{entry.photo_url?<Image source={{uri:entry.photo_url}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{String(entry.username).slice(0,1)}</Text>}</View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{String(entry.username).toUpperCase()}</Text><Text style={styles.commandMeta}>{String(entry.role).replace('_',' ').toUpperCase()}{entry.make?` · ${entry.year} ${entry.make} ${entry.model}`:''}{entry.sponsor_name?` · ${entry.sponsor_name}`:''}</Text></View></View>)}</ScrollView>}
  return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>MEET NETWORK</Text><Text style={styles.feedTitle}>CAR MEETS</Text></View><GlassButton label={creating?'CANCEL':'HOST MEET'} icon={creating?X:Plus} onPress={()=>setCreating(value=>!value)} active/></View>{creating?<GlassPanel style={styles.meetCreatePanel} glow><TextInput value={draft.title} onChangeText={value=>updateDraft('title',value)} placeholder="Meet title" placeholderTextColor={muted} style={styles.authInput}/><TextInput value={draft.location} onChangeText={value=>updateDraft('location',value)} placeholder="Primary address or place" placeholderTextColor={muted} style={styles.authInput}/><TextInput value={draft.stops} onChangeText={value=>updateDraft('stops',value)} placeholder={'Additional route stops, one per line'} placeholderTextColor={muted} multiline style={[styles.authInput,styles.meetTextArea]}/><TextInput value={draft.startsAt} onChangeText={value=>updateDraft('startsAt',value)} placeholder="YYYY-MM-DDTHH:mm" placeholderTextColor={muted} style={styles.authInput}/><TextInput value={draft.description} onChangeText={value=>updateDraft('description',value)} placeholder="Meet description" placeholderTextColor={muted} multiline style={[styles.authInput,styles.meetTextArea]}/><TextInput value={draft.rules} onChangeText={value=>updateDraft('rules',value)} placeholder="Rules, roll-in, safety, eligibility" placeholderTextColor={muted} multiline style={[styles.authInput,styles.meetTextArea]}/><GlassButton label={busy?'CREATING':'PUBLISH MEET'} icon={MapPin} onPress={()=>void createMeet()} active/></GlassPanel>:null}<SectionTitle label="OPEN MEETS" action={`${events.length} LIVE`}/>{events.map(event=><Pressable key={event.id} onPress={()=>void openMeet(event.id)} style={({pressed})=>[styles.meetCard,pressed&&styles.pressed]}><View style={styles.eventAvatar}><MapPin size={21} color={paper}/></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{event.title.toUpperCase()}</Text><Text style={styles.commandMeta}>{event.locationName} · {event.attendees} REGISTERED · {new Date(event.startTime).toLocaleString()}</Text></View><ChevronRight size={18} color={accent}/></Pressable>)}{!events.length&&!creating?<GlassPanel style={styles.emptyState}><MapPin size={28} color={accent}/><Text style={styles.emptyTitle}>NO OPEN MEETS</Text><Text style={styles.emptyCopy}>Host the first event and register show cars, attendees, and sponsors.</Text></GlassPanel>:null}</ScrollView>;
}

type LeaderboardMode='season'|'wins'|'speed'|'reputation'|'credits';
function LeaderboardScreen(){
  const rankings=useContentStore(state=>state.rankings);
  const [mode,setMode]=useState<LeaderboardMode>('season');
  const boards:{key:LeaderboardMode;label:string;title:string;icon:IconType;value:(row:(typeof rankings)[number])=>number;format:(value:number)=>string}[]=[
    {key:'season',label:'SEASON',title:'SEASON RP',icon:Trophy,value:row=>row.points,format:value=>`${value.toLocaleString()} RP`},
    {key:'wins',label:'WINS',title:'RACE WINS',icon:Medal,value:row=>row.wins,format:value=>`${value} WINS`},
    {key:'speed',label:'SPEED',title:'TOP SPEED',icon:Gauge,value:row=>row.topSpeed,format:value=>`${Math.round(value)} KPH`},
    {key:'reputation',label:'REP',title:'REPUTATION',icon:ShieldCheck,value:row=>row.reputation,format:value=>`${value.toLocaleString()} REP`},
    {key:'credits',label:'CREDITS',title:'CREDIT VAULT',icon:Gem,value:row=>row.credits,format:value=>`${value.toLocaleString()} ACR`},
  ];
  const board=boards.find(item=>item.key===mode)!;
  const sorted=useMemo(()=>[...rankings].sort((a,b)=>board.value(b)-board.value(a)||b.points-a.points||a.alias.localeCompare(b.alias)),[rankings,mode]);
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
    <View style={styles.leaderboardHero}><View><Text style={styles.eyebrow}>APEX COMPETITION NETWORK</Text><Text style={styles.feedTitle}>LEADERBOARDS</Text><Text style={styles.leaderboardHeroMeta}>VERIFIED BOARDS · LIVE SEASON</Text></View><View style={styles.leaderboardHeroIcon}><board.icon size={30} color={accent}/></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.boardTabs}>{boards.map(item=><Pressable key={item.key} onPress={()=>setMode(item.key)} style={[styles.boardTab,mode===item.key&&styles.boardTabActive]}><item.icon size={15} color={mode===item.key?accent:muted}/><Text style={[styles.boardTabText,mode===item.key&&styles.boardTabTextActive]}>{item.label}</Text></Pressable>)}</ScrollView>
    <View style={styles.boardIdentity}><Text style={styles.identityLabel}>ACTIVE BOARD</Text><Text style={styles.boardIdentityTitle}>{board.title}</Text><Text style={styles.commandMeta}>{mode==='speed'?'PERSONAL BESTS CAPTURED IN GPS DRIVE MODE':mode==='reputation'?'ACCEPTANCE, COMPLETION, AND NETWORK TRUST':mode==='wins'?'VERIFIED HEAD-TO-HEAD RESULTS':mode==='credits'?'CURRENT VIRTUAL CREDIT BALANCE':'RACE POINTS ACROSS THE ACTIVE SEASON'}</Text></View>
    {sorted.length?<View style={styles.podium}>{[1,0,2].map(position=>{const row=sorted[position];if(!row)return null;return <View key={row.id} style={[styles.podiumPilot,position===0&&styles.podiumFirst]}><Text style={styles.podiumPlace}>#{position+1}</Text><View style={styles.podiumAvatar}>{row.avatarUrl?<Image source={{uri:row.avatarUrl}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{row.alias.slice(0,1)}</Text>}</View><Text numberOfLines={1} style={styles.podiumName}>{row.alias.toUpperCase()}</Text><Text style={styles.podiumPoints}>{board.format(board.value(row))}</Text></View>;})}</View>:null}
    <SectionTitle label="BOARD STANDINGS" action={`${sorted.length} PILOTS`}/>
    <View style={styles.standingsTable}>{sorted.map((row,index)=><View key={row.id} style={[styles.leaderboardRow,index<3&&styles.leaderboardRowTop]}><Text style={styles.leaderboardRank}>{String(index+1).padStart(2,'0')}</Text><View style={styles.podiumAvatarSmall}>{row.avatarUrl?<Image source={{uri:row.avatarUrl}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{row.alias.slice(0,1)}</Text>}</View><View style={styles.commandCopy}><Text style={styles.utilityText}>{row.alias.toUpperCase()}</Text><Text style={styles.commandMeta}>{row.tier.toUpperCase()} · {row.wins}–{row.losses} · REP {row.reputation}</Text></View><Text style={styles.leaderboardPoints}>{board.format(board.value(row))}</Text></View>)}</View>
    {!sorted.length?<GlassPanel style={styles.emptyState}><Trophy size={28} color={accent}/><Text style={styles.emptyTitle}>BOARD AWAITING RESULTS</Text><Text style={styles.emptyCopy}>Verified pilot activity will populate this leaderboard.</Text></GlassPanel>:null}
  </ScrollView>;
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
  if (kind === 'leaderboard') return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.leaderboardHero}><View><Text style={styles.eyebrow}>VERIFIED SEASON</Text><Text style={styles.feedTitle}>{title}</Text></View><Trophy size={34} color={accent}/></View>{rankings.slice(0,3).length?<View style={styles.podium}>{[1,0,2].map(position=>{const row=rankings[position];if(!row)return null;return <View key={row.id} style={[styles.podiumPilot,position===0&&styles.podiumFirst]}><Text style={styles.podiumPlace}>#{position+1}</Text><View style={styles.podiumAvatar}>{row.avatarUrl?<Image source={{uri:row.avatarUrl}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{row.alias.slice(0,1)}</Text>}</View><Text style={styles.podiumName}>{row.alias.toUpperCase()}</Text><Text style={styles.podiumPoints}>{row.points} RP</Text></View>;})}</View>:null}<SectionTitle label="GLOBAL GRID" action={`${rankings.length} PILOTS`}/>{rankings.map((row,index)=><View key={row.id} style={[styles.leaderboardRow,index<3&&styles.leaderboardRowTop]}><Text style={styles.leaderboardRank}>{String(index+1).padStart(2,'0')}</Text><View style={styles.commandCopy}><Text style={styles.utilityText}>{row.alias.toUpperCase()} / {row.tier.toUpperCase()}</Text><Text style={styles.commandMeta}>{row.wins} WINS · {row.entered} RUNS · REP {row.reputation}</Text></View><Text style={styles.leaderboardPoints}>{row.points} RP</Text></View>)}{rankings.length===0?<GlassPanel style={styles.emptyState}><Trophy size={28} color={accent}/><Text style={styles.emptyTitle}>NO RANKED PILOTS YET</Text><Text style={styles.emptyCopy}>Verified race results will populate this leaderboard.</Text></GlassPanel>:null}</ScrollView>;
  if (kind === 'meets') return <MeetScreen />;
  if (conversationId) {
    const messages = messagesMap[conversationId] || [];
    return <View style={styles.messageScreen}><View style={styles.messageHeader}><Pressable onPress={() => { unsubscribeFromConversation(conversationId); setConversationId(null); }}><X size={20} color={paper} /></Pressable><Text style={styles.utilityText}>SECURE CHANNEL</Text></View><ScrollView contentContainerStyle={styles.messageList}>{messages.map(message => <View key={message.id} style={[styles.messageBubble, message.sender_id === userId && styles.messageBubbleOwn]}><Text style={styles.messageText}>{message.content}</Text><Text style={styles.messageTime}>{new Date(message.created_at).toLocaleTimeString()}</Text></View>)}</ScrollView><View style={styles.messageComposer}><TextInput value={messageDraft} onChangeText={setMessageDraft} placeholder="Encrypted message" placeholderTextColor={muted} style={styles.commentInput} /><Pressable onPress={async () => { if (!userId || !messageDraft.trim()) return; const result = await sendMessage(conversationId, userId, messageDraft.trim()); if (!result.error) setMessageDraft(''); }}><Send size={19} color={accent} /></Pressable></View></View>;
  }
  return <ScrollView contentContainerStyle={styles.screenContent}><View style={styles.utilityHero}><Icon size={28} color={accent} /><Text style={styles.feedTitle}>{title}</Text></View>{conversations.map(conversation => <Pressable key={conversation.id} onPress={async () => { await fetchMessages(conversation.id); subscribeToConversation(conversation.id); setConversationId(conversation.id); }} style={styles.utilityRow}><View style={styles.commandCopy}><Text style={styles.utilityText}>{(conversation.group_name || conversation.other_profile?.username || 'SECURE CHANNEL').toUpperCase()}</Text><Text style={styles.commandMeta}>{conversation.last_message || 'No messages yet'}</Text></View><ChevronRight size={17} color={muted} /></Pressable>)}{conversations.length === 0 ? <GlassPanel style={styles.emptyState}><MessagesSquare size={28} color={accent} /><Text style={styles.emptyTitle}>NO CONVERSATIONS</Text><Text style={styles.emptyCopy}>Challenge or follow a real pilot to start a secure channel.</Text></GlassPanel> : null}</ScrollView>;
}

function CatalogField({label,value,options,onChange,placeholder}: {label:string;value:string;options:string[];onChange:(value:string)=>void;placeholder?:string}) {
  const [focused,setFocused]=useState(false);
  const matches=options.filter(option=>!value.trim()||option.toLowerCase().includes(value.toLowerCase())).slice(0,7);
  return <View style={styles.catalogField}><Text style={styles.identityLabel}>{label}</Text><TextInput value={value} onFocus={()=>setFocused(true)} onChangeText={onChange} placeholder={placeholder||label} placeholderTextColor={muted} style={styles.authInput}/>{focused&&matches.length?<View style={styles.catalogOptions}>{matches.map(option=><Pressable key={option} onPress={()=>{onChange(option);setFocused(false);}} style={styles.catalogOption}><Text style={styles.catalogOptionText}>{option.toUpperCase()}</Text><ChevronRight size={13} color={accent}/></Pressable>)}</View>:null}</View>;
}

const vehicleAngleLabels={front:'FRONT',rear:'REAR',driver:'DRIVER SIDE',passenger:'PASSENGER SIDE'} as const;

function DigitalTwinCapture({vehicle,onClose}:{vehicle:ReturnType<typeof useContentStore.getState>['vehicles'][number];onClose:()=>void}){
  const [angles,setAngles]=useState<Record<keyof typeof vehicleAngleLabels,string|null>>({front:null,rear:null,driver:null,passenger:null});
  const [geminiKey,setGeminiKey]=useState('');
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState('CAPTURE FOUR CLEAR ANGLES');
  const pick=async(angle:keyof typeof vehicleAngleLabels)=>{const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:ImagePicker.MediaTypeOptions.Images,quality:.82,allowsEditing:false});if(!result.canceled&&result.assets[0])setAngles(current=>({...current,[angle]:result.assets[0].uri}));};
  const generate=async()=>{const entries=Object.entries(angles) as Array<[keyof typeof vehicleAngleLabels,string|null]>;if(entries.some(([,uri])=>!uri)){setStatus('ALL FOUR ANGLES ARE REQUIRED');return;}if(!geminiKey.trim()){setStatus('ENTER YOUR GEMINI API KEY');return;}setBusy(true);setStatus('UPLOADING SECURE REFERENCES');try{const uploaded=await Promise.all(entries.map(async([angle,uri])=>({angle,url:(await cloudflareApi.upload(uri!,'photo')).url})));setStatus('MATERIALIZING DIGITAL BUILD');await cloudflareApi.request('/api/vehicle-digital-twin',{method:'POST',body:JSON.stringify({vehicleId:vehicle.id,angles:uploaded,geminiApiKey:geminiKey.trim()})});setGeminiKey('');await useContentStore.getState().loadVehicles();setStatus('DIGITAL BUILD READY');}catch(error){setStatus((error instanceof Error?error.message:'GENERATION FAILED').toUpperCase());}finally{setBusy(false);}};
  return <View><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>AI GARAGE SCAN</Text><Text style={styles.feedTitle}>DIGITAL BUILD</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={17} color={paper}/></Pressable></View>{vehicle.digitalTwinUrl?<View style={styles.twinPreview}><Image source={{uri:vehicle.digitalTwinUrl}} style={styles.twinPreviewImage} resizeMode="contain"/><LinearGradient colors={['transparent','rgba(1,3,2,.92)']} style={StyleSheet.absoluteFill}/><View style={styles.garageHeroCopy}><Text style={styles.commandTitle}>CURRENT DIGITAL BUILD</Text><BadgeCheck size={19} color={accent}/></View></View>:null}<Text style={styles.emptyCopy}>Use the same car, lighting, wheels, paint, and body setup in every frame. The references remain attached to this garage vehicle.</Text><View style={styles.angleGrid}>{(Object.keys(vehicleAngleLabels) as Array<keyof typeof vehicleAngleLabels>).map(angle=><Pressable key={angle} onPress={()=>void pick(angle)} style={[styles.angleCapture,Boolean(angles[angle])&&styles.angleCaptureReady]}>{angles[angle]?<Image source={{uri:angles[angle]!}} style={styles.angleImage}/>:<CarFront size={27} color={muted}/>}<View style={styles.angleLabel}><Text style={styles.angleLabelText}>{vehicleAngleLabels[angle]}</Text>{angles[angle]?<Check size={12} color={accent}/>:null}</View></Pressable>)}</View><GlassPanel style={styles.twinKeyPanel}><View style={styles.fitmentBanner}><Sparkles size={20} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>GEMINI IMAGE CONNECTION</Text><Text style={styles.commandMeta}>Your key is sent once to Google and is never stored by Apex.</Text></View></View><TextInput value={geminiKey} onChangeText={setGeminiKey} secureTextEntry autoCapitalize="none" placeholder="Gemini API key" placeholderTextColor={muted} style={styles.authInput}/><Text style={styles.twinStatus}>{status}</Text><GlassButton label={busy?'GENERATING BUILD':'CREATE DIGITAL BUILD'} icon={Sparkles} onPress={()=>void generate()} active/></GlassPanel></View>;
}

function GarageScreen({ onTab }: { onTab: (tab: TabKey) => void }) {
  const { vehicles, activeVehicleId, loading, error, setActiveVehicle, addVehicle } = useContentStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showTwin,setShowTwin]=useState(false);
  const [mods,setMods]=useState<any[]>([]);
  const [modDraft,setModDraft]=useState({part:'',brand:'',category:'Performance',price:'',priority:'MEDIUM'});
  const [modStatus,setModStatus]=useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [vehicleDraft, setVehicleDraft] = useState({ nickname: '', year: String(new Date().getFullYear()), make: '', model: '', trim: 'Base', engine: 'Stock', drivetrain: 'AWD', horsepower: '300', color: 'Black' });
  const [makes,setMakes]=useState<string[]>(['Acura','Alfa Romeo','Aston Martin','Audi','Bentley','BMW','Buick','Cadillac','Chevrolet','Chrysler','Dodge','Ferrari','Ford','Genesis','GMC','Honda','Hyundai','Infiniti','Jaguar','Jeep','Kia','Lamborghini','Land Rover','Lexus','Lotus','Maserati','Mazda','McLaren','Mercedes-Benz','Mini','Mitsubishi','Nissan','Porsche','Ram','Subaru','Tesla','Toyota','Volkswagen','Volvo']);
  const [models,setModels]=useState<string[]>([]);
  const colorOptions=[{name:'Black',hex:'#090B0A'},{name:'White',hex:'#F4F5F2'},{name:'Pearl White',hex:'#E8ECE6'},{name:'Silver',hex:'#AEB4B2'},{name:'Gunmetal',hex:'#515857'},{name:'Gray',hex:'#747A78'},{name:'Red',hex:'#B5242D'},{name:'Burgundy',hex:'#641E2B'},{name:'Blue',hex:'#245EB5'},{name:'Navy',hex:'#142A52'},{name:'Green',hex:'#276143'},{name:'British Racing Green',hex:'#173D2A'},{name:'Yellow',hex:'#E4C62F'},{name:'Orange',hex:'#D36A25'},{name:'Purple',hex:'#633C88'},{name:'Bronze',hex:'#8C6844'},{name:'Gold',hex:'#B69A4D'},{name:'Tan',hex:'#B69E7D'},{name:'Pink',hex:'#D78BA7'},{name:'Custom',hex:'transparent'}];
  const car = vehicles.find(vehicle => vehicle.id === activeVehicleId);
  const updateVehicle = (key: keyof typeof vehicleDraft, value: string) => setVehicleDraft(current => ({ ...current, [key]: value }));
  useEffect(()=>{void cloudflareApi.request<{makes:string[]}>('/api/vehicle-catalog').then(data=>setMakes(data.makes||[])).catch(()=>undefined);},[]);
  useEffect(()=>{if(!vehicleDraft.make)return;const timer=setTimeout(()=>void cloudflareApi.request<{models:string[]}>(`/api/vehicle-catalog?year=${encodeURIComponent(vehicleDraft.year)}&make=${encodeURIComponent(vehicleDraft.make)}`).then(data=>setModels(data.models||[])).catch(()=>setModels([])),250);return()=>clearTimeout(timer);},[vehicleDraft.make,vehicleDraft.year]);
  const loadMods=async()=>{if(!activeVehicleId){setMods([]);return;}try{const data=await cloudflareApi.request<{wishlist:any[]}>(`/api/vehicles/${activeVehicleId}/wishlist`);setMods(data.wishlist||[]);setModStatus('SYNCED ACROSS DEVICES');}catch(error){setModStatus(error instanceof Error?error.message:'MOD SYNC UNAVAILABLE');}};
  useEffect(()=>{void loadMods();},[activeVehicleId]);
  const saveMod=async()=>{if(!activeVehicleId||!modDraft.part.trim())return;try{await cloudflareApi.request(`/api/vehicles/${activeVehicleId}/wishlist`,{method:'POST',body:JSON.stringify({...modDraft,price:Number(modDraft.price)||0})});setModDraft({part:'',brand:'',category:'Performance',price:'',priority:'MEDIUM'});playInterfaceSound('unlock');await loadMods();}catch(error){setModStatus(error instanceof Error?error.message:'MOD SYNC FAILED');}};
  const deleteMod=async(id:string)=>{if(!activeVehicleId)return;try{await cloudflareApi.request(`/api/vehicles/${activeVehicleId}/wishlist/${id}`,{method:'DELETE'});await loadMods();}catch(error){setModStatus(error instanceof Error?error.message:'DELETE FAILED');}};
  const pickVehiclePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: .9, allowsEditing: false });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };
  const saveVehicle = async () => {
    const ready = await addVehicle({ ...vehicleDraft, nickname: vehicleDraft.nickname || `${vehicleDraft.make} ${vehicleDraft.model}`, year: Number(vehicleDraft.year), horsepower: Number(vehicleDraft.horsepower) || 0 }, photoUri);
    if (ready) { setShowAdd(false); setPhotoUri(null); setVehicleDraft({ nickname: '', year: String(new Date().getFullYear()), make: '', model: '', trim: 'Base', engine: 'Stock', drivetrain: 'AWD', horsepower: '300', color: 'Black' }); }
  };
  if(car&&showTwin)return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><DigitalTwinCapture vehicle={car} onClose={()=>setShowTwin(false)}/></ScrollView>;
  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.garageSwitcher}>
        {vehicles.map(item => (
          <Pressable key={item.id} onPress={() => setActiveVehicle(item.id)} style={[styles.carChip, activeVehicleId === item.id && styles.carChipActive]}>
            <CarFront size={15} color={activeVehicleId === item.id ? accent : paper} />
            <Text style={[styles.carChipText, activeVehicleId === item.id && styles.carChipTextActive]}>{item.nickname.toUpperCase()}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => setShowAdd(value => !value)} style={styles.addCarButton}><Plus size={18} color={accent} /></Pressable>
      </View>
      {(showAdd || !car) ? <GlassPanel style={styles.vehicleForm} glow><View style={styles.notificationHeader}><View><Text style={styles.eyebrow}>VERIFIED FITMENT IDENTITY</Text><Text style={styles.notificationTitle}>ADD VEHICLE</Text></View>{car ? <Pressable onPress={() => setShowAdd(false)} style={styles.closeButton}><X size={17} color={paper} /></Pressable> : null}</View><Pressable onPress={pickVehiclePhoto} style={styles.vehiclePhotoPicker}>{photoUri ? <Image source={{ uri: photoUri }} style={styles.vehiclePhotoPreview} /> : <><CarFront size={32} color={accent} /><Text style={styles.composerHint}>UPLOAD YOUR ACTUAL CAR PHOTO</Text></>}</Pressable>
        <View style={styles.fitmentStep}><Text style={styles.fitmentStepNo}>01</Text><View style={styles.commandCopy}><Text style={styles.commandTitle}>VEHICLE IDENTITY</Text><Text style={styles.commandMeta}>NHTSA make and model catalog</Text></View></View>
        <View style={styles.vehicleFormGrid}><View style={styles.catalogField}><Text style={styles.identityLabel}>YEAR</Text><TextInput value={vehicleDraft.year} onChangeText={value=>updateVehicle('year',value.replace(/\D/g,'').slice(0,4))} keyboardType="numeric" placeholder="YEAR" placeholderTextColor={muted} style={styles.authInput}/></View><CatalogField label={`MAKE · ${makes.length} OPTIONS`} value={vehicleDraft.make} options={makes} onChange={value=>setVehicleDraft(current=>({...current,make:value,model:''}))}/><CatalogField label={`MODEL · ${models.length||'—'} OPTIONS`} value={vehicleDraft.model} options={models} onChange={value=>updateVehicle('model',value)} placeholder={vehicleDraft.make?'SELECT MODEL':'SELECT MAKE FIRST'}/><CatalogField label="TRIM" value={vehicleDraft.trim} options={['Base','Standard','Premium','Luxury','Sport','Touring','Limited','Performance','Competition','Track','NISMO','Type R','Type S','GT','GT-Line','GTS','RS','ST','S','SE','SEL','SL','SV','Platinum']} onChange={value=>updateVehicle('trim',value)}/></View>
        <View style={styles.fitmentStep}><Text style={styles.fitmentStepNo}>02</Text><View style={styles.commandCopy}><Text style={styles.commandTitle}>POWERTRAIN</Text><Text style={styles.commandMeta}>Used for marketplace fitment</Text></View></View>
        <View style={styles.choiceSection}><Text style={styles.identityLabel}>ENGINE / POWER UNIT</Text><View style={styles.choiceRail}>{['Stock','I3','I4','I5','I6','Flat-4','Flat-6','V6','V8','V10','V12','W12','Rotary','Diesel','Hybrid','Plug-in Hybrid','Single Motor EV','Dual Motor EV','Tri Motor EV'].map(item=><Pressable key={item} onPress={()=>updateVehicle('engine',item)} style={[styles.choiceChip,vehicleDraft.engine===item&&styles.choiceChipActive]}><Text style={[styles.choiceChipText,vehicleDraft.engine===item&&styles.choiceChipTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View></View>
        <View style={styles.choiceSection}><Text style={styles.identityLabel}>DRIVETRAIN</Text><View style={styles.choiceRail}>{['FWD','RWD','AWD','4WD','4x4','Dual Motor AWD','Tri Motor AWD'].map(item=><Pressable key={item} onPress={()=>updateVehicle('drivetrain',item)} style={[styles.choiceChip,vehicleDraft.drivetrain===item&&styles.choiceChipActive]}><Text style={[styles.choiceChipText,vehicleDraft.drivetrain===item&&styles.choiceChipTextActive]}>{item}</Text></Pressable>)}</View></View>
        <View style={styles.horsepowerPanel}><View style={styles.horsepowerTop}><View><Text style={styles.identityLabel}>HORSEPOWER</Text><Text style={styles.horsepowerHint}>CURRENT WHEEL OR CRANK ESTIMATE</Text></View><Text style={styles.horsepowerValue}>{vehicleDraft.horsepower} HP</Text></View><Slider minimumValue={50} maximumValue={2000} step={10} value={Number(vehicleDraft.horsepower)||300} onValueChange={value=>updateVehicle('horsepower',String(value))} minimumTrackTintColor={accent} maximumTrackTintColor="rgba(255,255,255,.16)" thumbTintColor={paper}/><View style={styles.sliderLabels}><Text style={styles.commandMeta}>50</Text><Text style={styles.commandMeta}>2,000 HP</Text></View></View>
        <View style={styles.choiceSection}><Text style={styles.identityLabel}>COLOR</Text><View style={styles.colorGrid}>{colorOptions.map(item=><Pressable key={item.name} onPress={()=>updateVehicle('color',item.name)} style={[styles.colorChoice,vehicleDraft.color===item.name&&styles.colorChoiceActive]}><View style={[styles.colorSwatch,{backgroundColor:item.hex},item.name==='Custom'&&styles.customSwatch]}/><Text style={styles.colorChoiceText}>{item.name.toUpperCase()}</Text></Pressable>)}</View></View><View style={styles.catalogFieldWide}><Text style={styles.identityLabel}>GARAGE NAME</Text><TextInput value={vehicleDraft.nickname} onChangeText={value=>updateVehicle('nickname',value)} placeholder="OPTIONAL NICKNAME" placeholderTextColor={muted} style={styles.authInput}/></View>
        {error ? <Text style={styles.networkError}>{error}</Text> : null}<GlassButton label={loading ? 'UPLOADING BUILD' : 'ADD TO GARAGE'} icon={Plus} onPress={() => void saveVehicle()} active /></GlassPanel> : <>
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

      <SectionTitle label="DIGITAL BUILD" action={car.digitalTwinUrl?'READY':'4 ANGLES'} />
      <Pressable onPress={()=>setShowTwin(true)} style={({pressed})=>[styles.fitmentCard,styles.digitalBuildCard,pressed&&styles.pressed]}><View style={styles.fitmentIcon}><Sparkles size={24} color={accent}/></View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{car.digitalTwinUrl?'UPDATE DIGITAL CAR':'SCAN THIS CAR'}</Text><Text style={styles.commandMeta}>Four-angle capture · AI-accurate paint, wheels, and body</Text></View><ChevronRight size={18} color={accent}/></Pressable>

      <SectionTitle label="BUILD IDENTITY" action="EDIT" />
      <GlassPanel>
        <View style={styles.identityRow}><Text style={styles.identityLabel}>COLOR</Text><Text style={styles.identityValue}>{car.color.toUpperCase()}</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>ENGINE</Text><Text style={styles.identityValue}>{car.engine.toUpperCase()}</Text></View>
        <View style={styles.identityDivider} />
        <View style={styles.identityRow}><Text style={styles.identityLabel}>VISIBILITY</Text><Text style={styles.identityValue}>PUBLIC SPECS</Text></View>
      </GlassPanel>

      <SectionTitle label="FITMENT VAULT" action="LIVE SEARCH" />
      <Pressable onPress={() => onTab('parts')} style={({ pressed }) => [styles.fitmentCard, pressed && styles.pressed]}>
        <View style={styles.fitmentIcon}><ScanLine size={24} color={accent} /></View>
        <View style={styles.commandCopy}><Text style={styles.commandTitle}>PARTS FOR THIS BUILD</Text><Text style={styles.commandMeta}>Year · trim · engine · drivetrain verified</Text></View>
        <ChevronRight size={18} color={accent} />
      </Pressable>
      <SectionTitle label="MOD SYNC" action={`${mods.length} SAVED`} />
      <GlassPanel glow><View style={styles.fitmentBanner}><RefreshCw size={19} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>BUILD PLANNER</Text><Text style={styles.commandMeta}>{modStatus||'SERVER-SYNCED PARTS FOR THIS VEHICLE'}</Text></View></View><TextInput value={modDraft.part} onChangeText={part=>setModDraft(current=>({...current,part}))} placeholder="Part name" placeholderTextColor={muted} style={styles.authInput}/><View style={styles.sheetActions}><TextInput value={modDraft.brand} onChangeText={brand=>setModDraft(current=>({...current,brand}))} placeholder="Brand" placeholderTextColor={muted} style={[styles.authInput,{flex:1}]}/><TextInput value={modDraft.price} onChangeText={price=>setModDraft(current=>({...current,price:price.replace(/[^0-9.]/g,'')}))} keyboardType="decimal-pad" placeholder="Price" placeholderTextColor={muted} style={[styles.authInput,{flex:1}]}/></View><View style={styles.sheetActions}>{(['LOW','MEDIUM','HIGH'] as const).map(priority=><Pressable key={priority} onPress={()=>setModDraft(current=>({...current,priority}))} style={[styles.durationChoice,modDraft.priority===priority&&styles.durationChoiceActive]}><Text style={[styles.segmentText,modDraft.priority===priority&&styles.segmentTextActive]}>{priority}</Text></Pressable>)}</View><GlassButton label="SYNC MOD" icon={Plus} onPress={()=>void saveMod()} active/></GlassPanel>
      {mods.map(item=><View key={item.id} style={styles.worldListRow}><PackageCheck size={19} color={item.installed?accent:paper}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{String(item.part).toUpperCase()}</Text><Text style={styles.commandMeta}>{String(item.brand||'UNBRANDED').toUpperCase()} · {item.priority} · {Number(item.price||0).toLocaleString(undefined,{style:'currency',currency:'USD'})}</Text></View>{item.url?<Pressable onPress={()=>Linking.openURL(item.url)} style={styles.productIconButton}><ExternalLink size={15} color={accent}/></Pressable>:null}<Pressable onPress={()=>void deleteMod(item.id)} style={styles.productIconButton}><X size={15} color={muted}/></Pressable></View>)}
      </>}
    </ScrollView>
  );
}

function SpecCell({ value, label, accentValue = false }: { value: string; label: string; accentValue?: boolean }) {
  return <View style={styles.specCell}><Text style={[styles.specValue, accentValue && { color: accent }]}>{value}</Text><Text style={styles.specLabel}>{label}</Text></View>;
}

function RaceScreen() {
  const formats = ['0–60', '60–130', '45 SEC', 'TOP SPEED'];
  const [raceMode,setRaceMode]=useState<'challenge'|'route'|'relay'>('challenge');
  const [view, setView] = useState<'stage' | 'inbox'>('stage');
  const [format, setFormat] = useState(formats[1]);
  const [opponents, setOpponents] = useState<string[]>([]);
  const [opponentQuery,setOpponentQuery]=useState('');
  const [wager, setWager] = useState(500);
  const [tracking, setTracking] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [gpsStatus, setGpsStatus] = useState('GPS STANDBY');
  const [schedule, setSchedule] = useState<'now' | 'later'>('now');
  const [contractStatus, setContractStatus] = useState('STAGE CONTRACT');
  const [inboxFilter,setInboxFilter]=useState<'pending'|'accepted'|'history'>('pending');
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const { pilots, races, profile, challengeTargetId, loadPilots, loadRaces, respondToRace, startRace, checkRace, setChallengeTarget } = useContentStore();
  const {route,location}=useLiveNetworkStore();
  const creditBalance=profile?.credits||0;
  const challengePilots=useMemo(()=>pilots.filter(pilot=>!opponentQuery.trim()||`${pilot.alias} ${pilot.vehicle||''}`.toLowerCase().includes(opponentQuery.trim().toLowerCase())).slice(0,24),[pilots,opponentQuery]);
  const visibleRaces=races.filter(race=>inboxFilter==='pending'?['pending','rescheduled'].includes(race.status):inboxFilter==='accepted'?['accepted','scheduled','live'].includes(race.status):!['pending','rescheduled','accepted','scheduled','live'].includes(race.status));

  useEffect(()=>{if(wager>creditBalance)setWager(creditBalance);},[creditBalance,wager]);

  useEffect(() => {
    if (challengeTargetId) {
      setOpponents([challengeTargetId]);
      setChallengeTarget(null);
    }
    void Promise.all([loadPilots(),loadRaces()]);
    return () => subscription.current?.remove();
  }, []);

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
    if(raceMode!=='challenge'&&(!route||!location)){setContractStatus('BUILD ROUTE + LOCK GPS');return;}
    setContractStatus('ENCRYPTING');
    const type = format === '0–60' ? 'Drag Race' : format === 'TOP SPEED' ? 'Time Attack' : 'Roll Race';
    try {
      const data = await cloudflareApi.request<{ id: string }>('/api/races', { method: 'POST', body: JSON.stringify({
        opponentIds: opponents, raceType: raceMode==='relay'?'Relay Race':raceMode==='route'?'Route Race':type, raceMode, routeName:raceMode==='challenge'?format:route?.destination||format,
        route:raceMode==='challenge'?[]:[{name:'START GRID',latitude:location!.latitude,longitude:location!.longitude},...(route?.stops||[])],courseVerified:raceMode!=='challenge',maxParticipants:opponents.length+1,
        distanceMiles: raceMode==='challenge'?(format === '0–60' ? .25 : .5):(route?.distanceKm||0)*.621371, rules: raceMode==='challenge'?`${format} GPS-verified run`:'Controlled-course GPS checkpoints · obey venue rules', startsAt: new Date(Date.now() + (schedule === 'later' ? 3600000 : 0)).toISOString(), wagerCredits: raceMode==='relay'?0:wager,
      }) });
      setContractStatus(`CONTRACT ${data.id.slice(0, 8).toUpperCase()}`);
      await loadRaces(); setView('inbox');
    } catch (error) {
      setContractStatus((error instanceof Error ? error.message : 'CONTRACT FAILED').toUpperCase().slice(0, 32));
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.raceHeader}>
        <View><Text style={styles.eyebrow}>RACE NETWORK</Text><Text style={styles.raceTitle}>{view === 'stage' ? 'STAGE A RUN' : 'CHALLENGES'}</Text></View>
        <View style={styles.secureMark}><LockKeyhole size={16} color={accent} /><Text style={styles.secureText}>SECURE</Text></View>
      </View>
      <View style={styles.raceViewTabs}><Pressable onPress={() => setView('stage')} style={[styles.raceViewTab,view==='stage'&&styles.raceViewTabActive]}><Swords size={15} color={view==='stage'?accent:muted}/><Text style={[styles.segmentText,view==='stage'&&styles.segmentTextActive]}>NEW CHALLENGE</Text></Pressable><Pressable onPress={() => setView('inbox')} style={[styles.raceViewTab,view==='inbox'&&styles.raceViewTabActive]}><Bell size={15} color={view==='inbox'?accent:muted}/><Text style={[styles.segmentText,view==='inbox'&&styles.segmentTextActive]}>RACE INBOX · {races.length}</Text></Pressable></View>

      {view === 'inbox' ? <><View style={styles.inboxFilters}>{(['pending','accepted','history'] as const).map(item=><Pressable key={item} onPress={()=>setInboxFilter(item)} style={[styles.inboxFilter,inboxFilter===item&&styles.inboxFilterActive]}><Text style={[styles.segmentText,inboxFilter===item&&styles.segmentTextActive]}>{item.toUpperCase()} · {races.filter(race=>item==='pending'?['pending','rescheduled'].includes(race.status):item==='accepted'?['accepted','scheduled','live'].includes(race.status):!['pending','rescheduled','accepted','scheduled','live'].includes(race.status)).length}</Text></Pressable>)}</View>{visibleRaces.map(race => { const myInvite=race.participants.find(item=>item.userId===useContentStore.getState().userId); const myEntry=race.entries.find(item=>item.userId===useContentStore.getState().userId); const canRespond=!race.isChallenger&&myInvite?.status==='invited'; return <GlassPanel key={race.id} style={styles.raceContractCard} glow={canRespond||race.status==='live'}><View style={styles.raceContractTop}><View><Text style={styles.eyebrow}>{race.raceMode.toUpperCase()} · {race.status.toUpperCase()}</Text><Text numberOfLines={2} style={styles.raceContractTitle}>{race.raceType.toUpperCase()} / {race.routeName}</Text></View><CreditsToken value={race.prizePool||race.wagerCredits} compact /></View><Text style={styles.raceContractMeta}>{race.challengerName.toUpperCase()} · {new Date(race.startsAt).toLocaleString()} · {race.entries.length||race.participants.length+1} PILOTS · {race.checkpoints.length} MARKS</Text><View style={styles.raceParticipantRail}>{race.entries.length?race.entries.map(pilot=><View key={pilot.userId} style={styles.raceParticipant}><Text style={styles.raceParticipantName}>{pilot.place?`P${pilot.place} · `:''}{pilot.username.toUpperCase()}</Text><Text style={styles.raceParticipantStatus}>{pilot.status.toUpperCase()}{pilot.payoutCredits?` · +${pilot.payoutCredits} ACR`:''}</Text></View>):race.participants.map(pilot=><View key={pilot.userId} style={styles.raceParticipant}><Text style={styles.raceParticipantName}>{pilot.username.toUpperCase()}</Text><Text style={styles.raceParticipantStatus}>{pilot.status.toUpperCase()} · REP {pilot.reputation}</Text></View>)}</View><View style={styles.sheetActions}>{canRespond?<><GlassButton label="ACCEPT" icon={Check} onPress={async()=>Alert.alert('Race updated',(await respondToRace(race.id,'accept')).toUpperCase())} active grow/><GlassButton label="DECLINE" icon={X} onPress={async()=>Alert.alert('Race updated',(await respondToRace(race.id,'decline')).toUpperCase())} grow/></>:null}{race.isChallenger&&race.status==='scheduled'?<GlassButton label="LAUNCH GRID" icon={Play} onPress={async()=>Alert.alert('Race grid',(await startRace(race.id)).toUpperCase())} active grow/>:null}{race.status==='live'&&myEntry&&race.raceMode!=='challenge'?<GlassButton label="CHECK MARK" icon={MapPin} onPress={async()=>location?Alert.alert('Checkpoint',(await checkRace(race.id,{latitude:location.latitude,longitude:location.longitude,accuracy:location.accuracy})).toUpperCase()):Alert.alert('GPS required','Lock your location on Map first.')} active grow/>:null}{race.status!=='live'?<GlassButton label="+1H" icon={CalendarDays} onPress={async()=>Alert.alert('Race rescheduled',(await respondToRace(race.id,'reschedule',new Date(Date.parse(race.startsAt)+3600000).toISOString())).toUpperCase())} grow/>:null}</View></GlassPanel>;})}{visibleRaces.length===0?<GlassPanel style={styles.emptyState}><Swords size={28} color={accent}/><Text style={styles.emptyTitle}>NO {inboxFilter.toUpperCase()} CHALLENGES</Text><Text style={styles.emptyCopy}>Race contracts are separated by their current status.</Text></GlassPanel>:null}</> : <>

      <SectionTitle label="RACE SYSTEM" action={route?`${route.stops.length} ROUTE STOPS`:'NO ROUTE'} />
      <View style={styles.raceModeGrid}>{([{id:'challenge',label:'SPEED RUN',icon:Gauge},{id:'route',label:'ROUTE RACE',icon:Navigation},{id:'relay',label:'RELAY',icon:Users}] as const).map(item=><Pressable key={item.id} onPress={()=>setRaceMode(item.id)} style={[styles.raceModeChoice,raceMode===item.id&&styles.raceModeChoiceActive]}><item.icon size={18} color={raceMode===item.id?accent:muted}/><Text style={[styles.segmentText,raceMode===item.id&&styles.segmentTextActive]}>{item.label}</Text></Pressable>)}</View>
      {raceMode!=='challenge'?<GlassPanel style={styles.courseBanner} glow={Boolean(route)}><Route size={20} color={route?accent:muted}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>{route?route.destination.toUpperCase():'BUILD A CONTROLLED COURSE ON MAP'}</Text><Text style={styles.commandMeta}>{route?`${route.distanceKm.toFixed(1)} KM · START + ${route.stops.length} CHECKPOINTS · ${raceMode==='relay'?'LEGS AUTO-ASSIGNED':'PODIUM TIMING'}`:'ROUTE RACES REQUIRE GPS CHECKPOINTS AND VENUE PERMISSION'}</Text></View></GlassPanel>:null}

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
      <View style={styles.pilotSearch}><ScanLine size={16} color={accent}/><TextInput value={opponentQuery} onChangeText={setOpponentQuery} placeholder="Search pilot or vehicle" placeholderTextColor={muted} style={styles.pilotSearchInput}/><Text style={styles.commandMeta}>{challengePilots.length}/{pilots.length}</Text></View>
      {challengePilots.map(pilot => (
        <Pressable key={pilot.id} onPress={() => toggleOpponent(pilot.id)} style={[styles.opponentRow, opponents.includes(pilot.id) && styles.opponentRowActive]}>
          <View style={styles.opponentAvatar}>{pilot.photoUrl?<Image source={{uri:pilot.photoUrl}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{pilot.alias.slice(0, 1)}</Text>}</View>
          <View style={styles.commandCopy}><Text style={styles.commandTitle}>{pilot.alias}</Text><Text style={styles.commandMeta}>{pilot.vehicle||'GARAGE PRIVATE'} · {pilot.wins}–{pilot.losses} · REP {pilot.reputation}</Text></View>
          <View style={[styles.checkRing, opponents.includes(pilot.id) && styles.checkRingActive]}>{opponents.includes(pilot.id) ? <View style={styles.checkCore} /> : null}</View>
        </Pressable>
      ))}
      {pilots.length===0?<GlassPanel style={styles.emptyState}><Users size={28} color={accent}/><Text style={styles.emptyTitle}>NO OTHER PILOTS YET</Text><Text style={styles.emptyCopy}>New accounts automatically enter the pilot directory and become challengeable.</Text></GlassPanel>:null}

      <SectionTitle label="CONTRACT WAGER / EACH PILOT" />
      <GlassPanel glow>
        <View style={styles.wagerRow}>
          <Pressable onPress={() => setWager(Math.max(0, wager - 100))} style={styles.wagerControl}><Text style={styles.wagerControlText}>−</Text></Pressable>
          <CreditsToken value={wager} compact />
          <Pressable onPress={() => setWager(Math.min(creditBalance,wager + 100))} style={styles.wagerControl}><Plus size={19} color={paper} /></Pressable>
        </View>
        <View style={styles.wagerBalanceRow}><Text style={styles.wagerFootnote}>BALANCE {creditBalance.toLocaleString()} · HELD WHEN ALL ACCEPT</Text><Pressable onPress={()=>setWager(creditBalance)}><Text style={styles.sectionAction}>MAX</Text></Pressable></View>
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
      </>}
    </ScrollView>
  );
}

function VaultScreen() {
  const profile = useContentStore(state => state.profile);
  const balance = profile?.credits || 0;
  const [ghost,setGhost]=useState<any|null>(null);const [shop,setShop]=useState<any[]>([]);const [rank,setRank]=useState<any|null>(null);const [refreshesAt,setRefreshesAt]=useState<string|null>(null);const [now,setNow]=useState(Date.now());const [category,setCategory]=useState('all');const [loading,setLoading]=useState(true);const [status,setStatus]=useState('');
  const load=async()=>{setLoading(true);try{const [profileData,shopData,rankData]=await Promise.all([cloudflareApi.request<any>('/api/ghost/profile'),cloudflareApi.request<any>('/api/ghost/shop'),cloudflareApi.request<any>('/api/rank')]);setGhost(profileData);setShop(shopData.items||[]);setRank(rankData);setRefreshesAt(shopData.refreshesAt||null);setStatus('');}catch(error){setStatus(error instanceof Error?error.message:'Ghost network unavailable.');}finally{setLoading(false);}};
  useEffect(()=>{void load();},[]);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
  const purchase=async(id:string)=>{try{await cloudflareApi.request(`/api/ghost/shop/${id}/purchase`,{method:'POST'});playInterfaceSound('unlock');await load();}catch(error){setStatus(error instanceof Error?error.message:'Purchase failed.');playInterfaceSound('error');}};
  const equip=async(id:string)=>{try{await cloudflareApi.request('/api/ghost/equip',{method:'POST',body:JSON.stringify({itemId:id})});setStatus('COSMETIC EQUIPPED');await load();}catch(error){setStatus(error instanceof Error?error.message:'Equip failed.');}};
  const unequip=async(category:string)=>{try{await cloudflareApi.request(`/api/ghost/equip/${category}`,{method:'DELETE'});setStatus('COSMETIC UNEQUIPPED');await load();}catch(error){setStatus(error instanceof Error?error.message:'Unequip failed.');}};
  const categories=[['all','ALL'],['frame','FRAMES'],['card','DRIVER CARDS'],['banner','BANNERS'],['badge','BADGES'],['garage','GARAGE'],['map','MAP'],['showcase','SHOWCASE']];
  const equippedByCategory=Object.fromEntries((ghost?.equipped||[]).map((entry:any)=>[entry.category,entry.item_id]));
  const visibleShop=shop.filter(item=>category==='all'||item.category===category);
  const secondsRemaining=refreshesAt?Math.max(0,Math.ceil((Date.parse(refreshesAt)-now)/1000)):0;
  const refreshLabel=`${String(Math.floor(secondsRemaining/3600)).padStart(2,'0')}:${String(Math.floor(secondsRemaining%3600/60)).padStart(2,'0')}:${String(secondsRemaining%60).padStart(2,'0')}`;
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
      <SectionTitle label="GHOST CREDITS" action={loading?'SYNCING':'SERVER LEDGER'} />
      <GlassPanel glow><View style={styles.vaultTop}><View><Text style={styles.commandTitle}>{Number(ghost?.profile?.credits||0).toLocaleString()} GC</Text><Text style={styles.commandMeta}>GHOST STREAK x{ghost?.profile?.current_streak||0} · BEST x{ghost?.profile?.best_streak||0}</Text></View><Gem size={23} color={accent}/></View><View style={styles.identityDivider}/><Text style={styles.commandMeta}>{ghost?.profile?.activities_completed||0} ACTIVITIES · {ghost?.profile?.drops_claimed||0} CACHES · {ghost?.profile?.bounty_escapes||0} SURVIVALS</Text><View style={styles.streakProgress}><Text style={styles.cacheStatus}>NEXT // x{Math.max(2,Math.ceil(((ghost?.profile?.current_streak||0)+1)/2)*2)}</Text><Text style={styles.commandMeta}>COMPLETE CACHES TO INCREASE SHOP ACCESS</Text></View></GlassPanel>
      <SectionTitle label="PILOT LOADOUT" action={`${Object.keys(equippedByCategory).length} EQUIPPED`} />
      <GlassPanel style={styles.loadoutPreview} glow><View style={styles.loadoutFrame}><Text style={styles.loadoutPilot}>{profile?.alias?.toUpperCase()||'UNKNOWN PILOT'}</Text><Text style={styles.loadoutRank}>{rank?.rank||profile?.tier||'ROOKIE'}</Text><Text style={styles.loadoutVehicle}>{Object.values(equippedByCategory).length ? Object.values(equippedByCategory).join(' // ') : 'STANDARD SIGNAL'}</Text></View><View style={styles.loadoutSlots}>{Object.entries(equippedByCategory).map(([slot,itemId])=><Pressable key={slot} onPress={()=>void unequip(slot)} style={styles.loadoutSlot}><Text style={styles.loadoutSlotText}>{slot.toUpperCase()}</Text><X size={12} color={muted}/></Pressable>)}{!Object.keys(equippedByCategory).length?<Text style={styles.commandMeta}>OWN A COSMETIC TO CUSTOMIZE YOUR DRIVER CARD.</Text>:null}</View></GlassPanel>
      <SectionTitle label="GHOST SHOP" action={`REFRESHES // ${refreshLabel}`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopCategoryRail}>{categories.map(([value,label])=><Pressable key={value} onPress={()=>setCategory(value)} style={[styles.shopCategoryChip,category===value&&styles.shopCategoryChipActive]}><Text style={[styles.shopCategoryText,category===value&&styles.shopCategoryTextActive]}>{label}</Text></Pressable>)}</ScrollView>
      {visibleShop.map(item=>{const equipped=equippedByCategory[item.category]===item.id;const locked=!item.owned&&((item.requirement_type==='streak'&&Number(ghost?.profile?.current_streak||0)<Number(item.requirement_value))||(item.requirement_type==='rank'&&Number(rank?.rep||0)<Number(item.requirement_value)));const previewIcon=item.category==='frame'?UserRound:item.category==='card'?BadgeCheck:item.category==='banner'?Layers3:item.category==='map'?Map:item.category==='garage'?CarFront:item.category==='showcase'?Sparkles:Medal;const Preview=previewIcon;return <GlassPanel key={item.id} style={[styles.ghostShopCard,locked&&styles.ghostShopLocked]} glow={item.rarity==='ELITE'||item.rarity==='APEX'}><View style={styles.ghostShopPreview}><Preview size={30} color={equipped?'#2CFF83':accent}/><Text style={styles.ghostShopPreviewLabel}>{item.category.toUpperCase()}</Text></View><View style={styles.ghostShopContent}><View style={styles.worldCardTop}><View style={styles.commandCopy}><Text style={styles.commandTitle}>{String(item.name).toUpperCase()}</Text><Text style={styles.commandMeta}>{item.description}</Text><Text style={styles.commandMeta}>{item.rarity} · {item.requirement_type?`${item.requirement_type.toUpperCase()} ${item.requirement_value}`:'OPEN ACCESS'}</Text></View><Text style={styles.contractReward}>{item.price_gc} GC</Text></View><View style={styles.ghostShopAction}>{equipped?<GlassButton label="UNEQUIP" icon={X} onPress={()=>void unequip(item.category)} grow/>:item.owned?<GlassButton label="EQUIP" icon={Check} onPress={()=>void equip(item.id)} active grow/>:<GlassButton label={locked?'LOCKED':'ACQUIRE'} icon={locked?LockKeyhole:ShoppingBag} onPress={()=>void purchase(item.id)} active={!locked} grow/>}</View></View></GlassPanel>;})}
      {!loading&&!visibleShop.length?<GlassPanel style={styles.emptyState}><Radio size={26} color={accent}/><Text style={styles.emptyTitle}>NO SIGNALS IN THIS CHANNEL</Text><Text style={styles.emptyCopy}>The next secure shop rotation may reveal new inventory.</Text></GlassPanel>:null}
      <SectionTitle label="GHOST LEDGER" action="LAST 50" />
      {(ghost?.transactions||[]).slice(0,8).map((entry:any)=><LedgerRow key={entry.id} icon={entry.amount>0?Gift:ShoppingBag} title={entry.source} meta={new Date(entry.created_at).toLocaleString()} value={`${entry.amount>0?'+':''}${entry.amount} GC`}/>)}
      {status?<Text style={styles.networkError}>{status.toUpperCase()}</Text>:null}
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

type InviteCodeRow={id:string;code:string;label:string;max_uses:number;use_count:number;expires_at:string|null;is_active:number;created_at:string};
type InviteRedemption={code_id:string;email:string;redeemed_at:string;user_id:string;username:string;display_name:string;avatar_url:string|null};

function MemberInviteScreen(){
  const [codes,setCodes]=useState<InviteCodeRow[]>([]);const [label,setLabel]=useState('PILOT INVITE');const [limit,setLimit]=useState(3);const [burn,setBurn]=useState(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const load=async()=>{try{const data=await cloudflareApi.request<{codes:InviteCodeRow[]}>('/api/invites');setCodes(data.codes);setError('');}catch(reason){setError(reason instanceof Error?reason.message:'Invite network failed.');}};useEffect(()=>{void load();},[]);
  const create=async()=>{setBusy(true);try{await cloudflareApi.request('/api/invites',{method:'POST',body:JSON.stringify({label,maxUses:burn?1:limit,burnAfterUse:burn})});playInterfaceSound('unlock');await load();}catch(reason){playInterfaceSound('error');setError(reason instanceof Error?reason.message:'Code creation failed.');}finally{setBusy(false);}};
  const toggle=async(id:string)=>{await cloudflareApi.request(`/api/invites/${id}/toggle`,{method:'POST'});await load();};const copyCode=async(code:string)=>{if(Platform.OS==='web'&&navigator.clipboard)await navigator.clipboard.writeText(code);Alert.alert('Access code',`${code}\n\nCopied to clipboard.`);};
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>INVITATION CHAIN</Text><Text style={styles.feedTitle}>ACCESS NETWORK</Text></View><View style={styles.adminLive}><View style={styles.liveDot}/><Text style={styles.adminLiveText}>PILOT</Text></View></View><GlassPanel glow><View style={styles.fitmentBanner}><LockKeyhole size={20} color={accent}/><View style={styles.commandCopy}><Text style={styles.commandTitle}>ISSUE A CHILD CODE</Text><Text style={styles.commandMeta}>Share access without exposing the code that admitted you.</Text></View></View><TextInput value={label} onChangeText={setLabel} placeholder="Code label" placeholderTextColor={muted} style={styles.authInput}/><View style={styles.durationRow}><Pressable onPress={()=>setBurn(false)} style={[styles.durationChoice,!burn&&styles.durationChoiceActive]}><Text style={[styles.segmentText,!burn&&styles.segmentTextActive]}>NETWORK</Text></Pressable><Pressable onPress={()=>{setBurn(true);setLimit(1);}} style={[styles.durationChoice,burn&&styles.durationChoiceActive]}><Text style={[styles.segmentText,burn&&styles.segmentTextActive]}>BURN CODE</Text></Pressable></View>{burn?<View style={styles.burnNotice}><Zap size={17} color={accent}/><Text style={styles.commandMeta}>SELF-DESTRUCTS AFTER ONE JOIN</Text></View>:<View style={styles.limitRow}><Pressable onPress={()=>setLimit(value=>Math.max(1,value-1))} style={styles.limitButton}><Text style={styles.limitButtonText}>-</Text></Pressable><View style={styles.limitValue}><Text style={styles.creditNumber}>{limit}</Text><Text style={styles.identityLabel}>JOIN SLOTS</Text></View><Pressable onPress={()=>setLimit(value=>Math.min(25,value+1))} style={styles.limitButton}><Plus size={19} color={paper}/></Pressable></View>}<GlassButton label={busy?'GENERATING':'GENERATE CHILD CODE'} icon={LockKeyhole} onPress={()=>void create()} active/></GlassPanel>{error?<Text style={styles.networkError}>{error.toUpperCase()}</Text>:null}<SectionTitle label="MY CODE CHAIN" action={`${codes.filter(code=>code.is_active).length} LIVE`}/>{codes.map(code=><View key={code.id} style={[styles.accessCodeCard,!code.is_active&&styles.accessCodeCardDisabled]}><View style={styles.accessCodeTop}><View style={styles.commandCopy}><Text style={styles.accessCode}>{code.code}</Text><Text style={styles.commandMeta}>{code.label} · {code.max_uses===1?'BURN CODE':`${code.max_uses} SLOTS`}</Text></View><Pressable onPress={()=>void copyCode(code.code)} style={styles.iconButton}><LockKeyhole size={16} color={paper}/></Pressable></View><View style={styles.codeUsageTrack}><View style={[styles.codeUsageFill,{width:`${Math.min(100,(code.use_count/code.max_uses)*100)}%`}]}/></View><View style={styles.codeUsageRow}><Text style={styles.codeUsage}>{code.use_count} / {code.max_uses} JOINED</Text><Pressable onPress={()=>void toggle(code.id)}><Text style={code.is_active?styles.codeDisable:styles.codeEnable}>{code.is_active?'DISABLE':'ENABLE'}</Text></Pressable></View></View>)}</ScrollView>;
}

function DeveloperAccessScreen(){
  const isDeveloper=useContentStore(state=>Boolean(state.profile?.isDeveloper));
  const endpoint=isDeveloper?'/api/admin/invites':'/api/invites';
  const [codes,setCodes]=useState<InviteCodeRow[]>([]);const [redemptions,setRedemptions]=useState<InviteRedemption[]>([]);const [label,setLabel]=useState('NIGHT ACCESS');const [limit,setLimit]=useState(10);const [duration,setDuration]=useState<'24h'|'7d'|'30d'|'none'>('7d');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const load=async()=>{try{const data=await cloudflareApi.request<{codes:InviteCodeRow[];redemptions:InviteRedemption[]}>(endpoint);setCodes(data.codes);setRedemptions(data.redemptions||[]);setError('');}catch(reason){setError(reason instanceof Error?reason.message:'Access control failed.');}};
  useEffect(()=>{void load();},[isDeveloper]);
  const create=async()=>{setBusy(true);try{const hours=duration==='24h'?24:duration==='7d'?168:duration==='30d'?720:null;await cloudflareApi.request(endpoint,{method:'POST',body:JSON.stringify({label,maxUses:limit,expiresAt:hours?new Date(Date.now()+hours*3600000).toISOString():null})});playInterfaceSound('unlock');await load();}catch(reason){playInterfaceSound('error');setError(reason instanceof Error?reason.message:'Code creation failed.');}finally{setBusy(false);}};
  const toggle=async(id:string)=>{await cloudflareApi.request(`${endpoint}/${id}/toggle`,{method:'POST'});await load();};
  const copyCode=async(code:string)=>{if(Platform.OS==='web'&&navigator.clipboard)await navigator.clipboard.writeText(code);Alert.alert('Access code',`${code}\n\nCopied to clipboard.`);};
  if(!isDeveloper)return <MemberInviteScreen/>;
  return <ScrollView contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}><View style={styles.raceHeader}><View><Text style={styles.eyebrow}>DEVELOPER CHANNEL</Text><Text style={styles.feedTitle}>ACCESS CONTROL</Text></View><View style={styles.adminLive}><View style={styles.liveDot}/><Text style={styles.adminLiveText}>OWNER</Text></View></View><GlassPanel glow><Text style={styles.identityLabel}>CREATE PRIVATE CODE</Text><TextInput value={label} onChangeText={setLabel} placeholder="Code label" placeholderTextColor={muted} style={styles.authInput}/><View style={styles.limitRow}><Pressable onPress={()=>setLimit(value=>Math.max(1,value-1))} style={styles.limitButton}><Text style={styles.limitButtonText}>−</Text></Pressable><View style={styles.limitValue}><Text style={styles.creditNumber}>{limit}</Text><Text style={styles.identityLabel}>REDEMPTIONS</Text></View><Pressable onPress={()=>setLimit(value=>Math.min(500,value+1))} style={styles.limitButton}><Plus size={19} color={paper}/></Pressable></View><View style={styles.durationRow}>{(['24h','7d','30d','none'] as const).map(item=><Pressable key={item} onPress={()=>setDuration(item)} style={[styles.durationChoice,duration===item&&styles.durationChoiceActive]}><Text style={[styles.segmentText,duration===item&&styles.segmentTextActive]}>{item.toUpperCase()}</Text></Pressable>)}</View><GlassButton label={busy?'GENERATING':'GENERATE CODE'} icon={LockKeyhole} onPress={()=>void create()} active/></GlassPanel>{error?<Text style={styles.networkError}>{error.toUpperCase()}</Text>:null}<SectionTitle label="ACTIVE CODES" action={`${codes.filter(code=>code.is_active).length} LIVE`}/>{codes.map(code=><View key={code.id} style={[styles.accessCodeCard,!code.is_active&&styles.accessCodeCardDisabled]}><View style={styles.accessCodeTop}><View style={styles.commandCopy}><Text style={styles.accessCode}>{code.code}</Text><Text style={styles.commandMeta}>{code.label} · {code.expires_at?`EXPIRES ${new Date(code.expires_at).toLocaleDateString()}`:'NO EXPIRY'}</Text></View><Pressable onPress={()=>void copyCode(code.code)} style={styles.iconButton}><LockKeyhole size={16} color={paper}/></Pressable></View><View style={styles.codeUsageTrack}><View style={[styles.codeUsageFill,{width:`${Math.min(100,(code.use_count/code.max_uses)*100)}%`}]}/></View><View style={styles.codeUsageRow}><Text style={styles.codeUsage}>{code.use_count} / {code.max_uses} JOINED</Text><Pressable onPress={()=>void toggle(code.id)}><Text style={code.is_active?styles.codeDisable:styles.codeEnable}>{code.is_active?'DISABLE':'ENABLE'}</Text></Pressable></View></View>)}<SectionTitle label="NEW PILOTS" action={`${redemptions.length} TOTAL`}/>{redemptions.map(entry=><View key={entry.user_id} style={styles.joinedPilot}><View style={styles.opponentAvatar}>{entry.avatar_url?<Image source={{uri:entry.avatar_url}} style={styles.opponentPhoto}/>:<Text style={styles.opponentAvatarText}>{entry.username.slice(0,1)}</Text>}</View><View style={styles.commandCopy}><Text style={styles.commandTitle}>{entry.display_name||entry.username}</Text><Text style={styles.commandMeta}>{entry.email} · {new Date(entry.redeemed_at).toLocaleString()}</Text></View><Check size={17} color={accent}/></View>)}</ScrollView>;
}

function AccessPortal({onUnlock}:{onUnlock:(code:string)=>void}){
  const [code,setCode]=useState('');const [status,setStatus]=useState('PRIVATE NETWORK');const [unlocking,setUnlocking]=useState(false);const [denied,setDenied]=useState(false);const reveal=useRef(new Animated.Value(0)).current;const shake=useRef(new Animated.Value(0)).current;const lockPulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{Animated.timing(reveal,{toValue:1,duration:900,useNativeDriver:useNativeAnimations}).start();},[reveal]);
  useEffect(()=>{let loop:Animated.CompositeAnimation|undefined;void AccessibilityInfo.isReduceMotionEnabled().then(reduced=>{if(reduced)return;loop=Animated.loop(Animated.sequence([Animated.timing(lockPulse,{toValue:1,duration:1800,useNativeDriver:useNativeAnimations}),Animated.timing(lockPulse,{toValue:0,duration:1800,useNativeDriver:useNativeAnimations})]));loop.start();});return()=>loop?.stop();},[lockPulse]);
  useEffect(()=>{if(!code||denied)return;playInterfaceSound('key');shake.setValue(0);Animated.sequence([Animated.timing(shake,{toValue:1,duration:24,useNativeDriver:useNativeAnimations}),Animated.timing(shake,{toValue:-1,duration:24,useNativeDriver:useNativeAnimations}),Animated.timing(shake,{toValue:0,duration:28,useNativeDriver:useNativeAnimations})]).start();},[code]);
  const reject=(message:string)=>{setStatus(message.toUpperCase());setDenied(true);playInterfaceSound('error');hapticResult('error');shake.setValue(0);Animated.sequence([4,-4,3,-3,2,0].map(value=>Animated.timing(shake,{toValue:value,duration:55,useNativeDriver:useNativeAnimations}))).start();setTimeout(()=>setDenied(false),950);};
  const verify=async()=>{if(!/^\d{6}$/.test(code)){reject('Enter all six digits');return;}setStatus('VERIFYING CREDENTIAL');try{await cloudflareApi.request('/api/invite/verify',{method:'POST',body:JSON.stringify({code})});playInterfaceSound('unlock');hapticResult('success');setUnlocking(true);setTimeout(()=>onUnlock(code),720);}catch(reason){reject(reason instanceof Error?reason.message:'Access denied');}};
  const enterKey=(key:string)=>{hapticTick();if(key==='CLEAR'){setCode('');setDenied(false);return;}if(key==='UNLOCK'){void verify();return;}setCode(current=>(current+key).slice(0,6));setDenied(false);};
  if(unlocking)return <CredentialTransition/>;
  const pulseScale=lockPulse.interpolate({inputRange:[0,1],outputRange:[1,1.018]});const pulseOpacity=lockPulse.interpolate({inputRange:[0,1],outputRange:[.86,1]});
  return <View style={[styles.accessPortal,denied&&styles.accessPortalDenied]}><Animated.View pointerEvents="none" style={[styles.lockBreathingGlow,{opacity:lockPulse.interpolate({inputRange:[0,1],outputRange:[.05,.34]}),transform:[{scale:pulseScale}]}]}/><Animated.Image source={require('./assets/apex-lock-reference.png')} style={[styles.lockReferenceImage,{opacity:pulseOpacity,transform:[{scale:pulseScale}]}]} resizeMode="cover"/><LinearGradient colors={denied?['rgba(74,0,8,.52)','rgba(0,0,0,.12)']:['transparent','rgba(0,0,0,.03)']} style={StyleSheet.absoluteFill}/><Animated.View style={[styles.photoLockControls,{opacity:reveal,transform:[{translateX:shake}]}]}><View style={styles.photoCodeSlots} pointerEvents="none">{Array.from({length:6},(_,index)=><Text key={index} style={[styles.photoCodeDigit,denied&&styles.photoLockCodeDenied]}>{code[index]||'—'}</Text>)}</View><TextInput value={code} onChangeText={value=>{setCode(value.replace(/\D/g,'').slice(0,6));setDenied(false);hapticTick();}} keyboardType="number-pad" maxLength={6} caretHidden style={styles.photoLockNativeInput} onSubmitEditing={()=>void verify()}/><View style={styles.photoKeypad} pointerEvents="box-none">{['1','2','3','4','5','6','7','8','9','CLEAR','0','UNLOCK'].map(key=><Pressable key={key} accessibilityLabel={key==='UNLOCK'?'Unlock network':key==='CLEAR'?'Clear access code':`Enter ${key}`} onPress={()=>enterKey(key)} style={({pressed})=>[styles.photoKeyHit,pressed&&styles.photoKeyHitPressed]}/>)}</View></Animated.View>{denied?<View pointerEvents="none" style={styles.deniedGlitch}><View style={[styles.glitchLine,{top:'62%'}]}/><Text style={styles.deniedStamp}>ERR // INVALID CREDENTIAL</Text></View>:null}</View>;
}

function AuthPanel({ onClose, onOpen, initialMode='signin', inviteCode }: { onClose: () => void;onOpen?: (tab:TabKey)=>void;initialMode?:'signin'|'signup';inviteCode?:string|null }) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [displayName,setDisplayName]=useState('');
  const signedInProfile=useContentStore(state=>state.profile);
  const signedInId=useContentStore(state=>state.userId);
  const updateProfile=useContentStore(state=>state.updateProfile);
  const signOut=async()=>{await cloudflareApi.signOut();useLiveNetworkStore.getState().dispose();await Promise.all([useContentStore.getState().initialize(),useLiveNetworkStore.getState().initialize()]);onClose();};
  const submit = async () => {
    if (!hasCloudflareBackend) { setStatus('APEX BACKEND HAS NOT BEEN PROVISIONED'); return; }
    if (!email.trim() || password.length < 8) { setStatus('ENTER AN EMAIL AND 8+ CHARACTER PASSWORD'); return; }
    setStatus('CONNECTING');
    try {
      if (mode === 'signin') await cloudflareApi.signIn(email.trim(), password);
      else await cloudflareApi.signUp(email.trim(), password,inviteCode||undefined);
      await Promise.all([useContentStore.getState().initialize(), useLiveNetworkStore.getState().initialize()]);
      const userId = useContentStore.getState().userId;
      if (userId) await Promise.all([useNotificationStore.getState().fetchNotifications(userId), useMessageStore.getState().fetchConversations(userId)]);
      onClose();
    } catch (error) {
      setStatus((error instanceof Error ? error.message : 'CONNECTION FAILED').toUpperCase());
    }
  };
  if(signedInId)return <View style={styles.authOverlay}><Pressable onPress={onClose} style={StyleSheet.absoluteFill}/><GlassPanel style={styles.authPanel} glow><View style={styles.notificationHeader}><View><Text style={styles.eyebrow}>PILOT IDENTITY</Text><Text style={styles.notificationTitle}>{signedInProfile?.displayName||'ACTIVE PILOT'}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={17} color={paper}/></Pressable></View><View style={styles.freeAccountBanner}><ShieldCheck size={17} color={accent}/><View><Text style={styles.freeAccountTitle}>PRIVATE CHANNEL ACTIVE</Text><Text style={styles.freeAccountMeta}>@{signedInProfile?.alias} · {signedInProfile?.isDeveloper?'DEVELOPER AUTHORITY':'INVITED MEMBER'}</Text></View></View><TextInput value={displayName} onChangeText={setDisplayName} placeholder={signedInProfile?.displayName||'Display name'} placeholderTextColor={muted} style={styles.authInput}/><GlassButton label="SAVE PILOT PROFILE" icon={Check} onPress={async()=>{if(await updateProfile(displayName||signedInProfile?.displayName||'')){setDisplayName('');setStatus('PROFILE SECURED');}}} active/><GlassButton label="SETTINGS + PRIVACY" icon={Settings} onPress={()=>{onClose();onOpen?.('settings');}}/><GlassButton label="SHARE ACCESS CODE" icon={Send} onPress={()=>{onClose();onOpen?.('access');}}/><AndroidDownloadButton/><View style={styles.identityDivider}/><GlassButton label="LOCK YOURSELF OUT" icon={LockKeyhole} onPress={()=>void signOut()}/>{status?<Text style={styles.networkError}>{status}</Text>:null}</GlassPanel></View>;
  return <View style={styles.authOverlay}><Pressable onPress={onClose} style={StyleSheet.absoluteFill} /><GlassPanel style={styles.authPanel} glow><View style={styles.notificationHeader}><View><Text style={styles.eyebrow}>PILOT IDENTITY</Text><Text style={styles.notificationTitle}>{mode === 'signin' ? 'ENTER NETWORK' : 'CREATE PILOT'}</Text></View><Pressable onPress={onClose} style={styles.closeButton}><X size={17} color={paper} /></Pressable></View>{hasCloudflareBackend ? <>{mode==='signup'?<View style={styles.freeAccountBanner}><ShieldCheck size={17} color={accent}/><View><Text style={styles.freeAccountTitle}>{inviteCode?'PRIVATE SLOT RESERVED':'DEVELOPER REGISTRATION'}</Text><Text style={styles.freeAccountMeta}>{inviteCode||'OWNER EMAIL REQUIRED'}</Text></View></View>:null}<ScrambleReadout value={email} label="IDENTITY SIGNAL"/><TextInput value={email} onChangeText={value=>{setEmail(value);playInterfaceSound('key');}} autoCapitalize="none" keyboardType="email-address" placeholder="Email" placeholderTextColor={muted} style={styles.authInput} /><ScrambleReadout value={password} masked label="PASSWORD SCRAMBLE"/><TextInput value={password} onChangeText={value=>{setPassword(value);playInterfaceSound('key');}} secureTextEntry placeholder="Password" placeholderTextColor={muted} style={styles.authInput} onSubmitEditing={submit} /><GlassButton label={mode === 'signin' ? 'SIGN IN' : 'CREATE PILOT'} icon={LockKeyhole} onPress={submit} active /><Pressable onPress={() => {setMode(value => value === 'signin' ? 'signup' : 'signin');setStatus('');}}><Text style={styles.authSwitch}>{mode === 'signin' ? 'DEVELOPER OR INVITED PILOT / CREATE ACCOUNT' : 'EXISTING PILOT / SIGN IN'}</Text></Pressable></> : <View style={styles.emptyNotification}><Radio size={26} color={accent} /><Text style={styles.emptyTitle}>BACKEND CONNECTION REQUIRED</Text><Text style={styles.emptyCopy}>The app will not invent an account or local network data.</Text></View>}{status ? <Text style={styles.networkError}>{status}</Text> : null}</GlassPanel></View>;
}

export function ApexDesignPreview() {
  const initialRoute=useMemo(routeState,[]);
  const [tab, setTab] = useState<TabKey>(initialRoute.tab);
  const [gameStarted,setGameStarted]=useState(initialRoute.started);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode,setAuthMode]=useState<'signin'|'signup'>('signin');
  const [inviteCode,setInviteCode]=useState<string|null>(null);
  const [booted,setBooted]=useState(false);
  const unreadCount = useNotificationStore(state => state.unreadCount);
  const userId = useContentStore(state => state.userId);
  const entrance = useRef(new Animated.Value(1)).current;
  const handlingHistory=useRef(false);
  const pendingDeepLink=useRef(initialRoute.started);

  useEffect(() => {
    const initialize = async () => {
      try{const local=await AsyncStorage.getItem(LOCAL_SETTINGS_KEY);if(local){try{const parsed=JSON.parse(local);setInterfaceAudioEnabled(parsed.audio!==false);setHapticsEnabled(parsed.haptics!==false);}catch{await AsyncStorage.removeItem(LOCAL_SETTINGS_KEY);}}
        await Promise.all([useLiveNetworkStore.getState().initialize(), useContentStore.getState().initialize()]);
        const userId = useContentStore.getState().userId;
        if (userId) {
          await useNotificationStore.getState().fetchNotifications(userId);
          useNotificationStore.getState().subscribeToNotifications(userId);
          await useMessageStore.getState().fetchConversations(userId);
        }}finally{setBooted(true);}
    };
    initialize();
    if (Platform.OS !== 'web') return () => useLiveNetworkStore.getState().dispose();
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key !== 'Enter' || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      event.preventDefault();
      setGameStarted(true);
      setTab('radar');
      useLiveNetworkStore.getState().startDrive();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); useLiveNetworkStore.getState().dispose(); useNotificationStore.getState().unsubscribeFromNotifications(); };
  }, []);

  useEffect(()=>{if(!booted)return;if(!userId){setGameStarted(false);return;}const deepLink=routeState();if(deepLink.started){pendingDeepLink.current=false;setTab(deepLink.tab);setGameStarted(true);}},[userId,booted]);

  useEffect(()=>{
    if(Platform.OS!=='web'||!booted)return;
    if(!userId&&window.location.pathname.startsWith('/app/'))return;
    const target=!userId?(pendingDeepLink.current?tabPaths[tab]:'/'):gameStarted?tabPaths[tab]:'/play';
    if(window.location.pathname===target){handlingHistory.current=false;return;}
    if(handlingHistory.current){handlingHistory.current=false;return;}
    window.history.pushState({tab,gameStarted},'',target);
  },[tab,gameStarted,userId,booted]);

  useEffect(()=>{
    if(Platform.OS!=='web')return;
    const onPopState=()=>{const next=routeState();handlingHistory.current=true;setTab(next.tab);setGameStarted(next.started);};
    window.addEventListener('popstate',onPopState);
    return()=>window.removeEventListener('popstate',onPopState);
  },[]);

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, { toValue: 1, duration: 340, useNativeDriver: useNativeAnimations }).start();
  }, [tab, entrance]);

  const content = useMemo(() => {
    if (tab === 'radar') return <RadarScreen onTab={setTab} />;
    if (tab === 'feed') return <FeedScreen onTab={setTab} />;
    if (tab === 'garage') return <GarageScreen onTab={setTab} />;
    if (tab === 'more') return <MoreScreen onTab={setTab} />;
    if (tab === 'race') return <RaceScreen />;
    if (tab === 'vault') return <VaultScreen />;
    if (tab === 'shop') return <VaultScreen />;
    if (tab === 'parts') return <ShopScreen />;
    if (tab === 'leaderboard') return <LeaderboardScreen />;
    if (tab === 'access') return <DeveloperAccessScreen />;
    if (tab === 'settings') return <SettingsScreen />;
    if (tab === 'bounty') return <BountyScreen onTab={setTab}/>;
    if (tab === 'world') return <WorldScreen onTab={setTab}/>;
    if (tab === 'season') return <SeasonHubScreen onTab={setTab}/>;
    if (tab === 'crews') return <CrewNetworkScreen onTab={setTab}/>;
    if (tab === 'achievements') return <AchievementsScreen/>;
    if (tab === 'meets' || tab === 'messages') return <UtilityScreen kind={tab} />;
    return <CommandScreen onTab={setTab} onProfile={()=>{setAuthMode('signin');setAuthOpen(true);}} />;
  }, [tab]);

  if(!booted)return <SafeAreaView style={styles.app}><AtmosphereBackdrop/><View style={styles.bootScreen}><View style={styles.bootLock}><LockKeyhole size={74} color={paper} strokeWidth={1.1}/></View><ApexLogo/><Text style={styles.bootLabel}>ESTABLISHING PRIVATE CHANNEL</Text></View></SafeAreaView>;
  if(!userId)return <SafeAreaView style={styles.app}>{inviteCode?<AtmosphereBackdrop/>:<AccessPortal onUnlock={code=>{setInviteCode(code);setAuthMode('signup');setAuthOpen(true);}}/>}{authOpen?<AuthPanel key={`${authMode}-${inviteCode||'owner'}`} onClose={()=>{setAuthOpen(false);setInviteCode(null);}} onOpen={setTab} initialMode={authMode} inviteCode={inviteCode}/>:null}</SafeAreaView>;
  if(!gameStarted)return <SafeAreaView style={styles.app}><GameLobby onEnter={next=>{setTab(next);setGameStarted(true);}}/></SafeAreaView>;

  return (
    <SafeAreaView style={styles.app}>
      <AtmosphereBackdrop />
      <View style={styles.header}>
        <View style={styles.brandLockup}>
          <ApexLogo />
          {screenWidth<360?<Text style={styles.compactHeaderBrand}>APEX</Text>:<GlitchBrand subtitle="UNDERGROUND RACING NETWORK"/>}
        </View>
        <View style={styles.headerRight}>
          <Pressable accessibilityLabel="Encrypted account" onPress={() => {playInterfaceSound();setAuthMode('signin');setAuthOpen(true);}} style={screenWidth<360?styles.signalCompact:styles.signal}><View style={styles.liveDot} />{screenWidth>=360?<Text style={styles.signalText}>ENCRYPTED</Text>:null}</Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open leaderboard" onPress={() => {playInterfaceSound();setTab('leaderboard');}} style={styles.iconButton}><Trophy size={17} color={paper} /></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open notifications" onPress={() => {playInterfaceSound();setNotificationsOpen(true);}} style={styles.iconButton}><Bell size={18} color={paper} />{unreadCount > 0 ? <View style={styles.headerUnread} /> : null}</Pressable>
        </View>
      </View>

      <Animated.View style={[styles.main, { opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }]}>
        {content}
      </Animated.View>

      <View pointerEvents="box-none" style={styles.tabBarPositioner}>
        <View style={styles.tabBarShell}>
          <BlurView intensity={42} tint="dark" style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.primaryNavRail}>
            {tabs.map(item => {
              const Icon = item.icon;
              const activeTab = tab === item.key || (item.key === 'command' && ['vault', 'access', 'settings', 'world', 'season', 'achievements', 'more'].includes(tab)) || (item.key === 'radar' && ['bounty'].includes(tab)) || (item.key === 'feed' && ['messages','crews'].includes(tab));
              return (
                <Pressable key={item.key} onPress={() => {playInterfaceSound();setTab(item.key);}} style={styles.tabItem}>
                  <View style={[styles.tabIcon, activeTab && styles.tabIconActive]}><Icon size={19} color={activeTab ? accent : muted} strokeWidth={2.1} /></View>
                  <Text style={[styles.tabLabel, activeTab && styles.tabLabelActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
            </ScrollView>
          </BlurView>
        </View>
      </View>

      {notificationsOpen ? <NotificationCenter onClose={() => setNotificationsOpen(false)} onOpen={setTab} /> : null}
      {authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} onOpen={setTab} initialMode={authMode} /> : null}
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
  gameLobby: { flex: 1, backgroundColor: '#010201', overflow: 'hidden', paddingHorizontal: 16, paddingTop: 22, paddingBottom: 20 },
  playScreenCopy: { marginTop: 'auto', marginBottom: 22, paddingHorizontal: 5, alignItems: 'center' },
  playScreenTitle: { color: paper, fontSize: 23, fontWeight: '900', letterSpacing: 1.2, marginTop: 8, textAlign: 'center' },
  playScreenMeta: { color: '#B8C2BC', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 8, textAlign: 'center' },
  playTransition: { flex: 1, backgroundColor: '#010201', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  playTransitionCore: { width: '82%', maxWidth: 390, alignItems: 'center', paddingHorizontal: 22, paddingVertical: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', borderRadius: 14, backgroundColor: 'rgba(3,6,4,.66)' },
  playTransitionLabel: { color: muted, fontSize: 7, fontWeight: '900', marginTop: 20 },
  playTransitionCar: { color: paper, fontSize: 25, fontWeight: '900', marginTop: 6 },
  playTransitionTrack: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,.12)', marginTop: 25, overflow: 'hidden' },
  playTransitionFill: { width: '100%', height: '100%', backgroundColor: paper },
  playTransitionReadout: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  playTransitionLive: { color: accent, fontSize: 7, fontWeight: '900' },
  playTransitionSweep: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,.7)', shadowColor: '#fff', shadowOpacity: .8, shadowRadius: 12 },
  introCar: { position: 'absolute', width: '118%', height: '56%', bottom: '4%' },
  introGrid: { position: 'absolute', width: 350, height: 350, alignItems: 'center', justifyContent: 'center' },
  introGridRing: { position: 'absolute', width: 118, height: 118, borderRadius: 200, borderWidth: 1, borderColor: 'rgba(167,229,154,.22)' },
  cinematicTop: { position: 'absolute', top: 24, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  livePill: { minHeight: 28, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,229,154,.35)', backgroundColor: 'rgba(3,8,4,.72)', flexDirection: 'row', alignItems: 'center', gap: 6 },
  cinematicStory: { position: 'absolute', left: 22, right: 22, bottom: 42, alignItems: 'center' },
  vaporStory: { color: paper, fontSize: 17, lineHeight: 22, fontWeight: '900', textAlign: 'center', textShadowColor: 'rgba(255,255,255,.5)', textShadowRadius: 13 },
  tacticalGlobe: { width: 208, height: 228, alignItems: 'center', justifyContent: 'center' },
  globeHalo: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1, borderColor: 'rgba(255,255,255,.08)', shadowColor: accent, shadowOpacity: .2, shadowRadius: 28 },
  globeSphere: { width: 142, height: 142, borderRadius: 71, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.46)', backgroundColor: 'rgba(4,10,6,.56)', alignItems: 'center', justifyContent: 'center' },
  globeLatitude: { position: 'absolute', left: 8, right: 8, height: 1, backgroundColor: 'rgba(167,229,154,.24)' },
  globeMeridian: { position: 'absolute', width: 52, height: 150, borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)' },
  globeCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: paper, shadowColor: paper, shadowOpacity: 1, shadowRadius: 11 },
  globeOrbit: { position: 'absolute', width: 174, height: 174, borderRadius: 87, borderWidth: 1, borderColor: 'rgba(167,229,154,.38)', borderTopColor: 'transparent', borderBottomColor: 'rgba(255,255,255,.7)' },
  globeNode: { position: 'absolute', left: 12, top: 24, width: 7, height: 7, borderRadius: 4, backgroundColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 8 },
  globeCoordinates: { position: 'absolute', left: 2, right: 2, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' },
  globeCoordinateText: { color: muted, fontSize: 6, fontWeight: '900' },
  globeCoordinateLive: { color: accent, fontSize: 6, fontWeight: '900' },
  credentialTransition: { flex: 1, backgroundColor: '#010201', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  credentialReference: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: .16 },
  credentialCore: { width: '84%', maxWidth: 390, alignItems: 'center' },
  credentialSeal: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  credentialOrbit: { position: 'absolute', width: 128, height: 128, borderRadius: 64, borderWidth: 1, borderColor: 'rgba(223,255,215,.58)', borderTopColor: 'transparent', borderBottomColor: paper },
  credentialSealInner: { width: 88, height: 88, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,.58)', backgroundColor: 'rgba(3,8,4,.74)', alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOpacity: .42, shadowRadius: 24 },
  credentialAccepted: { color: paper, fontSize: 22, fontWeight: '900' },
  credentialStage: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 8 },
  credentialTrack: { width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,.14)', marginTop: 24, overflow: 'hidden' },
  credentialFill: { width: '100%', height: '100%', backgroundColor: paper },
  credentialChecks: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  credentialCheck: { color: muted, fontSize: 6, fontWeight: '900' },
  welcomeGate: { flex: 1, backgroundColor: '#010101', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  welcomeGlitch: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: paper, opacity: .38, shadowColor: paper, shadowOpacity: 1, shadowRadius: 16 },
  welcomeRacer: { color: paper, fontSize: 31, fontWeight: '900', textShadowColor: 'rgba(255,255,255,.64)', textShadowRadius: 14 },
  welcomeSub: { color: muted, fontSize: 7, fontWeight: '900', marginTop: 10 },
  lobbyHeader: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lobbyLevel: { minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.07)', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  lobbyLevelText: { color: paper, fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  garageStage: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  garageStageLight: { position: 'absolute', width: '88%', height: 130, bottom: '19%', borderRadius: 70, backgroundColor: 'rgba(223,255,215,.08)', shadowColor: '#DFFFD7', shadowOpacity: .34, shadowRadius: 55, transform: [{ scaleX: 1.2 }] },
  lobbyCar: { width: '100%', maxWidth: 660, height: '75%', minHeight: 230, alignItems: 'center', justifyContent: 'center' },
  lobbyCarImage: { width: '100%', height: '100%' },
  lobbyNoCar: { width: '100%', minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 12 },
  lobbyReadyScene: { width: '100%', minHeight: 210, alignItems: 'center', justifyContent: 'center', gap: 10 },
  lobbyReadyLine: { position: 'absolute', width: '72%', height: 1, backgroundColor: 'rgba(255,255,255,.2)', shadowColor: paper, shadowOpacity: .7, shadowRadius: 15 },
  lobbyReadyTitle: { color: paper, fontSize: 24, fontWeight: '900', marginTop: 4 },
  partHotspot: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(2,5,3,.78)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', borderRadius: 9, paddingHorizontal: 7, paddingVertical: 5 },
  partHotspotDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 7 },
  partHotspotLabel: { color: paper, fontSize: 6, fontWeight: '900' },
  dragHint: { position: 'absolute', bottom: 4, color: '#A7AEA9', fontSize: 6, fontWeight: '900', letterSpacing: 1.2 },
  lobbyIdentity: { zIndex: 2, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,.8)', paddingLeft: 12, marginBottom: 15 },
  lobbyCarName: { color: paper, fontSize: 28, fontWeight: '900', marginTop: 3 },
  lobbyActions: { zIndex: 2, gap: 9 },
  playGameButton: { minHeight: 66, borderRadius: 3, borderWidth: 1, borderColor: 'rgba(94,255,219,.76)', backgroundColor: 'rgba(1,5,4,.76)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, shadowColor: accent, shadowOpacity: .26, shadowRadius: 22 },
  playGameText: { color: paper, fontSize: 12, fontWeight: '900', letterSpacing: 2.2 },
  playGameMeta: { color: '#364035', fontSize: 6, fontWeight: '900', letterSpacing: 1.1, marginTop: 2 },
  lobbyQuickRow: { flexDirection: 'row', gap: 8 },
  lobbyPlayHint: { color: muted, fontSize: 6, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center' },
  app: { flex: 1, backgroundColor: '#010201', overflow: 'hidden' },
  main: { flex: 1 },
  atmosphere: { ...StyleSheet.absoluteFillObject, overflow: 'hidden', backgroundColor: '#010201' },
  atmosphereImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'cover', opacity: .12 },
  lightShard: { position: 'absolute', width: 1, height: '145%', backgroundColor: '#FFFFFF', top: '-18%', transform: [{rotate:'18deg'}], shadowColor: '#FFFFFF', shadowOpacity: .55, shadowRadius: 18 },
  lightShardOne: { left: '22%' },
  lightShardTwo: { right: '18%' },
  filmGrain: { ...StyleSheet.absoluteFillObject, opacity: .16, borderWidth: 1, borderColor: 'rgba(255,255,255,.025)' },
  bootScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  bootLock: { width: 142, height: 142, borderRadius: 71, borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', backgroundColor: 'rgba(3,6,4,.72)', alignItems: 'center', justifyContent: 'center', shadowColor: '#DFFFD7', shadowOpacity: .2, shadowRadius: 35 },
  bootLabel: { color: muted, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  header: { height: 66, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: border, backgroundColor: 'rgba(1,3,2,.95)', zIndex: 20 },
  brandLockup: { flexDirection: 'row', alignItems: 'center' },
  compactHeaderBrand: { color: paper, fontSize: 14, fontWeight: '900' },
  brandMark: { width: 34, height: 34, borderWidth: 1, borderColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 10, transform: [{ rotate: '45deg' }] },
  brandMarkText: { color: accent, fontSize: 18, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  apexLogo: { width: 42, height: 42, marginRight: 9, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  logoGhost: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  logoGhostText: { color: '#7DFF69', fontSize: 26, fontWeight: '900', textShadowColor: '#7DFF69', textShadowRadius: 8 },
  apexLogoOuter: { width: 34, height: 34, transform: [{ rotate: '45deg' }], borderWidth: 1, borderColor: 'rgba(232,255,226,.72)', backgroundColor: 'rgba(145,185,133,.055)', alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOpacity: .32, shadowRadius: 9 },
  apexLogoInner: { width: 25, height: 25, borderWidth: 1, borderColor: 'rgba(145,185,133,.5)', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' },
  apexLogoLetter: { color: paper, fontSize: 18, lineHeight: 21, fontWeight: '900', transform: [{ rotate: '-45deg' }] },
  apexLogoSlash: { position: 'absolute', width: 3, height: 34, backgroundColor: accent, right: 3, transform: [{ rotate: '-12deg' }] },
  apexLogoSignal: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: accent, right: 0, top: 3, borderWidth: 1, borderColor: '#010201', shadowColor: accent, shadowOpacity: .8, shadowRadius: 5 },
  brand: { color: paper, fontSize: 15, fontWeight: '900', letterSpacing: 1.8 },
  glitchBrand: { position: 'relative' },
  brandGhost: { position: 'absolute', left: 0, top: 0, color: '#7DFF69', textShadowColor: '#7DFF69', textShadowRadius: 8 },
  brandSub: { color: muted, fontSize: 7, fontWeight: '800', letterSpacing: 1.1, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  signal: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  signalCompact: { width: 15, height: 36, alignItems: 'center', justifyContent: 'center' },
  signalText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 7 },
  liveDotBright: { width: 8, height: 8, borderRadius: 4 },
  iconButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', backgroundColor: 'rgba(255,255,255,.07)', shadowColor: '#000', shadowOpacity: .45, shadowRadius: 12 },
  screenContent: { padding: 14, paddingBottom: 116, width: '100%', maxWidth: 720, alignSelf: 'center' },
  glassShell: { borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: surface, shadowColor: '#000', shadowOpacity: .36, shadowRadius: 18 },
  glassGlow: { borderColor: 'rgba(145,185,133,.42)', shadowColor: accent, shadowOpacity: 0.12, shadowRadius: 20, elevation: 4 },
  glassBlur: { padding: 14, backgroundColor: 'rgba(4,7,5,.58)' },
  glassButtonShell: { minHeight: 43, minWidth: 0, flexShrink: 1, borderRadius: 13, overflow: 'hidden', shadowColor: '#FFFFFF', shadowOpacity: .10, shadowRadius: 16 },
  glassButtonGrow: { flex: 1 },
  glassButton: { minHeight: 43, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,.075)', position: 'relative', overflow: 'hidden' },
  glassButtonActive: { backgroundColor: 'rgba(126,164,117,.16)', borderColor: 'rgba(218,255,210,.44)' },
  glassButtonCompact: { minHeight: 36 },
  glassButtonText: { color: paper, fontSize: 9, fontWeight: '900', letterSpacing: 0.8, flexShrink: 1 },
  glassButtonTextActive: { color: paper },
  pressed: { opacity: 0.75, transform: [{ scale: 0.985 }] },
  hero: { height: 292, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', justifyContent: 'space-between', backgroundColor: '#050705' },
  heroEmpty: { height: 242 },
  emptyVehicleMark: { width: 88, height: 88, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,.12)', backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center' },
  emptyBuildIdentity: { position: 'absolute', top: 38, width: 138, height: 138, alignItems: 'center', justifyContent: 'center' },
  emptyBuildOrbitOuter: { position: 'absolute', width: 132, height: 132, borderRadius: 66, borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', borderStyle: 'dashed' },
  emptyBuildOrbitInner: { position: 'absolute', width: 92, height: 92, borderRadius: 46, borderWidth: 1, borderColor: 'rgba(167,229,154,.26)', transform: [{ rotate: '18deg' }] },
  emptyBuildCrosshairH: { position: 'absolute', width: 124, height: 1, backgroundColor: 'rgba(255,255,255,.09)' },
  emptyBuildCrosshairV: { position: 'absolute', width: 1, height: 124, backgroundColor: 'rgba(255,255,255,.09)' },
  emptyBuildSignal: { position: 'absolute', bottom: 12, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', backgroundColor: 'rgba(3,5,3,.82)' },
  emptyBuildSignalText: { color: paper, fontSize: 6, fontWeight: '900' },
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
  commandPulse: { minHeight: 58, marginTop: 8, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', borderRadius: 11, borderWidth: 1, borderColor: 'rgba(145,185,133,.26)', backgroundColor: 'rgba(145,185,133,.055)' },
  commandPulseLive: { flex: 1.5, flexDirection: 'row', alignItems: 'center', gap: 7 },
  commandPulseLabel: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: .8 },
  commandPulseMetric: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,.1)' },
  commandPulseValue: { color: paper, fontSize: 14, fontWeight: '900' },
  commandPulseMeta: { color: muted, fontSize: 6, fontWeight: '900', marginTop: 2 },
  commandTelemetryRail: { minHeight: 76, marginTop: 8, flexDirection: 'row', borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(7,10,8,.84)', overflow: 'hidden' },
  commandTelemetryCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,.08)' },
  commandTelemetryValue: { color: paper, fontSize: 14, fontWeight: '900', marginTop: 4 },
  commandTelemetryLabel: { color: muted, fontSize: 6, fontWeight: '900', marginTop: 2 },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 9 },
  sectionTitle: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 1.6 },
  sectionAction: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  statusTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusIdentity: { flex: 1, minWidth: 0, paddingRight: 10 },
  statusAlias: { color: paper, fontSize: 16, fontWeight: '900', letterSpacing: 0.4, marginBottom: 7, flexShrink: 1 },
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
  tokenOrbit: { position: 'absolute', width: 52, height: 52, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' },
  token: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.86)', transform: [{ rotate: '45deg' }], shadowColor: '#B7FFAA', shadowOpacity: .35, shadowRadius: 12 },
  tokenCompact: { width: 36, height: 36, borderRadius: 18 },
  tokenInner: { width: '72%', height: '72%', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(3,8,4,.28)', alignItems: 'center', justifyContent: 'center' },
  tokenLetter: { color: '#081006', fontSize: 22, fontWeight: '900', fontStyle: 'italic', transform: [{ rotate: '-45deg' }] },
  tokenLetterCompact: { fontSize: 17 },
  tokenValue: { color: paper, fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  tokenLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.9, marginTop: 2 },
  commandRow: { flexDirection: 'row', alignItems: 'center', minHeight: 70, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(12,15,13,.80)', marginBottom: 8 },
  commandIcon: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  commandCopy: { flex: 1, minWidth: 0 },
  commandTitle: { color: paper, fontSize: 11, fontWeight: '900', letterSpacing: 0.6 },
  commandMeta: { color: muted, fontSize: 8, fontWeight: '700', marginTop: 4, letterSpacing: 0.3 },
  operationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  operationTile: { width: '48.7%', minHeight: 112, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(9,12,10,.84)', position: 'relative' },
  operationIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.15)', backgroundColor: 'rgba(255,255,255,.045)', alignItems: 'center', justifyContent: 'center', marginBottom: 11 },
  operationTitle: { color: paper, fontSize: 11, fontWeight: '900', letterSpacing: .6 },
  operationMeta: { color: muted, fontSize: 7, fontWeight: '800', marginTop: 4 },
  activeGrid: { borderWidth: 1, borderColor: border, borderRadius: 11, backgroundColor: 'rgba(6,9,7,.82)', overflow: 'hidden' },
  activeGridRow: { minHeight: 66, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.08)' },
  activeGridIcon: { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.17)', backgroundColor: 'rgba(255,255,255,.045)', alignItems: 'center', justifyContent: 'center' },
  activeGridEmpty: { minHeight: 72, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  leaderPreview: { borderWidth: 1, borderColor: 'rgba(255,255,255,.18)', borderRadius: 11, backgroundColor: 'rgba(7,10,8,.82)', paddingHorizontal: 12 },
  leaderPreviewRow: { minHeight: 52, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.09)', flexDirection: 'row', alignItems: 'center', gap: 11 },
  leaderPreviewRank: { width: 22, color: accent, fontSize: 12, fontWeight: '900' },
  leaderPreviewOpen: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  nativePin: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#061008', borderWidth: 2, borderColor: '#2CFF83', alignItems: 'center', justifyContent: 'center', shadowColor: '#2CFF83', shadowOpacity: .7, shadowRadius: 9 },
  staleNativePin: { opacity: .55, borderColor: muted },
  nativePinText: { color: accent, fontWeight: '900' },
  nativeSelfMarker: { alignItems: 'center', justifyContent: 'center' },
  nativeSelfPin: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(44,255,131,.20)', borderWidth: 1, borderColor: 'rgba(44,255,131,.55)', alignItems: 'center', justifyContent: 'center', shadowColor: '#2CFF83', shadowOpacity: .95, shadowRadius: 16, elevation: 9 },
  nativeSelfCore: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#2CFF83', borderWidth: 3, borderColor: paper },
  nativeSelfLabel: { marginTop: 4, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, overflow: 'hidden', backgroundColor: 'rgba(2,10,5,.92)', color: '#2CFF83', fontSize: 7, fontWeight: '900', letterSpacing: .45 },
  driverSheet: { position: 'absolute', left: 14, right: 14, bottom: 88 },
  driverSheetHeader: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: { width: 48, height: 48, borderRadius: 11, backgroundColor: accent, alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  eventAvatar: { width: 48, height: 48, borderRadius: 11, backgroundColor: 'rgba(145,185,133,.18)', borderWidth: 1, borderColor: 'rgba(218,255,210,.38)', alignItems: 'center', justifyContent: 'center', marginRight: 11 },
  cacheAvatar: { width: 48, height: 48, borderRadius: 11, backgroundColor: '#2CFF83', borderWidth: 1, borderColor: 'rgba(255,255,255,.65)', alignItems: 'center', justifyContent: 'center', marginRight: 11, shadowColor: '#2CFF83', shadowOpacity: .6, shadowRadius: 13 },
  mysteryAvatar: { backgroundColor: '#0A0C0A', borderWidth: 1, borderColor: accent, borderStyle: 'dashed' },
  driverAvatarText: { color: '#050705', fontSize: 15, fontWeight: '900' },
  driverIdentity: { flex: 1 },
  driverAlias: { color: paper, fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  driverCar: { color: muted, fontSize: 8, fontWeight: '800', marginTop: 4 },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  driverStats: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: border, paddingTop: 12 },
  driverStatValue: { color: paper, fontSize: 13, fontWeight: '900' },
  driverStatLabel: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 2 },
  cacheStatusRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 13, paddingTop: 10, borderTopWidth: 1, borderTopColor: border },
  cacheStatus: { color: '#2CFF83', fontSize: 8, fontWeight: '900', letterSpacing: .7 },
  cacheEligibility: { color: muted, fontSize: 7, fontWeight: '800', textAlign: 'right', flexShrink: 1 },
  streakProgress: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  loadoutPreview: { overflow: 'hidden' },
  loadoutFrame: { minHeight: 112, padding: 15, justifyContent: 'flex-end', borderWidth: 1, borderColor: 'rgba(44,255,131,.42)', borderRadius: 8, backgroundColor: 'rgba(3,16,8,.86)', shadowColor: '#2CFF83', shadowOpacity: .22, shadowRadius: 16 },
  loadoutPilot: { color: paper, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  loadoutRank: { color: '#2CFF83', fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 1 },
  loadoutVehicle: { color: muted, fontSize: 7, fontWeight: '800', marginTop: 7 },
  loadoutSlots: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 11, alignItems: 'center' },
  loadoutSlot: { minHeight: 30, paddingHorizontal: 9, borderRadius: 7, borderWidth: 1, borderColor: border, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,.045)' },
  loadoutSlotText: { color: paper, fontSize: 7, fontWeight: '900', letterSpacing: .5 },
  shopCategoryRail: { gap: 7, paddingRight: 16, paddingBottom: 8 },
  shopCategoryChip: { minHeight: 34, paddingHorizontal: 11, borderRadius: 8, borderWidth: 1, borderColor: border, justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.035)' },
  shopCategoryChipActive: { borderColor: 'rgba(44,255,131,.72)', backgroundColor: 'rgba(44,255,131,.13)' },
  shopCategoryText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: .55 },
  shopCategoryTextActive: { color: '#2CFF83' },
  ghostShopCard: { flexDirection: 'row', gap: 11, marginBottom: 10, padding: 10 },
  ghostShopLocked: { opacity: .58 },
  ghostShopPreview: { width: 74, minHeight: 112, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(44,255,131,.24)', backgroundColor: 'rgba(5,16,8,.9)', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ghostShopPreviewLabel: { color: '#2CFF83', fontSize: 6, fontWeight: '900', letterSpacing: .55 },
  ghostShopContent: { flex: 1, minWidth: 0, justifyContent: 'space-between' },
  ghostShopAction: { marginTop: 10 },
  sheetActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  radarDock: { position: 'absolute', left: 14, right: 14, bottom: 88 },
  radarDockTitle: { color: paper, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  radarDockMeta: { color: muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  activeRoute: { minHeight: 46, marginTop: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: 'rgba(145,185,133,.30)', borderRadius: 9, backgroundColor: 'rgba(145,185,133,.07)' },
  activeRouteTitle: { color: paper, fontSize: 8, fontWeight: '900' },
  activeRouteMeta: { color: accent, fontSize: 7, fontWeight: '800', marginTop: 3 },
  routeStart: { minHeight: 29, paddingHorizontal: 9, borderRadius: 7, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#2CFF83' },
  routeStartText: { color: '#061008', fontSize: 7, fontWeight: '900', letterSpacing: .5 },
  routeClose: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  routeButton: { minWidth: 104, minHeight: 39, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.06)', flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  routeButtonText: { color: paper, fontSize: 7, fontWeight: '900' },
  routePanel: { position: 'absolute', left: 10, right: 10, top: 132, bottom: 88, zIndex: 20 },
  favoriteNickname: { marginTop: 9, padding: 10, borderWidth: 1, borderColor: 'rgba(44,255,131,.36)', borderRadius: 9, backgroundColor: 'rgba(4,14,7,.8)' },
  routePlannerScroll: { maxHeight: '100%' },
  convoyList: { borderWidth: 1, borderColor: border, borderRadius: 10, overflow: 'hidden', marginBottom: 9 },
  convoyRouteRow: { minHeight: 58, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.08)', backgroundColor: 'rgba(255,255,255,.025)' },
  itineraryStop: { minHeight: 54, marginBottom: 6, paddingHorizontal: 8, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  itineraryIndex: { width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(167,229,154,.42)', alignItems: 'center', justifyContent: 'center' },
  itineraryIndexText: { color: accent, fontSize: 8, fontWeight: '900' },
  itineraryAction: { width: 27, height: 32, alignItems: 'center', justifyContent: 'center' },
  routeCategoryRow: { flexDirection: 'row', gap: 5, marginBottom: 8 },
  routeCategory: { flex: 1, minHeight: 34, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center' },
  routeCategoryText: { color: paper, fontSize: 6, fontWeight: '900' },
  routeComposer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  routeInput: { flex: 1, minWidth: 0, minHeight: 44, color: paper, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.05)', paddingHorizontal: 12, fontSize: 10 },
  routeSubmit: { minWidth: 66, minHeight: 44, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(145,185,133,.42)', backgroundColor: 'rgba(145,185,133,.12)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  routeSubmitText: { color: paper, fontSize: 8, fontWeight: '900' },
  suggestionList: { marginTop: 8, borderWidth: 1, borderColor: border, borderRadius: 9, overflow: 'hidden', backgroundColor: 'rgba(2,4,3,.94)' },
  suggestionRow: { minHeight: 46, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.08)' },
  suggestionMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10, paddingVertical: 8 },
  suggestionText: { flex: 1, color: paper, fontSize: 8, lineHeight: 12, fontWeight: '700' },
  directionList: { borderWidth: 1, borderColor: border, borderRadius: 9, overflow: 'hidden', marginBottom: 10 },
  directionRow: { minHeight: 54, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.07)', backgroundColor: 'rgba(255,255,255,.025)' },
  directionRowActive: { backgroundColor: 'rgba(44,255,131,.11)', borderLeftWidth: 2, borderLeftColor: '#2CFF83' },
  directionIndex: { width: 18, color: accent, fontSize: 9, fontWeight: '900', textAlign: 'center' },
  directionInstruction: { color: paper, fontSize: 8, fontWeight: '900', lineHeight: 12 },
  directionDistance: { color: accent, fontSize: 7, fontWeight: '900', minWidth: 42, textAlign: 'right' },
  favoriteButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  savedNavHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 7 },
  savedNavRail: { gap: 7, paddingRight: 8 },
  savedNavChip: { minWidth: 118, maxWidth: 210, minHeight: 42, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.045)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  savedNavMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  savedNavText: { color: paper, fontSize: 7, fontWeight: '900', maxWidth: 145 },
  savedNavMeta: { color: accent, fontSize: 6, fontWeight: '800', marginTop: 2 },
  savedNavEmpty: { color: muted, fontSize: 7, fontWeight: '800', paddingVertical: 9 },
  garageSwitcher: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  carChip: { flex: 1, minHeight: 42, borderWidth: 1, borderColor: border, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,.04)' },
  carChipActive: { backgroundColor: 'rgba(145,185,133,.13)', borderColor: 'rgba(145,185,133,.4)' },
  carChipText: { color: paper, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  carChipTextActive: { color: paper },
  addCarButton: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', alignItems: 'center', justifyContent: 'center' },
  vehicleForm: { marginBottom: 12 },
  vehiclePhotoPicker: { height: 190, marginTop: 14, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(145,185,133,.42)', backgroundColor: 'rgba(145,185,133,.05)', alignItems: 'center', justifyContent: 'center' },
  vehiclePhotoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  vehicleFormGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  vehicleFormInput: { width: screenWidth > 620 ? '31.8%' : '48.5%', flexGrow: 1 },
  fitmentStep: { minHeight: 52, marginTop: 15, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: border },
  fitmentStepNo: { color: accent, fontSize: 16, fontWeight: '900' },
  catalogField: { width: screenWidth > 620 ? '48.8%' : '100%', flexGrow: 1, gap: 6, zIndex: 5 },
  catalogOptions: { borderWidth: 1, borderColor: 'rgba(145,185,133,.32)', borderRadius: 9, overflow: 'hidden', backgroundColor: '#090C09', marginTop: -4 },
  catalogOption: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.07)' },
  catalogOptionText: { color: paper, fontSize: 8, fontWeight: '800' },
  choiceSection: { marginBottom: 12 },
  choiceRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  choiceChip: { minHeight: 35, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center' },
  choiceChipActive: { borderColor: 'rgba(145,185,133,.5)', backgroundColor: 'rgba(145,185,133,.12)' },
  choiceChipText: { color: muted, fontSize: 7, fontWeight: '900' },
  choiceChipTextActive: { color: paper },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 8 },
  colorChoice: { width: screenWidth > 620 ? '23.8%' : '48.8%', minHeight: 39, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.03)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorChoiceActive: { borderColor: 'rgba(145,185,133,.55)', backgroundColor: 'rgba(145,185,133,.10)' },
  colorSwatch: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,.46)' },
  customSwatch: { borderColor: accent, borderStyle: 'dashed', backgroundColor: 'rgba(145,185,133,.08)' },
  colorChoiceText: { flex: 1, color: paper, fontSize: 7, fontWeight: '900' },
  catalogFieldWide: { width: '100%', gap: 6, marginBottom: 12 },
  horsepowerPanel: { padding: 13, marginBottom: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', backgroundColor: 'rgba(145,185,133,.055)' },
  horsepowerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  horsepowerHint: { color: muted, fontSize: 6, fontWeight: '800', marginTop: 4 },
  horsepowerValue: { color: paper, fontSize: 21, fontWeight: '900' },
  sliderLabels: { flexDirection: 'row', justifyContent: 'space-between' },
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
  raceViewTabs: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  raceViewTab: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: border, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  raceViewTabActive: { borderColor: 'rgba(145,185,133,.4)', backgroundColor: 'rgba(145,185,133,.10)' },
  inboxFilters: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  inboxFilter: { flex: 1, minHeight: 38, borderRadius: 9, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.03)' },
  inboxFilterActive: { borderColor: 'rgba(167,229,154,.48)', backgroundColor: 'rgba(167,229,154,.1)' },
  raceContractCard: { marginBottom: 10 },
  raceContractTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  raceContractTitle: { color: paper, fontSize: 15, fontWeight: '900', marginTop: 5 },
  raceContractMeta: { color: muted, fontSize: 8, lineHeight: 14, marginTop: 10 },
  raceParticipantRail: { marginTop: 11, borderTopWidth: 1, borderTopColor: border },
  raceParticipant: { minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.07)' },
  raceParticipantName: { color: paper, fontSize: 8, fontWeight: '900' },
  raceParticipantStatus: { color: accent, fontSize: 7, fontWeight: '800' },
  raceModeGrid: { flexDirection: 'row', gap: 7 },
  raceModeChoice: { flex: 1, minHeight: 68, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.03)', alignItems: 'center', justifyContent: 'center', gap: 7 },
  raceModeChoiceActive: { borderColor: 'rgba(167,229,154,.48)', backgroundColor: 'rgba(167,229,154,.09)' },
  courseBanner: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 9 },
  secureMark: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: 'rgba(145,185,133,.3)', backgroundColor: 'rgba(145,185,133,.07)', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  secureText: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  formatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  formatButton: { width: '48.7%', minHeight: 58, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  formatButtonActive: { backgroundColor: 'rgba(145,185,133,.12)', borderColor: 'rgba(145,185,133,.4)' },
  formatText: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  formatTextActive: { color: paper },
  opponentRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: border, borderRadius: 10, padding: 9, marginBottom: 7, backgroundColor: 'rgba(255,255,255,.025)' },
  pilotSearch: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: border, borderRadius: 10, paddingHorizontal: 11, marginBottom: 8, backgroundColor: 'rgba(255,255,255,.035)' },
  pilotSearchInput: { flex: 1, color: paper, fontSize: 10, fontWeight: '800', outlineStyle: 'none' } as any,
  opponentRowActive: { borderColor: 'rgba(145,185,133,.42)', backgroundColor: 'rgba(145,185,133,.055)' },
  opponentAvatar: { width: 42, height: 42, borderRadius: 9, backgroundColor: '#1D231D', borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  opponentAvatarText: { color: accent, fontSize: 14, fontWeight: '900' },
  opponentPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  checkRing: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: muted, alignItems: 'center', justifyContent: 'center' },
  checkRingActive: { borderColor: accent },
  checkCore: { width: 12, height: 12, borderRadius: 6, backgroundColor: accent },
  wagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  wagerControl: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.04)' },
  wagerControlText: { color: paper, fontSize: 22, fontWeight: '700', marginTop: -2 },
  wagerFootnote: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: 0.7, textAlign: 'center', marginTop: 14 },
  wagerBalanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  tabBarShell: { width: '95%', maxWidth: 700, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.30)', backgroundColor: 'rgba(6,8,7,.52)', shadowColor: '#FFFFFF', shadowOpacity: .11, shadowRadius: 24 },
  tabBar: { height: 70, backgroundColor: 'rgba(9,12,10,.48)' },
  primaryNavRail: { minWidth: '100%', paddingHorizontal: 7, alignItems: 'center' },
  tabItem: { width: 72, height: 68, alignItems: 'center', justifyContent: 'center' },
  tabIcon: { width: 35, height: 35, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: 'rgba(255,255,255,.13)', borderWidth: 1, borderColor: 'rgba(255,255,255,.42)', shadowColor:'#FFFFFF',shadowOpacity:.24,shadowRadius:12,transform:[{translateY:-2}] },
  tabLabel: { color: muted, fontSize: 6, fontWeight: '900', letterSpacing: 0.5, marginTop: 3 },
  tabLabelActive: { color: paper },
  rewardToast: { position: 'absolute', top: 78, alignSelf: 'center', backgroundColor: accent, borderRadius: 22, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 100, shadowColor: accent, shadowOpacity: 0.4, shadowRadius: 18 },
  rewardToastText: { color: '#050705', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  headerUnread: { position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: accent, right: 3, top: 2, borderWidth: 1, borderColor: '#020302' },
  radarFilters: { position: 'absolute', top: 103, left: 14, flexDirection: 'row', gap: 5 },
  radarFilter: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(2,4,3,.82)' },
  radarFilterActive: { borderColor: 'rgba(145,185,133,.40)', backgroundColor: 'rgba(145,185,133,.12)' },
  radarFilterText: { color: muted, fontSize: 7, fontWeight: '900', letterSpacing: .6 },
  radarFilterTextActive: { color: paper },
  radarRosterViewport: { position: 'absolute', top: 143, left: 10, right: 10, zIndex: 12, maxHeight: 58 },
  radarRoster: { gap: 7, paddingHorizontal: 4, paddingVertical: 4 },
  radarRosterItem: { minWidth: 166, height: 50, paddingHorizontal: 10, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', backgroundColor: 'rgba(3,6,4,.88)', flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: '#000', shadowOpacity: .48, shadowRadius: 12 },
  rosterSignal: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#747B76' },
  rosterSignalLive: { backgroundColor: accent, shadowColor: accent, shadowOpacity: .9, shadowRadius: 7 },
  radarRosterTitle: { maxWidth: 132, color: paper, fontSize: 7, fontWeight: '900' },
  radarRosterMeta: { maxWidth: 132, color: muted, fontSize: 6, fontWeight: '800', marginTop: 4 },
  radarReadout: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  radarRewardBar: { minHeight: 48, marginTop: 9, paddingHorizontal: 9, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(167,229,154,.34)', backgroundColor: 'rgba(167,229,154,.075)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  radarRewardTime: { color: paper, fontSize: 12, fontWeight: '900' },
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
  leaderboardHero: { minHeight: 104, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaderboardHeroMeta: { color: muted, fontSize: 7, fontWeight: '900', marginTop: 7, letterSpacing: .8 },
  leaderboardHeroIcon: { width: 58, height: 58, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(145,185,133,.35)', backgroundColor: 'rgba(145,185,133,.08)', alignItems: 'center', justifyContent: 'center' },
  boardTabs: { gap: 7, paddingRight: 14, marginBottom: 12 },
  boardTab: { minWidth: 88, height: 44, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  boardTabActive: { borderColor: 'rgba(145,185,133,.52)', backgroundColor: 'rgba(145,185,133,.11)' },
  boardTabText: { color: muted, fontSize: 7, fontWeight: '900' },
  boardTabTextActive: { color: paper },
  boardIdentity: { minHeight: 88, padding: 13, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.17)', backgroundColor: 'rgba(7,10,8,.82)' },
  boardIdentityTitle: { color: paper, fontSize: 22, fontWeight: '900', marginTop: 5 },
  standingsTable: { borderRadius: 11, borderWidth: 1, borderColor: border, overflow: 'hidden', backgroundColor: 'rgba(7,10,8,.72)' },
  podiumAvatarSmall: { width: 35, height: 35, borderRadius: 9, marginRight: 9, overflow: 'hidden', backgroundColor: '#182018', alignItems: 'center', justifyContent: 'center' },
  podium: { minHeight: 190, flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginBottom: 8 },
  podiumPilot: { flex: 1, minWidth: 0, height: 145, borderWidth: 1, borderColor: border, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.045)', alignItems: 'center', justifyContent: 'center', padding: 8 },
  podiumFirst: { height: 180, borderColor: 'rgba(145,185,133,.48)', backgroundColor: 'rgba(145,185,133,.10)' },
  podiumPlace: { color: accent, fontSize: 10, fontWeight: '900', marginBottom: 8 },
  podiumAvatar: { width: 46, height: 46, borderRadius: 23, overflow: 'hidden', borderWidth: 1, borderColor: paper, alignItems: 'center', justifyContent: 'center' },
  podiumName: { color: paper, fontSize: 8, fontWeight: '900', marginTop: 9, textAlign: 'center' },
  podiumPoints: { color: accent, fontSize: 7, fontWeight: '900', marginTop: 4 },
  leaderboardRow: { minHeight: 66, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  leaderboardRowTop: { backgroundColor: 'rgba(145,185,133,.045)' },
  leaderboardRank: { width: 36, color: accent, fontSize: 11, fontWeight: '900' },
  leaderboardPoints: { color: paper, fontSize: 9, fontWeight: '900' },
  meetDetailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 13 },
  meetLocation: { color: paper, fontSize: 15, fontWeight: '900', marginBottom: 9 },
  meetRules: { color: '#B8C0B8', fontSize: 9, lineHeight: 15, marginTop: 8 },
  meetRoleGrid: { flexDirection: 'row', gap: 7, marginBottom: 10 },
  meetRole: { flex: 1, minHeight: 43, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  meetRoleActive: { borderColor: 'rgba(145,185,133,.45)', backgroundColor: 'rgba(145,185,133,.12)' },
  meetRegistration: { minHeight: 66, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center' },
  meetCreatePanel: { marginBottom: 11 },
  meetTextArea: { minHeight: 74, paddingTop: 12, textAlignVertical: 'top' },
  meetCard: { minHeight: 76, padding: 11, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(7,10,8,.82)', flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
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
  previewLaunch: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: 'rgba(44,255,131,.25)', gap: 8 },
  previewLaunchMeta: { color: '#2CFF83', fontSize: 8, fontWeight: '900', textAlign: 'center', letterSpacing: .45 },
  navigationTop: { position: 'absolute', top: 70, left: 12, right: 12, minHeight: 108, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.34)', backgroundColor: 'rgba(2,5,3,.92)', shadowColor: '#FFFFFF', shadowOpacity: .12, shadowRadius: 18 },
  navigationManeuver: { color: paper, fontSize: 15, fontWeight: '900', letterSpacing: .7 },
  navigationRoad: { color: '#2CFF83', fontSize: 10, fontWeight: '900', letterSpacing: .55, marginTop: 6 },
  navigationDistance: { color: paper, fontSize: 22, fontWeight: '900', marginTop: 9 },
  navigationThen: { color: muted, fontSize: 7, fontWeight: '900', marginTop: 7, letterSpacing: .35 },
  navigationBottom: { position: 'absolute', left: 12, right: 12, bottom: 88, minHeight: 68, paddingHorizontal: 13, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.30)', backgroundColor: 'rgba(2,5,3,.94)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOpacity: .4, shadowRadius: 16 },
  navigationTime: { color: paper, fontSize: 18, fontWeight: '900' },
  navigationStat: { color: paper, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  navigationLabel: { color: muted, fontSize: 6, fontWeight: '900', letterSpacing: .65, marginTop: 3, textAlign: 'center' },
  navigationEnd: { minWidth: 42, minHeight: 35, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', alignItems: 'center', justifyContent: 'center' },
  navigationEndText: { color: paper, fontSize: 7, fontWeight: '900', letterSpacing: .6 },
  driveEnter: { flex: 1, minHeight: 39, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  driveEnterActive: { borderColor: 'rgba(145,185,133,.5)', backgroundColor: 'rgba(145,185,133,.13)' },
  driveEnterText: { color: paper, fontSize: 8, fontWeight: '900' },
  unitButton: { width: 48, minHeight: 39, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  unitText: { color: accent, fontSize: 8, fontWeight: '900' },
  driveHud: { position: 'absolute', top: 140, right: 14, width: 122, minHeight: 118, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', backgroundColor: 'rgba(2,4,3,.82)', alignItems: 'center', justifyContent: 'center', shadowColor: '#fff', shadowOpacity: .1, shadowRadius: 18 },
  driveSummary: { position: 'absolute', left: 14, right: 14, bottom: 88 },
  arrivalSheet: { position: 'absolute', left: 14, right: 14, bottom: 88, alignItems: 'center' },
  arrivalTitle: { color: paper, fontSize: 27, fontWeight: '900', letterSpacing: 1.5, marginTop: 7 },
  arrivalDestination: { color: accent, fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 6, letterSpacing: .7 },
  driveSpeed: { color: paper, fontSize: 48, lineHeight: 52, fontWeight: '300' },
  driveUnit: { color: accent, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  driveMeta: { color: muted, fontSize: 6, fontWeight: '900', marginTop: 8 },
  shareTimer: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: border },
  shareTimerTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareTimerMeta: { color: muted, fontSize: 6, fontWeight: '900' },
  shareTimerOptions: { flexDirection: 'row', gap: 6, marginTop: 8 },
  shareTimerOption: { flex: 1, minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.035)' },
  shareTimerOptionActive: { borderColor: 'rgba(167,229,154,.55)', backgroundColor: 'rgba(167,229,154,.12)' },
  shareTimerOptionText: { color: muted, fontSize: 7, fontWeight: '900' },
  shareTimerOptionTextActive: { color: paper },
  ghostButton: { flex: 1.5, minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center' },
  ghostButtonText: { color: paper, fontSize: 7, fontWeight: '900' },
  feedScreen: { flex: 1, backgroundColor: '#020403' },
  feedFloatingHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 30, minHeight: 72, paddingHorizontal: 15, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(1,3,2,.62)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.10)' },
  feedFloatingHeaderCompact: { minHeight: 114, alignItems: 'stretch', flexDirection: 'column', gap: 8 },
  feedHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  feedComposerOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 45, paddingTop: 78, backgroundColor: 'rgba(0,0,0,.78)' },
  feedPage: { width: '100%', position: 'relative', backgroundColor: '#020302', overflow: 'hidden' },
  feedMedia: { ...StyleSheet.absoluteFillObject, backgroundColor: '#050705' },
  feedVideoControls: { position: 'absolute', zIndex: 2, left: 10, right: 62, bottom: 10, minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)', backgroundColor: 'rgba(2,5,3,.72)' },
  feedVideoButton: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  feedVideoSlider: { flex: 1, height: 34 },
  feedVideoTime: { color: paper, fontSize: 9, fontWeight: '700', fontVariant: ['tabular-nums'] },
  feedCreator: { position: 'absolute', left: 15, right: 70, bottom: 122, flexDirection: 'row', alignItems: 'center', gap: 9 },
  feedCaption: { position: 'absolute', left: 15, right: 74, bottom: 78, color: paper, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  feedActionRail: { position: 'absolute', right: 10, bottom: 72, width: 50, alignItems: 'center', gap: 15 },
  feedAction: { minWidth: 45, minHeight: 42, alignItems: 'center', justifyContent: 'center', gap: 3 },
  feedActionCount: { color: paper, fontSize: 8, fontWeight: '900' },
  feedActionLabel: { color: paper, fontSize: 6, fontWeight: '900' },
  feedCommentComposer: { position: 'absolute', left: 12, right: 12, bottom: 18, minHeight: 48, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(3,6,4,.9)' },
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
  freeAccountBanner: { minHeight: 52, marginTop: 12, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(145,185,133,.36)', backgroundColor: 'rgba(145,185,133,.08)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  freeAccountTitle: { color: paper, fontSize: 9, fontWeight: '900' },
  freeAccountMeta: { color: accent, fontSize: 6, fontWeight: '800', marginTop: 3 },
  accessPortal: { flex: 1, backgroundColor: '#010101', overflow: 'hidden' },
  lockReferenceImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 1 },
  lockBreathingGlow: { position: 'absolute', width: '74%', height: '38%', left: '13%', top: '22%', borderRadius: 999, backgroundColor: 'rgba(44,255,131,.38)', shadowColor: '#EFFFF0', shadowOpacity: .95, shadowRadius: 42 },
  photoLockControls: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  photoCodeSlots: { position: 'absolute', top: '62.05%', left: '19.5%', right: '19.5%', height: '3.4%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  photoCodeDigit: { width: '14%', color: paper, fontSize: 18, fontWeight: '900', textAlign: 'center', textShadowColor: '#B9FFF2', textShadowRadius: 4 },
  photoLockNativeInput: { position: 'absolute', top: '60.7%', left: '16%', right: '16%', height: '6.5%', opacity: 0.01, color: 'transparent' },
  photoLockCodeDenied: { color: '#FFB1B8', textShadowColor: '#FF3344', textShadowRadius: 12 },
  photoKeypad: { position: 'absolute', top: '68.1%', left: '17%', right: '17%', height: '22.2%', flexDirection: 'row', flexWrap: 'wrap' },
  photoKeyHit: { width: '33.333%', height: '25%' },
  photoKeyHitPressed: { backgroundColor: 'rgba(103,255,224,.08)' },
  photoExistingHit: { position: 'absolute', bottom: '2.1%', left: '10%', right: '10%', minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  photoExistingText: { color: 'rgba(222,255,247,.66)', fontSize: 7, fontWeight: '900', letterSpacing: 1.35 },
  bountyPanel: { marginHorizontal: 14, marginBottom: 14, gap: 12 },
  bountyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bountyBadge: { minWidth: 48, minHeight: 32, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.035)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  bountyBadgeLive: { borderColor: 'rgba(145,185,133,.50)', backgroundColor: 'rgba(145,185,133,.10)' },
  bountyBadgeText: { color: paper, fontSize: 9, fontWeight: '900' },
  bountyConsent: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 5 },
  bountyCheck: { width: 20, height: 20, borderRadius: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bountyCheckOn: { backgroundColor: accent, borderColor: accent },
  bountyConsentText: { flex: 1, color: '#D7DED9', fontSize: 9, fontWeight: '700', lineHeight: 14 },
  bountyProgress: { minHeight: 59, borderTopWidth: 1, borderTopColor: border, paddingTop: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bountyTimer: { color: paper, fontSize: 21, fontWeight: '900', letterSpacing: 1 },
  bountyStarRail: { flexDirection: 'row', gap: 4 },
  unlockScreen: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 26, paddingBottom: 22, justifyContent: 'space-between' },
  unlockBrand: { flexDirection: 'row', alignItems: 'center', gap: 11, alignSelf: 'flex-start' },
  unlockPrompt: { borderTopWidth: 1, borderTopColor: 'rgba(94,255,219,.36)', backgroundColor: 'rgba(0,4,3,.70)', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14 },
  unlockEyebrow: { color: '#5FFFE0', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  unlockHeading: { color: paper, fontSize: 26, fontWeight: '900', letterSpacing: 1.1, marginTop: 6 },
  unlockDetail: { color: '#B8C3BD', fontSize: 7, fontWeight: '800', letterSpacing: 1, marginTop: 5, marginBottom: 12 },
  unlockCodeInput: { height: 56, color: paper, fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(94,255,219,.44)', backgroundColor: 'rgba(0,0,0,.64)', borderRadius: 2, marginBottom: 10 },
  unlockButton: { minHeight: 58, borderWidth: 1, borderColor: 'rgba(94,255,219,.74)', backgroundColor: 'rgba(1,9,7,.80)', paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', shadowColor: '#5FFFE0', shadowOpacity: .25, shadowRadius: 16 },
  unlockButtonText: { color: paper, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  accessPortalContent: { flex: 1, justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  accessTop: { flexDirection: 'row', alignItems: 'center' },
  characterPlate: { marginTop: 'auto', marginBottom: 18, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,.72)', paddingLeft: 12 },
  characterIndex: { color: '#A7AEA9', fontSize: 7, fontWeight: '900', letterSpacing: 1.4 },
  characterTitle: { color: paper, fontSize: 30, fontWeight: '900', marginTop: 5 },
  characterMeta: { color: '#A7AEA9', fontSize: 7, fontWeight: '900', letterSpacing: .8, marginTop: 5 },
  lockConsole: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.30)', backgroundColor: 'rgba(5,7,6,.54)', padding: 14 },
  lockConsoleDenied: { borderColor: 'rgba(255,76,86,.72)', shadowColor: '#FF3443', shadowOpacity: .55, shadowRadius: 24 },
  lockMonument: { position: 'absolute', top: '24%', alignSelf: 'center', width: 176, height: 166, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', backgroundColor: 'rgba(5,8,6,.64)', alignItems: 'center', justifyContent: 'center', shadowColor: '#DFFFD7', shadowOpacity: .14, shadowRadius: 30 },
  lockOrbitOuter: { position: 'absolute', width: 154, height: 144, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.16)' },
  lockOrbitInner: { position: 'absolute', width: 112, height: 112, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,229,154,.28)', backgroundColor: 'rgba(255,255,255,.025)' },
  lockMonumentCode: { position: 'absolute', bottom: 12, color: muted, fontSize: 6, fontWeight: '900', letterSpacing: 1.3 },
  lockInstruction: { color: '#65FFE0', fontSize: 8, fontWeight: '900', marginBottom: 11 },
  accessPortalDenied: { backgroundColor: '#080001' },
  lockStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  lockStatusDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#6B716D' },
  lockStatusDotOpen: { backgroundColor: accent, shadowColor: accent, shadowOpacity: .8, shadowRadius: 8 },
  lockStatusDotDenied: { backgroundColor: '#FF4C56', shadowColor: '#FF3443', shadowOpacity: 1, shadowRadius: 10 },
  lockStatusText: { color: '#D7DBD8', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  lockStatusTextDenied: { color: '#FF9097' },
  codeInput: { height: 58, color: paper, fontSize: 19, fontWeight: '900', letterSpacing: 2, textAlign: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)', backgroundColor: 'rgba(255,255,255,.07)', borderRadius: 12, marginBottom: 10 },
  codeInputDenied: { borderColor: 'rgba(255,76,86,.72)', color: '#FF9097', backgroundColor: 'rgba(80,0,6,.22)' },
  scrambleReadout: { minHeight: 31, marginBottom: 7, paddingHorizontal: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,.1)' },
  scrambleLabel: { color: muted, fontSize: 6, fontWeight: '900' },
  scrambleValue: { maxWidth: '62%', color: accent, fontSize: 7, fontWeight: '900', textAlign: 'right' },
  existingAccess: { color: '#C2C7C3', fontSize: 7, fontWeight: '900', textAlign: 'center', paddingTop: 14, letterSpacing: .8 },
  existingAccessHit: { borderRadius: 8 },
  androidDownload: { minHeight: 52, marginTop: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(255,255,255,.055)', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9 },
  androidDownloadIcon: { width: 34, height: 34, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(167,229,154,.32)', backgroundColor: 'rgba(167,229,154,.08)', alignItems: 'center', justifyContent: 'center' },
  androidDownloadTitle: { color: paper, fontSize: 8, fontWeight: '900' },
  androidDownloadMeta: { color: muted, fontSize: 6, fontWeight: '800', marginTop: 3 },
  unlockFlash: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.04)' },
  unlockBar: { position: 'absolute', left: 0, right: 0, height: 1, top: '50%', backgroundColor: '#FFFFFF', shadowColor: '#FFFFFF', shadowOpacity: 1, shadowRadius: 18 },
  unlockStamp: { color: paper, borderWidth: 1, borderColor: 'rgba(255,255,255,.62)', backgroundColor: 'rgba(0,0,0,.76)', paddingHorizontal: 18, paddingVertical: 10, fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  deniedGlitch: { ...StyleSheet.absoluteFillObject, zIndex: 20, alignItems: 'center', justifyContent: 'center' },
  glitchLine: { position: 'absolute', left: 0, right: 0, height: 2, backgroundColor: 'rgba(255,52,67,.75)', shadowColor: '#FF3443', shadowOpacity: 1, shadowRadius: 9 },
  deniedStamp: { color: '#FFE7E9', borderWidth: 1, borderColor: '#FF4C56', backgroundColor: 'rgba(18,0,2,.9)', paddingHorizontal: 18, paddingVertical: 10, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  centeredGate: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  adminLive: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: border, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7 },
  adminLiveText: { color: paper, fontSize: 7, fontWeight: '900' },
  limitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginVertical: 13 },
  limitButton: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.27)', backgroundColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' },
  limitButtonText: { color: paper, fontSize: 24, fontWeight: '700' },
  limitValue: { minWidth: 110, alignItems: 'center' },
  creditNumber: { color: paper, fontSize: 24, fontWeight: '900' },
  durationRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  durationChoice: { flex: 1, minHeight: 38, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.035)' },
  durationChoiceActive: { borderColor: 'rgba(255,255,255,.40)', backgroundColor: 'rgba(255,255,255,.12)' },
  burnNotice: { minHeight: 54, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(167,229,154,.35)', backgroundColor: 'rgba(167,229,154,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 12 },
  accessCodeCard: { borderWidth: 1, borderColor: 'rgba(255,255,255,.20)', borderRadius: 12, backgroundColor: 'rgba(7,10,8,.76)', padding: 12, marginBottom: 8 },
  accessCodeCardDisabled: { opacity: .48 },
  accessCodeTop: { flexDirection: 'row', alignItems: 'center' },
  accessCode: { color: paper, fontSize: 17, fontWeight: '900', letterSpacing: 1.4 },
  codeUsageTrack: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,.08)', marginTop: 13, overflow: 'hidden' },
  codeUsageFill: { height: '100%', backgroundColor: '#EAF7E7' },
  codeUsageRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 9 },
  codeUsage: { color: muted, fontSize: 7, fontWeight: '900' },
  codeDisable: { color: '#E0B0B0', fontSize: 7, fontWeight: '900' },
  codeEnable: { color: accent, fontSize: 7, fontWeight: '900' },
  joinedPilot: { minHeight: 66, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center' },
  messageScreen: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 88 },
  messageHeader: { height: 54, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: border, flexDirection: 'row', alignItems: 'center', gap: 12 },
  messageList: { padding: 14, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: { alignSelf: 'flex-start', maxWidth: '82%', borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.06)', padding: 10 },
  messageBubbleOwn: { alignSelf: 'flex-end', borderColor: 'rgba(145,185,133,.35)', backgroundColor: 'rgba(145,185,133,.11)' },
  messageText: { color: paper, fontSize: 11, lineHeight: 16 },
  messageTime: { color: muted, fontSize: 6, marginTop: 5 },
  messageComposer: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: 1, borderTopColor: border },
  digitalBuildCard: { borderColor: 'rgba(223,255,215,.34)', backgroundColor: 'rgba(223,255,215,.055)' },
  twinPreview: { height: 250, marginTop: 12, marginBottom: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', backgroundColor: '#030503', overflow: 'hidden' },
  twinPreviewImage: { width: '100%', height: '100%' },
  angleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 14 },
  angleCapture: { width: '48.5%', aspectRatio: 1.38, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,.22)', backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  angleCaptureReady: { borderStyle: 'solid', borderColor: 'rgba(167,229,154,.56)' },
  angleImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  angleLabel: { position: 'absolute', left: 6, right: 6, bottom: 6, minHeight: 25, borderRadius: 7, paddingHorizontal: 7, backgroundColor: 'rgba(2,4,3,.82)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  angleLabelText: { color: paper, fontSize: 6, fontWeight: '900', letterSpacing: .7 },
  twinKeyPanel: { marginBottom: 10 },
  twinStatus: { color: accent, fontSize: 7, fontWeight: '900', letterSpacing: .8, marginVertical: 11 },
  worldHero: { minHeight: 150, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,.20)', backgroundColor: 'rgba(4,8,5,.80)', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  worldMapButton: { width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)', backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center', shadowColor: '#DFFFD7', shadowOpacity: .24, shadowRadius: 18 },
  worldStats: { flexDirection: 'row', marginTop: 9, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: '#090B09', overflow: 'hidden' },
  heatPanel: { marginTop: 9, padding: 13, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', backgroundColor: 'rgba(4,7,5,.9)' },
  heatHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heatLevel: { color: paper, fontSize: 18, fontWeight: '900', marginTop: 3 },
  heatValue: { color: paper, fontSize: 34, fontWeight: '300' },
  heatTrack: { height: 3, marginVertical: 10, backgroundColor: 'rgba(255,255,255,.10)', overflow: 'hidden' },
  journeyProgress: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.08)', overflow: 'hidden', marginTop: 13 },
  journeyProgressFill: { height: '100%', borderRadius: 3, backgroundColor: accent },
  heatFill: { height: '100%', backgroundColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 8 },
  ghostProtocol: { minHeight: 70, marginTop: 9, paddingHorizontal: 13, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', backgroundColor: 'rgba(255,255,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 11 },
  worldCard: { marginBottom: 9 },
  contractCard: { marginBottom: 8 },
  contractReward: { color: accent, fontSize: 9, fontWeight: '900', marginLeft: 8 },
  contractTrack: { height: 3, backgroundColor: 'rgba(255,255,255,.10)', overflow: 'hidden' },
  contractFill: { height: '100%', backgroundColor: paper },
  contractFooter: { minHeight: 32, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contractActive: { color: accent, fontSize: 7, fontWeight: '900' },
  contractComplete: { color: paper, fontSize: 7, fontWeight: '900' },
  safeHouseAction: { width: 34, height: 34, borderRadius: 9, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(255,255,255,.05)', alignItems: 'center', justifyContent: 'center' },
  progressionBadgeRail: { gap: 8, paddingBottom: 8 },
  gameBadge: { width: 150, minHeight: 145, padding: 12, borderRadius: 11, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(4,7,5,.84)', opacity: .58 },
  gameBadgeEarned: { borderColor: 'rgba(167,229,154,.48)', backgroundColor: 'rgba(167,229,154,.08)', opacity: 1 },
  featuredBadgeList: { gap: 7 },
  featuredBadgeRow: { minHeight: 58, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: 'rgba(167,229,154,.30)', borderRadius: 8, backgroundColor: 'rgba(5,10,6,.88)' },
  featuredBadgeSlot: { width: 18, color: accent, fontSize: 11, fontWeight: '900', textAlign: 'center' },
  gameBadgeIcon: { width: 42, height: 42, borderRadius: 10, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  gameBadgeTitle: { color: paper, fontSize: 9, fontWeight: '900' },
  gameBadgeMeta: { color: muted, fontSize: 7, lineHeight: 11, marginTop: 7 },
  worldCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  worldListRow: { minHeight: 68, marginBottom: 7, paddingHorizontal: 11, borderRadius: 10, borderWidth: 1, borderColor: border, backgroundColor: 'rgba(7,10,8,.82)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  worldClaimed: { opacity: .5 },
  crewSigil: { width: 40, height: 40, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(167,229,154,.42)', backgroundColor: 'rgba(167,229,154,.09)', alignItems: 'center', justifyContent: 'center' },
  crewSigilText: { color: accent, fontSize: 8, fontWeight: '900' },
  reportTypes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reportType: { minHeight: 34, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1, borderColor: border, alignItems: 'center', justifyContent: 'center' },
  reportTypeActive: { borderColor: 'rgba(167,229,154,.52)', backgroundColor: 'rgba(167,229,154,.12)' },
  reportTypeText: { color: muted, fontSize: 6, fontWeight: '900' },
  reportTypeTextActive: { color: paper },
  nativeWorldPin: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(223,255,215,.7)', backgroundColor: 'rgba(3,7,4,.92)', alignItems: 'center', justifyContent: 'center' },
  nativeTimedPin: { alignItems: 'center', justifyContent: 'center', gap: 3 },
  nativeRewardPin: { minWidth: 38, height: 38, paddingHorizontal: 5, borderRadius: 19, borderWidth: 2, borderColor: paper, backgroundColor: '#0A120B', alignItems: 'center', justifyContent: 'center', shadowColor: accent, shadowOpacity: .8, shadowRadius: 10 },
  nativeRewardText: { color: accent, fontSize: 8, fontWeight: '900' },
  nativeMapTimer: { color: paper, fontSize: 6, fontWeight: '900', borderWidth: 1, borderColor: 'rgba(255,255,255,.4)', borderRadius: 6, backgroundColor: 'rgba(2,5,3,.92)', paddingHorizontal: 5, paddingVertical: 2 },
  nativeRouteStop: { width: 29, height: 29, borderRadius: 9, borderWidth: 2, borderColor: paper, backgroundColor: '#071008', alignItems: 'center', justifyContent: 'center' },
  nativeRouteStopText: { color: accent, fontSize: 9, fontWeight: '900' },
  nativeSafetyPin: { width: 27, height: 27, borderRadius: 7, borderWidth: 1, borderColor: 'rgba(255,255,255,.62)', backgroundColor: '#090C09', alignItems: 'center', justifyContent: 'center' },
  nativeSafetyText: { color: paper, fontSize: 14, fontWeight: '900' },
});
