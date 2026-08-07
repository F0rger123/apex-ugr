import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMapStore, DriverRadarMarker, CarMeetWithHost } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../config/colors';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import {
  Navigation,
  Shield,
  MapPin,
  Users,
  Gauge,
  MessageSquare,
  Flag,
  Eye,
  EyeOff,
  ChevronRight,
  Map as MapIcon,
  Globe,
  Plus,
  Minus,
  Compass,
  Search,
  Crosshair,
  Route,
  Layers,
} from 'lucide-react-native';

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;
let Polyline: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
  Polyline = Maps.Polyline;
}

const STATUS_COLORS: Record<string, string> = {
  'Cruising': colors.primary,
  'Staged for Race': '#FFB800',
  'Parked': colors.textMuted,
  'In Telemetry Run': '#FF0055',
};

// Preset Famous Racing Routes
const POPULAR_ROUTES = [
  { id: 'route_mulholland', name: 'Mulholland Snake Canyon', distance: '12.4 mi', coords: [{ lat: 34.1002, lng: -118.5234 }, { lat: 34.1120, lng: -118.5410 }, { lat: 34.0950, lng: -118.5600 }] },
  { id: 'route_pch', name: 'Pacific Coast Highway Sprint', distance: '24.8 mi', coords: [{ lat: 34.0300, lng: -118.5300 }, { lat: 34.0400, lng: -118.6500 }, { lat: 34.0500, lng: -118.8000 }] },
  { id: 'route_port', name: 'LA Port Industrial Dig Strip', distance: '1.2 mi', coords: [{ lat: 33.7400, lng: -118.2700 }, { lat: 33.7450, lng: -118.2600 }] },
];

// ─── Web MapLibre GL Map (3D Vector & Free-Pan Controls) ──────────────────
const WebRadarView = React.memo(
  ({ currentLocation, driversNearby, meets, followMode, activeRoute, mapZoom, pitchAngle }: any) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    const [htmlContent] = useState(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
      <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
      <style>
        html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #08090C; font-family: system-ui, sans-serif; overflow: hidden; }
        .maplibregl-popup-content { background: rgba(15,17,23,0.95) !important; color: #fff !important; border: 1px solid #00FF66 !important; border-radius: 10px !important; backdrop-filter: blur(8px); padding: 12px; }
        .maplibregl-popup-tip { border-top-color: #00FF66 !important; }
        .racer-tag { color: #00FF66; font-weight: 900; font-size: 14px; margin-bottom: 2px; }
        .racer-sub { color: #8E9BAE; font-size: 12px; }
        .speed-tag { color: #FFB800; font-weight: 800; font-size: 13px; margin-top: 6px; }
        
        .pulse-marker {
          width: 24px;
          height: 24px;
          background: #00FF66;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 25px #00FF66;
          animation: pulse 1.8s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 102, 0.7); }
          70% { transform: scale(1.15); box-shadow: 0 0 0 16px rgba(0, 255, 102, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0, 255, 102, 0); }
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map;
        let markers = {};
        let isFollow = true;
        
        function initMap(lat, lng) {
          if (map) return;
          map = new maplibregl.Map({
            container: 'map',
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [lng, lat],
            zoom: 14,
            pitch: 60,
            bearing: -15,
            antialias: true
          });
          
          map.addControl(new maplibregl.NavigationControl(), 'top-right');
        }

        window.addEventListener('message', function(event) {
          const data = event.data;
          
          if (data.type === 'INIT') {
            initMap(data.lat, data.lng);
          } else if (data.type === 'SET_ZOOM' && map) {
            map.setZoom(data.zoom);
          } else if (data.type === 'SET_PITCH' && map) {
            map.setPitch(data.pitch);
          } else if (data.type === 'CENTER' && map) {
            map.flyTo({ center: [data.lng, data.lat], zoom: 15, pitch: 60 });
          } else if (data.type === 'UPDATE' && map) {
            isFollow = data.followMode;
            
            if (data.you) {
              if (markers['you']) markers['you'].remove();
              
              const el = document.createElement('div');
              el.className = 'pulse-marker';
              
              markers['you'] = new maplibregl.Marker(el)
                .setLngLat([data.you.lng, data.you.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag">YOU (LIVE PILOT)</div><div class="racer-sub">Telemetry Active</div>'))
                .addTo(map);

              if (isFollow) {
                map.setCenter([data.you.lng, data.you.lat]);
              }
            }

            // Drivers
            Object.keys(markers).forEach(id => { if (id !== 'you' && !id.startsWith('meet_')) markers[id].remove(); });
            data.drivers.forEach(d => {
              const el = document.createElement('div');
              el.style.width = '20px';
              el.style.height = '20px';
              el.style.background = d.status === 'In Telemetry Run' ? '#FF0055' : '#FFB800';
              el.style.borderRadius = '50%';
              el.style.border = '2px solid #000';
              el.style.boxShadow = '0 0 15px ' + (d.status === 'In Telemetry Run' ? '#FF0055' : '#FFB800');
              el.style.cursor = 'pointer';

              markers[d.id] = new maplibregl.Marker(el)
                .setLngLat([d.lng, d.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag">@' + d.name + '</div><div class="racer-sub">' + d.car + '</div><div class="speed-tag">' + d.speed + ' MPH • ' + d.status + '</div>'))
                .addTo(map);
            });

            // Meets
            Object.keys(markers).forEach(id => { if (id.startsWith('meet_')) markers[id].remove(); });
            data.meets.forEach(m => {
              const el = document.createElement('div');
              el.style.width = '32px';
              el.style.height = '32px';
              el.style.background = '#FF0055';
              el.style.borderRadius = '8px';
              el.style.border = '2px solid #fff';
              el.style.boxShadow = '0 0 18px #FF0055';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.color = '#fff';
              el.style.fontSize = '10px';
              el.style.fontWeight = '900';
              el.innerText = 'MEET';

              markers['meet_'+m.id] = new maplibregl.Marker(el)
                .setLngLat([m.lng, m.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag" style="color:#FF0055;">' + m.title + '</div><div class="racer-sub">' + m.location + '</div>'))
                .addTo(map);
            });

            // Route Polyline Layer
            if (data.routeCoords && data.routeCoords.length > 0) {
              const geojson = {
                'type': 'Feature',
                'geometry': {
                  'type': 'LineString',
                  'coordinates': data.routeCoords.map(c => [c.lng, c.lat])
                }
              };
              if (map.getSource('route')) {
                map.getSource('route').setData(geojson);
              } else {
                map.addSource('route', { 'type': 'geojson', 'data': geojson });
                map.addLayer({
                  'id': 'route',
                  'type': 'line',
                  'source': 'route',
                  'layout': { 'line-join': 'round', 'line-cap': 'round' },
                  'paint': { 'line-color': '#00FF66', 'line-width': 5, 'line-opacity': 0.85 }
                });
              }
            }
          }
        });
        
        initMap(34.0522, -118.2437);
      </script>
    </body>
    </html>
  `);

    useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        const message = {
          type: 'UPDATE',
          followMode,
          routeCoords: activeRoute ? activeRoute.coords : [],
          you: currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null,
          drivers: driversNearby.map((d: any) => ({
            id: d.id,
            lat: d.latitude,
            lng: d.longitude,
            name: d.profile?.username || 'Racer',
            speed: d.speed_mph,
            status: d.status,
            car: d.vehicle ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}` : 'Tuned Performance Car',
          })),
          meets: meets.map((m: any) => ({
            id: m.id,
            lat: m.latitude,
            lng: m.longitude,
            title: m.title,
            location: m.location_name,
          })),
        };
        iframeRef.current.contentWindow.postMessage(message, '*');
      }
    }, [currentLocation, driversNearby, meets, followMode, activeRoute]);

    useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_ZOOM', zoom: mapZoom }, '*');
      }
    }, [mapZoom]);

    useEffect(() => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'SET_PITCH', pitch: pitchAngle }, '*');
      }
    }, [pitchAngle]);

    return (
      <View style={{ flex: 1, minHeight: 480, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.cardBorder }}>
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Apex UGR 3D Radar Map"
        />
      </View>
    );
  }
);

export const MapScreen = ({ navigation }: any) => {
  const {
    currentLocation,
    driversNearby,
    meets,
    privacyMode,
    visibilityRadiusKm,
    isLoading,
    startLocationTracking,
    stopLocationTracking,
    subscribeToDriverLocations,
    unsubscribeFromDriverLocations,
    fetchMeets,
    setPrivacyMode,
  } = useMapStore();
  const { user } = useAuthStore();

  const [selectedDriver, setSelectedDriver] = useState<DriverRadarMarker | null>(null);
  const [selectedMeet, setSelectedMeet] = useState<CarMeetWithHost | null>(null);
  const [mapTab, setMapTab] = useState<'radar' | 'meets' | 'routes'>('radar');
  const [followMode, setFollowMode] = useState(true);
  const [mapZoom, setMapZoom] = useState(14);
  const [pitchAngle, setPitchAngle] = useState(60);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mapRef = useRef<any>(null);

  useEffect(() => {
    startLocationTracking(user?.id);
    subscribeToDriverLocations();
    fetchMeets(currentLocation?.latitude, currentLocation?.longitude);
    return () => {
      stopLocationTracking();
      unsubscribeFromDriverLocations();
    };
  }, [user?.id]);

  const handleZoomIn = () => {
    setMapZoom((prev) => Math.min(19, prev + 1));
  };

  const handleZoomOut = () => {
    setMapZoom((prev) => Math.max(8, prev - 1));
  };

  const togglePitch = () => {
    setPitchAngle((prev) => (prev === 60 ? 0 : 60));
  };

  const handleSearchLocation = () => {
    if (!searchQuery.trim()) return;
    const matchedRoute = POPULAR_ROUTES.find((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (matchedRoute) {
      setActiveRoute(matchedRoute);
      Alert.alert('Route Loaded', `Loaded route: ${matchedRoute.name} (${matchedRoute.distance})`);
    } else {
      Alert.alert('Location Found', `Centered radar focus on: ${searchQuery.toUpperCase()}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>CITY RADAR</Text>
          <Text style={styles.headerSub}>3D MAPLIBRE VECTOR ENGINE</Text>
        </View>
        <TouchableOpacity
          style={[styles.privacyBtn, privacyMode === 'invisible' && styles.privacyBtnActive]}
          onPress={() => setPrivacyMode(privacyMode === 'invisible' ? 'all' : 'invisible', user?.id)}
        >
          {privacyMode === 'invisible' ? <EyeOff size={16} color={colors.danger} /> : <Eye size={16} color={colors.primary} />}
          <Text style={[styles.privacyText, privacyMode === 'invisible' && { color: colors.danger }]}>
            {privacyMode === 'invisible' ? 'GHOST' : 'LIVE'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Route & Location Search Bar */}
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputBox}>
          <Search size={16} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search city location, canyon route, or street..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchLocation}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchLocation}>
          <Route size={16} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Main 3D Map View Container */}
      <View style={styles.mapContainer}>
        <WebRadarView
          currentLocation={currentLocation}
          driversNearby={driversNearby}
          meets={meets}
          followMode={followMode}
          activeRoute={activeRoute}
          mapZoom={mapZoom}
          pitchAngle={pitchAngle}
        />

        {/* Floating Map Controls Overlay */}
        <View style={styles.floatingControls}>
          {/* Follow Me Lock Toggle */}
          <TouchableOpacity
            style={[styles.floatingBtn, followMode ? styles.floatingBtnActive : styles.floatingBtnInactive]}
            onPress={() => setFollowMode(!followMode)}
          >
            <Crosshair size={18} color={followMode ? colors.background : colors.primary} />
            <Text style={[styles.floatingBtnText, followMode && { color: colors.background }]}>
              {followMode ? 'LOCKED' : 'FREE PAN'}
            </Text>
          </TouchableOpacity>

          {/* 3D Tilt Toggle */}
          <TouchableOpacity style={styles.floatingSquareBtn} onPress={togglePitch}>
            <Layers size={18} color={pitchAngle === 60 ? colors.primary : colors.textMuted} />
          </TouchableOpacity>

          {/* Zoom In */}
          <TouchableOpacity style={styles.floatingSquareBtn} onPress={handleZoomIn}>
            <Plus size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Zoom Out */}
          <TouchableOpacity style={styles.floatingSquareBtn} onPress={handleZoomOut}>
            <Minus size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        {isLoading && !currentLocation && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>CALIBRATING HIGH-PRECISION GPS...</Text>
          </View>
        )}
      </View>

      {/* Bottom Tabs & Details Panel */}
      <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'radar' && styles.tabBtnActive]}
            onPress={() => setMapTab('radar')}
          >
            <Globe size={14} color={mapTab === 'radar' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'radar' && { color: colors.background }]}>RADAR ({driversNearby.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'meets' && styles.tabBtnActive]}
            onPress={() => setMapTab('meets')}
          >
            <Users size={14} color={mapTab === 'meets' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'meets' && { color: colors.background }]}>MEETS ({meets.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'routes' && styles.tabBtnActive]}
            onPress={() => setMapTab('routes')}
          >
            <Route size={14} color={mapTab === 'routes' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'routes' && { color: colors.background }]}>ROUTES</Text>
          </TouchableOpacity>
        </View>

        {mapTab === 'radar' && (
          <View style={styles.radarList}>
            {driversNearby.length === 0 ? (
              <View style={styles.emptyState}>
                <Globe size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO RACERS DETECTED NEARBY</Text>
                <Text style={styles.emptySub}>Zoom out or change range settings.</Text>
              </View>
            ) : (
              driversNearby.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.driverCard, selectedDriver?.id === driver.id && styles.driverCardActive]}
                  onPress={() => setSelectedDriver(driver)}
                >
                  <Image source={{ uri: driver.profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }} style={styles.driverAvatar} />
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>@{driver.profile?.username || 'Racer'}</Text>
                    <Text style={styles.driverCar}>
                      {driver.vehicle ? `${driver.vehicle.year} ${driver.vehicle.make} ${driver.vehicle.model}` : 'Tuned GT-R Nismo'}
                    </Text>
                  </View>
                  <View style={styles.driverStatusBlock}>
                    <Text style={[styles.driverSpeed, { color: STATUS_COLORS[driver.status] || colors.primary }]}>
                      {driver.speed_mph} MPH
                    </Text>
                    <Text style={styles.driverStatus}>{driver.status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {mapTab === 'meets' && (
          <View style={styles.meetsList}>
            {meets.length === 0 ? (
              <View style={styles.emptyState}>
                <MapPin size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO CAR MEETS SCHEDULED</Text>
              </View>
            ) : (
              meets.map((meet) => (
                <TouchableOpacity
                  key={meet.id}
                  style={[styles.meetCard, selectedMeet?.id === meet.id && styles.meetCardActive]}
                  onPress={() => navigation.navigate('CarMeetDetail', { meetId: meet.id })}
                >
                  <View style={styles.meetIconBox}>
                    <Users size={20} color={colors.background} />
                  </View>
                  <View style={styles.meetInfo}>
                    <Text style={styles.meetTitle}>{meet.title}</Text>
                    <Text style={styles.meetLocation}>{meet.location_name}</Text>
                  </View>
                  <View style={styles.meetAttendees}>
                    <Text style={styles.attendeeCount}>{meet.attendees_count}</Text>
                    <Text style={styles.attendeeLabel}>ATTENDING</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {mapTab === 'routes' && (
          <View style={styles.routesList}>
            {POPULAR_ROUTES.map((route) => (
              <TouchableOpacity
                key={route.id}
                style={[styles.routeCard, activeRoute?.id === route.id && styles.routeCardActive]}
                onPress={() => {
                  setActiveRoute(route);
                  Alert.alert('Active Route Set', `Navigating ${route.name}`);
                }}
              >
                <View style={styles.routeIconBox}>
                  <Route size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeDistance}>{route.distance} • Verified Canyon Run</Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: colors.surface,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  privacyBtnActive: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderColor: colors.danger },
  privacyText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  searchBarRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, height: 40, color: colors.text, fontSize: 13 },
  searchBtn: {
    width: 40,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapContainer: { flex: 0.6, margin: 12, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 12, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 12 },

  floatingControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 10,
    zIndex: 20,
  },
  floatingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  floatingBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  floatingBtnInactive: { backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: colors.primary },
  floatingBtnText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  floatingSquareBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoPanel: { flex: 0.4, paddingHorizontal: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginVertical: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  radarList: { gap: 10 },
  meetsList: { gap: 10 },
  routesList: { gap: 10 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  driverCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.05)' },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: colors.cardBorder },
  driverInfo: { flex: 1 },
  driverName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  driverCar: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  driverStatusBlock: { alignItems: 'flex-end' },
  driverSpeed: { fontSize: 16, fontWeight: '900' },
  driverStatus: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },

  meetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  meetCardActive: { borderColor: colors.primary },
  meetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FF0055',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  meetInfo: { flex: 1 },
  meetTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  meetLocation: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  meetAttendees: { alignItems: 'flex-end' },
  attendeeCount: { color: colors.primary, fontSize: 16, fontWeight: '900' },
  attendeeLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', marginTop: 2 },

  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  routeCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.05)' },
  routeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  routeDistance: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
});
