import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Dimensions,
  ViewToken,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useFeedStore, PostWithProfile, CommentWithProfile } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../config/colors';
import { Heart, MessageSquare, Repeat2, Share2, Plus, Send, X, Volume2, UserPlus, Camera, Film } from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Single Post Card (full-screen) ──────────────────────────────────────────
const FeedPostCard = ({
  post,
  isActive,
  onLike,
  onComment,
  onFollow,
}: {
  post: PostWithProfile;
  isActive: boolean;
  onLike: () => void;
  onComment: () => void;
  onFollow: () => void;
}) => {
  const author = post.user_profile;

  return (
    <View style={styles.postCard}>
      {/* Media Background */}
      {post.post_type === 'video' ? (
        <Video
          source={{ uri: post.media_url }}
          style={styles.mediaBackground}
          resizeMode={(ResizeMode?.COVER || 'cover') as any}
          shouldPlay={isActive}
          isLooping
          isMuted={false}
        />
      ) : (
        <Image
          source={{ uri: post.thumbnail_url || post.media_url }}
          style={styles.mediaBackground}
          resizeMode="cover"
        />
      )}

      {/* Gradient overlay for readability */}
      <View style={styles.gradientOverlay} />

      {/* Top bar — post type badge + audio pill */}
      <View style={styles.topBar}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{post.post_type.toUpperCase().replace('_', ' ')}</Text>
        </View>
        {post.post_type === 'video' && (
          <View style={styles.audioPill}>
            <Volume2 size={11} color={colors.primary} />
            <Text style={styles.audioPillText}>EXHAUST TELEMETRY AUDIO</Text>
          </View>
        )}
      </View>

      {/* Right sidebar — social actions */}
      <View style={styles.rightSidebar}>
        {/* Avatar + follow */}
        <TouchableOpacity style={styles.avatarContainer} onPress={onFollow}>
          <Image
            source={{ uri: author?.avatar_url || '' }}
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
              color={post.user_has_liked ? '#FF3366' : colors.text}
              fill={post.user_has_liked ? '#FF3366' : 'none'}
            />
          </View>
          <Text style={[styles.actionCount, post.user_has_liked && { color: '#FF3366' }]}>
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
        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionCircle}>
            <Repeat2 size={24} color={colors.text} />
          </View>
          <Text style={styles.actionCount}>{post.reposts_count}</Text>
        </TouchableOpacity>

        {/* Share */}
        <TouchableOpacity style={styles.actionItem}>
          <View style={styles.actionCircle}>
            <Share2 size={22} color={colors.text} />
          </View>
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

// ─── Main Feed Screen ─────────────────────────────────────────────────────────
export const FeedScreen = ({ navigation }: any) => {
  const {
    posts,
    commentsMap,
    fetchFeed,
    fetchComments,
    toggleLike,
    addComment,
    createPost,
    uploadPostMedia,
    isLoading,
    isLoadingMore,
    hasMore,
    subscribeToFeed,
    unsubscribeFromFeed,
  } = useFeedStore();
  const { user } = useAuthStore();

  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newMediaUri, setNewMediaUri] = useState<string | null>(null);
  const [newMediaType, setNewMediaType] = useState<'photo' | 'video'>('photo');
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (user) {
      fetchFeed(user.id, feedTab, true);
    }
    const channel = subscribeToFeed();
    return () => {
      unsubscribeFromFeed();
    };
  }, [feedTab, user?.id]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) {
        setActivePostId(viewableItems[0].item?.id || null);
      }
    },
    []
  );

  const handleOpenComments = (postId: string) => {
    setCommentPostId(postId);
    fetchComments(postId);
  };

  const handleSendComment = async () => {
    if (!commentText.trim() || !commentPostId || !user) return;
    await addComment(commentPostId, user.id, commentText.trim());
    setCommentText('');
  };

  const handlePickMedia = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setNewMediaUri(result.assets[0].uri);
      setNewMediaType(result.assets[0].type === 'video' ? 'video' : 'photo');
    }
  };

  const handleCreatePost = async () => {
    if (!newCaption.trim() || !user || !newMediaUri) {
      Alert.alert('Error', 'Caption and Media are required');
      return;
    }
    
    setIsPosting(true);
    
    // Attempt upload
    let finalMediaUrl = '';
    const ext = newMediaType === 'video' ? 'mp4' : 'jpeg';
    const mimeType = newMediaType === 'video' ? 'video/mp4' : 'image/jpeg';
    const fileName = `post_${Date.now()}.${ext}`;

    const { url, error } = await uploadPostMedia(user.id, newMediaUri, fileName, mimeType);
    
    if (error || !url) {
      // Fallback if local testing
      finalMediaUrl = newMediaUri; 
    } else {
      finalMediaUrl = url;
    }

    await createPost(user.id, {
      post_type: newMediaType,
      media_url: finalMediaUrl,
      caption: newCaption.trim(),
      tags: newCaption.match(/#\w+/g) || ['#ApexUGR'],
    });
    
    setIsPosting(false);
    setCreateModalVisible(false);
    setNewCaption('');
    setNewMediaUri(null);
  };

  const renderPost = ({ item }: { item: PostWithProfile }) => (
    <FeedPostCard
      post={item}
      isActive={item.id === activePostId}
      onLike={() => user && toggleLike(item.id, user.id)}
      onComment={() => handleOpenComments(item.id)}
      onFollow={() => {}}
    />
  );

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Fixed Tab Bar on top */}
      <View style={styles.tabBar}>
        <TouchableOpacity onPress={() => setFeedTab('foryou')} style={styles.tabBtn}>
          <Text style={[styles.tabText, feedTab === 'foryou' && styles.tabTextActive]}>FOR YOU</Text>
          {feedTab === 'foryou' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setFeedTab('following')} style={styles.tabBtn}>
          <Text style={[styles.tabText, feedTab === 'following' && styles.tabTextActive]}>FOLLOWING</Text>
          {feedTab === 'following' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalVisible(true)}>
          <Plus size={18} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Loading state */}
      {isLoading && (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>LOADING FEED...</Text>
        </View>
      )}

      {/* Full-screen paginated feed */}
      {!isLoading && (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          pagingEnabled
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          onEndReached={() => {
            if (hasMore && !isLoadingMore && user) {
              fetchFeed(user.id, feedTab);
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>NO POSTS YET</Text>
              <Text style={styles.emptySub}>
                {feedTab === 'following'
                  ? 'Follow other racers to see their posts here.'
                  : 'Be the first to post in the underground.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Comment Drawer */}
      <Modal visible={!!commentPostId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.commentsDrawer}>
            <View style={styles.drawerHandle} />
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>
                {commentPostId && posts.find(p => p.id === commentPostId)?.comments_count || 0} COMMENTS
              </Text>
              <TouchableOpacity onPress={() => setCommentPostId(null)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              style={styles.commentsList}
              data={commentPostId ? (commentsMap[commentPostId] || []) : []}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => (
                <View style={styles.commentRow}>
                  <Image source={{ uri: (item as any).user_profile?.avatar_url }} style={styles.commentAvatar} />
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>{(item as any).user_profile?.display_name}</Text>
                    <Text style={styles.commentBody}>{item.comment_text}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noCommentsText}>No comments yet. Be first!</Text>
              }
            />

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleSendComment}
              />
              <TouchableOpacity
                style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
                onPress={handleSendComment}
                disabled={!commentText.trim()}
              >
                <Send size={16} color={commentText.trim() ? colors.background : colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Post Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.createCard}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>CREATE POST</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.mediaTypeRow}>
              <TouchableOpacity style={styles.mediaTypeBtn} onPress={handlePickMedia}>
                <Camera size={20} color={colors.primary} />
                <Text style={styles.mediaTypeBtnText}>
                  {newMediaUri ? 'CHANGE MEDIA' : 'SELECT PHOTO / VIDEO'}
                </Text>
              </TouchableOpacity>
            </View>

            {newMediaUri && (
              <View style={{ marginBottom: 16 }}>
                <Text style={[styles.inputLabel, { color: colors.primary }]}>Media Selected ✓</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>CAPTION & HASHTAGS</Text>
            <TextInput
              style={[styles.formInput, { height: 90 }]}
              placeholder="Share your dyno results, race recap, build update... Add #hashtags"
              placeholderTextColor={colors.textMuted}
              value={newCaption}
              onChangeText={setNewCaption}
              multiline
            />

            <TouchableOpacity
              style={[styles.postBtn, (!newCaption.trim() || isPosting) && styles.postBtnDisabled]}
              onPress={handleCreatePost}
              disabled={!newCaption.trim() || isPosting}
            >
              {isPosting ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.postBtnText}>POST TO FEED</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  tabBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingTop: Platform.OS === 'web' ? 12 : 50,
    paddingBottom: 10,
    backgroundColor: 'rgba(8,9,12,0.7)',
  },
  tabBtn: { alignItems: 'center', paddingHorizontal: 18 },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: colors.text },
  tabIndicator: { height: 3, width: 28, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4 },
  createBtn: {
    position: 'absolute', right: 16, bottom: 10,
    backgroundColor: colors.primary, width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  loadingFooter: { height: 60, alignItems: 'center', justifyContent: 'center' },

  // Full-screen post card
  postCard: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, position: 'relative' },
  mediaBackground: { width: '100%', height: '100%', position: 'absolute' },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  actionCircleLiked: { backgroundColor: 'rgba(255,51,102,0.2)', borderColor: '#FF3366' },
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

  emptyState: { height: SCREEN_HEIGHT, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  emptySub: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  commentsDrawer: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: SCREEN_HEIGHT * 0.75, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  drawerHandle: { width: 36, height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  drawerTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  commentsList: { maxHeight: 300 },
  commentRow: { flexDirection: 'row', marginVertical: 8, alignItems: 'flex-start' },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.cardBorder },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthor: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  commentBody: { color: colors.text, fontSize: 13, marginTop: 2, lineHeight: 18 },
  noCommentsText: { color: colors.textMuted, textAlign: 'center', padding: 20, fontSize: 12 },

  commentInputRow: { flexDirection: 'row', marginTop: 12, alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, color: colors.text, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  sendBtn: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },

  createCard: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  mediaTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  mediaTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.cardBorder },
  mediaTypeBtnText: { color: colors.text, fontSize: 11, fontWeight: '900' },
  inputLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 6, marginTop: 10, letterSpacing: 0.8 },
  formInput: { backgroundColor: colors.surface, borderRadius: 12, color: colors.text, padding: 12, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  postBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  postBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
  postBtnText: { color: colors.background, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});
