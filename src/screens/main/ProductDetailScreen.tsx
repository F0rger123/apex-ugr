import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { PriceComparisonModal } from '../../components/marketplace/PriceComparisonModal';
import { colors } from '../../config/colors';
import {
  ShoppingCart,
  Star,
  CheckCircle,
  AlertTriangle,
  Zap,
  Tag,
  ShieldCheck,
  Truck,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  Wrench,
} from 'lucide-react-native';

export const ProductDetailScreen = ({ route, navigation }: any) => {
  const { productId } = route.params || {};
  const { products, addToCart, cart } = useMarketplaceStore();
  const { getActiveVehicle, addModification } = useGarageStore();

  const activeVehicle = getActiveVehicle();
  const product = products.find((p) => p.id === productId) || products[0];

  const [quantity, setQuantity] = useState(1);
  const [showPriceCompare, setShowPriceCompare] = useState(false);

  if (!product) {
    return (
      <View style={styles.container}>
        <ApexHeader showBack onBackPress={() => navigation.goBack()} />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>PRODUCT NOT FOUND</Text>
        </View>
      </View>
    );
  }

  // Check vehicle compatibility
  const isCompatible = activeVehicle
    ? product.compatible_makes.includes('All') ||
      product.compatible_makes.includes(activeVehicle.make)
    : false;

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
      addToCart(product);
    }
    Alert.alert(
      'Added to Cart',
      `${quantity}x ${product.title} added to your cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => navigation.navigate('Cart') },
      ]
    );
  };

  const handleOpenVendorUrl = () => {
    const url = (product as any).purchase_url || (product as any).vendor_url || 'https://www.americanmuscle.com';
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url);
    }
  };

  const handleInstallOnVehicle = async () => {
    if (!activeVehicle) {
      Alert.alert('No Ride Found', 'Please register a vehicle in your Garage first.');
      return;
    }

    await addModification({
      vehicle_id: activeVehicle.id,
      category: product.category,
      brand: product.brand,
      part_name: product.title,
      price: product.price,
      installation_date: new Date().toISOString().split('T')[0],
      notes: `Installed via Apex Marketplace. Expected HP Gain: +${product.hp_gain || 0} WHP`,
      hp_gain: product.hp_gain || 0,
      torque_gain: Math.round((product.hp_gain || 0) * 0.85),
      purchase_source: product.vendor_name || 'Apex Vendor',
    });

    Alert.alert(
      'Installed on Vehicle!',
      `${product.title} has been added to your ${activeVehicle.make} ${activeVehicle.model}. Performance gains applied!`,
      [{ text: 'View Garage', onPress: () => navigation.navigate('Garage') }]
    );
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="PRODUCT DETAILS"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Main Product Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image_url }} style={styles.productImage} resizeMode="cover" />
          <View style={styles.categoryBadge}>
            <MatrixBadge label={product.category.toUpperCase()} variant="green" />
          </View>
          {product.hp_gain > 0 && (
            <View style={styles.hpGainBadge}>
              <Zap size={14} color={colors.background} />
              <Text style={styles.hpGainText}>+{product.hp_gain} HP</Text>
            </View>
          )}
        </View>

        {/* Title & Brand Header */}
        <GlassCard style={styles.infoCard}>
          <Text style={styles.brandText}>{product.brand.toUpperCase()}</Text>
          <Text style={styles.titleText}>{product.title}</Text>

          {/* Rating & Seller Row */}
          <View style={styles.ratingRow}>
            <View style={styles.starsBox}>
              <Star size={14} color="#FFD700" fill="#FFD700" />
              <Text style={styles.ratingScore}>{product.rating}</Text>
              <Text style={styles.reviewsCount}>({product.reviews_count} reviews)</Text>
            </View>
            <View style={styles.vendorPill}>
              <Text style={styles.vendorText}>SOLD BY {product.vendor_name.toUpperCase()}</Text>
            </View>
          </View>

          {/* Price Header */}
          <View style={styles.priceRow}>
            <Text style={styles.priceVal}>${product.price.toLocaleString()}</Text>
            <TouchableOpacity style={styles.compareBtn} onPress={() => setShowPriceCompare(true)}>
              <Text style={styles.compareBtnText}>COMPARE PRICES</Text>
              <ExternalLink size={12} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Garage Compatibility Matching Banner */}
        {activeVehicle && (
          <GlassCard
            style={{
              ...styles.fitmentCard,
              ...(isCompatible ? styles.fitmentCardValid : styles.fitmentCardInvalid),
            }}
          >
            <View style={styles.fitmentHeader}>
              {isCompatible ? (
                <CheckCircle size={20} color={colors.primary} />
              ) : (
                <AlertTriangle size={20} color={colors.warning} />
              )}
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.fitmentTitle}>
                  {isCompatible
                    ? `GUARANTEED FITMENT MATCH`
                    : `FITMENT WARNING`}
                </Text>
                <Text style={styles.fitmentSub}>
                  {isCompatible
                    ? `Fits your ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}`
                    : `May require custom fabrication for your ${activeVehicle.make} ${activeVehicle.model}`}
                </Text>
              </View>
            </View>
          </GlassCard>
        )}

        {/* Description Section */}
        <GlassCard style={styles.descCard}>
          <Text style={styles.sectionTitle}>PART SPECIFICATIONS & OVERVIEW</Text>
          <Text style={styles.descText}>{product.description}</Text>

          {/* Performance Specs Grid */}
          <View style={styles.specGrid}>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>EST. HP GAIN</Text>
              <Text style={styles.specVal}>+{product.hp_gain || 25} HP</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>WARRANTY</Text>
              <Text style={styles.specVal}>2 YEAR</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>SHIPPING</Text>
              <Text style={styles.specVal}>EXPRESS 2-DAY</Text>
            </View>
            <View style={styles.specItem}>
              <Text style={styles.specLabel}>STOCK STATUS</Text>
              <Text style={[styles.specVal, { color: product.in_stock ? colors.primary : colors.danger }]}>
                {product.in_stock ? 'IN STOCK' : 'BACKORDER'}
              </Text>
            </View>
          </View>
        </GlassCard>

        {/* Compatible Vehicles Chip List */}
        <GlassCard style={styles.compatCard}>
          <Text style={styles.sectionTitle}>COMPATIBLE VEHICLE MAKES</Text>
          <View style={styles.chipRow}>
            {product.compatible_makes.map((make) => (
              <View key={make} style={styles.makeChip}>
                <Text style={styles.makeChipText}>{make}</Text>
              </View>
            ))}
          </View>
        </GlassCard>

        {/* Customer Reviews Spotlight */}
        <GlassCard style={styles.reviewCard}>
          <Text style={styles.sectionTitle}>VERIFIED RACER REVIEWS</Text>
          <View style={styles.singleReview}>
            <View style={styles.reviewerHeader}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop' }}
                style={styles.reviewerAvatar}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.reviewerName}>@phantom_gtr</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <Star size={10} color="#FFD700" fill="#FFD700" />
                  <Text style={styles.reviewDate}> • Verified Purchaser</Text>
                </View>
              </View>
            </View>
            <Text style={styles.reviewBody}>
              "Gained massive throttle response and noticed immediate dyno gains. High quality construction and hardware included!"
            </Text>
          </View>
        </GlassCard>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.qtyContainer}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => setQuantity(Math.max(1, quantity - 1))}
          >
            <Minus size={14} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.qtyText}>{quantity}</Text>
          <TouchableOpacity style={styles.qtyBtn} onPress={() => setQuantity(quantity + 1)}>
            <Plus size={14} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1, flexDirection: 'row', gap: 6 }}>
          <ApexButton
            title="BUY ON VENDOR SITE"
            variant="primary"
            size="md"
            style={{ flex: 1 }}
            icon={<ExternalLink size={14} color={colors.background} />}
            onPress={handleOpenVendorUrl}
          />
          <ApexButton
            title="INSTALL ON RIDE"
            variant="secondary"
            size="md"
            style={{ flex: 1 }}
            icon={<Wrench size={14} color={colors.primary} />}
            onPress={handleInstallOnVehicle}
          />
        </View>
      </View>

      {/* Multi-Vendor Price Comparison Modal */}
      <PriceComparisonModal
        visible={showPriceCompare}
        product={product}
        onClose={() => setShowPriceCompare(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 16, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 16 },

  imageContainer: { height: 260, borderRadius: 16, overflow: 'hidden', marginVertical: 12, position: 'relative' },
  productImage: { width: '100%', height: '100%' },
  categoryBadge: { position: 'absolute', top: 12, left: 12 },
  hpGainBadge: { position: 'absolute', bottom: 12, right: 12, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 4 },
  hpGainText: { color: colors.background, fontSize: 12, fontWeight: '900' },

  infoCard: { padding: 16, marginBottom: 12 },
  brandText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  titleText: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 4, letterSpacing: -0.5 },

  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  starsBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingScore: { color: colors.text, fontSize: 13, fontWeight: '900' },
  reviewsCount: { color: colors.textMuted, fontSize: 11 },
  vendorPill: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  vendorText: { color: colors.textSecondary, fontSize: 9, fontWeight: '800' },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  priceVal: { color: colors.primary, fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  compareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,255,102,0.1)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  compareBtnText: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

  fitmentCard: { padding: 14, marginBottom: 12, borderWidth: 1 },
  fitmentCardValid: { borderColor: colors.primary, backgroundColor: 'rgba(0,255,102,0.05)' },
  fitmentCardInvalid: { borderColor: colors.warning, backgroundColor: 'rgba(255,184,0,0.05)' },
  fitmentHeader: { flexDirection: 'row', alignItems: 'center' },
  fitmentTitle: { color: colors.text, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  fitmentSub: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  descCard: { padding: 16, marginBottom: 12 },
  sectionTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  descText: { color: colors.text, fontSize: 13, lineHeight: 20 },

  specGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  specItem: { width: '47%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 8 },
  specLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  specVal: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 2 },

  compatCard: { padding: 16, marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  makeChip: { backgroundColor: colors.surface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder },
  makeChipText: { color: colors.text, fontSize: 11, fontWeight: '800' },

  reviewCard: { padding: 16, marginBottom: 12 },
  singleReview: { marginTop: 6 },
  reviewerHeader: { flexDirection: 'row', alignItems: 'center' },
  reviewerAvatar: { width: 32, height: 32, borderRadius: 16 },
  reviewerName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  reviewDate: { color: colors.textMuted, fontSize: 10 },
  reviewBody: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', marginTop: 8, lineHeight: 18 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.glassHeader, borderTopWidth: 1, borderTopColor: colors.cardBorder, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, paddingHorizontal: 6, paddingVertical: 4 },
  qtyBtn: { padding: 6 },
  qtyText: { color: colors.text, fontSize: 14, fontWeight: '900', paddingHorizontal: 8 },
});
