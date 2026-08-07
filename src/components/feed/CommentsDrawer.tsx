import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Send, CornerDownRight } from 'lucide-react-native';
import { colors } from '../../config/colors';

import { CommentWithProfile } from '../../stores/feedStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentsDrawerProps {
  postId: string;
  postCommentCount: number;
  comments: CommentWithProfile[];
  onClose: () => void;
  onSend: (text: string, parentId?: string) => void;
}

export const CommentsDrawer: React.FC<CommentsDrawerProps> = ({
  postId,
  postCommentCount,
  comments,
  onClose,
  onSend,
}) => {
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState<{ id: string; username: string } | null>(null);

  const handleSend = () => {
    if (!commentText.trim()) return;
    onSend(commentText.trim(), replyingTo?.id);
    setCommentText('');
    setReplyingTo(null);
  };

  const renderComment = ({ item }: { item: CommentWithProfile }) => {
    const isReply = false;
    return (
      <View style={[styles.commentRow, isReply && styles.replyRow]}>
        {isReply && <CornerDownRight size={14} color={colors.textMuted} style={styles.replyIcon} />}
        <Image source={{ uri: item.user_profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }} style={styles.commentAvatar} />
        <View style={styles.commentContent}>
          <Text style={styles.commentAuthor}>{item.user_profile?.display_name || item.user_profile?.username || 'Racer'}</Text>
          <Text style={styles.commentBody}>{item.comment_text}</Text>
          <View style={styles.commentActions}>
            <Text style={styles.commentTime}>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            <TouchableOpacity onPress={() => setReplyingTo({ id: item.id, username: item.user_profile?.username || 'Racer' })}>
              <Text style={styles.replyBtnText}>Reply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.drawerHandle} />
      <View style={styles.drawerHeader}>
        <Text style={styles.drawerTitle}>{postCommentCount} COMMENTS</Text>
        <TouchableOpacity onPress={onClose}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.commentsList}
        data={comments}
        keyExtractor={(c) => c.id}
        renderItem={renderComment}
        ListEmptyComponent={
          <Text style={styles.noCommentsText}>No comments yet. Be first!</Text>
        }
      />

      {replyingTo && (
        <View style={styles.replyingToBar}>
          <Text style={styles.replyingToText}>Replying to @{replyingTo.username}</Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <X size={14} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.commentInputRow}>
        <TextInput
          style={styles.commentInput}
          placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
          placeholderTextColor={colors.textMuted}
          value={commentText}
          onChangeText={setCommentText}
          multiline={false}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !commentText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!commentText.trim()}
        >
          <Send size={16} color={commentText.trim() ? colors.background : colors.textMuted} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  drawerHandle: { width: 36, height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  drawerTitle: { color: colors.text, fontSize: 14, fontWeight: '900', letterSpacing: 1 },

  commentsList: { maxHeight: 350 },
  commentRow: { flexDirection: 'row', marginVertical: 8, alignItems: 'flex-start' },
  replyRow: { marginLeft: 30, marginTop: 4 },
  replyIcon: { marginTop: 8, marginRight: 8 },
  commentAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.cardBorder },
  commentContent: { flex: 1, marginLeft: 10 },
  commentAuthor: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  commentBody: { color: colors.text, fontSize: 13, marginTop: 2, lineHeight: 18 },
  commentActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  commentTime: { color: colors.textMuted, fontSize: 10 },
  replyBtnText: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  noCommentsText: { color: colors.textMuted, textAlign: 'center', padding: 20, fontSize: 12 },

  replyingToBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, padding: 8, borderRadius: 8, marginBottom: 8 },
  replyingToText: { color: colors.primary, fontSize: 11, fontWeight: '800' },

  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, color: colors.text, paddingHorizontal: 16, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  sendBtn: { backgroundColor: colors.primary, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
});
