import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useMapStore, DriverRadarMarker, CarMeetWithHost } from '../../stores/mapStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../config/colors';
import { Navigation, Shield, MapPin, Users, Gauge, MessageSquare, Flag, Eye, EyeOff, ChevronRight, Map as MapIcon, Globe } from 'lucide-react-native';

let MapView: any = null;
let Marker: any = null;
let Circle: any = null;

if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  Circle = Maps.Circle;
}

const STATUS_COLORS: Record<string, string> = {
  'Cruising': colors.primary,
  'Staged for Race': '#FFB800',
  'Parked': colors.textMuted,
  'In Telemetry Run': '#FF4444',
};

// ─── Web MapLibre GL Map (3D Globe-Like) ──────────────────────────────────────────────────
const WebRadarView = React.memo(({ currentLocation, driversNearby, meets }: any) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // We only set htmlContent ONCE.
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
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map;
        let markers = {};
        
        function initMap(lat, lng) {
          if (map) return;
          map = new maplibregl.Map({
            container: 'map',
            style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
            center: [lng, lat],
            zoom: 14,
            pitch: 60, // 3D Pitch
            bearing: -15, // Slight rotation for cool effect
            antialias: true
          });
          
          map.addControl(new maplibregl.NavigationControl(), 'top-right');
        }

        window.addEventListener('message', function(event) {
          const data = event.data;
          
          if (data.type === 'INIT') {
            initMap(data.lat, data.lng);
          } else if (data.type === 'UPDATE' && map) {
            if (data.you) {
              if (markers['you']) markers['you'].remove();
              
              const el = document.createElement('div');
              el.style.width = '24px';
              el.style.height = '24px';
              el.style.background = '#00FF66';
              el.style.borderRadius = '50%';
              el.style.border = '3px solid #fff';
              el.style.boxShadow = '0 0 20px #00FF66';
              
              markers['you'] = new maplibregl.Marker(el)
                .setLngLat([data.you.lng, data.you.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag">YOU (LIVE PILOT)</div><div class="racer-sub">Telemetry Active</div>'))
                .addTo(map);
            }

            // Update Drivers
            Object.keys(markers).forEach(id => { if (id !== 'you' && !id.startsWith('meet_')) markers[id].remove(); });
            data.drivers.forEach(d => {
              const el = document.createElement('div');
              el.style.width = '18px';
              el.style.height = '18px';
              el.style.background = '#FFB800';
              el.style.borderRadius = '50%';
              el.style.border = '2px solid #000';
              el.style.boxShadow = '0 0 15px #FFB800';

              markers[d.id] = new maplibregl.Marker(el)
                .setLngLat([d.lng, d.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag">@' + d.name + '</div><div class="racer-sub">' + d.car + '</div><div class="speed-tag">' + d.speed + ' MPH • ' + d.status + '</div>'))
                .addTo(map);
            });

            // Update Meets
            Object.keys(markers).forEach(id => { if (id.startsWith('meet_')) markers[id].remove(); });
            data.meets.forEach(m => {
              const el = document.createElement('div');
              el.style.width = '30px';
              el.style.height = '30px';
              el.style.background = '#FF0055';
              el.style.borderRadius = '8px';
              el.style.border = '2px solid #fff';
              el.style.boxShadow = '0 0 15px #FF0055';
              el.style.display = 'flex';
              el.style.alignItems = 'center';
              el.style.justifyContent = 'center';
              el.style.color = '#fff';
              el.style.fontSize = '10px';
              el.style.fontWeight = 'bold';
              el.innerText = 'MEET';

              markers['meet_'+m.id] = new maplibregl.Marker(el)
                .setLngLat([m.lng, m.lat])
                .setPopup(new maplibregl.Popup({ offset: 25 }).setHTML('<div class="racer-tag" style="color:#FF0055;">' + m.title + '</div><div class="racer-sub">' + m.location + '</div>'))
                .addTo(map);
            });
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
        you: currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null,
        drivers: driversNearby.map((d: any) => ({
          id: d.id, lat: d.latitude, lng: d.longitude,
          name: d.profile?.username || 'Racer', speed: d.speed_mph, status: d.status,
          car: d.vehicle ? `${d.vehicle.year} ${d.vehicle.make} ${d.vehicle.model}` : 'Tuned Vehicle'
        })),
        meets: meets.map((m: any) => ({
          id: m.id, lat: m.latitude, lng: m.longitude,
          title: m.title, location: m.location_name
        }))
      };
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [currentLocation, driversNearby, meets]);

  return (
    <View style={{ flex: 1, minHeight: 480, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: colors.cardBorder }}>
      {Platform.OS === 'web' ? (
        <iframe
          ref={iframeRef}
          srcDoc={htmlContent}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Apex UGR Radar Map"
        />
      ) : (
        <View style={styles.webRadarContainer}>
          <Text style={{ color: colors.textMuted }}>Native map enabled below.</Text>
        </View>
      )}
    </View>
  );
}, (prev, next) => {
  // Only re-render if we really need to, to prevent iframe flashing
  return prev.currentLocation?.latitude === next.currentLocation?.latitude 
      && prev.driversNearby.length === next.driversNearby.length 
      && prev.meets.length === next.meets.length;
});

// ─── Native Map View ──────────────────────────────────────────────────────
const NativeMapView = React.memo(({ currentLocation, driversNearby, meets, user, visibilityRadiusKm, setSelectedDriver, setSelectedMeet, mapRef }: any) => {
  if (!MapView || !currentLocation) return null;

  return (
    <MapView
      ref={mapRef}
      style={styles.nativeMap}
      initialRegion={{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }}
      customMapStyle={DARK_MAP_STYLE}
      pitchEnabled={true}
      showsUserLocation={true}
      showsCompass={true}
      showsBuildings={true}
      showsTraffic={true}
    >
      {currentLocation && (
        <Circle
          center={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
          radius={visibilityRadiusKm * 1000}
          fillColor="rgba(0, 255, 102, 0.04)"
          strokeColor="rgba(0, 255, 102, 0.2)"
          strokeWidth={1}
        />
      )}

      {driversNearby.map((driver: any) => (
        <Marker
          key={driver.id}
          coordinate={{ latitude: driver.latitude, longitude: driver.longitude }}
          onPress={() => setSelectedDriver(driver)}
        >
          <View style={[styles.driverMarker, { borderColor: STATUS_COLORS[driver.status] || colors.primary }]}>
            <Image source={{ uri: driver.profile?.avatar_url || '' }} style={styles.driverMarkerAvatar} />
          </View>
        </Marker>
      ))}

      {meets.map((meet: any) => (
        <Marker
          key={meet.id}
          coordinate={{ latitude: meet.latitude, longitude: meet.longitude }}
          onPress={() => setSelectedMeet(meet)}
        >
          <View style={styles.meetMarker}>
            <Users size={12} color={colors.background} />
            <Text style={styles.meetMarkerText}>{meet.attendees_count}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
});

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
  const [mapTab, setMapTab] = useState<'radar' | 'meets'>('radar');
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>CITY MAP</Text>
          <Text style={styles.headerSub}>3D STREET RADAR</Text>
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

      <View style={styles.mapContainer}>
        {Platform.OS === 'web' ? (
          <WebRadarView
            currentLocation={currentLocation}
            driversNearby={driversNearby}
            meets={meets}
          />
        ) : (
          <NativeMapView
            mapRef={mapRef}
            currentLocation={currentLocation}
            driversNearby={driversNearby}
            meets={meets}
            user={user}
            visibilityRadiusKm={visibilityRadiusKm}
            setSelectedDriver={setSelectedDriver}
            setSelectedMeet={setSelectedMeet}
          />
        )}

        {isLoading && !currentLocation && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={styles.loadingText}>CALIBRATING GPS SENSORS...</Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.infoPanel} showsVerticalScrollIndicator={false}>
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'radar' && styles.tabBtnActive]}
            onPress={() => setMapTab('radar')}
          >
            <Globe size={16} color={mapTab === 'radar' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'radar' && { color: colors.background }]}>LIVE RADAR</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'meets' && styles.tabBtnActive]}
            onPress={() => setMapTab('meets')}
          >
            <MapPin size={16} color={mapTab === 'meets' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabText, mapTab === 'meets' && { color: colors.background }]}>LOCAL MEETS</Text>
          </TouchableOpacity>
        </View>

        {mapTab === 'radar' ? (
          <View style={styles.radarList}>
            {driversNearby.length === 0 ? (
              <View style={styles.emptyState}>
                <Globe size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO DRIVERS DETECTED</Text>
                <Text style={styles.emptySub}>Expand your radar range or wait for active drivers.</Text>
              </View>
            ) : (
              driversNearby.map(driver => (
                <TouchableOpacity
                  key={driver.id}
                  style={[styles.driverCard, selectedDriver?.id === driver.id && styles.driverCardActive]}
                  onPress={() => setSelectedDriver(driver)}
                >
                  <Image source={{ uri: driver.profile?.avatar_url || '' }} style={styles.driverAvatar} />
                  <View style={styles.driverInfo}>
                    <Text style={styles.driverName}>@{driver.profile?.username || 'Racer'}</Text>
                    <Text style={styles.driverCar}>{driver.vehicle ? `${driver.vehicle.year} ${driver.vehicle.make} ${driver.vehicle.model}` : 'Tuned Performance Car'}</Text>
                  </View>
                  <View style={styles.driverStatusBlock}>
                    <Text style={[styles.driverSpeed, { color: STATUS_COLORS[driver.status] || colors.primary }]}>{driver.speed_mph} MPH</Text>
                    <Text style={styles.driverStatus}>{driver.status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          <View style={styles.meetsList}>
            {meets.length === 0 ? (
              <View style={styles.emptyState}>
                <MapPin size={32} color={colors.textMuted} style={{ marginBottom: 12 }} />
                <Text style={styles.emptyTitle}>NO MEETS SCHEDULED</Text>
                <Text style={styles.emptySub}>Host your own car meet to populate the map.</Text>
              </View>
            ) : (
              meets.map(meet => (
                <TouchableOpacity
                  key={meet.id}
                  style={[styles.meetCard, selectedMeet?.id === meet.id && styles.meetCardActive]}
                  onPress={() => setSelectedMeet(meet)}
                >
                  <View style={styles.meetIconBox}>
                    <Users size={20} color={colors.background} />
                  </View>
                  <View style={styles.meetInfo}>
                    <Text style={styles.meetTitle}>{meet.title}</Text>
                    <Text style={styles.meetLocation}>{meet.location_name}</Text>
                    <Text style={styles.meetTime}>{new Date(meet.start_time).toLocaleString()}</Text>
                  </View>
                  <View style={styles.meetAttendees}>
                    <Text style={styles.attendeeCount}>{meet.attendees_count}</Text>
                    <Text style={styles.attendeeLabel}>RSVP</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 40, backgroundColor: colors.surface },
  headerTitle: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  headerSub: { color: colors.primary, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0, 255, 102, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  privacyBtnActive: { backgroundColor: 'rgba(255, 68, 68, 0.1)', borderColor: colors.danger },
  privacyText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  mapContainer: { flex: 0.6, margin: 12, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  webRadarContainer: { flex: 1, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  nativeMap: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8, 9, 12, 0.8)', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  loadingText: { color: colors.primary, fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 12 },
  
  infoPanel: { flex: 0.4, paddingHorizontal: 16 },
  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginVertical: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textMuted, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  
  radarList: { gap: 10 },
  meetsList: { gap: 10 },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder },
  emptyTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder },
  driverCardActive: { borderColor: colors.primary, backgroundColor: 'rgba(0, 255, 102, 0.05)' },
  driverAvatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: colors.cardBorder },
  driverInfo: { flex: 1 },
  driverName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  driverCar: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  driverStatusBlock: { alignItems: 'flex-end' },
  driverSpeed: { fontSize: 16, fontWeight: '900' },
  driverStatus: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  
  meetCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder },
  meetCardActive: { borderColor: '#FF0055', backgroundColor: 'rgba(255, 0, 85, 0.05)' },
  meetIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FF0055', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  meetInfo: { flex: 1 },
  meetTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  meetLocation: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 2 },
  meetTime: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 4 },
  meetAttendees: { alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  attendeeCount: { color: colors.text, fontSize: 16, fontWeight: '900' },
  attendeeLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 2 },
  
  youMarker: { alignItems: 'center', justifyContent: 'center' },
  youMarkerAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 3, borderColor: colors.primary, zIndex: 2 },
  youMarkerPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0, 255, 102, 0.3)', zIndex: 1 },
  driverMarker: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  driverMarkerAvatar: { width: '100%', height: '100%' },
  meetMarker: { backgroundColor: '#FF0055', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 2, borderColor: colors.background },
  meetMarkerText: { color: colors.background, fontSize: 10, fontWeight: '900' },
});

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];
