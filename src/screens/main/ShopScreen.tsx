import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { SectionHeader } from '../../components/common/SectionHeader';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { colors } from '../../config/colors';
import { ShoppingBag, Sparkles, CheckCircle2, Shield, Lock } from 'lucide-react-native';

export const ShopScreen = ({ navigation }: any) => {
  const { user } = useAuthStore();

  const [items, setItems] = useState<any[]>([]);
  const [ownedIds, setOwnedIds] = useState<string[]>([]);
  const [equippedList, setEquippedList] = useState<any[]>([]);
  const [gcBalance, setGcBalance] = useState<number>(user?.credits_balance || 1000);
  const [isLoading, setIsLoading] = useState(false);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/ghost-shop/catalog');
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
        setOwnedIds(data.ownedItemIds || []);
        setEquippedList(data.equipped || []);
        setGcBalance(data.gcBalance ?? (user?.credits_balance || 1000));
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuy = async (itemId: string, price: number) => {
    if (gcBalance < price) {
      Alert.alert('Insufficient GC', 'You need more Ghost Credits to unlock this cosmetic.');
      return;
    }

    setPurchasingId(itemId);
    try {
      const res = await fetch('/api/ghost-shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId }),
      });
      const data = await res.json();
      if (res.ok) {
        setGcBalance(data.newGcBalance);
        setOwnedIds((prev) => [...prev, itemId]);
        Alert.alert('Unlocked!', 'Cosmetic unlocked and added to your inventory.');
      } else {
        Alert.alert('Purchase Error', data.error || 'Transaction failed.');
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to complete purchase.');
    } finally {
      setPurchasingId(null);
    }
  };

  const handleEquip = async (itemId: string, category: string) => {
    try {
      const res = await fetch('/api/ghost-shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, category }),
      });
      if (res.ok) {
        Alert.alert('Equipped!', 'Item equipped to your active Driver Profile.');
        fetchCatalog();
      }
    } catch (e) {}
  };

  const rarityColor: Record<string, string> = {
    COMMON: '#AAAAAA',
    UNCOMMON: '#00FF66',
    RARE: '#00CCFF',
    EPIC: '#CC00FF',
    LEGENDARY: '#FFCC00',
    CLASSIFIED: colors.primary,
  };

  return (
    <View style={styles.container}>
      <ApexHeader title="GHOST VAULT & SHOP" />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Balance Card */}
        <GlassCard style={styles.balanceCard}>
          <View>
            <Text style={styles.balanceLabel}>AVAILABLE GHOST CREDITS</Text>
            <Text style={styles.balanceValue}>{gcBalance.toLocaleString()} GC</Text>
          </View>
          <Sparkles size={28} color={colors.primary} />
        </GlassCard>

        <SectionHeader title="VAULT COSMETICS CATALOG" />

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <GlassCard style={{ padding: 20, alignItems: 'center' }}>
            <ShoppingBag size={32} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 8 }}>Catalog loading or offline.</Text>
          </GlassCard>
        ) : (
          items.map((item) => {
            const isOwned = ownedIds.includes(item.id);
            const isEquipped = equippedList.some((e) => e.item_id === item.id);
            const rColor = rarityColor[item.rarity?.toUpperCase()] || '#00FF66';

            return (
              <GlassCard key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemRarity, { color: rColor }]}>{item.rarity?.toUpperCase() || 'COMMON'}</Text>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc}>{item.description}</Text>
                  </View>
                  <Text style={styles.priceText}>{item.price_gc} GC</Text>
                </View>

                <View style={styles.itemFooter}>
                  {isOwned ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, isEquipped && styles.actionBtnEquipped]}
                      onPress={() => handleEquip(item.id, item.category)}
                      disabled={isEquipped}
                    >
                      <CheckCircle2 size={14} color={isEquipped ? colors.primary : '#000'} />
                      <Text style={[styles.actionBtnText, isEquipped && styles.actionBtnTextEquipped]}>
                        {isEquipped ? 'EQUIPPED' : 'EQUIP ITEM'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.buyBtn}
                      onPress={() => handleBuy(item.id, item.price_gc)}
                      disabled={purchasingId === item.id}
                    >
                      {purchasingId === item.id ? (
                        <ActivityIndicator color="#000" size="small" />
                      ) : (
                        <Text style={styles.buyBtnText}>UNLOCK FOR {item.price_gc} GC</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.deepSpace },
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, marginBottom: 16, borderColor: colors.primary },
  balanceLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  balanceValue: { color: colors.primary, fontSize: 24, fontWeight: '900', marginTop: 2 },
  itemCard: { padding: 14, marginBottom: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemRarity: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  itemName: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },
  itemDesc: { color: colors.textMuted, fontSize: 10, marginTop: 2, lineHeight: 14 },
  priceText: { color: colors.primary, fontSize: 13, fontWeight: '900', marginLeft: 8 },
  itemFooter: { marginTop: 12, alignItems: 'flex-end' },
  actionBtn: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 6 },
  actionBtnEquipped: { backgroundColor: 'rgba(0,255,102,0.1)', borderWidth: 1, borderColor: colors.primary },
  actionBtnText: { color: '#000', fontSize: 10, fontWeight: '900' },
  actionBtnTextEquipped: { color: colors.primary },
  buyBtn: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6 },
  buyBtnText: { color: '#000', fontSize: 11, fontWeight: '900' },
});
