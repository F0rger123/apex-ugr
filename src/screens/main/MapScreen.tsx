import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { useMapStore, DriverRadarMarker, CarMeetWithHost } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../config/colors';
import { GlassCard } from '../../components/common/GlassCard';
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
  Globe,
  Plus,
  Minus,
  Crosshair,
  Route,
  Layers,
  Search,
  LocateFixed,
  ZoomIn,
  ZoomOut,
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

const POPULAR_ROUTES = [
  { id: 'route_mulholland', name: 'Mulholland Snake Canyon', distance: '12.4 mi', difficulty: 'EXPERT', coords: [{ lat: 34.1002, lng: -118.5234 }, { lat: 34.1120, lng: -118.5410 }, { lat: 34.0950, lng: -118.5600 }] },
  { id: 'route_pch', name: 'Pacific Coast Highway Sprint', distance: '24.8 mi', difficulty: 'INTERMEDIATE', coords: [{ lat: 34.0300, lng: -118.5300 }, { lat: 34.0400, lng: -118.6500 }, { lat: 34.0500, lng: -118.8000 }] },
  { id: 'route_port', name: 'LA Port Industrial Dig Strip', distance: '1.2 mi', difficulty: 'BEGINNER', coords: [{ lat: 33.7400, lng: -118.2700 }, { lat: 33.7450, lng: -118.2600 }] },
  { id: 'route_canyon', name: 'Angeles Crest Canyon Attack', distance: '18.6 mi', difficulty: 'EXPERT', coords: [{ lat: 34.2200, lng: -118.1000 }, { lat: 34.2500, lng: -118.0500 }, { lat: 34.2800, lng: -117.9800 }] },
];

// ─── Web MapLibre GL Map — Full 3D Vector with Real GPS ──────────────────────
const WebRadarView = React.memo(
  ({ currentLocation, driversNearby, meets, followMode, activeRoute, mapZoom, pitchAngle, onMapReady }: any) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const gpsInitSentRef = useRef(false);

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
        .maplibregl-popup-content { background: rgba(8,9,12,0.98) !important; color: #fff !important; border: 1px solid #00FF66 !important; border-radius: 12px !important; backdrop-filter: blur(16px); padding: 14px 16px; min-width: 160px; }
        .maplibregl-popup-tip { border-top-color: #00FF66 !important; }
        .racer-tag { color: #00FF66; font-weight: 900; font-size: 14px; margin-bottom: 4px; letter-spacing: 0.5px; }
        .racer-sub { color: #8E9BAE; font-size: 11px; }
        .speed-tag { color: #FFB800; font-weight: 800; font-size: 13px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 6px; }
        .you-tag { color: #00FF66; font-weight: 900; font-size: 14px; }
        .gps-ring { animation: ringPulse 2.5s infinite; }

        .pulse-marker {
          width: 22px; height: 22px;
          background: #00FF66;
          border-radius: 50%;
          border: 3px solid #ffffff;
          box-shadow: 0 0 0 0 rgba(0, 255, 102, 0.7);
          animation: pulseGPS 2s infinite;
        }
        @keyframes pulseGPS {
          0% { box-shadow: 0 0 0 0 rgba(0, 255, 102, 0.7); transform: scale(0.95); }
          50% { box-shadow: 0 0 0 18px rgba(0, 255, 102, 0); transform: scale(1.1); }
          100% { box-shadow: 0 0 0 0 rgba(0, 255, 102, 0); transform: scale(0.95); }
        }
        .accuracy-ring {
          border-radius: 50%;
          border: 2px solid rgba(0, 255, 102, 0.3);
          background: rgba(0, 255, 102, 0.05);
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .meet-marker {
          width: 36px; height: 36px;
          background: linear-gradient(135deg, #FF0055, #FF3366);
          border-radius: 8px;
          border: 2px solid #fff;
          box-shadow: 0 0 18px rgba(255,0,85,0.6);
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 10px; font-weight: 900;
        }
        .racer-marker {
          width: 18px; height: 18px;
          border-radius: 50%;
          border: 2px solid #000;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .racer-marker:hover { transform: scale(1.4); }
        #gps-status {
          position: absolute;
          bottom: 12px;
          left: 12px;
          background: rgba(8,9,12,0.9);
          color: #00FF66;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1px;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px solid rgba(0,255,102,0.3);
          pointer-events: none;
          z-index: 10;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <div id="gps-status">ACQUIRING GPS...</div>
      <script>
        let map;
        let markers = {};
        let isFollow = true;
        let userLat = 34.0522;
        let userLng = -118.2437;
        let accuracyMarker = null;
        let mapReady = false;

        function initMap(lat, lng, zoom) {
          if (map) return;
          userLat = lat;
          userLng = lng;
          map = new maplibregl.Map({
            container: 'map',
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [lng, lat],
            zoom: zoom || 15,
            minZoom: 4,
            maxZoom: 19,
            pitch: 60,
            bearing: -10,
            antialias: true
          });
          map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
          map.on('load', () => {
            mapReady = true;
            window.parent.postMessage({ type: 'MAP_READY' }, '*');
            document.getElementById('gps-status').textContent = 'GPS LOCKED ✓';
          });
          map.on('dragstart', () => { isFollow = false; });
        }

        function addYouMarker(lat, lng, accuracy) {
          if (!map || !mapReady) return;
          if (markers['you']) markers['you'].remove();

          const el = document.createElement('div');
          el.className = 'pulse-marker';

          markers['you'] = new maplibregl.Marker(el)
            .setLngLat([lng, lat])
            .setPopup(new maplibregl.Popup({ offset: 28 }).setHTML('<div class="you-tag">● YOU (LIVE PILOT)</div><div class="racer-sub">GPS Active · ' + (accuracy ? Math.round(accuracy) + 'm accuracy' : 'Locked') + '</div>'))
            .addTo(map);

          if (isFollow) {
            map.easeTo({ center: [lng, lat], duration: 800 });
          }

          // Update accuracy ring
          const accuracyMeters = accuracy || 20;
          document.getElementById('gps-status').textContent = 'GPS LOCKED ✓ ±' + Math.round(accuracyMeters) + 'm';
        }

        window.addEventListener('message', function(event) {
          const data = event.data;

          if (data.type === 'INIT') {
            initMap(data.lat, data.lng, data.zoom || 15);
            addYouMarker(data.lat, data.lng, data.accuracy);
          }

          if (data.type === 'SET_FOLLOW') {
            isFollow = data.follow;
            if (data.follow && userLat && userLng) {
              map && map.flyTo({ center: [userLng, userLat], zoom: 16, pitch: 60, duration: 1000 });
            }
          }

          if (data.type === 'ZOOM_REGION') {
            map && map.flyTo({ zoom: 10, duration: 1200 });
          }

          if (data.type === 'SET_ZOOM' && map) {
            map.easeTo({ zoom: data.zoom, duration: 400 });
          }

          if (data.type === 'SET_PITCH' && map) {
            map.easeTo({ pitch: data.pitch, duration: 400 });
          }

          if (data.type === 'UPDATE' && map) {
            isFollow = data.followMode;

            if (data.you) {
              userLat = data.you.lat;
              userLng = data.you.lng;
              addYouMarker(data.you.lat, data.you.lng, data.you.accuracy);
            }

            // Drivers
            Object.keys(markers).forEach(id => {
              if (id !== 'you' && !id.startsWith('meet_')) {
                markers[id].remove();
                delete markers[id];
              }
            });
            data.drivers.forEach(d => {
              const el = document.createElement('div');
              el.className = 'racer-marker';
              const isRacing = d.status === 'In Telemetry Run';
              el.style.background = isRacing ? '#FF0055' : '#FFB800';
              el.style.boxShadow = '0 0 14px ' + (isRacing ? '#FF0055' : '#FFB800');

              markers[d.id] = new maplibregl.Marker(el)
                .setLngLat([d.lng, d.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
                  '<div class="racer-tag">@' + d.name + '</div>' +
                  '<div class="racer-sub">' + d.car + '</div>' +
                  '<div class="speed-tag">' + d.speed + ' MPH · ' + d.status + '</div>'
                ))
                .addTo(map);
            });

            // Meets
            Object.keys(markers).forEach(id => {
              if (id.startsWith('meet_')) {
                markers[id].remove();
                delete markers[id];
              }
            });
            data.meets.forEach(m => {
              const el = document.createElement('div');
              el.className = 'meet-marker';
              el.innerText = 'MEET';

              markers['meet_'+m.id] = new maplibregl.Marker(el)
                .setLngLat([m.lng, m.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML(
                  '<div class="racer-tag" style="color:#FF0055;">' + m.title + '</div>' +
                  '<div class="racer-sub">📍 ' + m.location + '</div>'
                ))
                .addTo(map);
            });

            // Route Polyline
            if (data.routeCoords && data.routeCoords.length > 0) {
              const geojson = {
                'type': 'Feature',
                'geometry': { 'type': 'LineString', 'coordinates': data.routeCoords.map(c => [c.lng, c.lat]) }
              };
              if (map.getSource('route')) {
                map.getSource('route').setData(geojson);
              } else {
                map.addSource('route', { 'type': 'geojson', 'data': geojson });
                map.addLayer({
                  'id': 'route', 'type': 'line', 'source': 'route',
                  'layout': { 'line-join': 'round', 'line-cap': 'round' },
                  'paint': { 'line-color': '#00FF66', 'line-width': 6, 'line-opacity': 0.9,
                    'line-dasharray': [0, 2] }
                });
              }
            }
          }
        });

        // Auto-acquire GPS on load
        if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const lat = pos.coords.latitude;
              const lng = pos.coords.longitude;
              const acc = pos.coords.accuracy;
              initMap(lat, lng, 15);
              addYouMarker(lat, lng, acc);
            },
            (err) => {
              console.log('GPS fallback:', err.message);
              initMap(34.0522, -118.2437, 13);
              document.getElementById('gps-status').textContent = 'GPS UNAVAILABLE';
            },
            { enableHighAccuracy: true, timeout: 8000 }
          );
        } else {
          initMap(34.0522, -118.2437, 13);
        }
      </script>
    </body>
    </html>
  `);

    useEffect(() => {
      if (!iframeRef.current?.contentWindow) return;
      const win = iframeRef.current.contentWindow;

      win.postMessage({
        type: 'UPDATE',
        followMode,
        routeCoords: activeRoute ? activeRoute.coords : [],
        you: currentLocation
          ? { lat: currentLocation.latitude, lng: currentLocation.longitude, accuracy: currentLocation.accuracy || 10 }
          : null,
        drivers: (driversNearby || []).map((d: any) => ({
          id: d.id,
          lat: d.latitude,
          lng: d.longitude,
          name: d.profile?.username || 'Racer',
          speed: d.speed_mph || 0,
          status: d.status || 'Cruising',
          car: d.vehicle ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}` : 'Performance Build',
        })),
        meets: (meets || []).map((m: any) => ({
          id: m.id,
          lat: m.latitude,
          lng: m.longitude,
          title: m.title,
          location: m.location_name,
        })),
      }, '*');
    }, [currentLocation, driversNearby, meets, followMode, activeRoute]);

    useEffect(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_ZOOM', zoom: mapZoom }, '*');
    }, [mapZoom]);

    useEffect(() => {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_PITCH', pitch: pitchAngle }, '*');
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
  const [mapZoom, setMapZoom] = useState(15);
  const [pitchAngle, setPitchAngle] = useState(60);
  const [activeRoute, setActiveRoute] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const iframeRef = useRef<any>(null);

  // Pulse animation for live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    startLocationTracking(user?.id);
    subscribeToDriverLocations();
    fetchMeets(currentLocation?.latitude, currentLocation?.longitude);
    return () => {
      stopLocationTracking();
      unsubscribeFromDriverLocations();
    };
  }, [user?.id]);

  const handleZoomIn = () => setMapZoom(prev => Math.min(19, prev + 1));
  const handleZoomOut = () => setMapZoom(prev => Math.max(8, prev - 1));
  const togglePitch = () => setPitchAngle(prev => prev === 60 ? 0 : 60);

  const handleRecenterOnMe = () => {
    setFollowMode(true);
    setMapZoom(16);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'SET_FOLLOW', follow: true }, '*');
    }
  };

  const handleZoomToRegion = () => {
    setFollowMode(false);
    setMapZoom(10);
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage({ type: 'ZOOM_REGION' }, '*');
    }
  };

  const handleSearchLocation = () => {
    if (!searchQuery.trim()) return;
    const matchedRoute = POPULAR_ROUTES.find(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (matchedRoute) {
      setActiveRoute(matchedRoute);
      Alert.alert('Route Loaded', `${matchedRoute.name}\n${matchedRoute.distance} · ${matchedRoute.difficulty}`);
    } else {
      Alert.alert('Searched', `Searching for: ${searchQuery}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>CITY RADAR</Text>
          <Text style={styles.headerSub}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <View style={[styles.liveDot, { backgroundColor: currentLocation ? colors.primary : colors.textMuted }]} />
            </Animated.View>
            {' '}{currentLocation ? 'GPS LOCKED' : 'SEARCHING...'} · {driversNearby.length} RACERS NEARBY
          </Text>
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
            placeholder="Search canyon route, city location, street..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearchLocation}
          />
        </View>
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearchLocation}>
          <Route size={16} color="#000000" />
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
            onPress={() => {
              const newMode = !followMode;
              setFollowMode(newMode);
              if (newMode) { setMapZoom(16); handleRecenterOnMe(); }
            }}
          >
            <Crosshair size={16} color={followMode ? '#000000' : colors.primary} />
            <Text style={[styles.floatingBtnText, followMode && { color: '#000000' }]}>
              {followMode ? 'LOCKED' : 'FREE'}
            </Text>
          </TouchableOpacity>

          {/* Recenter on My Location */}
          <TouchableOpacity style={styles.floatingSquareBtn} onPress={handleRecenterOnMe}>
            <LocateFixed size={18} color={colors.primary} />
          </TouchableOpacity>

          {/* Zoom to Region */}
          <TouchableOpacity style={styles.floatingSquareBtn} onPress={handleZoomToRegion}>
            <Globe size={18} color={colors.textSecondary} />
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

        {isLoading && (
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
            <Globe size={14} color={mapTab === 'radar' ? '#000000' : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'radar' && { color: '#000000' }]}>RADAR ({driversNearby.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'meets' && styles.tabBtnActive]}
            onPress={() => setMapTab('meets')}
          >
            <Users size={14} color={mapTab === 'meets' ? '#000000' : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'meets' && { color: '#000000' }]}>MEETS ({meets.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'routes' && styles.tabBtnActive]}
            onPress={() => setMapTab('routes')}
          >
            <Route size={14} color={mapTab === 'routes' ? '#000000' : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'routes' && { color: '#000000' }]}>ROUTES</Text>
          </TouchableOpacity>
        </View>

        {mapTab === 'radar' && (
          <View style={styles.radarList}>
            {driversNearby.length === 0 ? (
              <View style={styles.emptyState}>
                <Globe size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO RACERS DETECTED NEARBY</Text>
                <Text style={styles.emptySub}>Zoom out or expand your visibility radius.</Text>
              </View>
            ) : (
              driversNearby.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.driverCard, selectedDriver?.id === driver.id && styles.driverCardActive]}
                  onPress={() => setSelectedDriver(prev => prev?.id === driver.id ? null : driver as any)}
                >
                  <View style={[styles.driverStatusDot, { backgroundColor: STATUS_COLORS[driver.status] || colors.primary }]} />
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>@{(driver as any).profile?.username || 'RACER'}</Text>
                    <Text style={styles.driverCar}>
                      {(driver as any).vehicle ? `${(driver as any).vehicle.year} ${(driver as any).vehicle.make} ${(driver as any).vehicle.model}` : 'Tuned Performance Build'}
                    </Text>
                    <Text style={[styles.driverStatusText, { color: STATUS_COLORS[driver.status] || colors.primary }]}>{driver.status}</Text>
                  </View>
                  <View style={styles.driverStatusBlock}>
                    <Text style={[styles.driverSpeed, { color: STATUS_COLORS[driver.status] || colors.primary }]}>
                      {driver.speed_mph || 0}
                    </Text>
                    <Text style={styles.driverSpeedUnit}>MPH</Text>
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
                <Flag size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO MEETS IN YOUR AREA</Text>
                <Text style={styles.emptySub}>Check back later or create a meet.</Text>
              </View>
            ) : (
              meets.map((meet) => (
                <TouchableOpacity
                  key={meet.id}
                  style={[styles.meetCard, selectedMeet?.id === meet.id && styles.meetCardActive]}
                  onPress={() => {
                    setSelectedMeet((prev: CarMeetWithHost | null) => prev?.id === meet.id ? null : meet);
                    navigation.navigate('CarMeets');
                  }}
                >
                  <View style={styles.meetIconBox}>
                    <Flag size={18} color="#fff" />
                  </View>
                  <View style={styles.meetInfo}>
                    <Text style={styles.meetTitle}>{meet.title}</Text>
                    <Text style={styles.meetLocation}>📍 {meet.location_name}</Text>
                  </View>
                  <View style={styles.meetAttendees}>
                    <Text style={styles.attendeeCount}>{meet.attendees_count || 0}</Text>
                    <Text style={styles.attendeeLabel}>GOING</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {mapTab === 'routes' && (
          <View style={styles.routesList}>
            {POPULAR_ROUTES.map(route => (
              <TouchableOpacity
                key={route.id}
                style={[styles.routeCard, activeRoute?.id === route.id && styles.routeCardActive]}
                onPress={() => setActiveRoute(activeRoute?.id === route.id ? null : route)}
              >
                <View style={[styles.routeIconBox, activeRoute?.id === route.id && { backgroundColor: 'rgba(0,255,102,0.2)' }]}>
                  <Route size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.routeName}>{route.name}</Text>
                  <Text style={styles.routeDistance}>{route.distance} · {route.difficulty}</Text>
                </View>
                <View style={[styles.difficultyBadge, {
                  backgroundColor: route.difficulty === 'EXPERT' ? 'rgba(255,0,85,0.15)' :
                    route.difficulty === 'INTERMEDIATE' ? 'rgba(255,184,0,0.15)' : 'rgba(0,255,102,0.1)'
                }]}>
                  <Text style={[styles.difficultyText, {
                    color: route.difficulty === 'EXPERT' ? '#FF0055' :
                      route.difficulty === 'INTERMEDIATE' ? '#FFB800' : colors.primary
                  }]}>{route.difficulty}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 3, flexDirection: 'row', alignItems: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  privacyBtnActive: { borderColor: colors.danger, backgroundColor: 'rgba(255, 51, 102, 0.1)' },
  privacyText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  searchBarRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  searchInput: { flex: 1, height: 42, color: colors.text, fontSize: 13 },
  searchBtn: {
    width: 42,
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  mapContainer: {
    flex: 0.65,
    margin: 12,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 9, 12, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 14 },

  floatingControls: {
    position: 'absolute',
    top: 14,
    right: 14,
    gap: 8,
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
  floatingBtnInactive: { backgroundColor: 'rgba(8, 9, 12, 0.92)', borderColor: colors.primary },
  floatingBtnText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  floatingSquareBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(8, 9, 12, 0.92)',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoPanel: { flex: 0.35, paddingHorizontal: 12 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 3,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 5 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  radarList: { gap: 8 },
  meetsList: { gap: 8 },
  routesList: { gap: 8 },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: { color: colors.text, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: colors.textMuted, fontSize: 11, marginTop: 4 },

  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 10,
  },
  driverCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.04)' },
  driverStatusDot: { width: 10, height: 10, borderRadius: 5 },
  driverInfo: { flex: 1 },
  driverName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  driverCar: { color: colors.textMuted, fontSize: 11, fontWeight: '600', marginTop: 2 },
  driverStatusText: { fontSize: 10, fontWeight: '800', marginTop: 3, letterSpacing: 0.5 },
  driverStatusBlock: { alignItems: 'flex-end' },
  driverSpeed: { fontSize: 20, fontWeight: '900' },
  driverSpeedUnit: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 2 },

  meetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  meetCardActive: { borderColor: colors.primary },
  meetIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 0, 85, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  meetInfo: { flex: 1 },
  meetTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  meetLocation: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  meetAttendees: { alignItems: 'flex-end' },
  attendeeCount: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  attendeeLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '800', marginTop: 2 },

  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 12,
  },
  routeCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.04)' },
  routeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  routeDistance: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
});
