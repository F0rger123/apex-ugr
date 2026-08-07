import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
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
import { Heart, MessageSquare, Repeat2, Share2, Plus, Send, X, Volume2, VolumeX, UserPlus, Camera, Film, Play } from 'lucide-react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const POST_HEIGHT = Platform.OS === 'web' ? SCREEN_HEIGHT - 60 : SCREEN_HEIGHT - 90;

import { FeedPostCard } from '../../components/feed/FeedPostCard';
import { CommentsDrawer } from '../../components/feed/CommentsDrawer';

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
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  const [newMediaUri, setNewMediaUri] = useState<string | null>(null);
  const [newMediaType, setNewMediaType] = useState<'photo' | 'video'>('photo');
  const [isPosting, setIsPosting] = useState(false);
  const [postHeight, setPostHeight] = useState(0);

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

  const handleSendComment = async (text: string, parentId?: string) => {
    if (!text.trim() || !commentPostId || !user) return;
    await addComment(commentPostId, user.id, text.trim());
    // NOTE: If parentId is used, backend needs support. For now, addComment ignores it or handles it via store update.
  };

  const handlePickMedia = async () => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,video/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const isVideo = file.type.startsWith('video');
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              setNewMediaUri(event.target.result as string);
              setNewMediaType(isVideo ? 'video' : 'photo');
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
      return;
    }

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

      {/* Racer Stories Carousel */}
      <View style={styles.storiesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 12 }}>
          <TouchableOpacity style={styles.addStoryItem} onPress={() => setCreateModalVisible(true)}>
            <View style={styles.addStoryCircle}>
              <Plus size={20} color={colors.primary} />
            </View>
            <Text style={styles.storyName}>YOUR LOG</Text>
          </TouchableOpacity>

          {[
            { id: '1', name: 'phantom_gtr', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop', live: true },
            { id: '2', name: 'apex_gt3', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop', live: true },
            { id: '3', name: 'boosted_2jz', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop', live: false },
            { id: '4', name: 'coyote_50', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop', live: false },
          ].map((s) => (
            <TouchableOpacity key={s.id} style={styles.storyItem}>
              <View style={[styles.storyRing, s.live && styles.storyRingLive]}>
                <Image source={{ uri: s.avatar }} style={styles.storyAvatar} />
              </View>
              <Text style={styles.storyName} numberOfLines={1}>@{s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
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
        <View 
          style={{ flex: 1 }} 
          onLayout={(e) => setPostHeight(e.nativeEvent.layout.height)}
        >
          {postHeight > 0 && (
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={{ height: postHeight }}>
                  <FeedPostCard
                    post={item}
                    isActive={item.id === activePostId}
                    onLike={() => user && toggleLike(item.id, user.id)}
                    onComment={() => handleOpenComments(item.id)}
                    onFollow={() => {}}
                  />
                </View>
              )}
              showsVerticalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={{ itemVisiblePercentThreshold: 60, minimumViewTime: 200 }}
              pagingEnabled={true}
              decelerationRate="fast"
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
        </View>
      )}

      {/* Comment Drawer */}
      <Modal visible={!!commentPostId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          {commentPostId && (
            <CommentsDrawer
              postId={commentPostId}
              postCommentCount={posts.find(p => p.id === commentPostId)?.comments_count || 0}
              comments={commentsMap[commentPostId] || []}
              onClose={() => setCommentPostId(null)}
              onSend={handleSendComment}
            />
          )}
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

  // Stories Carousel
  storiesContainer: { paddingVertical: 10, backgroundColor: 'rgba(8,9,12,0.9)', borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  addStoryItem: { alignItems: 'center', width: 64 },
  addStoryCircle: { width: 50, height: 50, borderRadius: 25, borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,255,102,0.05)' },
  storyItem: { alignItems: 'center', width: 64 },
  storyRing: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.cardBorder, padding: 2 },
  storyRingLive: { borderColor: colors.primary },
  storyAvatar: { width: '100%', height: '100%', borderRadius: 23 },
  storyName: { color: colors.textMuted, fontSize: 9, fontWeight: '800', marginTop: 4, textAlign: 'center' },
});
