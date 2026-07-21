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
import { Navigation, Shield, MapPin, Users, Gauge, MessageSquare, Flag, Eye, EyeOff, ChevronRight } from 'lucide-react-native';

// react-native-maps is not available in web — conditional import
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

// ─── Web Interactive Map ──────────────────────────────────────────────────
const WebRadarView = React.memo(({ currentLocation, driversNearby, meets }: any) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [htmlLoaded, setHtmlLoaded] = useState(false);
  const lat = currentLocation?.latitude || 34.0522;
  const lng = currentLocation?.longitude || -118.2437;

  // Static HTML template — only loaded once!
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #08090C; font-family: system-ui, sans-serif; }
        .leaflet-container { background: #08090C !important; }
        .leaflet-popup-content-wrapper { background: rgba(15,17,23,0.95) !important; color: #fff !important; border: 1px solid #00FF66 !important; border-radius: 10px !important; backdrop-filter: blur(8px); }
        .leaflet-popup-tip { background: #00FF66 !important; }
        .racer-tag { color: #00FF66; font-weight: 900; font-size: 13px; margin-bottom: 2px; }
        .racer-sub { color: #8E9BAE; font-size: 11px; }
        .speed-tag { color: #FFB800; font-weight: 800; font-size: 12px; margin-top: 4px; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        let map;
        let markers = {};
        
        function initMap(lat, lng) {
          if (map) return;
          map = L.map('map', { zoomControl: true }).setView([lat, lng], 12);
          L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap, © CARTO'
          }).addTo(map);
          window.parent.postMessage({ type: 'MAP_READY' }, '*');
        }

        window.addEventListener('message', function(event) {
          const data = event.data;
          
          if (data.type === 'INIT') {
            initMap(data.lat, data.lng);
          } else if (data.type === 'UPDATE' && map) {
            // Update Your Location
            if (data.you) {
              if (markers['you']) map.removeLayer(markers['you']);
              const youIcon = L.divIcon({ html: '<div style="width:20px;height:20px;background:#00FF66;border-radius:50%;border:3px solid #fff;box-shadow:0 0 15px #00FF66;"></div>', className: '' });
              markers['you'] = L.marker([data.you.lat, data.you.lng], { icon: youIcon }).addTo(map)
                .bindPopup('<div class="racer-tag">YOU (LIVE PILOT)</div><div class="racer-sub">Telemetry Active</div>');
              map.panTo([data.you.lat, data.you.lng]); // Follow user
            }

            // Update Drivers (clear old ones first)
            Object.keys(markers).forEach(id => { if (id !== 'you' && !id.startsWith('meet_')) map.removeLayer(markers[id]); });
            data.drivers.forEach(d => {
              const icon = L.divIcon({ html: '<div style="width:16px;height:16px;background:#FFB800;border-radius:50%;border:2px solid #000;box-shadow:0 0 10px #FFB800;"></div>', className: '' });
              markers[d.id] = L.marker([d.lat, d.lng], { icon: icon }).addTo(map)
                .bindPopup('<div class="racer-tag">@' + d.name + '</div><div class="racer-sub">' + d.car + '</div><div class="speed-tag">' + d.speed + ' MPH • ' + d.status + '</div>');
            });

            // Update Meets
            Object.keys(markers).forEach(id => { if (id.startsWith('meet_')) map.removeLayer(markers[id]); });
            data.meets.forEach(m => {
              const icon = L.divIcon({ html: '<div style="width:24px;height:24px;background:#FF0055;border-radius:6px;border:2px solid #fff;box-shadow:0 0 12px #FF0055;display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;">MEET</div>', className: '' });
              markers['meet_'+m.id] = L.marker([m.lat, m.lng], { icon: icon }).addTo(map)
                .bindPopup('<div class="racer-tag" style="color:#FF0055;">' + m.title + '</div><div class="racer-sub">' + m.location + '</div>');
            });
          }
        });
        
        // Initialize immediately if lat/lng available
        initMap(${lat}, ${lng});
      </script>
    </body>
    </html>
  `;

  // Send updates to iframe when data changes
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
      // For cross-origin safety in webviews, use '*' in this specific constrained environment,
      // though typically you'd restrict this to window.location.origin
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, [currentLocation, driversNearby, meets]);

  return (
    <View style={{ flex: 1, minHeight: 380, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.cardBorder }}>
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
    >
      {/* User's own location */}
      {currentLocation && (
        <Marker
          coordinate={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
          title="You"
          description={user?.display_name}
        >
          <View style={styles.youMarker}>
            <Image source={{ uri: user?.avatar_url || '' }} style={styles.youMarkerAvatar} />
            <View style={styles.youMarkerPulse} />
          </View>
        </Marker>
      )}

      {/* Visibility radius circle */}
      {currentLocation && (
        <Circle
          center={{ latitude: currentLocation.latitude, longitude: currentLocation.longitude }}
          radius={visibilityRadiusKm * 1000}
          fillColor="rgba(0, 255, 102, 0.04)"
          strokeColor="rgba(0, 255, 102, 0.2)"
          strokeWidth={1}
        />
      )}

      {/* Nearby driver markers */}
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

      {/* Meet location markers */}
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
    if (!user) return;

    // Start real GPS tracking and Realtime driver subscription
    startLocationTracking(user.id);
    subscribeToDriverLocations();

    return () => {
      stopLocationTracking();
      unsubscribeFromDriverLocations();
    };
  }, [user?.id]);

  useEffect(() => {
    if (currentLocation) {
      fetchMeets(currentLocation.latitude, currentLocation.longitude);
    }
  }, [currentLocation?.latitude, currentLocation?.longitude]);

  const handlePrivacyToggle = (mode: typeof privacyMode) => {
    if (!user) return;
    setPrivacyMode(mode, user.id);
  };
  return (
    <View style={styles.container}>
      {/* Map Area */}
      <View style={styles.mapArea}>
        {Platform.OS === 'web' ? (
          <WebRadarView currentLocation={currentLocation} driversNearby={driversNearby} meets={meets} />
        ) : (
          <NativeMapView 
            currentLocation={currentLocation} 
            driversNearby={driversNearby} 
            meets={meets} 
            user={user}
            visibilityRadiusKm={visibilityRadiusKm}
            setSelectedDriver={setSelectedDriver}
            setSelectedMeet={setSelectedMeet}
            mapRef={mapRef}
          />
        )}

        {/* Top HUD */}
        <View style={styles.topHud}>
          <View style={styles.privacyChip}>
            <Shield size={11} color={colors.primary} />
            <Text style={styles.privacyChipText}>
              {privacyMode === 'invisible' ? 'INVISIBLE' : `${privacyMode.toUpperCase()}`}
            </Text>
          </View>
          <View style={styles.locationChip}>
            <Navigation size={11} color={currentLocation ? colors.primary : colors.textMuted} />
            <Text style={styles.locationChipText}>
              {currentLocation ? 'GPS LOCKED' : 'ACQUIRING GPS...'}
            </Text>
          </View>
        </View>

        {/* Selected Driver Card */}
        {selectedDriver && (
          <View style={styles.driverCard}>
            <TouchableOpacity style={styles.driverCardClose} onPress={() => setSelectedDriver(null)}>
              <Text style={styles.driverCardCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.driverCardRow}>
              <Image
                source={{ uri: selectedDriver.profile?.avatar_url || '' }}
                style={styles.driverCardAvatar}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.driverCardName}>{selectedDriver.profile?.display_name || selectedDriver.profile?.username}</Text>
                <Text style={styles.driverCardVehicle}>{selectedDriver.status}</Text>
                <Text style={styles.driverCardRep}>{selectedDriver.profile?.reputation_level}</Text>
              </View>
              <View style={[styles.speedBadge, { borderColor: STATUS_COLORS[selectedDriver.status] || colors.primary }]}>
                <Text style={[styles.speedBadgeText, { color: STATUS_COLORS[selectedDriver.status] || colors.primary }]}>
                  {selectedDriver.speed_mph}
                </Text>
                <Text style={styles.speedBadgeUnit}>MPH</Text>
              </View>
            </View>
            <View style={styles.driverCardActions}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => navigation.navigate('CreateChallenge')}
              >
                <Flag size={13} color={colors.background} />
                <Text style={styles.actionBtnPrimaryText}>WAGER RACE</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => navigation.navigate('Messages')}
              >
                <MessageSquare size={13} color={colors.text} />
                <Text style={styles.actionBtnSecondaryText}>MESSAGE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        {/* Tab switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'radar' && styles.tabBtnActive]}
            onPress={() => setMapTab('radar')}
          >
            <Gauge size={14} color={mapTab === 'radar' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabBtnText, mapTab === 'radar' && styles.tabBtnTextActive]}>
              RADAR ({driversNearby.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, mapTab === 'meets' && styles.tabBtnActive]}
            onPress={() => setMapTab('meets')}
          >
            <Users size={14} color={mapTab === 'meets' ? colors.background : colors.textMuted} />
            <Text style={[styles.tabBtnText, mapTab === 'meets' && styles.tabBtnTextActive]}>
              MEETS ({meets.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Privacy controls */}
        {mapTab === 'radar' && (
          <View style={styles.privacyRow}>
            {(['all', 'friends', 'meet_only', 'invisible'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[styles.privacyBtn, privacyMode === mode && styles.privacyBtnActive]}
                onPress={() => handlePrivacyToggle(mode)}
              >
                <Text style={[styles.privacyBtnText, privacyMode === mode && styles.privacyBtnTextActive]}>
                  {mode === 'meet_only' ? 'MEETS' : mode.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Driver list or meets list */}
        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {mapTab === 'radar' ? (
            driversNearby.length > 0 ? (
              driversNearby.map((driver) => (
                <TouchableOpacity
                  key={driver.id}
                  style={styles.listItem}
                  onPress={() => setSelectedDriver(driver)}
                >
                  <Image source={{ uri: driver.profile?.avatar_url || '' }} style={styles.listAvatar} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.listName}>{driver.profile?.display_name || driver.profile?.username}</Text>
                    <Text style={styles.listSub}>{driver.status}</Text>
                  </View>
                  <View style={styles.listRight}>
                    <Text style={[styles.listSpeed, { color: STATUS_COLORS[driver.status] || colors.primary }]}>
                      {driver.speed_mph} MPH
                    </Text>
                    <ChevronRight size={14} color={colors.textMuted} />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>No drivers nearby. Your GPS is broadcasting.</Text>
              </View>
            )
          ) : (
            meets.length > 0 ? (
              meets.map((meet) => (
                <TouchableOpacity
                  key={meet.id}
                  style={styles.listItem}
                  onPress={() => setSelectedMeet(meet)}
                >
                  <View style={styles.meetIcon}>
                    <Users size={16} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.listName} numberOfLines={1}>{meet.title}</Text>
                    <Text style={styles.listSub}>{meet.location_name} • {meet.attendees_count} attending</Text>
                  </View>
                  <ChevronRight size={14} color={colors.textMuted} />
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyList}>
                <Text style={styles.emptyListText}>No meets in your area.</Text>
              </View>
            )
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      </View>
    </View>
  );
};

// Dark map style for react-native-maps
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#08090C' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#08090C' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1a1d24' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#141720' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#1e2128' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#060710' }] },
];

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  mapArea: { height: 340, position: 'relative', backgroundColor: '#070A0F' },

  // Web radar
  webRadarContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  radarRing: { position: 'absolute', borderWidth: 1, borderColor: 'rgba(0,255,102,0.12)' },
  radarCrossH: { position: 'absolute', width: '100%', height: 1, backgroundColor: 'rgba(0,255,102,0.07)' },
  radarCrossV: { position: 'absolute', height: '100%', width: 1, backgroundColor: 'rgba(0,255,102,0.07)' },
  youDot: { alignItems: 'center' },
  youPulse: { width: 14, height: 14, borderRadius: 7, backgroundColor: colors.primary, borderWidth: 2, borderColor: colors.background },
  youLabel: { color: colors.primary, fontSize: 8, fontWeight: '900', marginTop: 2 },
  driverPin: { position: 'absolute', backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBorder, padding: 5, alignItems: 'center' },
  driverPinSelected: { borderColor: colors.primary },
  driverPinDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 2 },
  pinAvatar: { width: 24, height: 24, borderRadius: 12 },
  pinName: { color: colors.text, fontSize: 7, fontWeight: '800', marginTop: 2 },
  pinSpeed: { fontSize: 7, fontWeight: '900' },
  radarStats: { position: 'absolute', top: 10, left: 12 },
  radarStatText: { color: colors.primary, fontSize: 9, fontWeight: '900' },

  // Native map
  nativeMap: { flex: 1 },
  youMarker: { alignItems: 'center' },
  youMarkerAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: colors.primary },
  youMarkerPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: colors.primary, opacity: 0.4 },
  driverMarker: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, overflow: 'hidden' },
  driverMarkerAvatar: { width: '100%', height: '100%' },
  meetMarker: { backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8, gap: 3 },
  meetMarkerText: { color: colors.background, fontSize: 10, fontWeight: '900' },

  // Top HUD
  topHud: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  privacyChip: { backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  privacyChipText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  locationChip: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.cardBorder },
  locationChipText: { color: colors.text, fontSize: 9, fontWeight: '800' },

  // Selected driver card
  driverCard: { position: 'absolute', bottom: 10, left: 12, right: 12, backgroundColor: 'rgba(11,13,17,0.95)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: colors.cardBorder },
  driverCardClose: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  driverCardCloseText: { color: colors.textMuted, fontSize: 14 },
  driverCardRow: { flexDirection: 'row', alignItems: 'center' },
  driverCardAvatar: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: colors.primary },
  driverCardName: { color: colors.text, fontSize: 14, fontWeight: '900' },
  driverCardVehicle: { color: colors.primary, fontSize: 11, fontWeight: '700', marginTop: 1 },
  driverCardRep: { color: colors.textMuted, fontSize: 9, marginTop: 1 },
  speedBadge: { alignItems: 'center', borderWidth: 1, borderRadius: 8, padding: 6, minWidth: 48 },
  speedBadgeText: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  speedBadgeUnit: { color: colors.textMuted, fontSize: 8, fontWeight: '800' },
  driverCardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtnPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10 },
  actionBtnPrimaryText: { color: colors.background, fontSize: 11, fontWeight: '900' },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.cardBorder },
  actionBtnSecondaryText: { color: colors.text, fontSize: 11, fontWeight: '900' },

  // Bottom panel
  bottomPanel: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  tabRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 10, borderWidth: 1, borderColor: colors.cardBorder },
  tabBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabBtnText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  tabBtnTextActive: { color: colors.background },
  privacyRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  privacyBtn: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  privacyBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  privacyBtnText: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  privacyBtnTextActive: { color: colors.background },
  listScroll: { flex: 1 },
  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  listAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.cardBorder },
  listName: { color: colors.text, fontSize: 13, fontWeight: '800' },
  listSub: { color: colors.textMuted, fontSize: 11, marginTop: 1 },
  listRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listSpeed: { fontSize: 14, fontWeight: '900' },
  meetIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  emptyList: { padding: 20, alignItems: 'center' },
  emptyListText: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
});
