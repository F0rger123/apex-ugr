import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useAuthStore } from '../../stores/authStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { colors } from '../../config/colors';
import { ShoppingCart, Trash2, Plus, Minus, Tag, CreditCard, Coins, CheckCircle2, ShieldCheck, X } from 'lucide-react-native';

export const CartScreen = ({ navigation }: any) => {
  const { cart, removeFromCart, updateCartQuantity, checkoutCart } = useMarketplaceStore();
  const { user } = useAuthStore();

  const [promoCode, setPromoCode] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [shippingAddress, setShippingAddress] = useState('1042 Apex Speedway Blvd, Los Angeles, CA 90015');
  const [paymentMethod, setPaymentMethod] = useState<'credits' | 'card'>('credits');
  const [orderConfirmedOrder, setOrderConfirmedOrder] = useState<any | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const total = subtotal - discountAmount;

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'APEX2026') {
      setDiscountPercent(10);
      setPromoError('');
    } else {
      setPromoError('INVALID PROMO CODE. TRY: APEX2026');
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0 || !user) return;
    const order = checkoutCart(user.id, shippingAddress);
    setOrderConfirmedOrder(order);
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="SHOPPING CART & CHECKOUT"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title={`CART ITEMS (${cart.length})`} />

        {cart.length === 0 ? (
          <GlassCard style={{ alignItems: 'center', padding: 24, marginVertical: 12 }}>
            <ShoppingCart size={32} color={colors.textMuted} />
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 10 }}>YOUR CART IS EMPTY</Text>
            <ApexButton
              title="BROWSE MARKETPLACE"
              size="sm"
              style={{ marginTop: 12 }}
              onPress={() => navigation.navigate('Marketplace')}
            />
          </GlassCard>
        ) : (
          <>
            {/* Cart Items List */}
            {cart.map((item) => (
              <GlassCard key={item.product.id} style={styles.cartCard}>
                <View style={styles.itemRow}>
                  <Image source={{ uri: item.product.image_url }} style={styles.itemImg} />

                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.vendorText}>{item.product.vendor_name}</Text>
                    <Text style={styles.itemTitle} numberOfLines={1}>{item.product.title}</Text>
                    <Text style={styles.itemPrice}>${(item.product.price * item.quantity).toLocaleString()}</Text>

                    <View style={styles.qtyRow}>
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

                      <TouchableOpacity style={styles.trashBtn} onPress={() => removeFromCart(item.product.id)}>
                        <Trash2 size={14} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GlassCard>
            ))}

            {/* Promo Code Input */}
            <GlassCard>
              <Text style={styles.label}>PROMO CODE</Text>
              <View style={styles.promoRow}>
                <TextInput
                  style={styles.promoInput}
                  placeholder="Enter APEX2026 for 10% OFF"
                  placeholderTextColor={colors.textMuted}
                  value={promoCode}
                  onChangeText={setPromoCode}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={applyPromo}>
                  <Text style={styles.applyBtnText}>APPLY</Text>
                </TouchableOpacity>
              </View>
              {promoError ? <Text style={styles.errorText}>{promoError}</Text> : null}
              {discountPercent > 0 ? <Text style={styles.successText}>PROMO CODE APPLIED: 10% DISCOUNT</Text> : null}
            </GlassCard>

            {/* Shipping Address Form */}
            <GlassCard>
              <Text style={styles.label}>SHIPPING ADDRESS</Text>
              <TextInput
                style={styles.addressInput}
                value={shippingAddress}
                onChangeText={setShippingAddress}
                placeholder="Enter street address, city, state, zip..."
                placeholderTextColor={colors.textMuted}
              />
            </GlassCard>

            {/* Payment Method Selector */}
            <GlassCard>
              <Text style={styles.label}>PAYMENT METHOD</Text>
              <View style={styles.paymentRow}>
                <TouchableOpacity
                  style={[styles.payBtn, paymentMethod === 'credits' && styles.payBtnActive]}
                  onPress={() => setPaymentMethod('credits')}
                >
                  <Coins size={16} color={paymentMethod === 'credits' ? colors.background : colors.warning} />
                  <Text style={[styles.payText, paymentMethod === 'credits' && { color: colors.background }]}>
                    APEX CREDITS (${user?.credits_balance.toLocaleString()})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.payBtn, paymentMethod === 'card' && styles.payBtnActive]}
                  onPress={() => setPaymentMethod('card')}
                >
                  <CreditCard size={16} color={paymentMethod === 'card' ? colors.background : colors.text} />
                  <Text style={[styles.payText, paymentMethod === 'card' && { color: colors.background }]}>
                    CREDIT CARD / APPLE PAY
                  </Text>
                </TouchableOpacity>
              </View>
            </GlassCard>

            {/* Order Summary & Checkout Action */}
            <GlassCard activeGlow style={styles.summaryCard}>
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Subtotal</Text>
                <Text style={styles.sumVal}>${subtotal.toLocaleString()}</Text>
              </View>
              {discountPercent > 0 && (
                <View style={styles.sumRow}>
                  <Text style={styles.sumLabel}>Discount (10%)</Text>
                  <Text style={styles.sumValGreen}>-${discountAmount.toLocaleString()}</Text>
                </View>
              )}
              <View style={styles.sumRow}>
                <Text style={styles.sumLabel}>Shipping</Text>
                <Text style={styles.sumValGreen}>FREE EXPRESS</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalVal}>${total.toLocaleString()}</Text>
              </View>

              <ApexButton
                title="PLACE ORDER NOW"
                variant="primary"
                size="lg"
                style={{ marginTop: 12 }}
                onPress={handleCheckout}
              />
            </GlassCard>
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Order Confirmation Modal */}
      <Modal visible={!!orderConfirmedOrder} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ alignItems: 'center', paddingVertical: 12 }}>
              <CheckCircle2 size={48} color={colors.primary} />
              <Text style={styles.confirmTitle}>ORDER CONFIRMED & SHIPPED!</Text>
              <Text style={styles.confirmSub}>TRACKING #: {orderConfirmedOrder?.tracking_number}</Text>
            </View>

            <GlassCard style={{ padding: 12, marginVertical: 10 }}>
              <Text style={styles.confirmHeader}>DELIVERY SUMMARY</Text>
              <Text style={styles.confirmAddress}>📍 {orderConfirmedOrder?.shipping_address}</Text>
              <Text style={styles.confirmTotal}>Total Paid: ${orderConfirmedOrder?.total_amount.toLocaleString()}</Text>
            </GlassCard>

            <ApexButton
              title="TRACK ORDER IN MARKETPLACE"
              onPress={() => {
                setOrderConfirmedOrder(null);
                navigation.navigate('Marketplace');
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  cartCard: { marginBottom: 8, padding: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemImg: { width: 64, height: 64, borderRadius: 8, backgroundColor: colors.surface },
  vendorText: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  itemPrice: { color: colors.primary, fontSize: 14, fontWeight: '900', marginTop: 2 },

  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  qtyBtn: { backgroundColor: colors.surface, padding: 4, borderRadius: 4, borderWidth: 1, borderColor: colors.cardBorder },
  qtyText: { color: colors.text, fontSize: 12, fontWeight: '900', marginHorizontal: 8 },
  trashBtn: { marginLeft: 'auto', padding: 4 },

  label: { color: colors.textMuted, fontSize: 10, fontWeight: '800', marginBottom: 4 },
  promoRow: { flexDirection: 'row', gap: 6 },
  promoInput: { flex: 1, backgroundColor: colors.surface, borderRadius: 8, color: colors.text, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, borderWidth: 1, borderColor: colors.cardBorder },
  applyBtn: { backgroundColor: colors.primary, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  applyBtnText: { color: colors.background, fontSize: 10, fontWeight: '900' },
  errorText: { color: colors.danger, fontSize: 10, fontWeight: '800', marginTop: 4 },
  successText: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 4 },

  addressInput: { backgroundColor: colors.surface, borderRadius: 8, color: colors.text, padding: 10, fontSize: 12, borderWidth: 1, borderColor: colors.cardBorder },

  paymentRow: { gap: 6 },
  payBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder, flexDirection: 'row', alignItems: 'center' },
  payBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  payText: { color: colors.text, fontSize: 10, fontWeight: '900', marginLeft: 8 },

  summaryCard: { marginTop: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 4 },
  sumLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  sumVal: { color: colors.text, fontSize: 12, fontWeight: '900' },
  sumValGreen: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: 'rgba(255, 255, 255, 0.08)' },
  totalLabel: { color: colors.text, fontSize: 14, fontWeight: '900' },
  totalVal: { color: colors.primary, fontSize: 18, fontWeight: '900' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.primary },
  confirmTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 8 },
  confirmSub: { color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 2 },
  confirmHeader: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  confirmAddress: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 4 },
  confirmTotal: { color: colors.warning, fontSize: 12, fontWeight: '900', marginTop: 4 },
});
