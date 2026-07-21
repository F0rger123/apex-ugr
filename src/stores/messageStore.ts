import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';
import { RealtimeChannel } from '@supabase/supabase-js';

type Message = Database['public']['Tables']['messages']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Conversation = Database['public']['Tables']['conversations']['Row'];

export type MessageWithSender = Message & {
  sender_profile?: Profile;
};

export type ConversationWithProfile = Conversation & {
  other_profile?: Profile;
};

interface MessageState {
  conversations: ConversationWithProfile[];
  messagesMap: Record<string, MessageWithSender[]>;
  activeConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  _channels: Record<string, RealtimeChannel>;

  fetchConversations: (userId: string) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  setActiveConversation: (id: string | null) => void;

  startConversation: (currentUserId: string, otherUserId: string) => Promise<{ conversationId: string | null; error: string | null }>;
  sendMessage: (conversationId: string, senderId: string, content: string, mediaUrl?: string, mediaType?: string) => Promise<{ error: string | null }>;

  subscribeToConversation: (conversationId: string) => void;
  unsubscribeFromConversation: (conversationId: string) => void;
}

export const useMessageStore = create<MessageState>((set, get) => ({
  conversations: [],
  messagesMap: {},
  activeConversationId: null,
  isLoading: false,
  error: null,
  _channels: {},

  // ─── Fetch conversations ──────────────────────────────────────────────────
  fetchConversations: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .contains('participants', [userId])
        .order('updated_at', { ascending: false });

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // For each conversation, fetch the other participant's profile
      const conversationsWithProfiles = await Promise.all(
        (data || []).map(async (conv) => {
          const otherUserId = conv.participants.find((p: string) => p !== userId);
          if (!otherUserId) return conv as ConversationWithProfile;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUserId)
            .single();

          return { ...conv, other_profile: profile } as ConversationWithProfile;
        })
      );

      set({ conversations: conversationsWithProfiles, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Failed to load conversations', isLoading: false });
    }
  },

  // ─── Fetch messages for a conversation ────────────────────────────────────
  fetchMessages: async (conversationId) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*, sender_profile:profiles!messages_sender_id_fkey(*)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (!error && data) {
        set((state) => ({
          messagesMap: {
            ...state.messagesMap,
            [conversationId]: data as MessageWithSender[],
          },
        }));
      }
    } catch (err) {
      console.error('[MessageStore] fetchMessages error:', err);
    }
  },

  setActiveConversation: (id) => set({ activeConversationId: id }),

  // ─── Start or get existing conversation ──────────────────────────────────
  startConversation: async (currentUserId, otherUserId) => {
    try {
      // Check if conversation already exists
      const existing = get().conversations.find(
        (c) =>
          c.participants.includes(currentUserId) &&
          c.participants.includes(otherUserId)
      );

      if (existing) return { conversationId: existing.id, error: null };

      // Create new conversation
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participants: [currentUserId, otherUserId],
          is_group: false,
        })
        .select()
        .single();

      if (error) return { conversationId: null, error: error.message };

      // Fetch other profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherUserId)
        .single();

      const newConv: ConversationWithProfile = { ...data, other_profile: profile || undefined };

      set((state) => ({
        conversations: [newConv, ...state.conversations],
      }));

      return { conversationId: data.id, error: null };
    } catch (err: any) {
      return { conversationId: null, error: err?.message || 'Failed to start conversation' };
    }
  },

  // ─── Send message ─────────────────────────────────────────────────────────
  sendMessage: async (conversationId, senderId, content, mediaUrl, mediaType) => {
    // Optimistic insert
    const tempId = `temp-${Date.now()}`;
    const tempMessage: MessageWithSender = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      messagesMap: {
        ...state.messagesMap,
        [conversationId]: [...(state.messagesMap[conversationId] || []), tempMessage],
      },
    }));

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          media_url: mediaUrl,
          media_type: mediaType || 'text',
        })
        .select('*, sender_profile:profiles!messages_sender_id_fkey(*)')
        .single();

      if (error) {
        // Remove optimistic message on failure
        set((state) => ({
          messagesMap: {
            ...state.messagesMap,
            [conversationId]: (state.messagesMap[conversationId] || []).filter(
              (m) => m.id !== tempId
            ),
          },
        }));
        return { error: error.message };
      }

      // Replace temp message with real one
      set((state) => ({
        messagesMap: {
          ...state.messagesMap,
          [conversationId]: (state.messagesMap[conversationId] || []).map((m) =>
            m.id === tempId ? (data as MessageWithSender) : m
          ),
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, last_message: content, updated_at: new Date().toISOString() }
            : c
        ),
      }));

      // Update conversation last_message in DB
      await supabase
        .from('conversations')
        .update({ last_message: content, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return { error: null };
    } catch (err: any) {
      return { error: err?.message || 'Failed to send message' };
    }
  },

  // ─── Realtime subscription per conversation ────────────────────────────────
  subscribeToConversation: (conversationId) => {
    if (get()._channels[conversationId]) return; // Already subscribed

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Only add if it's not our own message (already optimistically added)
          const existing = get().messagesMap[conversationId] || [];
          const alreadyExists = existing.some((m) => m.id === payload.new.id);
          if (alreadyExists) return;

          // Fetch with sender profile
          const { data } = await supabase
            .from('messages')
            .select('*, sender_profile:profiles!messages_sender_id_fkey(*)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            set((state) => ({
              messagesMap: {
                ...state.messagesMap,
                [conversationId]: [
                  ...(state.messagesMap[conversationId] || []),
                  data as MessageWithSender,
                ],
              },
            }));
          }
        }
      )
      .subscribe();

    set((state) => ({
      _channels: { ...state._channels, [conversationId]: channel },
    }));
  },

  unsubscribeFromConversation: (conversationId) => {
    const channel = get()._channels[conversationId];
    if (channel) {
      supabase.removeChannel(channel);
      set((state) => {
        const updated = { ...state._channels };
        delete updated[conversationId];
        return { _channels: updated };
      });
    }
  },
}));
