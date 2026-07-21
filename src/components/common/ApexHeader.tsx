import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { colors } from '../../config/colors';
import { Bell, Coins, ArrowLeft } from 'lucide-react-native';

interface ApexHeaderProps {
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
  showBack?: boolean;
  onBackPress?: () => void;
  title?: string;
}

export const ApexHeader: React.FC<ApexHeaderProps> = ({
  onNotificationPress,
  onProfilePress,
  showBack = false,
  onBackPress,
  title,
}) => {
  const { user } = useAuthStore();

  return (
    <View style={styles.headerContainer}>
      {/* Left Navigation: Back Arrow or App Brand */}
      {showBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBackPress}>
          <ArrowLeft size={20} color={colors.primary} />
          <Text style={styles.backTitle}>{title || 'BACK'}</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>APEX</Text>
          </View>
          <Text style={styles.brandTitle}>UGR</Text>
        </View>
      )}

      {/* Right Controls: Credits Balance & Avatar */}
      <View style={styles.rightControls}>
        <View style={styles.creditsPill}>
          <Coins size={14} color={colors.warning} />
          <Text style={styles.creditsText}>
            ${user?.credits_balance ? user.credits_balance.toLocaleString() : '5,000'}
          </Text>
        </View>

        {onNotificationPress && (
          <TouchableOpacity style={styles.iconBtn} onPress={onNotificationPress}>
            <Bell size={18} color={colors.text} />
            <View style={styles.notifDot} />
          </TouchableOpacity>
        )}

        {onProfilePress && (
          <TouchableOpacity style={styles.avatarBtn} onPress={onProfilePress}>
            <Image
              source={{ uri: user?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    height: 60,
    backgroundColor: colors.glassHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 8,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    backgroundColor: colors.primary,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  logoText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    marginLeft: 6,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creditsPill: {
    backgroundColor: 'rgba(255, 184, 0, 0.12)',
    borderColor: 'rgba(255, 184, 0, 0.4)',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  creditsText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '900',
    marginLeft: 4,
  },
  iconBtn: {
    padding: 6,
    marginRight: 8,
  },
  notifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  avatarBtn: {
    padding: 2,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
