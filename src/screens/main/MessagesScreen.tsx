import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { Send, ArrowLeft, Image as ImageIcon, Mic } from 'lucide-react-native';

export const MessagesScreen = ({ navigation }: any) => {
  const { conversations, messagesMap, activeConversationId, setActiveConversation, sendMessage } = useMessageStore();
  const { user } = useAuthStore();

  const [inputContent, setInputContent] = useState('');

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = activeConversationId ? messagesMap[activeConversationId] || [] : [];

  const handleSend = () => {
    if (!inputContent.trim() || !activeConversationId) return;
    sendMessage(activeConversationId, inputContent);
    setInputContent('');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      {activeConversationId && activeConv ? (
        /* Chat Room View */
        <View style={{ flex: 1 }}>
          <View style={styles.roomHeader}>
            <TouchableOpacity onPress={() => setActiveConversation(null)}>
              <ArrowLeft size={18} color={colors.primary} />
            </TouchableOpacity>
            <Image
              source={{ uri: activeConv.other_profile?.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop' }}
              style={styles.roomAvatar}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.roomTitle}>{activeConv.other_profile?.display_name || 'Racer'}</Text>
              <Text style={styles.roomSub}>@{activeConv.other_profile?.username} • ONLINE</Text>
            </View>
          </View>

          <ScrollView style={styles.messagesList} contentContainerStyle={{ paddingVertical: 12 }}>
            {activeMessages.map((m) => {
              const isMe = m.sender_id === user?.id;
              return (
                <View key={m.id} style={[styles.msgBubble, isMe ? styles.msgMe : styles.msgOther]}>
                  <Text style={[styles.msgText, isMe && { color: colors.background }]}>{m.content}</Text>
                </View>
              );
            })}
          </ScrollView>

          {/* Chat Input Bar */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput}
              placeholder="Type message or wager detail..."
              placeholderTextColor={colors.textMuted}
              value={inputContent}
              onChangeText={setInputContent}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={16} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Conversations List */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <SectionHeader title="DIRECT & GROUP CHATS" />
          {conversations.map((c) => (
            <GlassCard key={c.id} onPress={() => setActiveConversation(c.id)}>
              <View style={styles.convRow}>
                <Image
                  source={{ uri: c.other_profile?.avatar_url || 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop' }}
                  style={styles.avatar}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.convName}>{c.other_profile?.display_name}</Text>
                  <Text style={styles.convLastMsg} numberOfLines={1}>{c.last_message}</Text>
                </View>
                <MatrixBadge label="ACTIVE" variant="green" size="sm" />
              </View>
            </GlassCard>
          ))}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },

  roomHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  roomAvatar: { width: 34, height: 34, borderRadius: 17, marginLeft: 10, borderWidth: 1, borderColor: colors.primary },
  roomTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  roomSub: { color: colors.primary, fontSize: 9, fontWeight: '800' },

  messagesList: { flex: 1, paddingHorizontal: 16 },
  msgBubble: { maxWidth: '75%', padding: 10, borderRadius: 12, marginVertical: 4 },
  msgMe: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  msgOther: { alignSelf: 'flex-start', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  msgText: { color: colors.text, fontSize: 13, fontWeight: '600' },

  chatInputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, padding: 10, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  chatInput: { flex: 1, backgroundColor: colors.background, borderRadius: 8, color: colors.text, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  sendBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 8, marginLeft: 8 },

  convRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.primary },
  convName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  convLastMsg: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
});
