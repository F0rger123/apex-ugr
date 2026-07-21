import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { MarketplaceProduct } from '../../types/database.types';
import { GlassCard } from '../common/GlassCard';
import { MatrixBadge } from '../common/MatrixBadge';
import { ApexButton } from '../common/ApexButton';
import { colors } from '../../config/colors';
import { Star, ShoppingCart } from 'lucide-react-native';

interface ProductCardProps {
  product: MarketplaceProduct;
  onPress: () => void;
  onAddToCart: () => void;
  isWishlisted?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  onAddToCart,
}) => {
  return (
    <GlassCard onPress={onPress} style={styles.card}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: product.image_url }} style={styles.image} resizeMode="cover" />
        <MatrixBadge label={product.vendor_name} variant="silver" style={styles.vendorBadge} size="sm" />
      </View>

      <View style={styles.content}>
        <Text style={styles.brand}>{product.brand}</Text>
        <Text style={styles.title} numberOfLines={2}>{product.title}</Text>

        <View style={styles.ratingRow}>
          <Star size={12} color={colors.warning} fill={colors.warning} />
          <Text style={styles.ratingText}>{product.rating} ({product.reviews_count})</Text>
          <Text style={styles.categoryText}>• {product.category}</Text>
        </View>

        <View style={styles.priceRow}>
          <Text style={styles.price}>${product.price.toLocaleString()}</Text>
          <TouchableOpacity style={styles.cartBtn} onPress={onAddToCart}>
            <ShoppingCart size={14} color={colors.background} />
            <Text style={styles.cartBtnText}>ADD</Text>
          </TouchableOpacity>
        </View>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 0,
    marginBottom: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  imageContainer: {
    height: 120,
    width: '100%',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  vendorBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
  },
  content: {
    padding: 10,
  },
  brand: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
    height: 34,
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
  cartBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
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
