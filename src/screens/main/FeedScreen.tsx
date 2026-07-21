import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, TextInput, Dimensions } from 'react-native';
import { useFeedStore } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Heart, MessageSquare, Repeat, Share2, Plus, Send, X, Flame, Volume2, UserPlus } from 'lucide-react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const FeedScreen = ({ navigation }: any) => {
  const { posts, commentsMap, toggleLike, addComment, createPost } = useFeedStore();
  const { user } = useAuthStore();

  const [feedTab, setFeedTab] = useState<'foryou' | 'following'>('foryou');
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const handleCreatePost = () => {
    if (!caption) return;
    createPost({
      user_id: user?.id || '00000000-0000-0000-0000-000000000001',
      post_type: 'photo',
      media_url: mediaUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
      caption,
      tags: ['#ApexUGR', '#TrackDemon'],
      user_profile: user || undefined
    });
    setModalVisible(false);
    setCaption(''); setMediaUrl('');
  };

  const handleSendComment = (postId: string) => {
    if (!commentText.trim()) return;
    addComment(postId, commentText);
    setCommentText('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      {/* Top Feed Bar (For You / Following Tabs) */}
      <View style={styles.topFeedBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setFeedTab('foryou')}>
          <Text style={[styles.tabText, feedTab === 'foryou' && styles.tabTextActive]}>FOR YOU</Text>
          {feedTab === 'foryou' && <View style={styles.activePill} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabBtn} onPress={() => setFeedTab('following')}>
          <Text style={[styles.tabText, feedTab === 'following' && styles.tabTextActive]}>FOLLOWING</Text>
          {feedTab === 'following' && <View style={styles.activePill} />}
        </TouchableOpacity>

        <TouchableOpacity style={styles.createPostFab} onPress={() => setModalVisible(true)}>
          <Plus size={16} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.feedScroll} pagingEnabled showsVerticalScrollIndicator={false}>
        {posts.map((post) => {
          const author = post.user_profile;
          const comments = commentsMap[post.id] || [];

          return (
            <View key={post.id} style={styles.reelsCard}>
              {/* Media Background */}
              <Image source={{ uri: post.media_url }} style={styles.mediaBackground} resizeMode="cover" />
              <View style={styles.overlayGradient} />

              {/* Top Tag */}
              <View style={styles.topTagRow}>
                <MatrixBadge label={post.post_type.toUpperCase()} variant="green" size="sm" />
                <View style={styles.audioPill}>
                  <Volume2 size={12} color={colors.primary} />
                  <Text style={styles.audioText}>RAW EXHAUST TELEMETRY AUDIO</Text>
                </View>
              </View>

              {/* Right Side Social Overlay Buttons */}
              <View style={styles.rightSocialOverlay}>
                {/* Author Avatar */}
                <View style={styles.avatarBox}>
                  <Image
                    source={{ uri: author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
                    style={styles.authorAvatar}
                  />
                  <View style={styles.followBadge}>
                    <UserPlus size={10} color={colors.background} />
                  </View>
                </View>

                {/* Like Button */}
                <TouchableOpacity style={styles.overlayActionBtn} onPress={() => toggleLike(post.id)}>
                  <View style={[styles.actionCircle, post.user_has_liked && styles.likedCircle]}>
                    <Heart
                      size={22}
                      color={post.user_has_liked ? colors.danger : colors.text}
                      fill={post.user_has_liked ? colors.danger : 'none'}
                    />
                  </View>
                  <Text style={[styles.actionLabel, post.user_has_liked && { color: colors.danger }]}>
                    {post.likes_count}
                  </Text>
                </TouchableOpacity>

                {/* Comment Button */}
                <TouchableOpacity style={styles.overlayActionBtn} onPress={() => setActiveCommentsPostId(post.id)}>
                  <View style={styles.actionCircle}>
                    <MessageSquare size={22} color={colors.text} />
                  </View>
                  <Text style={styles.actionLabel}>{post.comments_count}</Text>
                </TouchableOpacity>

                {/* Repost Button */}
                <TouchableOpacity style={styles.overlayActionBtn}>
                  <View style={styles.actionCircle}>
                    <Repeat size={22} color={colors.text} />
                  </View>
                  <Text style={styles.actionLabel}>{post.reposts_count}</Text>
                </TouchableOpacity>

                {/* Share Button */}
                <TouchableOpacity style={styles.overlayActionBtn}>
                  <View style={styles.actionCircle}>
                    <Share2 size={22} color={colors.text} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Bottom Caption Overlay */}
              <View style={styles.bottomInfoOverlay}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.authorDisplayName}>{author?.display_name}</Text>
                  <Text style={styles.authorUsername}>@{author?.username}</Text>
                </View>

                <Text style={styles.captionText} numberOfLines={3}>{post.caption}</Text>

                {/* Hashtags */}
                <View style={styles.tagsRow}>
                  {post.tags.map((t, idx) => (
                    <Text key={idx} style={styles.tagItem}>{t} </Text>
                  ))}
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Comment Drawer Modal */}
      <Modal visible={!!activeCommentsPostId} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.commentsDrawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>COMMENTS</Text>
              <TouchableOpacity onPress={() => setActiveCommentsPostId(null)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 300 }}>
              {(activeCommentsPostId ? commentsMap[activeCommentsPostId] || [] : []).map((c) => (
                <View key={c.id} style={styles.commentItem}>
                  <Image source={{ uri: c.user_profile?.avatar_url }} style={styles.commentAvatar} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.commentUser}>{c.user_profile?.display_name}</Text>
                    <Text style={styles.commentBody}>{c.comment_text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Add a comment..."
                placeholderTextColor={colors.textMuted}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity
                style={styles.sendCommentBtn}
                onPress={() => activeCommentsPostId && handleSendComment(activeCommentsPostId)}
              >
                <Send size={16} color={colors.background} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE REELS POST</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>CAPTION & HASHTAGS</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Share your dyno results, car edits, or roll runs..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>VIDEO / PHOTO MEDIA URL</Text>
            <TextInput
              style={styles.input}
              value={mediaUrl}
              onChangeText={setMediaUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
            />

            <ApexButton title="POST TO FEED" onPress={handleCreatePost} style={{ marginTop: 14 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topFeedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.glassHeader, paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  tabBtn: { marginHorizontal: 16, alignItems: 'center' },
  tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: colors.text },
  activePill: { height: 3, width: 24, backgroundColor: colors.primary, borderRadius: 2, marginTop: 4 },
  createPostFab: { position: 'absolute', right: 16, backgroundColor: colors.primary, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  feedScroll: { flex: 1 },
  reelsCard: { height: SCREEN_HEIGHT - 130, width: '100%', backgroundColor: colors.surface, overflow: 'hidden' },
  mediaBackground: { width: '100%', height: '100%' },
  overlayGradient: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)' },

  topTagRow: { position: 'absolute', top: 16, left: 16, flexDirection: 'row', alignItems: 'center' },
  audioPill: { backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginLeft: 8 },
  audioText: { color: colors.text, fontSize: 9, fontWeight: '800', marginLeft: 4 },

  rightSocialOverlay: { position: 'absolute', right: 16, bottom: 90, alignItems: 'center', gap: 16 },
  avatarBox: { alignItems: 'center', marginBottom: 8 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: colors.primary },
  followBadge: { position: 'absolute', bottom: -4, backgroundColor: colors.primary, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },

  overlayActionBtn: { alignItems: 'center' },
  actionCircle: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(0, 0, 0, 0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  likedCircle: { borderColor: colors.danger, backgroundColor: 'rgba(255, 51, 102, 0.2)' },
  actionLabel: { color: colors.text, fontSize: 11, fontWeight: '900', marginTop: 4 },

  bottomInfoOverlay: { position: 'absolute', bottom: 20, left: 16, right: 80 },
  authorDisplayName: { color: colors.text, fontSize: 16, fontWeight: '900' },
  authorUsername: { color: colors.primary, fontSize: 12, fontWeight: '800', marginLeft: 6 },
  captionText: { color: colors.text, fontSize: 13, lineHeight: 18, marginTop: 4 },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  tagItem: { color: colors.primary, fontSize: 11, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  commentsDrawer: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderWidth: 1, borderColor: colors.primary },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  drawerTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  commentItem: { flexDirection: 'row', marginVertical: 6 },
  commentAvatar: { width: 28, height: 28, borderRadius: 14 },
  commentUser: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  commentBody: { color: colors.text, fontSize: 12 },
  commentInputRow: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  commentInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, fontSize: 12, borderWidth: 1, borderColor: colors.cardBorder },
  sendCommentBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, marginLeft: 8 },

  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, margin: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
});
