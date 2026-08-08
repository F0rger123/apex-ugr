import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { MarketplaceProduct } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { colors } from '../../config/colors';
import { Star, ShoppingCart, ExternalLink, ShieldCheck, Heart } from 'lucide-react-native';
import { openVendorUrl } from '../../utils/vendorLinks';

interface ProductCardProps {
  product: MarketplaceProduct;
  onPress: () => void;
  onAddToCart: () => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  activeVehicleName?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
  isWishlisted = false,
  onToggleWishlist,
  activeVehicleName,
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const handleOpenExternalLink = async () => {
    try {
      if (!(await openVendorUrl(product))) {
        Alert.alert('Vendor link unavailable', 'This vendor link could not be opened on your device.');
      }
    } catch {
      Alert.alert('Vendor link unavailable', 'Please try again in a moment.');
    }
  };

  return (
    <GlassCard style={styles.card}>
      <View style={styles.imageContainer}>
        {imageFailed ? (
          <Image source={{ uri: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=85' }} style={styles.image} resizeMode="cover" />
        ) : (
          <Image source={{ uri: product.image_url }} onError={() => setImageFailed(true)} style={styles.image} resizeMode="cover" />
        )}
        <View style={styles.badgeTopRow}>
          <MatrixBadge label={product.vendor_name} variant="silver" size="sm" />
          {onToggleWishlist && (
            <TouchableOpacity style={styles.heartBtn} onPress={onToggleWishlist}>
              <Heart
                size={14}
                color={isWishlisted ? colors.danger : colors.textSecondary}
                fill={isWishlisted ? colors.danger : 'none'}
              />
            </TouchableOpacity>
          )}
        </View>
        {product.hp_gain && product.hp_gain > 0 ? (
          <MatrixBadge label={`+${product.hp_gain} WHP`} variant="green" size="sm" style={styles.hpBadge} />
        ) : null}
      </View>

      <View style={styles.content}>
        <Text style={styles.brand}>{product.brand}</Text>
        <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.title} numberOfLines={2}>{product.title}</Text>
        </TouchableOpacity>

        {/* Compatibility Match Tag */}
        {activeVehicleName && (
          <View style={styles.compatPill}>
            <ShieldCheck size={10} color={colors.primary} />
            <Text style={styles.compatText} numberOfLines={1}>FITS {activeVehicleName.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.ratingRow}>
          <Star size={12} color={colors.warning} fill={colors.warning} />
          <Text style={styles.ratingText}>{product.rating} ({product.reviews_count})</Text>
          <Text style={styles.categoryText}>• {product.category}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.price.toLocaleString()}</Text>

          <View style={styles.actionGroup}>
            <TouchableOpacity style={styles.linkBtn} onPress={handleOpenExternalLink}>
              <ExternalLink size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cartBtn} onPress={onAddToCart}>
              <ShoppingCart size={13} color="#000000" />
              <Text style={styles.cartBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity style={styles.detailsBtn} onPress={onPress} activeOpacity={0.8}>
          <Text style={styles.detailsBtnText}>VIEW PART DETAILS</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: 12,
    width: '100%',
  },
  imageContainer: {
    height: 140,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceContainerHigh },
  imageFallbackText: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  badgeTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heartBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 6,
    borderRadius: 12,
  },
  hpBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  content: {
    padding: 12,
  },
  brand: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  compatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  compatText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '800',
    marginLeft: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 4,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 11,
    marginLeft: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  price: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900',
  },
  detailsBtn: { borderTopWidth: 1, borderTopColor: colors.cardBorder, marginTop: 10, paddingTop: 10 },
  detailsBtnText: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  actionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkBtn: {
    backgroundColor: colors.surface,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cartBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartBtnText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
});
