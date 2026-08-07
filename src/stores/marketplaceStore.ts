import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type MarketplaceProduct = Database['public']['Tables']['marketplace_products']['Row'];
type MarketplaceOrder = Database['public']['Tables']['marketplace_orders']['Row'];

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

// Instant-display performance parts catalog (shown immediately, no loading delay)
const INSTANT_PARTS: MarketplaceProduct[] = [
  {
    id: 'ipart_borla_1',
    title: 'Borla S-Type Cat-Back Exhaust System',
    brand: 'Borla Performance',
    category: 'Exhaust',
    price: 1849.99,
    description: 'Aircraft-grade T-304 stainless steel cat-back exhaust. Deep aggressive tone with patented anti-drone tech. Dyno-proven +28 RWHP gains on most V8 applications.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Car_exhaust_pipe.jpg/640px-Car_exhaust_pipe.jpg',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota'],
    compatible_models: ['Mustang GT', 'Camaro SS', 'Challenger', 'GT-R', 'Supra'],
    vendor_name: 'Summit Racing',
    purchase_url: 'https://www.summitracing.com/search?keyword=borla+catback+exhaust',
    rating: 4.9,
    reviews_count: 142,
    in_stock: true,
    hp_gain: 28,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_garrett_g35',
    title: 'Garrett G35-1050 Ball Bearing Turbocharger',
    brand: 'Garrett Motion',
    category: 'Turbo',
    price: 2450.00,
    description: 'Billet compressor wheel, dual ceramic ball bearings, internal wastegate. Rated for 1,050HP. The go-to single turbo for street builds pushing over 800WHP.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Turbocharger.jpg/640px-Turbocharger.jpg',
    compatible_makes: ['Nissan', 'Toyota', 'Subaru', 'BMW', 'Ford'],
    compatible_models: ['GT-R', 'Supra 2JZ', 'WRX STI', 'M3', 'Mustang'],
    vendor_name: 'Summit Racing',
    purchase_url: 'https://www.summitracing.com/search?keyword=garrett+g35+turbo',
    rating: 5.0,
    reviews_count: 89,
    in_stock: true,
    hp_gain: 220,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_whipple_gen5',
    title: 'Whipple 3.0L Gen5 Twin-Screw Supercharger Kit',
    brand: 'Whipple Superchargers',
    category: 'Supercharger',
    price: 8495.00,
    description: '99% volumetric efficiency twin-screw design. Dual-pass intercooler, oversized 68mm throttle body. Complete bolt-on kit with CARB EO compliance for street use.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Supercharger.jpg/640px-Supercharger.jpg',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge'],
    compatible_models: ['Mustang GT', 'Camaro SS', 'Challenger'],
    vendor_name: 'Lethal Performance',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=whipple+supercharger+kit',
    rating: 4.95,
    reviews_count: 67,
    in_stock: true,
    hp_gain: 310,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_brembo_gt6',
    title: 'Brembo GT 6-Piston Big Brake Kit (405mm)',
    brand: 'Brembo High Performance',
    category: 'Brakes',
    price: 4995.00,
    description: 'Forged aluminum 6-piston radial mount calipers with 405x34mm 2-piece floating slotted rotors. Consistent fade-free stops from 150mph+. OEM fitment, no modifications required.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f2/Disk_brake_dsc03682.jpg/640px-Disk_brake_dsc03682.jpg',
    compatible_makes: ['Porsche', 'BMW', 'Nissan', 'Chevrolet', 'Ford', 'Toyota'],
    compatible_models: ['911 GT3', 'M3', 'GT-R', 'Corvette', 'Mustang', 'Supra'],
    vendor_name: 'Brembo',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=brembo+GT+big+brake+kit',
    rating: 4.9,
    reviews_count: 53,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_cobb_ap3',
    title: 'Cobb Accessport V3 ECU Tuner & Monitor',
    brand: 'Cobb Tuning',
    category: 'Tune',
    price: 725.00,
    description: 'Full-color display, real-time gauges, live datalog, pre-loaded Stage 1/2/E85 OTS maps. Flash in under 5 minutes. The #1 OBD tuning device for performance enthusiasts.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/OBD_II_adapter.jpg/640px-OBD_II_adapter.jpg',
    compatible_makes: ['Nissan', 'Porsche', 'Subaru', 'Ford', 'Toyota', 'BMW'],
    compatible_models: ['GT-R', '911 Turbo', 'WRX STI', 'Focus RS', 'Supra', 'M4'],
    vendor_name: 'Cobb Tuning',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=cobb+accessport+v3',
    rating: 4.88,
    reviews_count: 215,
    in_stock: true,
    hp_gain: 75,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_kw_v4',
    title: 'KW V4 3-Way Adjustable Coilover Kit',
    brand: 'KW Suspensions',
    category: 'Suspension',
    price: 5899.00,
    description: '3-way independent damping adjustment. CNC machined aluminum top mounts. 30-step rebound, 15-step low-speed, 10-step high-speed compression control.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Shock_absorber.JPG/640px-Shock_absorber.JPG',
    compatible_makes: ['Porsche', 'BMW', 'Nissan', 'Toyota', 'Chevrolet', 'Ford'],
    compatible_models: ['911 GT3', 'M4', 'GT-R', 'Supra', 'Corvette', 'Mustang'],
    vendor_name: 'ECS Tuning',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=kw+v4+coilover+kit',
    rating: 4.92,
    reviews_count: 41,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_afe_intake',
    title: 'aFe Momentum GT Cold Air Intake (Pro DRY S)',
    brand: 'aFe Power',
    category: 'Intake',
    price: 389.99,
    description: 'Pro DRY S high-flow air filter with sealed carbon fiber airbox. Dyno-proven +15–23HP and +18 lb-ft TQ. No re-oiling required.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Cold_Air_Intake.jpg/640px-Cold_Air_Intake.jpg',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota', 'BMW', 'Porsche', 'Subaru'],
    compatible_models: ['All V8/V6 Models'],
    vendor_name: 'aFe Power',
    purchase_url: 'https://www.summitracing.com/search?keyword=afe+cold+air+intake',
    rating: 4.7,
    reviews_count: 328,
    in_stock: true,
    hp_gain: 20,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_mishimoto_ic',
    title: 'Mishimoto Performance Bar-and-Plate Intercooler',
    brand: 'Mishimoto',
    category: 'Intercooler',
    price: 1199.99,
    description: '50% more cooling capacity than stock. Full aluminum end tanks, TIG-welded fittings. -30°F charge air temperature drop for consistent boosted power.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Intercooler.jpg/640px-Intercooler.jpg',
    compatible_makes: ['Subaru', 'Ford', 'Nissan', 'BMW', 'Toyota'],
    compatible_models: ['WRX STI', 'Focus RS', 'GT-R', 'M2', 'Supra'],
    vendor_name: 'Mishimoto',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=mishimoto+intercooler',
    rating: 4.8,
    reviews_count: 97,
    in_stock: true,
    hp_gain: 35,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_rays_te37',
    title: 'Rays Volk Racing TE37 Saga SL Forged Wheels',
    brand: 'Rays Engineering',
    category: 'Wheels & Tires',
    price: 3200.00,
    description: 'Iconic 6-spoke forged JIS aluminum alloy wheel. Industry-lightest production forged wheel. Used on World Time Attack and Super GT race programs worldwide.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Alloy_wheel.jpg/640px-Alloy_wheel.jpg',
    compatible_makes: ['Nissan', 'Toyota', 'Honda', 'Subaru', 'Mitsubishi', 'Porsche'],
    compatible_models: ['GT-R', 'Supra', 'Civic Type R', 'WRX STI', 'Evo X', '911'],
    vendor_name: 'Tire Rack',
    purchase_url: 'https://www.ebay.com/sch/i.html?_nkw=volk+racing+TE37+wheels',
    rating: 5.0,
    reviews_count: 64,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_nitrous_zex',
    title: 'ZEX Perimeter Plate Nitrous System (75–175HP)',
    brand: 'ZEX Nitrous',
    category: 'Nitrous',
    price: 699.99,
    description: 'Street/strip dry nitrous system with purge kit and launch control relay. Progressive controller, 75–175HP power levels. Complete 10lb bottle included.',
    image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/NitrousBottle.jpg/640px-NitrousBottle.jpg',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota', 'Honda'],
    compatible_models: ['All EFI Models'],
    vendor_name: 'Summit Racing',
    purchase_url: 'https://www.summitracing.com/search?keyword=zex+nitrous+system',
    rating: 4.6,
    reviews_count: 83,
    in_stock: true,
    hp_gain: 150,
    created_at: new Date().toISOString(),
  },
];

interface MarketplaceState {
  products: MarketplaceProduct[];
  cart: CartItem[];
  wishlistIds: string[];
  orders: MarketplaceOrder[];
  selectedCategory: string;
  selectedVendor: string;
  maxBudget: number;
  searchQuery: string;
  isLoading: boolean;
  isLoadingOrders: boolean;
  error: string | null;

  fetchProducts: (vehicleMake?: string, vehicleModel?: string) => Promise<void>;
  fetchFromEbayAPI: (vehicleMake?: string, vehicleModel?: string) => Promise<void>;
  fetchOrders: (userId: string) => Promise<void>;

  setCategory: (category: string) => void;
  setVendor: (vendor: string) => void;
  setMaxBudget: (budget: number) => void;
  setSearchQuery: (query: string) => void;

  addToCart: (product: MarketplaceProduct) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  toggleWishlist: (productId: string) => void;

  checkoutCart: (userId: string, shippingAddress: string) => Promise<{ order: MarketplaceOrder | null; error: string | null }>;

  getFilteredProducts: (vehicleMake?: string, vehicleModel?: string) => MarketplaceProduct[];
  getCartTotal: () => number;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  products: INSTANT_PARTS, // ← Populated immediately, zero loading delay
  cart: [],
  wishlistIds: [],
  orders: [],
  selectedCategory: 'All',
  selectedVendor: 'All',
  maxBudget: 25000,
  searchQuery: '',
  isLoading: false,
  isLoadingOrders: false,
  error: null,

  fetchProducts: async (vehicleMake, vehicleModel) => {
    set({ isLoading: true });

    try {
      // Fire live API fetch in background
      const { partsApiService } = require('../services/partsApiService');
      const liveParts = await partsApiService.fetchLiveParts({ make: vehicleMake, model: vehicleModel });

      // Also pull from Supabase
      const { data: dbParts } = await supabase
        .from('marketplace_products')
        .select('*')
        .eq('in_stock', true)
        .order('rating', { ascending: false })
        .limit(100);

      const combined = [...(dbParts || []), ...liveParts, ...INSTANT_PARTS];
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      set({ products: unique as MarketplaceProduct[], isLoading: false });
    } catch {
      // On any error, keep the instant parts showing
      set({ isLoading: false });
    }
  },

  fetchFromEbayAPI: async () => {
    // Handled through fetchProducts
  },

  fetchOrders: async (userId) => {
    set({ isLoadingOrders: true });
    try {
      const { data } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false });
      set({ orders: (data || []) as MarketplaceOrder[], isLoadingOrders: false });
    } catch {
      set({ isLoadingOrders: false });
    }
  },

  setCategory: (category) => set({ selectedCategory: category }),
  setVendor: (vendor) => set({ selectedVendor: vendor }),
  setMaxBudget: (budget) => set({ maxBudget: budget }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addToCart: (product) => {
    const { cart } = get();
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      set({ cart: cart.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item) });
    } else {
      set({ cart: [...cart, { product, quantity: 1 }] });
    }
  },

  removeFromCart: (productId) => {
    set({ cart: get().cart.filter(item => item.product.id !== productId) });
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set({ cart: get().cart.map(item => item.product.id === productId ? { ...item, quantity } : item) });
  },

  clearCart: () => set({ cart: [] }),

  toggleWishlist: (productId) => {
    const { wishlistIds } = get();
    set({ wishlistIds: wishlistIds.includes(productId) ? wishlistIds.filter(id => id !== productId) : [...wishlistIds, productId] });
  },

  checkoutCart: async (userId, shippingAddress) => {
    const { cart, getCartTotal } = get();
    if (cart.length === 0) return { order: null, error: 'Cart is empty' };
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .insert({
          buyer_id: userId,
          total_amount: getCartTotal(),
          shipping_address: shippingAddress,
          status: 'pending',
          items: cart.map(item => ({ product_id: item.product.id, quantity: item.quantity, price: item.product.price })),
        })
        .select()
        .single();
      if (error) return { order: null, error: error.message };
      set({ cart: [] });
      return { order: data as MarketplaceOrder, error: null };
    } catch (err: any) {
      return { order: null, error: err?.message || 'Checkout failed' };
    }
  },

  getFilteredProducts: (vehicleMake?, vehicleModel?) => {
    const { products, selectedCategory, selectedVendor, maxBudget, searchQuery } = get();
    let filtered = products;
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category.toLowerCase().includes(selectedCategory.toLowerCase()));
    }
    if (selectedVendor !== 'All') {
      filtered = filtered.filter(p => p.vendor_name === selectedVendor);
    }
    if (maxBudget < 25000) {
      filtered = filtered.filter(p => p.price <= maxBudget);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    if (vehicleMake && vehicleMake !== 'All') {
      filtered = filtered.filter(p => !p.compatible_makes || p.compatible_makes.includes('All') || p.compatible_makes.includes(vehicleMake));
    }
    return filtered;
  },

  getCartTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
}));
