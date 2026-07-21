import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { MarketplaceProduct } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { X, ExternalLink, Tag, ShieldCheck } from 'lucide-react-native';

interface PriceComparisonModalProps {
  visible: boolean;
  product: MarketplaceProduct | null;
  onClose: () => void;
}

export const PriceComparisonModal: React.FC<PriceComparisonModalProps> = ({
  visible,
  product,
  onClose,
}) => {
  if (!product) return null;

  const basePrice = product.price;

  const vendorOffers = [
    { vendor: 'Summit Racing', price: basePrice, inStock: true, shipping: 'FREE Next-Day', link: 'https://www.summitracing.com' },
    { vendor: 'eBay Motors', price: Math.round(basePrice * 0.94), inStock: true, shipping: '$15 Freight', link: 'https://www.ebay.com/motors' },
    { vendor: 'Amazon', price: Math.round(basePrice * 0.98), inStock: true, shipping: 'FREE Prime 2-Day', link: 'https://www.amazon.com' },
    { vendor: 'AmericanMuscle', price: Math.round(basePrice * 1.02), inStock: true, shipping: 'FREE Ground', link: 'https://www.americanmuscle.com' },
    { vendor: 'AutoZone', price: Math.round(basePrice * 1.04), inStock: true, shipping: 'Same-Day Pick Up', link: 'https://www.autozone.com' },
    { vendor: 'Tire Rack', price: Math.round(basePrice * 1.01), inStock: false, shipping: 'Backorder', link: 'https://www.tirerack.com' },
  ];

  const lowestPrice = Math.min(...vendorOffers.map((o) => o.price));

  const openLink = (url: string) => {
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>MULTI-VENDOR PRICE COMPARISON</Text>
              <Text style={styles.partTitle} numberOfLines={1}>{product.title}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }}>
            {vendorOffers.map((offer, idx) => {
              const isLowest = offer.price === lowestPrice;

              return (
                <GlassCard key={idx} activeGlow={isLowest} style={styles.offerCard}>
                  <View style={styles.offerRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.vendorName}>{offer.vendor}</Text>
                        {isLowest && (
                          <MatrixBadge label="BEST PRICE" variant="green" size="sm" style={{ marginLeft: 6 }} />
                        )}
                      </View>
                      <Text style={styles.shippingText}>Shipping: {offer.shipping}</Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.offerPrice, isLowest && { color: colors.primary }]}>
                        ${offer.price.toLocaleString()}
                      </Text>

                      <TouchableOpacity style={styles.visitBtn} onPress={() => openLink(offer.link)}>
                        <Text style={styles.visitText}>BUY ON {offer.vendor.toUpperCase()}</Text>
                        <ExternalLink size={10} color={colors.background} style={{ marginLeft: 4 }} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </GlassCard>
              );
            })}
          </ScrollView>

          <ApexButton title="CLOSE COMPARISON" variant="secondary" onPress={onClose} style={{ marginTop: 12 }} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  title: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  partTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },

  offerCard: { marginBottom: 8, padding: 10 },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vendorName: { color: colors.text, fontSize: 13, fontWeight: '900' },
  shippingText: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  offerPrice: { color: colors.text, fontSize: 16, fontWeight: '900', marginBottom: 4 },
  visitBtn: { backgroundColor: colors.primary, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, flexDirection: 'row', alignItems: 'center' },
  visitText: { color: colors.background, fontSize: 9, fontWeight: '900' },
});
