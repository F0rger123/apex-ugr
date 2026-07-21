import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import { MarketplaceProduct } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { colors } from '../../config/colors';
import { Star, ShoppingCart, ExternalLink, ShieldCheck, Heart } from 'lucide-react-native';

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
  const openExternalLink = () => {
    if (product.purchase_url) {
      if (Platform.OS === 'web') {
        window.open(product.purchase_url, '_blank');
      } else {
        Linking.openURL(product.purchase_url);
      }
    }
  };

  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
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
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>

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
            <TouchableOpacity style={styles.linkBtn} onPress={openExternalLink}>
              <ExternalLink size={12} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.cartBtn} onPress={onAddToCart}>
              <ShoppingCart size={13} color={colors.background} />
              <Text style={styles.cartBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    height: 130,
    width: '100%',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
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
    left: 8,
  },
  content: {
    padding: 10,
  },
  brand: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    lineHeight: 17,
  },
  compatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 102, 0.1)',
    borderColor: 'rgba(0, 255, 102, 0.3)',
    borderWidth: 1,
    paddingVertical: 2,
    paddingHorizontal: 6,
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
    color: colors.background,
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4,
  },
});
