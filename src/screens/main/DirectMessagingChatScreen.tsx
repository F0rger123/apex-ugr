import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useMessageStore } from '../../stores/messageStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import {
  Send,
  Image as ImageIcon,
  Flag,
  Car,
  Paperclip,
  CheckCheck,
} from 'lucide-react-native';

export const DirectMessagingChatScreen = ({ route, navigation }: any) => {
  const { conversationId, targetUsername = 'Ryder Vance' } = route.params || {};
  const { messagesMap, fetchMessages, sendMessage } = useMessageStore();
  const { user } = useAuthStore();

  const [text, setText] = useState('');
  const activeConversationId = conversationId || 'c1';

  useEffect(() => {
    fetchMessages(activeConversationId);
  }, [activeConversationId]);

  const conversationMessages = messagesMap[activeConversationId] || [
    {
      id: 'm1',
      conversation_id: activeConversationId,
      sender_id: '00000000-0000-0000-0000-000000000001',
      content: 'Yo! Are you bringing the GT-R to Friday night roll runs?',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'm2',
      conversation_id: activeConversationId,
      sender_id: user?.id || 'user_me',
      content: 'Yeah, dyno tuned it to 1,150WHP on E85 yesterday. Ready for high-horsepower pulls.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'm3',
      conversation_id: activeConversationId,
      sender_id: '00000000-0000-0000-0000-000000000001',
      content: 'Let’s stage a $1,000 credit wager roll race at the industrial strip!',
      created_at: new Date(Date.now() - 600000).toISOString(),
    },
  ];

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    const msgText = text.trim();
    setText('');
    await sendMessage(activeConversationId, user.id, msgText);
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.sender_id === user?.id || item.sender_id === 'user_me';
    return (
      <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
          <Text style={styles.messageText}>{item.content}</Text>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>
              {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            {isMe && <CheckCheck size={12} color={colors.primary} />}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title={`@${targetUsername.toUpperCase()}`}
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      {/* Target Pilot Status Bar */}
      <View style={styles.pilotBar}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
          style={styles.pilotAvatar}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.pilotName}>Ryder Vance</Text>
          <Text style={styles.pilotSub}>1,100WHP R35 GT-R • ONLINE</Text>
        </View>
        <TouchableOpacity
          style={styles.wagerBtn}
          onPress={() => navigation.navigate('CreateChallenge')}
        >
          <Flag size={12} color={colors.background} />
          <Text style={styles.wagerBtnText}>STAGING WAGER</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <FlatList
          data={conversationMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
        />

        {/* Input Bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.attachBtn}>
            <Paperclip size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Send encrypted message to pilot..."
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
          />

          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!text.trim()}
          >
            <Send size={16} color={text.trim() ? colors.background : colors.textMuted} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pilotBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  pilotAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary },
  pilotName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  pilotSub: { color: colors.primary, fontSize: 9, fontWeight: '800', marginTop: 1 },

  wagerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  wagerBtnText: { color: colors.background, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

  messageList: { padding: 16 },
  bubbleWrapper: { marginVertical: 4, maxWidth: '80%' },
  bubbleLeft: { alignSelf: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end' },

  bubble: { padding: 12, borderRadius: 16 },
  bubbleMe: { backgroundColor: 'rgba(0, 255, 102, 0.15)', borderBottomRightRadius: 2, borderWidth: 1, borderColor: colors.primary },
  bubbleOther: { backgroundColor: colors.surface, borderBottomLeftRadius: 2, borderWidth: 1, borderColor: colors.cardBorder },

  messageText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  timeText: { color: colors.textMuted, fontSize: 9 },

  inputBar: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: colors.glassHeader, borderTopWidth: 1, borderTopColor: colors.cardBorder, gap: 10 },
  attachBtn: { padding: 6 },
  textInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: colors.text, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },
  sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.cardBorder },
});
