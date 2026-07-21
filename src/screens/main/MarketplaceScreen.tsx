import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { SectionHeader } from '../../components/common/SectionHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { OrderTracker } from '../../components/marketplace/OrderTracker';
import { colors } from '../../config/colors';
import { ShoppingCart, Search, Filter, DollarSign, SlidersHorizontal } from 'lucide-react-native';

export const MarketplaceScreen = ({ navigation }: any) => {
  const {
    cart,
    selectedCategory,
    setCategory,
    selectedVendor,
    setVendor,
    maxBudget,
    setMaxBudget,
    searchQuery,
    setSearchQuery,
    getFilteredProducts,
    orders,
    wishlistIds,
    toggleWishlist,
    addToCart,
  } = useMarketplaceStore();

  const { getActiveVehicle } = useGarageStore();
  const activeVehicle = getActiveVehicle();

  const [activeTab, setActiveTab] = useState<'catalog' | 'orders'>('catalog');
  const [filterByGarage, setFilterByGarage] = useState(false);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  const products = getFilteredProducts(
    filterByGarage ? activeVehicle?.make : undefined,
    filterByGarage ? activeVehicle?.model : undefined
  );

  const categories = ['All', 'Exhaust', 'Turbo', 'Tune', 'Brakes', 'Wheels & Tires', 'Supercharger', 'Nitrous', 'Cleaning Supplies'];
  const vendors = ['All', 'AmericanMuscle', 'eBay Motors', 'Amazon', 'Summit Racing', 'CJ Pony Parts', 'Tire Rack', 'AutoZone'];

  return (
    <View style={styles.container}>
      <ApexHeader onProfilePress={() => navigation.navigate('Profile')} />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Bar */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>APEX MARKETPLACE</Text>
            <Text style={styles.subTitle}>PARTS • VENDORS • FITMENT ENGINE</Text>
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
            <Text style={[styles.tabText, activeTab === 'orders' && { color: colors.background }]}>ORDERS ({orders.length})</Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'catalog' ? (
          <>
            {/* Search & Compatibility Controls */}
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

              <TouchableOpacity
                style={styles.filterToggleBtn}
                onPress={() => setShowFilterDrawer(!showFilterDrawer)}
              >
                <SlidersHorizontal size={16} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Garage Compatibility Match Button */}
            {activeVehicle && (
              <TouchableOpacity
                style={[styles.garageFitPill, filterByGarage && styles.garageFitPillActive]}
                onPress={() => setFilterByGarage(!filterByGarage)}
              >
                <Filter size={12} color={filterByGarage ? colors.background : colors.primary} />
                <Text style={[styles.garageFitText, filterByGarage && { color: colors.background }]}>
                  {filterByGarage ? `MATCHING ONLY: ${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}` : `FILTER FOR MY ${activeVehicle.make} ${activeVehicle.model}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Expandable Filter Drawer (Vendor & Budget) */}
            {showFilterDrawer && (
              <GlassCard style={styles.filterDrawer}>
                <Text style={styles.filterGroupTitle}>SELECT VENDOR SOURCE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                  {vendors.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={[styles.vendorPill, selectedVendor === v && styles.vendorPillActive]}
                      onPress={() => setVendor(v)}
                    >
                      <Text style={[styles.vendorPillText, selectedVendor === v && { color: colors.background }]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={styles.filterGroupTitle}>MAX PRICE BUDGET (${maxBudget.toLocaleString()})</Text>
                <View style={styles.budgetRow}>
                  {[1000, 3000, 5000, 10000].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.budgetChip, maxBudget === val && styles.budgetChipActive]}
                      onPress={() => setMaxBudget(val)}
                    >
                      <Text style={[styles.budgetChipText, maxBudget === val && { color: colors.background }]}>&lt; ${val.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </GlassCard>
            )}

            {/* Category Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
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

            {/* Product List Grid */}
            <View style={styles.productList}>
              {products.length === 0 ? (
                <GlassCard style={{ alignItems: 'center', padding: 24, marginVertical: 12 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '800' }}>
                    NO PARTS FOUND MATCHING CURRENT FILTER CRITERIA
                  </Text>
                </GlassCard>
              ) : (
                products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    activeVehicleName={activeVehicle ? `${activeVehicle.make} ${activeVehicle.model}` : undefined}
                    isWishlisted={wishlistIds.includes(p.id)}
                    onToggleWishlist={() => toggleWishlist(p.id)}
                    onPress={() => navigation.navigate('ProductDetail', { productId: p.id })}
                    onAddToCart={() => addToCart(p)}
                  />
                ))
              )}
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
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10 },
  title: { color: colors.text, fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subTitle: { color: colors.textMuted, fontSize: 10, fontWeight: '800' },
  cartBtn: { backgroundColor: colors.primary, padding: 10, borderRadius: 12 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: colors.danger, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  tabBar: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 10, padding: 3, marginBottom: 10 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: colors.primary },
  tabText: { color: colors.text, fontSize: 10, fontWeight: '900' },

  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  searchInputBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.cardBorder },
  searchInput: { flex: 1, color: colors.text, paddingVertical: 8, fontSize: 12, marginLeft: 6 },
  filterToggleBtn: { backgroundColor: colors.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },

  garageFitPill: { backgroundColor: 'rgba(0, 255, 102, 0.1)', borderColor: 'rgba(0, 255, 102, 0.3)', borderWidth: 1, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  garageFitPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  garageFitText: { color: colors.primary, fontSize: 10, fontWeight: '900', marginLeft: 6 },

  filterDrawer: { marginBottom: 10, padding: 12 },
  filterGroupTitle: { color: colors.textMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.8, marginTop: 4 },
  vendorPill: { paddingVertical: 5, paddingHorizontal: 10, backgroundColor: colors.surface, borderRadius: 6, marginRight: 6, borderWidth: 1, borderColor: colors.cardBorder },
  vendorPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vendorPillText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  budgetRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  budgetChip: { flex: 1, paddingVertical: 6, backgroundColor: colors.surface, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: colors.cardBorder },
  budgetChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  budgetChipText: { color: colors.text, fontSize: 10, fontWeight: '800' },

  catPill: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: colors.surface, borderRadius: 8, marginRight: 6, borderWidth: 1, borderColor: colors.cardBorder },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { color: colors.text, fontSize: 11, fontWeight: '800' },

  productList: { marginTop: 8 },
});
