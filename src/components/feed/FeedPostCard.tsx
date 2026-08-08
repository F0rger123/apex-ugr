import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { TapGestureHandler, State } from 'react-native-gesture-handler';
import { PostWithProfile } from '../../stores/feedStore';
import { colors } from '../../config/colors';
import { Heart, MessageSquare, Repeat2, Share2, Volume2, VolumeX, UserPlus, Play, Bookmark } from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_HEIGHT = Platform.OS === 'web' ? SCREEN_HEIGHT - 60 : SCREEN_HEIGHT - 90;

interface FeedPostCardProps {
  post: PostWithProfile;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onFollow: () => void;
  onSave: () => void;
  isSaved?: boolean;
  onRepost: () => void;
  onShare: () => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  isActive,
  onLike,
  onComment,
  onFollow,
  onSave,
  isSaved = false,
  onRepost,
  onShare,
}) => {
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const author = post.user_profile;

  // Reanimated Heart
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const rHeartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const doubleTapRef = useRef();

  const onDoubleTap = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Trigger visually
      heartScale.value = withSequence(
        withSpring(1.2, { damping: 10, stiffness: 100 }),
        withDelay(500, withSpring(0))
      );
      heartOpacity.value = withSequence(
        withSpring(1),
        withDelay(500, withSpring(0))
      );
      
      // Trigger actual like API
      runOnJS(onLike)();
    }
  }, [onLike]);

  const onSingleTap = useCallback((event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      setIsPaused((p) => !p);
    }
  }, []);

  return (
    <View style={[styles.postCard, { height: POST_HEIGHT }]}>
      <TapGestureHandler
        onHandlerStateChange={onSingleTap}
        waitFor={doubleTapRef}
      >
        <Animated.View style={StyleSheet.absoluteFill}>
          <TapGestureHandler
            ref={doubleTapRef}
            numberOfTaps={2}
            onHandlerStateChange={onDoubleTap}
          >
            <Animated.View style={StyleSheet.absoluteFill}>
              {/* Media Background */}
              {post.post_type === 'video' ? (
                <View style={styles.mediaBackground}>
                  {Platform.OS === 'web' ? (
                    <video
                      src={post.media_url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      autoPlay={isActive && !isPaused}
                      loop
                      muted={isMuted}
                      playsInline
                    />
                  ) : (
                    <Video
                      source={{ uri: post.media_url }}
                      style={styles.mediaBackground}
                      resizeMode={(ResizeMode?.COVER || 'cover') as any}
                      shouldPlay={isActive && !isPaused}
                      isLooping
                      isMuted={isMuted}
                    />
                  )}
                  {isPaused && (
                    <View style={styles.pauseOverlay}>
                      <Play size={64} color="rgba(255,255,255,0.8)" fill="rgba(255,255,255,0.8)" />
                    </View>
                  )}
                </View>
              ) : (
                <Image
                  source={{ uri: post.thumbnail_url || post.media_url }}
                  style={styles.mediaBackground}
                  resizeMode="cover"
                />
              )}

              {/* Glowing Heart Overlay */}
              <Animated.View style={[styles.animatedHeartContainer, rHeartStyle]}>
                <Heart size={120} color={colors.primary} fill={colors.primary} style={styles.heartGlow} />
              </Animated.View>
            </Animated.View>
          </TapGestureHandler>
        </Animated.View>
      </TapGestureHandler>

      {/* Gradient overlay for readability */}
      <View style={styles.gradientOverlay} pointerEvents="none" />

      {/* Top bar — post type badge + audio pill */}
      <View style={styles.topBar}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{post.post_type.toUpperCase().replace('_', ' ')}</Text>
        </View>
        {post.post_type === 'video' && (
          <TouchableOpacity style={styles.audioPill} onPress={() => setIsMuted(!isMuted)}>
            {isMuted ? <VolumeX size={11} color={colors.textMuted} /> : <Volume2 size={11} color={colors.primary} />}
            <Text style={styles.audioPillText}>{isMuted ? 'MUTED' : 'EXHAUST TELEMETRY AUDIO'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Right sidebar — social actions */}
      <View style={styles.rightSidebar}>
        {/* Avatar + follow */}
        <TouchableOpacity style={styles.avatarContainer} onPress={onFollow}>
          <Image
            source={{ uri: author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
            style={styles.authorAvatar}
          />
          <View style={styles.followPlusBadge}>
            <UserPlus size={9} color={colors.background} />
          </View>
        </TouchableOpacity>

        {/* Like */}
        <TouchableOpacity style={styles.actionItem} onPress={onLike}>
          <View style={[styles.actionCircle, post.user_has_liked && styles.actionCircleLiked]}>
            <Heart
              size={24}
              color={post.user_has_liked ? colors.primary : colors.text}
              fill={post.user_has_liked ? colors.primary : 'none'}
            />
          </View>
          <Text style={[styles.actionCount, post.user_has_liked && { color: colors.primary }]}>{''}
            {post.likes_count >= 1000
              ? `${(post.likes_count / 1000).toFixed(1)}K`
              : post.likes_count}
          </Text>
        </TouchableOpacity>

        {/* Comment */}
        <TouchableOpacity style={styles.actionItem} onPress={onComment}>
          <View style={styles.actionCircle}>
            <MessageSquare size={24} color={colors.text} />
          </View>
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </TouchableOpacity>

        {/* Repost */}
        <TouchableOpacity style={styles.actionItem} onPress={onRepost}>
          <View style={styles.actionCircle}>
            <Repeat2 size={24} color={colors.text} />
          </View>
          <Text style={styles.actionCount}>{post.reposts_count}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionItem} onPress={onShare}>
          <View style={styles.actionCircle}>
            <Share2 size={22} color={colors.text} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onSave}>
          <View style={styles.actionCircle}>
            <Bookmark size={22} color={isSaved ? colors.primary : colors.text} fill={isSaved ? colors.primary : 'none'} />
          </View>
          <Text style={styles.actionCount}>{isSaved ? 'SAVED' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom info overlay */}
      <View style={styles.bottomOverlay}>
        <View style={styles.authorRow}>
          <Text style={styles.authorName}>{author?.display_name}</Text>
          <Text style={styles.authorHandle}> @{author?.username}</Text>
          {author?.is_verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>

        <Text style={styles.caption} numberOfLines={3}>{post.caption}</Text>

        <View style={styles.tagsRow}>
          {(post.tags || []).map((tag, i) => (
            <Text key={i} style={styles.tag}>{tag} </Text>
          ))}
        </View>

        {/* Rep badge */}
        {author?.reputation_level && (
          <View style={styles.repBadge}>
            <Text style={styles.repText}>{author.reputation_level.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  postCard: { width: SCREEN_WIDTH, position: 'relative', overflow: 'hidden' },
  mediaBackground: { width: '100%', height: '100%', position: 'absolute' },
  pauseOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  animatedHeartContainer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
    pointerEvents: 'none',
  },
  heartGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 10,
  },
  topBar: { position: 'absolute', top: Platform.OS === 'web' ? 80 : 110, left: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeBadge: { backgroundColor: 'rgba(0,255,102,0.15)', borderWidth: 1, borderColor: colors.primary, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8 },
  typeBadgeText: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  audioPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  audioPillText: { color: colors.text, fontSize: 8, fontWeight: '800' },

  rightSidebar: { position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 16 },
  avatarContainer: { alignItems: 'center' },
  authorAvatar: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: colors.primary },
  followPlusBadge: { position: 'absolute', bottom: -6, backgroundColor: colors.primary, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  actionItem: { alignItems: 'center', gap: 4 },
  actionCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  actionCircleLiked: { backgroundColor: colors.primaryBg, borderColor: colors.primary },
  actionCount: { color: colors.text, fontSize: 11, fontWeight: '900' },

  bottomOverlay: { position: 'absolute', bottom: 30, left: 16, right: 70 },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  authorName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  authorHandle: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  verifiedBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 4, marginLeft: 4 },
  verifiedText: { color: colors.background, fontSize: 9, fontWeight: '900' },
  caption: { color: 'rgba(255,255,255,0.9)', fontSize: 13, lineHeight: 19 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  tag: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  repBadge: { marginTop: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 3, paddingHorizontal: 8, borderRadius: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  repText: { color: colors.textSecondary, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
});
