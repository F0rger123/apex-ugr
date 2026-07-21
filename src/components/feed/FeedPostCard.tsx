import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput } from 'react-native';
import { Post } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { colors } from '../../config/colors';
import { Heart, MessageSquare, Repeat, Share2, Send } from 'lucide-react-native';

interface FeedPostCardProps {
  post: Post;
  onLike: () => void;
  onCommentSubmit: (text: string) => void;
  comments?: any[];
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  onLike,
  onCommentSubmit,
  comments = [],
}) => {
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handleSubmit = () => {
    if (!commentText.trim()) return;
    onCommentSubmit(commentText);
    setCommentText('');
  };

  const author = post.user_profile;

  return (
    <GlassCard style={styles.card}>
      {/* Author Header */}
      <View style={styles.authorHeader}>
        <Image
          source={{ uri: author?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.displayName}>{author?.display_name || 'Racer'}</Text>
            {author?.is_verified && (
              <MatrixBadge label="VERIFIED" variant="green" size="sm" style={{ marginLeft: 6 }} />
            )}
          </View>
          <Text style={styles.username}>@{author?.username || 'racer'}</Text>
        </View>
        <MatrixBadge label={post.post_type.toUpperCase()} variant="silver" size="sm" />
      </View>

      {/* Caption */}
      <Text style={styles.caption}>{post.caption}</Text>

      {/* Tags */}
      {post.tags && post.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {post.tags.map((tag, idx) => (
            <Text key={idx} style={styles.tagText}>{tag} </Text>
          ))}
        </View>
      )}

      {/* Media Image / Video */}
      <View style={styles.mediaBox}>
        <Image source={{ uri: post.media_url }} style={styles.mediaImage} resizeMode="cover" />
      </View>

      {/* Social Engagement Actions */}
      <View style={styles.engagementRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Heart
            size={20}
            color={post.user_has_liked ? colors.danger : colors.textSecondary}
            fill={post.user_has_liked ? colors.danger : 'none'}
          />
          <Text style={[styles.actionCount, post.user_has_liked && { color: colors.danger }]}>
            {post.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setShowComments(!showComments)}>
          <MessageSquare size={20} color={colors.textSecondary} />
          <Text style={styles.actionCount}>{post.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Repeat size={20} color={colors.textSecondary} />
          <Text style={styles.actionCount}>{post.reposts_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn}>
          <Share2 size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Comments Drawer Section */}
      {showComments && (
        <View style={styles.commentsSection}>
          {comments.map((c, idx) => (
            <View key={idx} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>{c.user_profile?.display_name || 'Racer'}: </Text>
              <Text style={styles.commentBody}>{c.comment_text}</Text>
            </View>
          ))}

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textMuted}
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSubmit}>
              <Send size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 12,
  },
  authorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  displayName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  username: {
    color: colors.textMuted,
    fontSize: 11,
  },
  caption: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  tagText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  mediaBox: {
    height: 220,
    width: '100%',
    borderRadius: 12,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    marginBottom: 10,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  engagementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  actionCount: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginLeft: 6,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  commentRow: {
    flexDirection: 'row',
    marginVertical: 3,
  },
  commentAuthor: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  commentBody: {
    color: colors.text,
    fontSize: 11,
    flex: 1,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  commentInput: {
    flex: 1,
    color: colors.text,
    paddingVertical: 8,
    fontSize: 12,
  },
  sendBtn: {
    padding: 6,
  },
});
