import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { OrderTracker } from '../../components/marketplace/OrderTracker';
import { colors } from '../../config/colors';
import { ShoppingCart, Search, Filter, PackageCheck } from 'lucide-react-native';

export const MarketplaceScreen = ({ navigation }: any) => {
  const { cart, selectedCategory, setCategory, searchQuery, setSearchQuery, getFilteredProducts, orders } = useMarketplaceStore();
  const { getActiveVehicle } = useGarageStore();
  const activeVehicle = getActiveVehicle();

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [filterByGarage, setFilterByGarage] = useState(false);

  const products = getFilteredProducts(
    filterByGarage ? activeVehicle?.make : undefined,
    filterByGarage ? activeVehicle?.model : undefined
  );

  const categories = ['All', 'Exhaust', 'Turbo', 'Tune', 'Brakes', 'Wheels & Tires', 'Suspension'];

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Marketplace Header & Cart Pill */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.title}>APEX MARKETPLACE</Text>
            <Text style={styles.subTitle}>VERIFIED AUTOMOTIVE PARTS & PERFORMNACE</Text>
          </View>

          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
            <ShoppingCart size={18} color={colors.background} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab Selector: Catalog vs Orders */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'catalog' && styles.tabItemActive]}
            onPress={() => setActiveTab('catalog')}
          >
            <Text style={[styles.tabText, activeTab === 'catalog' && { color: colors.background }]}>PARTS CATALOG</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && { color: colors.background }]}>ORDER TRACKING ({orders.length})</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'catalog' ? (
          <>
            {/* Search Bar & Garage Vehicle Compatibility Filter Toggle */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputBox}>
                <Search size={16} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search exhaust, turbos, tunes..."
                  placeholderTextColor={colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              {activeVehicle && (
                <TouchableOpacity
                  style={[styles.compatBtn, filterByGarage && styles.compatBtnActive]}
                  onPress={() => setFilterByGarage(!filterByGarage)}
                >
                  <Filter size={14} color={filterByGarage ? colors.background : colors.primary} />
                  <Text style={[styles.compatBtnText, filterByGarage && { color: colors.background }]}>
                    {activeVehicle.make} {activeVehicle.model}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catPillText, selectedCategory === cat && { color: colors.background }]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product Grid */}
            <View style={styles.productGrid}>
              {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                  onAddToCart={() => useMarketplaceStore.getState().addToCart(p)}
                />
              ))}
            </View>
          </>
        ) : (
          /* Orders Tracking View */
          <View style={{ marginVertical: 8 }}>
            <SectionHeader title="ACTIVE & HISTORICAL ORDERS" />
            {orders.map((ord) => (
              <OrderTracker key={ord.id} order={ord} />
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  cartBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 12 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.danger, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginBottom: 12 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.cardBorder },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 8, fontSize: 12, marginLeft: 6 },
  compatBtn: { backgroundColor: 'rgba(0, 255, 102, 0.12)', borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center' },
  compatBtnActive: { backgroundColor: colors.primary },
  compatBtnText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 4 },

  catPill: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: colors.cardBorder },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { color: colors.text, fontSize: 11, fontWeight: '800' },

  productGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginTop: 8 },
});
