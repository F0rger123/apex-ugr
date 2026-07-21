import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { Send, Image as ImageIcon, Mic, CheckCheck, Users, Search, Volume2 } from 'lucide-react-native';

export const MessagesScreen = ({ navigation }: any) => {
  const { conversations, activeConversationId, messagesMap, setActiveConversation, sendMessage, fetchConversations, fetchMessages, subscribeToConversation, unsubscribeFromConversation, isLoading } = useMessageStore();
  const { user } = useAuthStore();

  const [inputContent, setInputContent] = useState('');
  const scrollRef = useRef<any>(null);
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const activeMessages = messagesMap[activeConversation?.id || ''] || [];

  useEffect(() => {
    if (user) {
      fetchConversations(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    if (activeConversation?.id) {
      fetchMessages(activeConversation.id);
      subscribeToConversation(activeConversation.id);
    }
    return () => {
      if (activeConversation?.id) {
        unsubscribeFromConversation(activeConversation.id);
      }
    };
  }, [activeConversation?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current && activeMessages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [activeMessages.length]);

  const handleSend = async () => {
    if (!inputContent.trim() || !activeConversation || !user) return;
    const text = inputContent.trim();
    setInputContent('');
    await sendMessage(activeConversation.id, user.id, text);
  };


  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="DIRECT MESSAGES"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <View style={styles.layoutRow}>
        {/* Conversations List Sidebar */}
        <View style={styles.convoSidebar}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {conversations.map((c) => {
              const isActive = c.id === activeConversation?.id;
              const title = c.is_group ? c.group_name : c.other_profile?.display_name;
              const avatar = c.is_group ? 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?q=80&w=400&auto=format&fit=crop' : c.other_profile?.avatar_url;

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.convoItem, isActive && styles.convoItemActive]}
                  onPress={() => setActiveConversation(c.id)}
                >
                  <Image source={{ uri: avatar || '' }} style={styles.convoAvatar} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.convoTitle} numberOfLines={1}>{title}</Text>
                    <Text style={styles.convoLast} numberOfLines={1}>{c.last_message}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Active Chat Thread */}
        <View style={styles.chatArea}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <Text style={styles.chatHeaderTitle}>
              {activeConversation?.is_group ? activeConversation.group_name : activeConversation?.other_profile?.display_name}
            </Text>
            {activeConversation?.is_group && (
              <MatrixBadge label="GROUP CHAT" variant="green" size="sm" />
            )}
          </View>

          {/* Messages Feed */}
          <ScrollView ref={scrollRef} style={styles.messagesScroll} showsVerticalScrollIndicator={false}>
            {activeMessages.length === 0 && (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>No messages yet. Say hello!</Text>
              </View>
            )}
            {activeMessages.map((m) => {
              const isMe = m.sender_id === user?.id;

              return (
                <View key={m.id} style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
                  <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                    {m.media_type === 'audio' ? (
                      <View style={styles.audioRow}>
                        <Volume2 size={16} color={colors.primary} />
                        <Text style={styles.audioBubbleText}>{m.content}</Text>
                      </View>
                    ) : (
                      <Text style={[styles.msgText, isMe && { color: colors.background }]}>{m.content}</Text>
                    )}
                    <Text style={[styles.timeText, isMe && { color: 'rgba(0,0,0,0.5)' }]}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Message Input Box */}
          <View style={styles.inputBoxRow}>
            <TextInput
              style={styles.textInput}
              placeholder="Type message..."
              placeholderTextColor={colors.textMuted}
              value={inputContent}
              onChangeText={setInputContent}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />

            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Send size={16} color={colors.background} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  layoutRow: { flex: 1, flexDirection: 'row' },
  convoSidebar: { width: 110, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.cardBorder, paddingVertical: 8 },
  convoItem: { padding: 8, alignItems: 'center', marginVertical: 4, borderRadius: 8 },
  convoItemActive: { backgroundColor: 'rgba(0, 255, 102, 0.12)', borderWidth: 1, borderColor: colors.primary },
  convoAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder },
  convoTitle: { color: colors.text, fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
  convoLast: { color: colors.textMuted, fontSize: 8, textAlign: 'center' },
  chatArea: { flex: 1, flexDirection: 'column' },
  chatHeader: { height: 44, backgroundColor: colors.glassHeader, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  chatHeaderTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  messagesScroll: { flex: 1, padding: 12 },
  emptyChat: { alignItems: 'center', paddingTop: 40 },
  emptyChatText: { color: colors.textMuted, fontSize: 12 },
  bubbleWrapper: { marginVertical: 4, flexDirection: 'row' },
  bubbleLeft: { justifyContent: 'flex-start' },
  bubbleRight: { justifyContent: 'flex-end' },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, maxWidth: '80%' },
  bubbleOther: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder },
  bubbleMe: { backgroundColor: colors.primary },
  msgText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  timeText: { color: colors.textMuted, fontSize: 8, marginTop: 2, textAlign: 'right' },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioBubbleText: { color: colors.primary, fontSize: 12, fontWeight: '800', marginLeft: 6 },
  inputBoxRow: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  mediaBtn: { padding: 8 },
  textInput: { flex: 1, backgroundColor: colors.card, borderRadius: 8, color: colors.text, paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, borderWidth: 1, borderColor: colors.cardBorder },
  sendBtn: { backgroundColor: colors.primary, padding: 8, borderRadius: 8, marginLeft: 8 },
});
