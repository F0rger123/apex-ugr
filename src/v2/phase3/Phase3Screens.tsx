import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { CameraView, useCameraPermissions } from "expo-camera";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import Svg, { Polyline } from "react-native-svg";
import {
  BadgeCheck,
  Camera,
  CarFront,
  Check,
  ChevronRight,
  Crosshair,
  Gauge,
  Gift,
  Image as ImageIcon,
  LockKeyhole,
  MapPin,
  Medal,
  Mic,
  MicOff,
  Navigation,
  Play,
  QrCode,
  Radio,
  Route,
  ScanLine,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react-native";
import { cloudflareApi } from "../../config/cloudflareApi";
import { useContentStore } from "../live/contentStore";
import { useLiveNetworkStore } from "../live/liveNetworkStore";

const accent = "#A7E59A",
  paper = "#F7F9F7",
  muted = "#929B95",
  border = "rgba(255,255,255,.14)",
  panel = "rgba(5,9,6,.9)";
const boards = [
  ["rep", "REP"],
  ["rank", "RANK"],
  ["season", "SEASON XP"],
  ["most_wanted", "MOST WANTED"],
  ["bounty_hunters", "HUNTERS"],
  ["bounty_survivors", "SURVIVORS"],
  ["exploration", "EXPLORATION"],
  ["miles", "MILES"],
  ["ghost", "GHOST"],
  ["safe_houses", "SAFE HOUSES"],
  ["meets", "MEETS"],
  ["cotw", "COTW"],
  ["zero_sixty", "0-60"],
  ["sixty_130", "60-130"],
  ["top_speed", "TOP SPEED"],
  ["h2h", "H2H"],
  ["convoy", "CONVOY"],
  ["weekly_streak", "STREAK"],
] as const;
const scopes = ["global", "local", "friends", "crew"] as const;

function Panel({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  return <View style={[styles.panel, style]}>{children}</View>;
}
function Action({
  label,
  onPress,
  active = false,
  disabled = false,
  icon: Icon = ChevronRight,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  icon?: any;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        active && styles.actionActive,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Icon size={15} color={active ? "#041006" : paper} />
      <Text style={[styles.actionText, active && styles.actionTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}
function Segments({
  items,
  value,
  onChange,
}: {
  items: readonly string[];
  value: string;
  onChange: (value: any) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.segments}
    >
      {items.map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[styles.segment, value === item && styles.segmentActive]}
        >
          <Text
            style={[
              styles.segmentText,
              value === item && styles.segmentTextActive,
            ]}
          >
            {item.replaceAll("_", " ").toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
function Header({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
      </View>
      {action}
    </View>
  );
}
function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.metric}>
      <Text numberOfLines={1} adjustsFontSizeToFit style={styles.metricValue}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
function Empty({ title, copy }: { title: string; copy: string }) {
  return (
    <Panel style={styles.empty}>
      <Radio size={25} color={muted} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.copy}>{copy}</Text>
    </Panel>
  );
}

export function Phase3LeadersScreen({
  onProfile,
}: {
  onProfile: (id: string) => void;
}) {
  const [board, setBoard] = useState("rep"),
    [scope, setScope] = useState("global"),
    [data, setData] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const featured = useRef(0);
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await cloudflareApi.request<any>(
        `/api/v3/leaderboards?board=${board}&scope=${scope}`,
      );
      setData(payload.entries || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Leaderboard failed.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [board, scope]);
  useEffect(() => {
    const timer = setInterval(() => {
      featured.current = (featured.current + 1) % 6;
      setBoard(boards[featured.current][0]);
    }, 15000);
    return () => clearInterval(timer);
  }, []);
  const metric = (row: any) =>
    board === "zero_sixty" || board === "sixty_130"
      ? `${Number(row.metric).toFixed(2)} SEC`
      : board === "top_speed"
        ? `${Math.round(Number(row.metric))} KPH`
        : board === "miles"
          ? `${Number(row.metric).toFixed(1)} MI`
          : Number(row.metric).toLocaleString();
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <Header
        eyebrow="THE UNDERGROUND"
        title="LEADERS"
        action={<Trophy size={28} color={accent} />}
      />
      <Panel style={styles.featured}>
        <Text style={styles.eyebrow}>FEATURED BOARD // AUTO SIGNAL</Text>
        <Text style={styles.featuredTitle}>
          {boards.find((item) => item[0] === board)?.[1]}
        </Text>
        <Text style={styles.copy}>
          Legitimate D1 records only. Swipe or select any board below.
        </Text>
      </Panel>
      <Segments items={scopes} value={scope} onChange={setScope} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.boardRail}
      >
        {boards.map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setBoard(key)}
            style={[styles.boardChip, board === key && styles.boardChipActive]}
          >
            <Text
              style={[
                styles.boardChipText,
                board === key && styles.boardChipTextActive,
              ]}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <Empty
          title="SYNCING BOARD"
          copy="Reading the verified network ledger."
        />
      ) : data.length ? (
        <View style={styles.leaderList}>
          {data.map((row, index) => (
            <Pressable
              key={row.id}
              onPress={() => onProfile(row.id)}
              style={({ pressed }) => [
                styles.leaderRow,
                index < 3 && styles.leaderPodium,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.place, index === 0 && { color: accent }]}>
                {String(row.position).padStart(2, "0")}
              </Text>
              <View style={styles.avatar}>
                {row.avatar_url ? (
                  <Image
                    source={{ uri: row.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarText}>
                    {String(row.display_name || row.username)
                      .slice(0, 1)
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={styles.cardTitle}>
                  {String(row.display_name || row.username).toUpperCase()}
                </Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {row.apex_id || "APEX ID PENDING"} ·{" "}
                  {String(row.tier).toUpperCase()}
                  {row.crew_name ? ` · ${row.crew_name}` : ""}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.boardValue}>{metric(row)}</Text>
                <Text style={styles.meta}>{row.frame_name || "STANDARD"}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <Empty
          title="NO VERIFIED RESULTS"
          copy="This board will populate from real activity as pilots qualify."
        />
      )}
      <Header eyebrow="HALL OF FAME" title="STREET LEGENDS" />
      <Panel>
        <Text style={styles.copy}>
          Long-term legends are derived from rank, verified performance,
          community activity, Bounty outcomes, and exploration. No fabricated
          placements are inserted.
        </Text>
      </Panel>
    </ScrollView>
  );
}

type ProfileTab =
  | "OVERVIEW"
  | "CARS"
  | "RECORDS"
  | "BADGES"
  | "BOUNTY"
  | "SEASONS"
  | "SOCIAL"
  | "MILESTONES";
export function Phase3ProfileScreen({
  driverId,
  onClose,
}: {
  driverId?: string | null;
  onClose?: () => void;
}) {
  const [data, setData] = useState<any | null>(null),
    [tab, setTab] = useState<ProfileTab>("OVERVIEW"),
    [error, setError] = useState(""),
    [qrOpen, setQrOpen] = useState(false),
    [cameraOpen, setCameraOpen] = useState(false);
  const vehicles = useContentStore((state) => state.vehicles);
  const load = async () => {
    try {
      setData(
        await cloudflareApi.request<any>(
          driverId ? `/api/v3/profile/${driverId}` : "/api/v3/profile",
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Profile failed.");
    }
  };
  useEffect(() => {
    void load();
  }, [driverId]);
  if (!data)
    return (
      <ScrollView contentContainerStyle={styles.screen}>
        {onClose ? <Action label="BACK" onPress={onClose} icon={X} /> : null}
        <Empty
          title={error ? "PROFILE UNAVAILABLE" : "DECRYPTING DRIVER CARD"}
          copy={error || "Loading real driver records and equipped cosmetics."}
        />
      </ScrollView>
    );
  const p = data.profile,
    s = data.stats,
    frame = data.equipped?.find((item: any) => item.category === "frame"),
    banner = data.equipped?.find((item: any) => item.category === "banner");
  const rankProgress = Number(data.rank?.progress || 0);
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {onClose ? (
        <Action label="BACK TO LEADERS" onPress={onClose} icon={X} />
      ) : null}
      <LinearGradient
        colors={
          banner
            ? ["rgba(25,58,36,.9)", "rgba(3,6,4,.98)"]
            : ["rgba(34,38,35,.9)", "rgba(3,5,4,.98)"]
        }
        style={styles.profileHero}
      >
        <View
          style={[styles.profileAvatar, frame && styles.profileAvatarEquipped]}
        >
          {p.avatar_url ? (
            <Image source={{ uri: p.avatar_url }} style={styles.profilePhoto} />
          ) : (
            <Text style={styles.profileInitial}>
              {String(p.display_name || p.username).slice(0, 1)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>{p.title}</Text>
          <Text numberOfLines={1} style={styles.title}>
            {String(p.display_name || p.username).toUpperCase()}
          </Text>
          <Text style={styles.profileId}>
            {p.apex_id || "APEX ID PENDING"} ·{" "}
            {String(data.rank?.current || p.tier).toUpperCase()}
          </Text>
          <Text style={styles.meta}>
            {p.crew ? `[${p.crew.tag}] ${p.crew.name}` : "INDEPENDENT PILOT"} ·{" "}
            {frame?.name || "STANDARD FRAME"}
          </Text>
        </View>
        {data.isSelf ? (
          <View style={styles.profileTools}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Apex ID QR scanner"
              onPress={() => setQrOpen(true)}
              style={styles.iconAction}
            >
              <QrCode size={18} color={paper} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open Apex Camera"
              onPress={() => setCameraOpen(true)}
              style={styles.iconAction}
            >
              <Camera size={18} color={paper} />
            </Pressable>
          </View>
        ) : null}
      </LinearGradient>
      <View style={styles.rankTrack}>
        <View style={[styles.rankFill, { width: `${rankProgress}%` }]} />
      </View>
      <View style={styles.gpsRow}>
        <Text style={styles.meta}>
          {Number(data.rank?.rep || 0).toLocaleString()} REP
        </Text>
        <Text style={styles.meta}>
          {data.rank?.next
            ? `NEXT // ${data.rank.next} · ${Number(data.rank.repToNext).toLocaleString()} REP`
            : "MAX RANK // APEX"}
        </Text>
      </View>
      <Segments
        items={[
          "OVERVIEW",
          "CARS",
          "RECORDS",
          "BADGES",
          "BOUNTY",
          "SEASONS",
          "SOCIAL",
          "MILESTONES",
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "OVERVIEW" ? (
        <>
          <View style={styles.metricGrid}>
            <Metric value={s.wins} label="WINS" />
            <Metric value={s.losses} label="LOSSES" />
            <Metric value={`${s.winRate}%`} label="WIN RATE" />
            <Metric
              value={s.topSpeedKph ? `${Math.round(s.topSpeedKph)} KPH` : "—"}
              label="TOP SPEED"
            />
            <Metric
              value={s.bestZeroSixty ? `${s.bestZeroSixty.toFixed(2)} S` : "—"}
              label="BEST 0-60"
            />
            <Metric value={s.currentStreak} label="GHOST STREAK" />
          </View>
          <Header eyebrow="EQUIPPED LOADOUT" title="DRIVER CARD" />
          <Panel>
            <Text style={styles.cardTitle}>
              {banner?.name || "STANDARD BANNER"}
            </Text>
            <Text style={styles.copy}>
              {(data.equipped || []).length
                ? (data.equipped || [])
                    .map(
                      (item: any) =>
                        `${item.category.toUpperCase()} // ${item.name}`,
                    )
                    .join("\n")
                : "No cosmetic loadout equipped."}
            </Text>
          </Panel>
        </>
      ) : tab === "CARS" ? (
        <>
          {data.vehicles.length ? (
            data.vehicles.map((vehicle: any) => (
              <Panel key={vehicle.id} style={styles.vehiclePanel}>
                {vehicle.photo_url ? (
                  <Image
                    source={{ uri: vehicle.photo_url }}
                    style={styles.vehicleImage}
                  />
                ) : (
                  <View style={styles.vehiclePlaceholder}>
                    <CarFront size={42} color={muted} />
                  </View>
                )}
                <Text style={styles.cardTitle}>
                  {vehicle.nickname?.toUpperCase() ||
                    `${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                </Text>
                <Text style={styles.meta}>
                  {vehicle.year} {vehicle.make} {vehicle.model}{" "}
                  {vehicle.trim || ""} · {vehicle.horsepower || 0} HP ·{" "}
                  {vehicle.color || "COLOR PRIVATE"}
                </Text>
              </Panel>
            ))
          ) : (
            <Empty
              title="NO PUBLIC VEHICLES"
              copy="This driver has not exposed a garage build."
            />
          )}
        </>
      ) : tab === "RECORDS" ? (
        <>
          {data.records.length ? (
            data.records.map((record: any) => (
              <Panel key={record.id} style={styles.recordRow}>
                <Gauge size={22} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {record.run_type} //{" "}
                    {Number(record.result_seconds).toFixed(3)} SEC
                  </Text>
                  <Text style={styles.meta}>
                    {record.confidence_label} CONFIDENCE ·{" "}
                    {Math.round(Number(record.top_speed_kph || 0))} KPH ·{" "}
                    {new Date(record.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </Panel>
            ))
          ) : (
            <Empty
              title="NO SAVED RUNS"
              copy="Personal performance records will appear after a valid closed-course session."
            />
          )}
        </>
      ) : tab === "BADGES" ? (
        <View style={styles.badgeGrid}>
          {data.badges.map((badge: any) => (
            <View
              key={badge.id}
              style={[styles.badge, badge.earned && styles.badgeEarned]}
            >
              {badge.earned ? (
                <BadgeCheck size={24} color={accent} />
              ) : (
                <LockKeyhole size={22} color={muted} />
              )}
              <Text style={styles.cardTitle}>{badge.name}</Text>
              <Text style={styles.meta}>
                {badge.earned
                  ? `EARNED ${new Date(badge.earned_at).toLocaleDateString()}`
                  : `${badge.current_value || 0}/${badge.target_value || 1}`}
              </Text>
            </View>
          ))}
        </View>
      ) : tab === "BOUNTY" ? (
        <View style={styles.metricGrid}>
          <Metric value={s.bountiesClaimed} label="CLAIMS" />
          <Metric value={data.bounty?.escapes || 0} label="ESCAPES" />
          <Metric value={s.fiveStarEscapes} label="5★ ESCAPES" />
          <Metric
            value={data.bounty?.highest_star_claimed || 0}
            label="MAX CLAIM"
          />
        </View>
      ) : tab === "SEASONS" ? (
        <>
          {data.seasons?.length ? (
            data.seasons.map((season: any) => (
              <Panel key={season.id} style={styles.recordRow}>
                <Trophy size={22} color={accent} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    S{String(season.season_number).padStart(2, "0")} //{" "}
                    {String(season.name).toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>
                    LEVEL {Number(season.level || 1)} ·{" "}
                    {Number(season.xp || 0).toLocaleString()} XP ·{" "}
                    {season.is_active ? "ACTIVE" : "ARCHIVED"}
                  </Text>
                </View>
              </Panel>
            ))
          ) : (
            <Empty
              title="NO SEASON HISTORY"
              copy="Season XP and completed journeys will appear after entry."
            />
          )}
        </>
      ) : tab === "SOCIAL" ? (
        <>
          <View style={styles.metricGrid}>
            <Metric value={data.social?.posts || 0} label="POSTS" />
            <Metric value={data.social?.followers || 0} label="FOLLOWERS" />
            <Metric value={data.social?.following || 0} label="FOLLOWING" />
            <Metric value={data.social?.likesReceived || 0} label="LIKES" />
            <Metric
              value={data.social?.commentsReceived || 0}
              label="COMMENTS"
            />
          </View>
          {data.social?.recentPosts?.length ? (
            data.social.recentPosts.map((post: any) => (
              <Panel key={post.id} style={styles.recordRow}>
                {post.media_type === "image" ? (
                  <Image
                    source={{ uri: post.media_url }}
                    style={styles.socialThumb}
                  />
                ) : (
                  <Play size={22} color={accent} />
                )}
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={2} style={styles.cardTitle}>
                    {post.caption || "ENCRYPTED TRANSMISSION"}
                  </Text>
                  <Text style={styles.meta}>
                    {post.feed_category} · {post.likes} LIKES · {post.comments}{" "}
                    COMMENTS
                  </Text>
                </View>
              </Panel>
            ))
          ) : (
            <Empty
              title="NO SOCIAL TRANSMISSIONS"
              copy="This driver has not published media yet."
            />
          )}
        </>
      ) : tab === "MILESTONES" ? (
        <>
          {data.milestones.length ? (
            data.milestones.map((item: any) => (
              <Panel key={item.milestone_key} style={styles.recordRow}>
                <Star size={20} color={accent} />
                <View>
                  <Text style={styles.cardTitle}>
                    {String(item.milestone_key)
                      .replaceAll("_", " ")
                      .toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>
                    {new Date(item.earned_at).toLocaleDateString()} ·{" "}
                    {item.value_number || 1}
                  </Text>
                </View>
              </Panel>
            ))
          ) : (
            <Empty
              title="TIMELINE QUIET"
              copy="Verified firsts, distance markers, Meets, Bounties and performance milestones appear here."
            />
          )}
        </>
      ) : (
        <Empty
          title={`${tab} SIGNAL`}
          copy="This section uses the driver's persistent network history and will remain empty until qualifying activity exists."
        />
      )}
      {qrOpen ? (
        <QrPanel
          apexId={p.apex_id}
          userId={p.id}
          onClose={() => setQrOpen(false)}
        />
      ) : null}
      {cameraOpen ? (
        <CameraPanel
          profile={p}
          vehicle={vehicles[0]}
          onClose={() => setCameraOpen(false)}
        />
      ) : null}
    </ScrollView>
  );
}

function QrPanel({
  apexId,
  userId,
  onClose,
}: {
  apexId: string;
  userId: string;
  onClose: () => void;
}) {
  const [payload, setPayload] = useState(""),
    [result, setResult] = useState(""),
    [scanning, setScanning] = useState(false),
    [permission, requestPermission] = useCameraPermissions();
  const validate = async (value = payload) => {
    try {
      const data = await cloudflareApi.request<any>("/api/v3/qr/validate", {
        method: "POST",
        body: JSON.stringify({ payload: value }),
      });
      setPayload(value);
      setScanning(false);
      setResult(`${data.type} VERIFIED // ${data.targetId}`);
    } catch (e) {
      setScanning(false);
      setResult(e instanceof Error ? e.message : "QR rejected.");
    }
  };
  const openScanner = async () => {
    if (Platform.OS === "web") return;
    const current = permission?.granted
      ? permission
      : await requestPermission();
    if (!current.granted) {
      setResult("Camera permission is required to scan Apex IDs.");
      return;
    }
    setResult("");
    setScanning(true);
  };
  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <BlurView intensity={45} tint="dark" style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>STABLE APEX ID</Text>
              <Text style={styles.title}>{apexId || "PENDING"}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Apex ID"
              onPress={onClose}
              style={styles.iconAction}
            >
              <X size={18} color={paper} />
            </Pressable>
          </View>
          {scanning ? (
            <View style={styles.qrScanner}>
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={({ data }) => void validate(data)}
              />
              <View style={styles.qrReticle}>
                <ScanLine size={42} color={accent} />
              </View>
            </View>
          ) : (
            <Panel style={styles.qrVisual}>
              <QrCode size={86} color={accent} />
              <Text selectable style={styles.profileId}>
                apex://profile/{userId}
              </Text>
            </Panel>
          )}
          {Platform.OS !== "web" ? (
            <Action
              label={scanning ? "CANCEL SCAN" : "SCAN APEX QR"}
              onPress={() =>
                scanning ? setScanning(false) : void openScanner()
              }
              active={!scanning}
              icon={ScanLine}
            />
          ) : null}
          <TextInput
            value={payload}
            onChangeText={setPayload}
            placeholder="Paste scanned Apex QR payload"
            placeholderTextColor={muted}
            style={styles.input}
          />
          <Action
            label="VALIDATE ENCRYPTED PAYLOAD"
            onPress={() => void validate()}
            active
            icon={ShieldCheck}
          />
          {result ? (
            <Text
              style={
                result.includes("VERIFIED") ? styles.success : styles.error
              }
            >
              {result}
            </Text>
          ) : null}
          <Text style={styles.copy}>
            Native devices scan QR codes through the camera, then validate the
            payload against D1 before navigation. Manual entry remains available
            on web.
          </Text>
        </BlurView>
      </View>
    </Modal>
  );
}

function CameraPanel({
  profile,
  vehicle,
  onClose,
}: {
  profile: any;
  vehicle: any;
  onClose: () => void;
}) {
  const [uri, setUri] = useState<string | null>(null),
    [template, setTemplate] = useState("UNDERGROUND");
  const capture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      return Alert.alert(
        "Camera permission required",
        "Enable camera access to use Apex Camera.",
      );
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled) setUri(result.assets[0].uri);
  };
  const share = async () => {
    if (!uri) return;
    await Share.share({
      message: `APEX UGR // ${template}\n${profile.display_name} · ${profile.apex_id}\n${vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "VEHICLE PRIVATE"}\n${uri}`,
    });
  };
  return (
    <Modal transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BlurView intensity={50} tint="dark" style={styles.modal}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>GARAGE TOOL</Text>
              <Text style={styles.title}>APEX CAMERA</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close Apex Camera"
              onPress={onClose}
              style={styles.iconAction}
            >
              <X size={18} color={paper} />
            </Pressable>
          </View>
          <View style={styles.cameraFrame}>
            {uri ? (
              <Image source={{ uri }} style={styles.cameraImage} />
            ) : (
              <Pressable
                onPress={() => void capture()}
                style={styles.cameraEmpty}
              >
                <Camera size={46} color={accent} />
                <Text style={styles.cardTitle}>CAPTURE VEHICLE</Text>
              </Pressable>
            )}
            <View style={styles.cameraOverlay}>
              <Text style={styles.eyebrow}>APEX // {template}</Text>
              <Text style={styles.cardTitle}>
                {profile.display_name} · {profile.apex_id}
              </Text>
            </View>
          </View>
          <Segments
            items={[
              "CLEAN",
              "DRIVER CARD",
              "MEET",
              "BUILD",
              "GHOST",
              "TRACK",
              "CONVOY",
              "UNDERGROUND",
              "BOUNTY",
              "PERFORMANCE",
              "COTW",
              "SEASON",
            ]}
            value={template}
            onChange={setTemplate}
          />
          <View style={styles.actionRow}>
            <Action
              label="CAMERA"
              onPress={() => void capture()}
              icon={Camera}
            />
            <Action
              label="SYSTEM SHARE"
              onPress={() => void share()}
              active={Boolean(uri)}
              disabled={!uri}
              icon={Share2}
            />
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

type RunState = "IDLE" | "ARMED" | "RUNNING" | "COMPLETE";
const targetMph: Record<string, [number, number]> = {
  "0-30": [0, 30],
  "0-60": [0, 60],
  "0-100": [0, 100],
  "30-60": [30, 60],
  "40-100": [40, 100],
  "60-130": [60, 130],
  CUSTOM: [0, 60],
};

function tracePoints(route: any[], width = 280, height = 82) {
  const valid = (route || []).filter(
    (sample) =>
      Number.isFinite(Number(sample.latitude)) &&
      Number.isFinite(Number(sample.longitude)),
  );
  if (valid.length < 2) return "";
  const lats = valid.map((sample) => Number(sample.latitude)),
    lngs = valid.map((sample) => Number(sample.longitude)),
    minLat = Math.min(...lats),
    maxLat = Math.max(...lats),
    minLng = Math.min(...lngs),
    maxLng = Math.max(...lngs),
    latSpan = Math.max(0.000001, maxLat - minLat),
    lngSpan = Math.max(0.000001, maxLng - minLng);
  return valid
    .map((sample) => {
      const x = 8 + ((Number(sample.longitude) - minLng) / lngSpan) * (width - 16),
        y = 8 + (1 - (Number(sample.latitude) - minLat) / latSpan) * (height - 16);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function ghostAtElapsed(route: any[], elapsedMs: number) {
  if (!Array.isArray(route) || route.length < 2) return null;
  const first = Number(route[0].timestamp),
    target = first + Math.max(0, elapsedMs);
  if (!Number.isFinite(first)) return null;
  let right = route.findIndex((sample) => Number(sample.timestamp) >= target);
  if (right < 0) right = route.length - 1;
  if (right === 0) return { ...route[0], progress: 0 };
  const left = right - 1,
    a = route[left],
    b = route[right],
    span = Math.max(1, Number(b.timestamp) - Number(a.timestamp)),
    ratio = Math.max(0, Math.min(1, (target - Number(a.timestamp)) / span));
  return {
    speedKph:
      Number(a.speedKph) + (Number(b.speedKph) - Number(a.speedKph)) * ratio,
    progress: Math.max(0, Math.min(1, right / (route.length - 1))),
  };
}

function PerformanceShareCard({
  cardRef,
  alias,
  apexId,
  vehicle,
  runType,
  result,
}: {
  cardRef: React.RefObject<View>;
  alias: string;
  apexId: string;
  vehicle: any;
  runType: string;
  result: any;
}) {
  const points = tracePoints(result.route || []);
  return (
    <View ref={cardRef} collapsable={false} style={styles.shareCard}>
      <View style={styles.shareCardHeader}>
        <View>
          <Text style={styles.shareBrand}>APEX UGR</Text>
          <Text style={styles.shareSubhead}>GHOST RUN // VERIFIED TELEMETRY</Text>
        </View>
        <Radio size={28} color={accent} />
      </View>
      <View style={styles.shareDivider} />
      <Text style={styles.shareAlias}>{alias.toUpperCase()}</Text>
      <Text style={styles.shareApexId}>{apexId}</Text>
      <Text style={styles.shareVehicle}>
        {vehicle
          ? `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.trim ? ` ${vehicle.trim}` : ""}`
          : "REGISTERED VEHICLE"}
      </Text>
      <View style={styles.shareMetricRow}>
        <View>
          <Text style={styles.shareMetric}>{result.seconds.toFixed(3)}</Text>
          <Text style={styles.shareMetricLabel}>{runType} // SEC</Text>
        </View>
        <View>
          <Text style={styles.shareMetric}>{Math.round(result.topSpeedKph)}</Text>
          <Text style={styles.shareMetricLabel}>TOP SPEED // KPH</Text>
        </View>
      </View>
      <View style={styles.shareTrace}>
        {points ? (
          <Svg width="100%" height="82" viewBox="0 0 280 82">
            <Polyline
              points={points}
              fill="none"
              stroke={accent}
              strokeWidth="2"
            />
          </Svg>
        ) : (
          <Text style={styles.shareMetricLabel}>ROUTE TRACE UNAVAILABLE</Text>
        )}
      </View>
      <View style={styles.shareDivider} />
      <Text style={styles.shareFooter}>
        {new Date().toISOString().slice(0, 10)} // PRIVATE CLOSED COURSE
      </Text>
    </View>
  );
}
export function Phase3RaceScreen({
  contracts,
}: {
  contracts: React.ReactNode;
}) {
  const vehicles = useContentStore((state) => state.vehicles),
    activeVehicleId = useContentStore((state) => state.activeVehicleId),
    localProfile = useContentStore((state) => state.profile);
  const [mode, setMode] = useState<"SOLO" | "ROUTE + RELAY">("SOLO"),
    [runType, setRunType] = useState("0-60"),
    [safe, setSafe] = useState(false),
    [state, setState] = useState<RunState>("IDLE"),
    [speed, setSpeed] = useState(0),
    [accuracy, setAccuracy] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [result, setResult] = useState<any | null>(null),
    [status, setStatus] = useState(""),
    [driverData, setDriverData] = useState<any | null>(null);
  const watch = useRef<Location.LocationSubscription | null>(null),
    started = useRef(0),
    lastSample = useRef(0),
    route = useRef<any[]>([]),
    shareCardRef = useRef<View>(null),
    visual = useRef(new Animated.Value(0)).current;
  useEffect(() => () => watch.current?.remove(), []);
  const loadDriverData = async () => {
    try {
      setDriverData(await cloudflareApi.request<any>("/api/v3/profile"));
    } catch {
      setDriverData(null);
    }
  };
  useEffect(() => {
    void loadDriverData();
  }, []);
  const pbRecord = useMemo(() => {
      const matches = (driverData?.records || [])
        .filter(
          (record: any) =>
            record.vehicle_id === activeVehicleId &&
            record.run_type === runType &&
            Number(record.result_seconds) > 0,
        )
        .sort(
          (a: any, b: any) =>
            Number(a.result_seconds) - Number(b.result_seconds),
        );
      return matches[0] || null;
    }, [driverData, activeVehicleId, runType]),
    pbRoute = useMemo(() => {
      try {
        const parsed = JSON.parse(pbRecord?.route_json || "[]");
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }, [pbRecord]),
    ghostSample = ghostAtElapsed(pbRoute, elapsed * 1000),
    activeVehicle = vehicles.find((item) => item.id === activeVehicleId);
  useEffect(() => {
    Animated.timing(visual, {
      toValue: speed,
      duration: 220,
      useNativeDriver: false,
    }).start();
  }, [speed]);
  useEffect(() => {
    if (state !== "RUNNING") return;
    const timer = setInterval(
      () => setElapsed((Date.now() - started.current) / 1000),
      33,
    );
    return () => clearInterval(timer);
  }, [state]);
  const stop = async (finalSpeed: number) => {
    watch.current?.remove();
    watch.current = null;
    const seconds = (Date.now() - started.current) / 1000;
    setElapsed(seconds);
    setState("COMPLETE");
    setResult({
      seconds,
      topSpeedKph: Math.max(
        finalSpeed,
        ...route.current.map((item) => item.speedKph || 0),
      ),
      route: [...route.current],
      sampleAgeMs: Date.now() - lastSample.current,
    });
  };
  const arm = async () => {
    if (!safe)
      return Alert.alert(
        "Safety confirmation required",
        "Use Solo Performance only on a private property, track, or lawful closed course.",
      );
    if (!activeVehicleId)
      return Alert.alert(
        "Vehicle required",
        "Select an active garage vehicle first.",
      );
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted")
      return Alert.alert(
        "Location required",
        "Performance timing needs foreground GPS.",
      );
    route.current = [];
    setResult(null);
    setElapsed(0);
    setState("ARMED");
    const [startMph, endMph] = targetMph[runType];
    watch.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 250,
        distanceInterval: 0,
      },
      (sample) => {
        const kph = Math.max(0, Number(sample.coords.speed || 0) * 3.6),
          mph = kph / 1.609344;
        lastSample.current = sample.timestamp;
        setSpeed(kph);
        setAccuracy(Number(sample.coords.accuracy || 0));
        route.current.push({
          latitude: sample.coords.latitude,
          longitude: sample.coords.longitude,
          speedKph: kph,
          timestamp: sample.timestamp,
        });
        if (
          started.current === 0 &&
          ((startMph === 0 && mph >= 2.5) || (startMph > 0 && mph >= startMph))
        ) {
          started.current = sample.timestamp;
          setState("RUNNING");
        } else if (started.current > 0 && mph >= endMph) {
          void stop(kph);
        }
      },
    );
    started.current = 0;
  };
  const reset = () => {
    watch.current?.remove();
    watch.current = null;
    started.current = 0;
    setState("IDLE");
    setSpeed(0);
    setElapsed(0);
    setResult(null);
    setStatus("");
  };
  const save = async () => {
    if (!result) return;
    try {
      const data = await cloudflareApi.request<any>("/api/v3/performance", {
        method: "POST",
        body: JSON.stringify({
          vehicleId: activeVehicleId,
          runType,
          resultSeconds: result.seconds,
          topSpeedKph: result.topSpeedKph,
          gpsAccuracyM: accuracy,
          gpsSampleAgeMs: result.sampleAgeMs,
          route: result.route,
          unit: "MPH",
          eventContext: "PRIVATE / CLOSED COURSE",
        }),
      });
      setStatus(
        `SAVED // PB ${data.personalBest.best.toFixed(3)} SEC${data.personalBest.improvement ? ` // -${data.personalBest.improvement.toFixed(3)}` : ""}`,
      );
      await loadDriverData();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Run save failed.");
    }
  };
  const webShareImage = async (action: "save" | "share") => {
    if (!result) return;
    const canvas = document.createElement("canvas"),
      context = canvas.getContext("2d");
    if (!context) throw new Error("Share image renderer unavailable.");
    canvas.width = 1080;
    canvas.height = 1350;
    context.fillStyle = "#020403";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#A7E59A";
    context.lineWidth = 3;
    context.strokeRect(55, 55, 970, 1240);
    context.fillStyle = "#F7F9F7";
    context.font = "700 74px sans-serif";
    context.fillText("APEX UGR", 90, 150);
    context.fillStyle = "#A7E59A";
    context.font = "600 25px monospace";
    context.fillText("GHOST RUN // VERIFIED TELEMETRY", 92, 205);
    context.fillStyle = "#F7F9F7";
    context.font = "700 52px sans-serif";
    context.fillText(
      String(localProfile?.alias || "UNKNOWN PILOT").toUpperCase(),
      92,
      330,
    );
    context.fillStyle = "#A7E59A";
    context.font = "500 24px monospace";
    context.fillText(driverData?.profile?.apex_id || "APEX ID PRIVATE", 94, 375);
    context.fillStyle = "#B8C0BA";
    context.font = "500 28px sans-serif";
    context.fillText(
      activeVehicle
        ? `${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
        : "REGISTERED VEHICLE",
      94,
      445,
    );
    context.fillStyle = "#F7F9F7";
    context.font = "700 112px sans-serif";
    context.fillText(result.seconds.toFixed(3), 90, 610);
    context.fillText(String(Math.round(result.topSpeedKph)), 620, 610);
    context.fillStyle = "#A7E59A";
    context.font = "600 24px monospace";
    context.fillText(`${runType} // SEC`, 94, 655);
    context.fillText("TOP SPEED // KPH", 624, 655);
    const valid = (result.route || []).filter(
      (sample: any) =>
        Number.isFinite(Number(sample.latitude)) &&
        Number.isFinite(Number(sample.longitude)),
    );
    if (valid.length > 1) {
      const lats = valid.map((sample: any) => Number(sample.latitude)),
        lngs = valid.map((sample: any) => Number(sample.longitude)),
        minLat = Math.min(...lats),
        maxLat = Math.max(...lats),
        minLng = Math.min(...lngs),
        maxLng = Math.max(...lngs),
        latSpan = Math.max(0.000001, maxLat - minLat),
        lngSpan = Math.max(0.000001, maxLng - minLng);
      context.beginPath();
      valid.forEach((sample: any, index: number) => {
        const x = 100 + ((Number(sample.longitude) - minLng) / lngSpan) * 880,
          y = 760 + (1 - (Number(sample.latitude) - minLat) / latSpan) * 320;
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = "#A7E59A";
      context.lineWidth = 7;
      context.stroke();
    }
    context.fillStyle = "#929B95";
    context.font = "500 22px monospace";
    context.fillText(
      `${new Date().toISOString().slice(0, 10)} // PRIVATE CLOSED COURSE`,
      92,
      1225,
    );
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) => (value ? resolve(value) : reject(new Error("Image export failed."))),
        "image/png",
        1,
      ),
    );
    const file = new File([blob], `apex-ghost-run-${Date.now()}.png`, {
      type: "image/png",
    });
    if (
      action === "share" &&
      navigator.share &&
      (!navigator.canShare || navigator.canShare({ files: [file] }))
    )
      await navigator.share({ files: [file], title: "Apex UGR Ghost Run" });
    else {
      const url = URL.createObjectURL(blob),
        anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };
  const exportShareImage = async (action: "save" | "share") => {
    if (!result) return;
    try {
      if (Platform.OS === "web") await webShareImage(action);
      else {
        const uri = await captureRef(shareCardRef, {
          format: "png",
          quality: 1,
          width: 1080,
          height: 1350,
        });
        if (action === "save") {
          const permission = await MediaLibrary.requestPermissionsAsync();
          if (!permission.granted) throw new Error("Photo library permission is required.");
          await MediaLibrary.createAssetAsync(uri);
        } else {
          if (!(await Sharing.isAvailableAsync())) throw new Error("System sharing is unavailable.");
          await Sharing.shareAsync(uri, {
            mimeType: "image/png",
            dialogTitle: "Share Apex UGR Ghost Run",
          });
        }
      }
      setStatus(action === "save" ? "SHARE IMAGE SAVED" : "SHARE IMAGE READY");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Share image failed.");
    }
  };
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <Header
        eyebrow="LEGAL COURSE PERFORMANCE"
        title="RACE"
        action={<Gauge size={28} color={accent} />}
      />
      <Segments
        items={["SOLO", "ROUTE + RELAY"]}
        value={mode}
        onChange={setMode}
      />
      {mode === "ROUTE + RELAY" ? (
        contracts
      ) : (
        <>
          <Panel style={styles.speedPanel}>
            <Text style={styles.eyebrow}>
              {state} // {runType}
            </Text>
            <Animated.Text style={styles.speedValue}>
              {speed.toFixed(0)}
            </Animated.Text>
            <Text style={styles.speedUnit}>KPH</Text>
            <View style={styles.gpsRow}>
              <Text style={styles.meta}>
                GPS ACCURACY //{" "}
                {accuracy ? `${Math.round(accuracy)} M` : "WAITING"}
              </Text>
              <Text style={styles.meta}>RAW SENSOR RATE // DEVICE</Text>
            </View>
            <Text style={styles.timer}>{elapsed.toFixed(3)} SEC</Text>
          </Panel>
          <Segments
            items={Object.keys(targetMph)}
            value={runType}
            onChange={(value) => {
              if (state === "IDLE") setRunType(value);
            }}
          />
          <Panel>
            <Pressable
              onPress={() => setSafe((value) => !value)}
              style={styles.consent}
            >
              <View style={[styles.checkbox, safe && styles.checkboxChecked]}>
                {safe ? <Check size={13} color="#041006" /> : null}
              </View>
              <Text style={styles.copy}>
                I am on a private property, track, or lawful closed course and
                accept responsibility for safe operation.
              </Text>
            </Pressable>
            <View style={styles.actionRow}>
              {state === "IDLE" ? (
                <Action
                  label="READY"
                  onPress={() => void arm()}
                  active
                  icon={Play}
                />
              ) : state === "ARMED" || state === "RUNNING" ? (
                <Action label="ABORT" onPress={reset} icon={X} />
              ) : (
                <>
                  <Action
                    label="SAVE RUN"
                    onPress={() => void save()}
                    active
                    icon={Check}
                  />
                  <Action
                    label="SHARE IMAGE"
                    onPress={() => void exportShareImage("share")}
                    icon={Share2}
                  />
                  <Action label="DISCARD" onPress={reset} icon={X} />
                </>
              )}
            </View>
            {status ? (
              <Text
                style={status.includes("SAVED") ? styles.success : styles.error}
              >
                {status}
              </Text>
            ) : null}
          </Panel>
          {result ? (
            <>
              <Panel>
                <Text style={styles.eyebrow}>RUN SUMMARY</Text>
                <View style={styles.metricGrid}>
                  <Metric
                    value={`${result.seconds.toFixed(3)} S`}
                    label={runType}
                  />
                  <Metric
                    value={`${Math.round(result.topSpeedKph)} KPH`}
                    label="TOP SPEED"
                  />
                  <Metric
                    value={`${accuracy.toFixed(0)} M`}
                    label="GPS ACCURACY"
                  />
                  <Metric value={route.current.length} label="SAMPLES" />
                </View>
              </Panel>
              <PerformanceShareCard
                cardRef={shareCardRef}
                alias={localProfile?.alias || "UNKNOWN PILOT"}
                apexId={driverData?.profile?.apex_id || "APEX ID PRIVATE"}
                vehicle={activeVehicle}
                runType={runType}
                result={result}
              />
              <View style={styles.actionRow}>
                <Action
                  label="SAVE IMAGE"
                  onPress={() => void exportShareImage("save")}
                  active
                  icon={ImageIcon}
                />
                <Action
                  label="SYSTEM SHARE"
                  onPress={() => void exportShareImage("share")}
                  icon={Share2}
                />
              </View>
            </>
          ) : null}
          <Panel>
            <Text style={styles.cardTitle}>YOUR PB GHOST</Text>
            {pbRoute.length >= 2 ? (
              <>
                <View style={styles.ghostMeter}>
                  <View
                    style={[
                      styles.ghostMeterFill,
                      { width: `${Math.round((ghostSample?.progress || 0) * 100)}%` },
                    ]}
                  />
                </View>
                <View style={styles.metricGrid}>
                  <Metric
                    value={`${Number(ghostSample?.speedKph || 0).toFixed(0)} KPH`}
                    label="PB GHOST SPEED"
                  />
                  <Metric
                    value={`${Number(pbRecord.result_seconds).toFixed(3)} S`}
                    label="PB TIME"
                  />
                </View>
                <Text style={styles.copy}>
                  Replay is interpolated only between {pbRoute.length} recorded GPS
                  samples from the saved run. No synthetic movement is generated.
                </Text>
              </>
            ) : (
              <Text style={styles.copy}>
                No timestamped PB trace is available. Older runs remain visible but
                are marked unsupported; the next saved run records replay telemetry.
              </Text>
            )}
          </Panel>
        </>
      )}
    </ScrollView>
  );
}

export function Phase3MeetsScreen({ network }: { network: React.ReactNode }) {
  const [tab, setTab] = useState<
      "NETWORK" | "CHECK-IN" | "SHOWCASE" | "CONVOYS"
    >("NETWORK"),
    [meets, setMeets] = useState<any[]>([]),
    [convoys, setConvoys] = useState<any[]>([]),
    [status, setStatus] = useState(""),
    [showcaseCategory, setShowcaseCategory] = useState("BEST_BUILD"),
    [radioMuted, setRadioMuted] = useState(false),
    [pttConvoyId, setPttConvoyId] = useState<string | null>(null);
  const joinedConvoy = convoys.find((convoy) => convoy.joined) || null;
  const load = async () => {
    try {
      const [m, c] = await Promise.all([
        cloudflareApi.request<any>("/api/v3/meets"),
        cloudflareApi.request<any>("/api/v3/convoys"),
      ]);
      setMeets(m.meets || []);
      setConvoys(c.convoys || []);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Meet network failed.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const checkin = async (id: string) => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== "granted") return;
    const point = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    try {
      const result = await cloudflareApi.request<any>(
        `/api/v3/meets/${id}/checkin`,
        {
          method: "POST",
          body: JSON.stringify({
            latitude: point.coords.latitude,
            longitude: point.coords.longitude,
            accuracyM: point.coords.accuracy,
            sampleAgeMs: Math.max(0, Date.now() - point.timestamp),
          }),
        },
      );
      setStatus(
        result.firstCheckIn
          ? `CHECKED IN // +${result.repAwarded} REP`
          : "CHECK-IN ALREADY VERIFIED",
      );
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Check-in failed.");
    }
  };
  const convoyAction = async (id: string, action: string, body: any = {}) => {
    try {
      const result = await cloudflareApi.request<any>(
        `/api/v3/convoys/${id}/${action}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      setStatus(
        action === "end"
          ? `CONVOY RECAP // ${result.recapId}`
          : `${action.toUpperCase()} CONFIRMED`,
      );
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Convoy action failed.");
    }
  };
  const vote = async (eventId: string, nomineeUserId: string) => {
    try {
      await cloudflareApi.request(`/api/v3/meets/${eventId}/vote`, {
        method: "POST",
        body: JSON.stringify({ category: showcaseCategory, nomineeUserId }),
      });
      setStatus(`${showcaseCategory.replaceAll("_", " ")} VOTE VERIFIED`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Vote failed.");
    }
  };
  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <Header
        eyebrow="COMMUNITY GRID"
        title="MEETS + CONVOYS"
        action={<Users size={28} color={accent} />}
      />
      <Segments
        items={["NETWORK", "CHECK-IN", "SHOWCASE", "CONVOYS"]}
        value={tab}
        onChange={setTab}
      />
      {status ? (
        <Text
          style={
            status.toLowerCase().includes("failed") ||
            status.toLowerCase().includes("required") ||
            status.toLowerCase().includes("already")
              ? styles.error
              : styles.success
          }
        >
          {status}
        </Text>
      ) : null}
      {tab === "NETWORK" ? (
        network
      ) : tab === "CHECK-IN" ? (
        <>
          {meets.map((meet) => (
            <Panel key={meet.id}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {String(meet.title).toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>
                    {meet.location_name} · {meet.going_count}/{meet.capacity}{" "}
                    GOING
                  </Text>
                </View>
                {meet.checked_in ? (
                  <BadgeCheck size={22} color={accent} />
                ) : (
                  <Action
                    label="CHECK IN"
                    onPress={() => void checkin(meet.id)}
                    active
                    icon={MapPin}
                  />
                )}
              </View>
            </Panel>
          ))}
          {!meets.length ? (
            <Empty
              title="NO MEETS"
              copy="Published, privacy-eligible meets will appear here."
            />
          ) : null}
        </>
      ) : tab === "SHOWCASE" ? (
        <>
          <Segments
            items={[
              "BEST_BUILD",
              "BEST_SOUND",
              "BEST_WHEELS",
              "BEST_INTERIOR",
              "CROWD_FAVORITE",
            ]}
            value={showcaseCategory}
            onChange={setShowcaseCategory}
          />
          {meets.map((meet) => (
            <Panel key={meet.id}>
              <Text style={styles.cardTitle}>
                {String(meet.title).toUpperCase()}
              </Text>
              <Text style={styles.meta}>
                {(meet.categories || []).join(" · ") ||
                  "HOST HAS NOT OPENED VOTING"}
              </Text>
              {(meet.showCars || []).map((nominee: any) => (
                <View key={nominee.user_id} style={styles.recordRow}>
                  {nominee.photo_url ? (
                    <Image
                      source={{ uri: nominee.photo_url }}
                      style={styles.showcaseThumb}
                    />
                  ) : (
                    <View style={styles.showcaseThumbEmpty}>
                      <CarFront size={20} color={muted} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {String(
                        nominee.display_name || nominee.username,
                      ).toUpperCase()}
                    </Text>
                    <Text style={styles.meta}>
                      {nominee.year
                        ? `${nominee.year} ${nominee.make} ${nominee.model}`
                        : "SHOW CAR"}
                    </Text>
                  </View>
                  <Action
                    label="VOTE"
                    onPress={() => void vote(meet.id, nominee.user_id)}
                    active
                    icon={Trophy}
                  />
                </View>
              ))}
              {!(meet.showCars || []).length ? (
                <Text style={styles.copy}>
                  No registered show cars are eligible yet.
                </Text>
              ) : null}
            </Panel>
          ))}
        </>
      ) : (
        <>
          {convoys.map((convoy) => (
            <Panel key={convoy.id}>
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>
                    {String(convoy.title).toUpperCase()}
                  </Text>
                  <Text style={styles.meta}>
                    {convoy.leader_name} · {convoy.member_count}/
                    {convoy.max_members} ·{" "}
                    {(convoy.status || "scheduled").toUpperCase()}
                  </Text>
                </View>
                <Route size={22} color={accent} />
              </View>
              <Text style={styles.copy}>
                {convoy.route?.destination ||
                  convoy.destination_name ||
                  "ROUTE PENDING"}
              </Text>
              <View style={styles.memberRail}>
                {(convoy.members || []).map((member: any) => (
                  <View key={member.user_id} style={styles.memberChip}>
                    <Text style={styles.memberRole}>{member.role}</Text>
                    <Text style={styles.meta}>{member.username}</Text>
                  </View>
                ))}
              </View>
              {convoy.joined ? (
                <View style={styles.actionRow}>
                  <Action
                    label="LEAVE"
                    onPress={() => void convoyAction(convoy.id, "leave")}
                    icon={X}
                  />
                  {convoy.host_id === useContentStore.getState().userId ? (
                    <>
                      <Action
                        label="REGROUP HERE"
                        onPress={async () => {
                          const p = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.High,
                          });
                          void convoyAction(convoy.id, "regroup", {
                            latitude: p.coords.latitude,
                            longitude: p.coords.longitude,
                            label: "REGROUP",
                          });
                        }}
                        icon={MapPin}
                      />
                      <Action
                        label="END + RECAP"
                        onPress={() => void convoyAction(convoy.id, "end")}
                        active
                        icon={Check}
                      />
                    </>
                  ) : null}
                </View>
              ) : null}
              {convoy.regroup ? (
                <Text style={styles.success}>
                  REGROUP SIGNAL // {convoy.regroup.label}
                </Text>
              ) : null}
            </Panel>
          ))}
          <Panel>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>CONVOY RADIO // FOUNDATION</Text>
                <Text style={styles.meta}>
                  {joinedConvoy
                    ? `${joinedConvoy.title} · ${joinedConvoy.my_role || "MID"}`
                    : "JOIN A CONVOY TO ARM RADIO"}
                </Text>
              </View>
              {radioMuted ? <MicOff size={22} color={muted} /> : <Mic size={22} color={accent} />}
            </View>
            <Text style={styles.copy}>
              PTT, mute, member roles, and speaker state are functional locally.
              Voice transport remains unavailable until authenticated signaling
              and a mobile-compatible WebRTC SFU are deployed.
            </Text>
            <View style={styles.memberRail}>
              {(joinedConvoy?.members || []).map((member: any) => (
                <View key={member.user_id} style={styles.memberChip}>
                  <Text style={styles.memberRole}>{member.role}</Text>
                  <Text style={styles.meta}>{member.username}</Text>
                  <Text style={styles.meta}>SPEAKER // IDLE</Text>
                </View>
              ))}
            </View>
            <View style={styles.actionRow}>
              <Action
                label={radioMuted ? "UNMUTE" : "MUTE"}
                onPress={() => {
                  setRadioMuted((value) => !value);
                  setPttConvoyId(null);
                }}
                icon={radioMuted ? Mic : MicOff}
                disabled={!joinedConvoy}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Push to talk"
                disabled={!joinedConvoy || radioMuted}
                onPressIn={() => setPttConvoyId(joinedConvoy?.id || null)}
                onPressOut={() => setPttConvoyId(null)}
                style={({ pressed }) => [
                  styles.ptt,
                  Boolean(pttConvoyId) && styles.pttActive,
                  (!joinedConvoy || radioMuted) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Radio size={17} color={pttConvoyId ? "#041006" : paper} />
                <Text style={[styles.actionText, Boolean(pttConvoyId) && styles.actionTextActive]}>
                  {pttConvoyId ? "TRANSMIT STATE" : "HOLD PTT"}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.error}>VOICE TRANSPORT // UNAVAILABLE</Text>
          </Panel>
        </>
      )}
    </ScrollView>
  );
}

export function Phase3HudEvents() {
  const [chest, setChest] = useState<any | null>(null),
    [cotw, setCotw] = useState<any | null>(null),
    [open, setOpen] = useState<"chest" | "cotw" | null>(null);
  const load = async () => {
    try {
      const [c, w] = await Promise.all([
        cloudflareApi.request<any>("/api/daily-chest/status"),
        cloudflareApi.request<any>("/api/cotw/active"),
      ]);
      setChest(c);
      setCotw(w);
    } catch {
      /* HUD remains usable if optional events are unavailable. */
    }
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <View style={styles.hudEvents}>
        <Pressable onPress={() => setOpen("chest")} style={styles.hudEvent}>
          <Gift size={22} color={chest?.available ? accent : muted} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>DAILY GHOST CHEST</Text>
            <Text style={styles.meta}>
              {chest?.available
                ? "SIGNAL READY"
                : `CLAIMED ${chest?.lastClaimedDate || ""}`}{" "}
              · STREAK {chest?.streakCount || 0}
            </Text>
          </View>
          <ChevronRight size={17} color={paper} />
        </Pressable>
        <Pressable onPress={() => setOpen("cotw")} style={styles.hudEvent}>
          <Trophy size={22} color={accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>CAR OF THE WEEK</Text>
            <Text style={styles.meta}>
              {cotw?.weekIdentifier || "WEEKLY NETWORK"} ·{" "}
              {(cotw?.submissions || []).length} ENTRIES
            </Text>
          </View>
          <ChevronRight size={17} color={paper} />
        </Pressable>
      </View>
      {open === "chest" ? (
        <ChestModal
          state={chest}
          onClose={() => {
            setOpen(null);
            void load();
          }}
        />
      ) : open === "cotw" ? (
        <CotwModal
          state={cotw}
          onClose={() => {
            setOpen(null);
            void load();
          }}
        />
      ) : null}
    </>
  );
}

function ChestModal({ state, onClose }: { state: any; onClose: () => void }) {
  const [stage, setStage] = useState(0),
    [reward, setReward] = useState<any | null>(null),
    [error, setError] = useState("");
  const pulse=useRef(new Animated.Value(0)).current;
  useEffect(()=>{
    const loop=Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:1300,useNativeDriver:true}),
      Animated.timing(pulse,{toValue:0,duration:1300,useNativeDriver:true}),
    ]));
    loop.start();
    return()=>loop.stop();
  },[pulse]);
  const labels = [
    "WAKE SIGNAL",
    "BREAK ENCRYPTION",
    "DISENGAGE LOCKS",
    "OPEN CHEST",
  ];
  const tap = async () => {
    if (!state?.available) return;
    if (stage < 3) {
      setStage((value) => value + 1);
      return;
    }
    try {
      const result = await cloudflareApi.request<any>(
        "/api/daily-chest/claim",
        { method: "POST" },
      );
      setReward(result.claim);
      setStage(4);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chest failed.");
    }
  };
  return (
    <Modal transparent animationType="fade">
      <View style={styles.modalBackdrop}>
        <BlurView intensity={50} tint="dark" style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Daily Ghost Chest"
            onPress={onClose}
            style={styles.modalClose}
          >
            <X size={18} color={paper} />
          </Pressable>
          <Text style={styles.eyebrow}>DAILY ENCRYPTED DROP</Text>
          <Text style={styles.title}>GHOST CHEST</Text>
          <Animated.View style={{width:"100%",transform:[{scale:pulse.interpolate({inputRange:[0,1],outputRange:[1,1.025]})}],opacity:pulse.interpolate({inputRange:[0,1],outputRange:[.9,1]})}}>
          <Pressable onPress={() => void tap()} style={[styles.chest,stage > 0 && styles.chestAwake,stage === 4 && styles.chestOpen]}>
            {reward ? (
              <>
                <Sparkles size={52} color={accent} />
                <Text style={styles.featuredTitle}>{reward.rarity}</Text>
                <Text style={styles.cardTitle}>+{reward.gcReward} GC</Text>
              </>
            ) : (
              <>
                <LockKeyhole
                  size={54}
                  color={state?.available ? accent : muted}
                />
                <View style={styles.stageDots}>
                  {[0, 1, 2, 3].map((index) => (
                    <View
                      key={index}
                      style={[
                        styles.stageDot,
                        index < stage && styles.stageDotActive,
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.cardTitle}>
                  {state?.available ? labels[stage] : "ALREADY CLAIMED TODAY"}
                </Text>
              </>
            )}
          </Pressable>
          </Animated.View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Text style={styles.copy}>
            Four deliberate decrypt stages. Claim state and reward are
            controlled by server UTC day and a unique user/day ledger.
          </Text>
        </BlurView>
      </View>
    </Modal>
  );
}

function CotwModal({ state, onClose }: { state: any; onClose: () => void }) {
  const vehicles=useContentStore((store)=>store.vehicles),activeVehicleId=useContentStore((store)=>store.activeVehicleId);
  const [data,setData]=useState(state),
    [category, setCategory] = useState("BEST_APPEARANCE"),
    [status, setStatus] = useState(""),
    [selectedVehicleId,setSelectedVehicleId]=useState(activeVehicleId||vehicles[0]?.id||""),
    [submissionUri,setSubmissionUri]=useState<string|null>(null),
    [submissionType,setSubmissionType]=useState<"photo"|"video">("photo"),
    [submitting,setSubmitting]=useState(false);
  const selectedVehicle=vehicles.find(vehicle=>vehicle.id===selectedVehicleId)||null;
  const refresh=async()=>{const next=await cloudflareApi.request<any>("/api/cotw/active");setData(next);};
  const entries = (data?.submissions || []).filter(
    (item: any) => item.category === category,
  );
  const pickMedia=async()=>{
    const sound=category==="BEST_SOUND";
    const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:sound?ImagePicker.MediaTypeOptions.Videos:ImagePicker.MediaTypeOptions.All,quality:.88,allowsEditing:false});
    if(result.canceled||!result.assets[0])return;
    const asset=result.assets[0],type=asset.type==="video"?"video":"photo";
    if(sound&&type!=="video"){setStatus("BEST SOUND REQUIRES A VIDEO");return;}
    setSubmissionUri(asset.uri);setSubmissionType(type);setStatus("MEDIA READY // PRESS ENTER CAR");
  };
  const enterCar=async()=>{
    if(!selectedVehicle){setStatus("SELECT A GARAGE VEHICLE");return;}
    setSubmitting(true);setStatus("ENCRYPTING COTW ENTRY");
    try{
      let mediaUrl:string|null=null;
      if(submissionUri)mediaUrl=(await cloudflareApi.upload(submissionUri,submissionType)).url;
      else if(selectedVehicle.photoUrl?.startsWith("/api/media/"))mediaUrl=selectedVehicle.photoUrl;
      if(!mediaUrl)throw new Error("Upload a photo or video for this entry.");
      await cloudflareApi.request("/api/cotw/submit",{method:"POST",body:JSON.stringify({category,vehicleId:selectedVehicle.id,yearMakeModel:`${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,mediaUrls:[mediaUrl],description:selectedVehicle.nickname,buildInfo:`${selectedVehicle.trim||""} · ${selectedVehicle.horsepower} HP`})});
      await refresh();setSubmissionUri(null);setStatus("CAR ENTERED // VOTING LIVE");
    }catch(e){setStatus(e instanceof Error?e.message:"Entry failed.");}finally{setSubmitting(false);}
  };
  const vote = async (item: any) => {
    try {
      await cloudflareApi.request("/api/cotw/vote", {
        method: "POST",
        body: JSON.stringify({
          submissionId: item.id,
          category,
          weekIdentifier: data.weekIdentifier,
        }),
      });
      await refresh();setStatus("VOTE VERIFIED");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Vote failed.");
    }
  };
  return (
    <Modal transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <BlurView intensity={50} tint="dark" style={styles.modal}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close Car of the Week"
            onPress={onClose}
            style={styles.modalClose}
          >
            <X size={18} color={paper} />
          </Pressable>
          <Text style={styles.eyebrow}>THE UNDERGROUND IS VOTING</Text>
          <Text style={styles.title}>CAR OF THE WEEK</Text>
          <Segments
            items={["BEST_APPEARANCE", "BEST_BUILD", "BEST_SOUND"]}
            value={category}
            onChange={setCategory}
          />
          <Text style={styles.eyebrow}>ENTER YOUR GARAGE CAR</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cotwVehicleRail}>
            {vehicles.map(vehicle=><Pressable key={vehicle.id} onPress={()=>setSelectedVehicleId(vehicle.id)} style={[styles.cotwVehicle,vehicle.id===selectedVehicleId&&styles.cotwVehicleActive]}>{vehicle.photoUrl?<Image source={{uri:vehicle.photoUrl}} style={styles.cotwVehicleImage}/>:<CarFront size={24} color={muted}/>}<Text numberOfLines={1} style={styles.cardTitle}>{vehicle.nickname||vehicle.model}</Text><Text style={styles.meta}>{vehicle.year} {vehicle.make} {vehicle.model}</Text></Pressable>)}
          </ScrollView>
          <View style={styles.actionRow}>
            <Action label={submissionUri?"CHANGE MEDIA":"UPLOAD PHOTO / VIDEO"} onPress={()=>void pickMedia()} icon={ImageIcon}/>
            <Action label={submitting?"ENTERING...":"ENTER CAR"} onPress={()=>void enterCar()} active={Boolean(selectedVehicle&&!submitting)} disabled={!selectedVehicle||submitting} icon={Trophy}/>
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            {entries.map((item: any) => (
              <Panel key={item.id}>
                {item.vehicle_photo || item.media_urls?.[0] ? (
                  <Image
                    source={{ uri: item.vehicle_photo || item.media_urls[0] }}
                    style={styles.cotwImage}
                  />
                ) : null}
                <Text style={styles.cardTitle}>{item.year_make_model}</Text>
                <Text style={styles.meta}>
                  {item.username} · {item.votes_count} VOTES
                </Text>
                <Action
                  label="CAST VERIFIED VOTE"
                  onPress={() => void vote(item)}
                  active
                  icon={Trophy}
                />
              </Panel>
            ))}
            {!entries.length ? (
              <Empty
                title="NO SUBMISSIONS"
                copy="This category has no registered entries yet."
              />
            ) : null}
          </ScrollView>
          {status ? (
            <Text
              style={
                status.includes("VERIFIED") ? styles.success : styles.error
              }
            >
              {status}
            </Text>
          ) : null}
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { padding: 14, paddingBottom: 124, gap: 11 },
  panel: {
    backgroundColor: panel,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    padding: 13,
    gap: 8,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: {
    color: accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  title: { color: paper, fontSize: 25, fontWeight: "900", letterSpacing: 0 },
  copy: { color: "#B5BDB7", fontSize: 12, lineHeight: 18, letterSpacing: 0 },
  meta: { color: muted, fontSize: 9, fontWeight: "700", letterSpacing: 0 },
  cardTitle: {
    color: paper,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  featured: { paddingVertical: 20 },
  featuredTitle: {
    color: paper,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
  },
  segments: { gap: 7, paddingVertical: 2 },
  segment: {
    height: 34,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(5,7,6,.76)",
  },
  segmentActive: {
    borderColor: accent,
    backgroundColor: "rgba(167,229,154,.14)",
  },
  segmentText: {
    color: muted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0,
  },
  segmentTextActive: { color: paper },
  boardRail: { gap: 7, paddingVertical: 2 },
  boardChip: {
    paddingHorizontal: 11,
    height: 31,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: border,
    justifyContent: "center",
  },
  boardChipActive: { borderColor: accent, backgroundColor: accent },
  boardChipText: { color: muted, fontSize: 9, fontWeight: "900" },
  boardChipTextActive: { color: "#041006" },
  leaderList: { gap: 7 },
  leaderRow: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 7,
    padding: 9,
    backgroundColor: "rgba(3,6,4,.88)",
  },
  leaderPodium: { borderColor: "rgba(167,229,154,.3)" },
  place: { color: paper, fontSize: 18, fontWeight: "900", width: 30 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: border,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: { width: "100%", height: "100%" },
  avatarText: { color: accent, fontSize: 18, fontWeight: "900" },
  boardValue: { color: accent, fontSize: 12, fontWeight: "900" },
  empty: { alignItems: "center", paddingVertical: 24 },
  action: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,.04)",
  },
  actionActive: { backgroundColor: accent, borderColor: accent },
  actionText: { color: paper, fontSize: 9, fontWeight: "900" },
  actionTextActive: { color: "#041006" },
  disabled: { opacity: 0.38 },
  pressed: { opacity: 0.72 },
  profileHero: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: paper,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  profileAvatarEquipped: {
    borderWidth: 3,
    borderColor: accent,
    shadowColor: accent,
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  profilePhoto: { width: "100%", height: "100%" },
  profileInitial: { color: paper, fontSize: 30, fontWeight: "900" },
  profileId: { color: accent, fontSize: 10, fontWeight: "900" },
  profileTools: { gap: 7 },
  iconAction: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,.05)",
  },
  rankTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,.1)",
    overflow: "hidden",
  },
  rankFill: { height: "100%", backgroundColor: accent },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  metric: {
    width: "48.5%",
    minHeight: 74,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: border,
    backgroundColor: "rgba(4,8,5,.85)",
    padding: 11,
    justifyContent: "center",
  },
  metricValue: { color: paper, fontSize: 21, fontWeight: "900" },
  metricLabel: { color: muted, fontSize: 8, fontWeight: "900", marginTop: 3 },
  vehiclePanel: { overflow: "hidden" },
  vehicleImage: { height: 180, width: "100%", borderRadius: 6 },
  socialThumb: {
    width: 54,
    height: 54,
    borderRadius: 5,
    backgroundColor: "#090D0A",
  },
  vehiclePlaceholder: {
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  recordRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  showcaseThumb: { width: 50, height: 50, borderRadius: 6 },
  showcaseThumbEmpty: {
    width: 50,
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: border,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    width: "48.5%",
    minHeight: 128,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: border,
    padding: 12,
    justifyContent: "space-between",
    opacity: 0.55,
  },
  badgeEarned: { opacity: 1, borderColor: "rgba(167,229,154,.42)" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modal: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "92%",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: border,
    overflow: "hidden",
    padding: 16,
    gap: 12,
  },
  modalClose: { position: "absolute", right: 12, top: 12, zIndex: 3 },
  qrVisual: { alignItems: "center", paddingVertical: 22 },
  input: {
    minHeight: 44,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: border,
    paddingHorizontal: 12,
    color: paper,
    backgroundColor: "rgba(0,0,0,.5)",
  },
  qrScanner: {
    height: 310,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: accent,
    alignItems: "center",
    justifyContent: "center",
  },
  qrReticle: {
    width: 176,
    height: 176,
    borderWidth: 1,
    borderColor: accent,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraFrame: {
    height: 340,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: border,
    backgroundColor: "#020302",
  },
  cameraImage: { width: "100%", height: "100%" },
  cameraEmpty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  cameraOverlay: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: "rgba(0,0,0,.68)",
    padding: 10,
    borderRadius: 5,
  },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  shareCard: {
    width: "100%",
    aspectRatio: 0.8,
    minHeight: 410,
    borderWidth: 1,
    borderColor: accent,
    borderRadius: 6,
    padding: 20,
    backgroundColor: "#020403",
    justifyContent: "space-between",
  },
  shareCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  shareBrand: { color: paper, fontSize: 27, fontWeight: "900" },
  shareSubhead: { color: accent, fontSize: 8, fontWeight: "900", marginTop: 3 },
  shareDivider: { height: 1, backgroundColor: "rgba(167,229,154,.35)" },
  shareAlias: { color: paper, fontSize: 24, fontWeight: "900" },
  shareApexId: { color: accent, fontSize: 9, fontWeight: "900" },
  shareVehicle: { color: muted, fontSize: 12, fontWeight: "700" },
  shareMetricRow: { flexDirection: "row", justifyContent: "space-between" },
  shareMetric: { color: paper, fontSize: 40, fontWeight: "900" },
  shareMetricLabel: { color: accent, fontSize: 8, fontWeight: "900" },
  shareTrace: {
    height: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareFooter: { color: muted, fontSize: 8, fontWeight: "800" },
  ghostMeter: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,.1)",
  },
  ghostMeterFill: { height: "100%", backgroundColor: accent },
  speedPanel: { alignItems: "center", paddingVertical: 26 },
  speedValue: { color: paper, fontSize: 80, fontWeight: "900", lineHeight: 88 },
  speedUnit: { color: accent, fontSize: 12, fontWeight: "900" },
  timer: {
    color: paper,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  gpsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  consent: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: accent, borderColor: accent },
  success: {
    color: accent,
    fontSize: 10,
    fontWeight: "900",
    paddingVertical: 5,
  },
  error: {
    color: "#FF7C7C",
    fontSize: 10,
    fontWeight: "800",
    paddingVertical: 5,
  },
  memberRail: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  memberChip: {
    borderWidth: 1,
    borderColor: border,
    borderRadius: 6,
    padding: 7,
  },
  memberRole: { color: accent, fontSize: 8, fontWeight: "900" },
  ptt: {
    minHeight: 40,
    flexGrow: 1,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,.04)",
  },
  pttActive: { backgroundColor: accent, borderColor: accent },
  hudEvents: { gap: 8 },
  hudEvent: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: border,
    borderRadius: 8,
    padding: 11,
    backgroundColor: "rgba(4,8,5,.88)",
  },
  chest: {
    minHeight: 250,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: border,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "rgba(0,0,0,.6)",
  },
  chestAwake: {
    borderColor: accent,
    shadowColor: accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  chestOpen: { backgroundColor: "rgba(15,35,20,.8)" },
  stageDots: { flexDirection: "row", gap: 7 },
  stageDot: { width: 28, height: 3, backgroundColor: "rgba(255,255,255,.13)" },
  stageDotActive: { backgroundColor: accent },
  cotwImage: { height: 180, width: "100%", borderRadius: 6 },
  cotwVehicleRail: { gap: 8, paddingVertical: 4 },
  cotwVehicle: { width: 132, minHeight: 112, borderWidth: 1, borderColor: border, borderRadius: 7, padding: 8, gap: 5, backgroundColor: "rgba(255,255,255,.025)" },
  cotwVehicleActive: { borderColor: accent, backgroundColor: "rgba(167,229,154,.09)" },
  cotwVehicleImage: { width: "100%", height: 62, borderRadius: 5 },
});
