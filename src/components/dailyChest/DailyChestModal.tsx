import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, ActivityIndicator, Alert } from 'react-native';
import { useDailyChestStore, DailyChestClaimResult } from '../../stores/dailyChestStore';
import { GlassCard } from '../common/GlassCard';
import { colors } from '../../config/colors';
import { Sparkles, Gift, Lock, ShieldCheck, CheckCircle2, Zap, X } from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const DailyChestModal: React.FC<Props> = ({ visible, onClose }) => {
  const { available, streakCount, claimChest, isLoading } = useDailyChestStore();
  const [tapStage, setTapStage] = useState<number>(0); // 0: initial, 1: shake, 2: cracking, 3: glowing energy, 4: opened
  const [claimResult, setClaimResult] = useState<DailyChestClaimResult | null>(null);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleTap = async () => {
    if (tapStage === 0) {
      setTapStage(1);
      triggerShake();
    } else if (tapStage === 1) {
      setTapStage(2);
      triggerShake();
    } else if (tapStage === 2) {
      setTapStage(3);
      Animated.timing(glowAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else if (tapStage === 3) {
      const res = await claimChest();
      if (res) {
        setClaimResult(res);
        setTapStage(4);
      } else {
        Alert.alert('Chest Claim', 'Chest claim failed or already claimed today.');
      }
    }
  };

  const resetModal = () => {
    setTapStage(0);
    setClaimResult(null);
    onClose();
  };

  const rarityColor = {
    COMMON: '#AAAAAA',
    RARE: '#00CCFF',
    EPIC: '#CC00FF',
    LEGENDARY: '#FFCC00',
    CLASSIFIED: colors.primary,
  }[claimResult?.rarity || 'COMMON'];

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={resetModal}>
      <View style={styles.overlay}>
        <GlassCard style={styles.modalCard}>
          <TouchableOpacity onPress={resetModal} style={styles.closeBtn}>
            <X size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>DAILY GHOST DROP</Text>
          <Text style={styles.streakSub}>DAY {streakCount + 1} STREAK · FORGIVING PROTECTION ACTIVE</Text>

          <View style={styles.chestArea}>
            <Animated.View
              style={[
                styles.chestContainer,
                { transform: [{ translateX: shakeAnim }] },
                tapStage >= 3 && { borderColor: colors.primary, shadowColor: colors.primary, shadowRadius: 20 },
              ]}
            >
              <TouchableOpacity activeOpacity={0.8} onPress={handleTap} disabled={tapStage === 4 || isLoading} style={styles.chestTouch}>
                {tapStage === 4 && claimResult ? (
                  <View style={{ alignItems: 'center' }}>
                    <Sparkles size={48} color={rarityColor} />
                    <Text style={[styles.rarityTag, { color: rarityColor }]}>{claimResult.rarity}</Text>
                    <Text style={styles.rewardText}>+{claimResult.gcReward} GHOST CREDITS</Text>
                    <Text style={styles.xpText}>+{claimResult.xpReward} SEASON XP</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Gift size={54} color={tapStage >= 3 ? colors.primary : colors.textMuted} />
                    <Text style={styles.stagePrompt}>
                      {tapStage === 0 && 'TAP TO UNLOCK DROP'}
                      {tapStage === 1 && 'TAP AGAIN — BREAK LOCK'}
                      {tapStage === 2 && 'TAP — RELEASE GHOST ENERGY'}
                      {tapStage === 3 && (isLoading ? 'OPENING...' : 'FINAL TAP TO OPEN')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {tapStage === 4 ? (
            <TouchableOpacity style={styles.claimDoneBtn} onPress={resetModal}>
              <Text style={styles.claimDoneText}>COLLECT REWARDS</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hintText}>Claims are server-authoritative and prevent double collection.</Text>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { width: '100%', maxWidth: 360, padding: 20, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 12, right: 12 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '900', letterSpacing: 1.5, marginTop: 8 },
  streakSub: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  chestArea: { marginVertical: 24, alignItems: 'center' },
  chestContainer: { width: 220, height: 180, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  chestTouch: { flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center', padding: 12 },
  stagePrompt: { color: colors.textSecondary, fontSize: 11, fontWeight: '800', marginTop: 12, textAlign: 'center', letterSpacing: 0.5 },
  rarityTag: { fontSize: 14, fontWeight: '900', marginTop: 8, letterSpacing: 1 },
  rewardText: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 4 },
  xpText: { color: colors.textMuted, fontSize: 12, fontWeight: '800', marginTop: 2 },
  claimDoneBtn: { backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 8, marginTop: 12 },
  claimDoneText: { color: '#000', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  hintText: { color: colors.textMuted, fontSize: 9, textAlign: 'center', marginTop: 8 },
});
