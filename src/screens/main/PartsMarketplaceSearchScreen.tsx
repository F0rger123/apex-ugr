import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useGarageStore } from '../../stores/garageStore';
import { ApexHeader } from '../../components/common/ApexHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { MatrixBadge } from '../../components/common/MatrixBadge';
import { ApexButton } from '../../components/common/ApexButton';
import { ProductCard } from '../../components/marketplace/ProductCard';
import { colors } from '../../config/colors';
import {
  Search,
  SlidersHorizontal,
  Car,
  Filter,
  Check,
  RotateCcw,
  Zap,
  ShoppingBag,
} from 'lucide-react-native';

export const PartsMarketplaceSearchScreen = ({ navigation }: any) => {
  const { products, addToCart, wishlistIds, toggleWishlist } = useMarketplaceStore();
  const { getActiveVehicle } = useGarageStore();

  const activeVehicle = getActiveVehicle();

  const [query, setQuery] = useState('');
  const [selectedMake, setSelectedMake] = useState<string>(activeVehicle?.make || 'All');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [minHpGain, setMinHpGain] = useState(0);

  const MAKES = ['All', 'Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota', 'Porsche', 'BMW', 'Subaru'];
  const CATEGORIES = ['All', 'Supercharger', 'Exhaust', 'Turbo', 'Brakes', 'Wheels & Tires', 'Tune', 'Nitrous'];

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (query.trim()) {
      const q = query.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchBrand = p.brand.toLowerCase().includes(q);
      const matchCat = p.category.toLowerCase().includes(q);
      if (!matchTitle && !matchBrand && !matchCat) return false;
    }

    if (selectedMake !== 'All') {
      const matchMake = p.compatible_makes.includes('All') || p.compatible_makes.includes(selectedMake);
      if (!matchMake) return false;
    }

    if (selectedCategory !== 'All' && p.category !== selectedCategory) {
      return false;
    }

    if (onlyInStock && !p.in_stock) {
      return false;
    }

    if (minHpGain > 0 && (p.hp_gain || 0) < minHpGain) {
      return false;
    }

    return true;
  });

  const resetFilters = () => {
    setQuery('');
    setSelectedMake('All');
    setSelectedCategory('All');
    setOnlyInStock(false);
    setMinHpGain(0);
  };

  return (
    <View style={styles.container}>
      <ApexHeader
        showBack
        title="PARTS SEARCH & FITMENT"
        onBackPress={() => navigation.goBack()}
        onProfilePress={() => navigation.navigate('Profile')}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar Input */}
        <View style={styles.searchBar}>
          <Search size={16} color={colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search parts by keyword (e.g. Borla, Whipple, Turbo)..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Vehicle Filter Selector */}
        <GlassCard style={styles.fitmentBox}>
          <View style={styles.fitmentHeader}>
            <Car size={16} color={colors.primary} />
            <Text style={styles.fitmentTitle}>FILTER BY VEHICLE MAKE</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {MAKES.map((make) => (
              <TouchableOpacity
                key={make}
                style={[styles.makeChip, selectedMake === make && styles.makeChipActive]}
                onPress={() => setSelectedMake(make)}
              >
                <Text style={[styles.makeChipText, selectedMake === make && { color: colors.background }]}>
                  {make}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Category Selector Chips */}
        <GlassCard style={styles.categoryBox}>
          <View style={styles.fitmentHeader}>
            <Filter size={16} color={colors.primary} />
            <Text style={styles.fitmentTitle}>CATEGORY SELECTION</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 10 }}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.makeChip, selectedCategory === cat && styles.makeChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.makeChipText, selectedCategory === cat && { color: colors.background }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Quick Toggles */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleBtn, onlyInStock && styles.toggleBtnActive]}
            onPress={() => setOnlyInStock(!onlyInStock)}
          >
            {onlyInStock && <Check size={12} color={colors.background} />}
            <Text style={[styles.toggleText, onlyInStock && { color: colors.background }]}>
              IN STOCK ONLY
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleBtn, minHpGain > 0 && styles.toggleBtnActive]}
            onPress={() => setMinHpGain(minHpGain > 0 ? 0 : 50)}
          >
            <Zap size={12} color={minHpGain > 0 ? colors.background : colors.primary} />
            <Text style={[styles.toggleText, minHpGain > 0 && { color: colors.background }]}>
              {minHpGain > 0 ? '50+ HP GAIN' : 'HIGH HP GAINS'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
            <RotateCcw size={12} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>{filteredProducts.length} PARTS FOUND</Text>
          {selectedMake !== 'All' && <MatrixBadge label={`FITMENT: ${selectedMake}`} variant="green" size="sm" />}
        </View>

        {/* Results List */}
        <View style={styles.resultsList}>
          {filteredProducts.length === 0 ? (
            <GlassCard style={{ alignItems: 'center', padding: 24 }}>
              <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '800' }}>
                NO PARTS MATCH YOUR FITMENT FILTERS
              </Text>
              <TouchableOpacity onPress={resetFilters} style={{ marginTop: 12 }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '900' }}>RESET ALL FILTERS</Text>
              </TouchableOpacity>
            </GlassCard>
          ) : (
            filteredProducts.map((p) => (
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

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, paddingHorizontal: 16 },

  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: colors.cardBorder, marginVertical: 12 },
  searchInput: { flex: 1, color: colors.text, fontSize: 13, marginLeft: 10 },

  fitmentBox: { padding: 14, marginBottom: 10 },
  categoryBox: { padding: 14, marginBottom: 10 },
  fitmentHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fitmentTitle: { color: colors.textSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  makeChip: { backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder },
  makeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  makeChipText: { color: colors.text, fontSize: 11, fontWeight: '800' },

  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surface, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.cardBorder },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.text, fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  resetBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.cardBorder },

  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  resultsTitle: { color: colors.textSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  resultsList: { marginVertical: 4 },
});
