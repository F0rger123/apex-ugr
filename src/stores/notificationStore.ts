import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'challenge' | 'race_result' | 'message' | 'comment' | 'follower' | 'meet' | 'order';
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notif: Omit<AppNotification, 'id' | 'read' | 'created_at'>) => void;
}

const INITIAL_NOTIFS: AppNotification[] = [
  {
    id: 'n-1',
    type: 'challenge',
    title: 'NEW RACE CHALLENGE STAGED!',
    body: 'Kenji Sato (Supra 2JZ) challenged you to a $500 Credit 1/4 Mile Drag Race.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'n-2',
    type: 'race_result',
    title: 'WAGER VICTORY VERIFIED (+500 CR)',
    body: 'Referee community verified your 8.85s drag win against Elena Rostova.',
    read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
  {
    id: 'n-3',
    type: 'order',
    title: 'ORDER SHIPPED: SUMMIT RACING',
    body: 'Tracking # APX-982341902-US has been picked up by FedEx.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 600).toISOString(),
  },
  {
    id: 'n-4',
    type: 'meet',
    title: 'CAR MEET REMINDER',
    body: 'LA Underground Midnight Highway Roll starts in 2 hours.',
    read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 1200).toISOString(),
  },
];

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: INITIAL_NOTIFS,
  unreadCount: INITIAL_NOTIFS.filter((n) => !n.read).length,

  markAsRead: (id) => {
    set((state) => {
      const updated = state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      };
    });
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  addNotification: (notif) => {
    const newNotif: AppNotification = {
      ...notif,
      id: `n-${Date.now()}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    set((state) => ({
      notifications: [newNotif, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
