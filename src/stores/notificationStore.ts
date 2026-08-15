import { create } from 'zustand';
import { cloudflareApi } from '../config/cloudflareApi';

export interface Notification {
  id: string;
  user_id: string;
  type: 'race_challenge' | 'wager_won' | 'new_follower' | 'comment' | 'like' | 'meet_rsvp' | 'dispute';
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  _poll: ReturnType<typeof setInterval> | null;
  fetchNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => void;
  unsubscribeFromNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [], unreadCount: 0, isLoading: false, _poll: null,
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const data = await cloudflareApi.request<{ notifications: Notification[] }>('/api/notifications');
      set({ notifications: data.notifications, unreadCount: data.notifications.filter(item => !item.read).length });
    } catch {
      set({ notifications: [], unreadCount: 0 });
    } finally { set({ isLoading: false }); }
  },
  markAsRead: async notificationId => {
    await cloudflareApi.request(`/api/notifications/${notificationId}/read`, { method: 'POST' });
    set(state => ({ notifications: state.notifications.map(item => item.id === notificationId ? { ...item, read: true } : item), unreadCount: Math.max(0, state.unreadCount - 1) }));
  },
  markAllAsRead: async () => {
    await cloudflareApi.request('/api/notifications/read-all', { method: 'POST' });
    set(state => ({ notifications: state.notifications.map(item => ({ ...item, read: true })), unreadCount: 0 }));
  },
  subscribeToNotifications: userId => {
    if (get()._poll) clearInterval(get()._poll!);
    const poll = setInterval(() => void get().fetchNotifications(userId), 8000);
    set({ _poll: poll });
  },
  unsubscribeFromNotifications: () => {
    if (get()._poll) clearInterval(get()._poll!);
    set({ _poll: null });
  },
}));
