import { create } from 'zustand';
import { Conversation, Message } from '../types/database.types';

interface MessageState {
  conversations: Conversation[];
  messagesMap: Record<string, Message[]>;
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;
  sendMessage: (conversationId: string, content: string, mediaUrl?: string, mediaType?: string) => void;
}

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv-1',
    participants: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002'],
    is_group: false,
    last_message: 'Let’s confirm the roll race distance on Sector 7.',
    updated_at: new Date(Date.now() - 1200000).toISOString(),
    other_profile: {
      id: '00000000-0000-0000-0000-000000000002',
      username: 'apex_gt3',
      display_name: 'Elena Rostova',
      avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Street Specialist',
      bio: null, home_city: 'Miami, FL', reputation_points: 3920, credits_balance: 14200, favorite_car_type: 'Euro', racing_specialties: [], stats: { races_entered: 10, races_won: 8, top_speed_recorded: 184, meets_hosted: 2 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
    }
  },
  {
    id: 'conv-2',
    participants: ['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003'],
    is_group: false,
    last_message: 'Are you bringing the 2JZ to the LA port meet on Friday?',
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    other_profile: {
      id: '00000000-0000-0000-0000-000000000003',
      username: 'boosted_2jz',
      display_name: 'Kenji Sato',
      avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop',
      reputation_level: 'Veteran',
      bio: null, home_city: 'Tokyo', reputation_points: 2800, credits_balance: 9500, favorite_car_type: 'JDM', racing_specialties: [], stats: { races_entered: 8, races_won: 5, top_speed_recorded: 210, meets_hosted: 1 }, achievements: [], is_verified: true, privacy_mode: 'all', visibility_radius_km: 50, created_at: new Date().toISOString()
    }
  }
];

const INITIAL_MESSAGES: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: '00000000-0000-0000-0000-000000000002',
      content: 'Hey Ryder, saw your 1,150 WHP dyno post! Incredible build.',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'msg-2',
      conversation_id: 'conv-1',
      sender_id: '00000000-0000-0000-0000-000000000001',
      content: 'Appreciate it Elena! Your GT3 RS corner speeds are absurd.',
      created_at: new Date(Date.now() - 2400000).toISOString()
    },
    {
      id: 'msg-3',
      conversation_id: 'conv-1',
      sender_id: '00000000-0000-0000-0000-000000000002',
      content: 'Let’s confirm the roll race distance on Sector 7.',
      created_at: new Date(Date.now() - 1200000).toISOString()
    }
  ]
};

export const useMessageStore = create<MessageState>((set) => ({
  conversations: INITIAL_CONVERSATIONS,
  messagesMap: INITIAL_MESSAGES,
  activeConversationId: null,

  setActiveConversation: (id) => set({ activeConversationId: id }),

  sendMessage: (conversationId, content, mediaUrl, mediaType) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: '00000000-0000-0000-0000-000000000001',
      content,
      media_url: mediaUrl,
      media_type: mediaType,
      created_at: new Date().toISOString()
    };

    set((state) => {
      const existing = state.messagesMap[conversationId] || [];
      return {
        messagesMap: {
          ...state.messagesMap,
          [conversationId]: [...existing, newMessage]
        },
        conversations: state.conversations.map((c) =>
          c.id === conversationId
            ? { ...c, last_message: content, updated_at: new Date().toISOString() }
            : c
        )
      };
    });
  }
}));
