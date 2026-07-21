import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useFeedStore } from '../../stores/feedStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { FeedPostCard } from '../../components/feed/FeedPostCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { Plus, Image as ImageIcon, Video, X } from 'lucide-react-native';

export const FeedScreen = ({ navigation }: any) => {
  const { posts, commentsMap, toggleLike, addComment, createPost } = useFeedStore();
  const { user } = useAuthStore();

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

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Feed Header */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>COMMUNITY FEED</Text>
            <Text style={styles.subTitle}>DYNO RUNS • CAR EDITS • RACE RECAPS</Text>
          </View>

          <ApexButton
            title="POST"
            variant="primary"
            size="sm"
            icon={<Plus size={14} color={colors.background} />}
            onPress={() => setModalVisible(true)}
          />
        </View>

        {/* Posts */}
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            comments={commentsMap[post.id] || []}
            onLike={() => toggleLike(post.id)}
            onCommentSubmit={(text) => addComment(post.id, text)}
          />
        ))}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Create Post Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREATE COMMUNITY POST</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>CAPTION & HASHTAGS</Text>
            <TextInput
              style={[styles.input, { height: 90 }]}
              value={caption}
              onChangeText={setCaption}
              multiline
              placeholder="Share your dyno results, build updates, or race recaps..."
              placeholderTextColor={colors.textMuted}
            />

            <Text style={styles.label}>MEDIA PHOTO/VIDEO URL</Text>
            <TextInput
              style={styles.input}
              value={mediaUrl}
              onChangeText={setMediaUrl}
              placeholder="https://..."
              placeholderTextColor={colors.textMuted}
            />

            <ApexButton title="PUBLISH POST" onPress={handleCreatePost} style={{ marginTop: 16 }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginTop: 10, marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 14, borderWidth: 1, borderColor: colors.cardBorder },
});
