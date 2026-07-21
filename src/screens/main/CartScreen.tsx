import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, ShieldCheck } from 'lucide-react-native';

export const CartScreen = ({ navigation }: any) => {
  const { cart, removeFromCart, updateCartQuantity, checkoutCart } = useMarketplaceStore();
  const [shippingAddress, setShippingAddress] = useState('1042 Apex Speedway Blvd, Los Angeles, CA 90015');

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const shipping = subtotal > 0 ? 45.00 : 0;
  const grandTotal = subtotal + shipping;

  const handleCheckout = () => {
    if (cart.length === 0) return;
    checkoutCart(shippingAddress);
    navigation.navigate('Marketplace');
  };

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.primary} />
          <Text style={styles.backText}>BACK TO MARKETPLACE</Text>
        </TouchableOpacity>

        <Text style={styles.pageTitle}>CHECKOUT CART ({cart.length})</Text>

        {cart.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 30 }}>
            <ShoppingBag size={40} color={colors.textMuted} />
            <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '800', marginTop: 12 }}>
              YOUR CART IS CURRENTLY EMPTY
            </Text>
          </GlassCard>
        ) : (
          <>
            {/* Cart Items List */}
            {cart.map((item) => (
              <GlassCard key={item.product.id} style={styles.cartItemCard}>
                <Image source={{ uri: item.product.image_url }} style={styles.itemImage} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.itemBrand}>{item.product.brand}</Text>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.product.title}</Text>
                  <Text style={styles.itemPrice}>${item.product.price.toLocaleString()}</Text>
                </View>

                {/* Quantity & Delete */}
                <View style={styles.quantityControls}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                  >
                    <Minus size={12} color={colors.text} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                  >
                    <Plus size={12} color={colors.text} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}

            {/* Shipping Address */}
            <SectionHeader title="SHIPPING DESTINATION" />
            <GlassCard>
              <Text style={styles.label}>STREET ADDRESS & CITY</Text>
              <TextInput
                style={styles.input}
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholder="Enter shipping address..."
                placeholderTextColor={colors.textMuted}
              />
            </GlassCard>

            {/* Order Summary Box */}
            <SectionHeader title="PAYMENT SUMMARY" />
            <GlassCard>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Subtotal</Text>
                <Text style={styles.summaryVal}>${subtotal.toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryKey}>Freight Shipping & Insured Delivery</Text>
                <Text style={styles.summaryVal}>${shipping.toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingTop: 8, marginTop: 8 }]}>
                <Text style={styles.totalKey}>TOTAL</Text>
                <Text style={styles.totalVal}>${grandTotal.toLocaleString()}</Text>
              </View>

              <ApexButton
                title="PLACE ORDER & START TRACKING"
                variant="primary"
                size="lg"
                style={{ marginTop: 16 }}
                onPress={handleCheckout}
              />
            </GlassCard>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  backText: { color: colors.primary, fontSize: 11, fontWeight: '900', marginLeft: 6, letterSpacing: 1 },
  pageTitle: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },

  cartItemCard: { flexDirection: 'row', alignItems: 'center', padding: 10, marginBottom: 8 },
  itemImage: { width: 60, height: 60, borderRadius: 8, backgroundColor: colors.surface },
  itemBrand: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  itemTitle: { color: colors.text, fontSize: 12, fontWeight: '800', marginTop: 2 },
  itemPrice: { color: colors.primary, fontSize: 14, fontWeight: '900', marginTop: 4 },

  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 4, borderWidth: 1, borderColor: colors.cardBorder },
  qtyBtn: { padding: 6 },
  qtyText: { color: colors.text, fontSize: 12, fontWeight: '900', paddingHorizontal: 8 },

  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 13, borderWidth: 1, borderColor: colors.cardBorder },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  summaryKey: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  summaryVal: { color: colors.text, fontSize: 12, fontWeight: '800' },
  totalKey: { color: colors.text, fontSize: 14, fontWeight: '900' },
  totalVal: { color: colors.primary, fontSize: 18, fontWeight: '900' },
});
