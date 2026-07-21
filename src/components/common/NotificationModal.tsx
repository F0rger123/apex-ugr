import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useNotificationStore } from '../../stores/notificationStore';
import { GlassCard } from './GlassCard';
import { MatrixBadge } from './MatrixBadge';
import { colors } from '../../config/colors';
import { Bell, X, Flag, ShoppingCart, Calendar, Trophy, CheckCheck } from 'lucide-react-native';

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
}

export const NotificationModal: React.FC<NotificationModalProps> = ({ visible, onClose }) => {
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Bell size={18} color={colors.primary} />
              <Text style={styles.modalTitle}>NOTIFICATION CENTER</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => markAllAsRead('demo-user-1')} style={{ marginRight: 12 }}>
                <CheckCheck size={18} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ maxHeight: 400 }}>
            {notifications.map((n) => (
              <GlassCard
                key={n.id}
                onPress={() => markAsRead(n.id)}
                style={[styles.notifCard, !n.read ? styles.unreadNotif : null] as any}
              >
                <View style={styles.notifRow}>
                  <View style={styles.iconBox}>
                    {(n.type as string) === 'challenge' && <Flag size={16} color={colors.warning} />}
                    {(n.type as string) === 'race_result' && <Trophy size={16} color={colors.primary} />}
                    {(n.type as string) === 'order' && <ShoppingCart size={16} color={colors.info} />}
                    {(n.type as string) === 'meet' && <Calendar size={16} color={colors.text} />}
                  </View>

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.notifTitle}>{n.title}</Text>
                    <Text style={styles.notifBody}>{n.body}</Text>
                  </View>
                </View>
              </GlassCard>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginLeft: 8, letterSpacing: 1 },
  notifCard: { marginBottom: 8, padding: 10 },
  unreadNotif: { borderColor: colors.primary, borderWidth: 1, backgroundColor: 'rgba(0, 255, 102, 0.08)' },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { backgroundColor: colors.surface, padding: 8, borderRadius: 8 },
  notifTitle: { color: colors.text, fontSize: 12, fontWeight: '900' },
  notifBody: { color: colors.textSecondary, fontSize: 11, marginTop: 2, lineHeight: 15 },
});
