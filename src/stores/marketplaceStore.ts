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
    title: 'Borla S-Type Cat-Back Exhaust (3.0" Quad Tips)',
    brand: 'Borla Performance',
    category: 'Exhaust',
    price: 1849.99,
    description: 'Aircraft-grade T-304 stainless steel cat-back exhaust with aggressive straight-through muffler design and patented anti-drone tech. Produces a deep, aggressive exhaust note without drone at highway speeds.',
    image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota'],
    compatible_models: ['Mustang GT', 'Camaro SS', 'Challenger SRT', 'GT-R', 'Supra'],
    vendor_name: 'AmericanMuscle',
    purchase_url: 'https://www.americanmuscle.com/borla-mustang-s-type-catback-exhaust-black-tips-140743bc.html',
    rating: 4.9,
    reviews_count: 142,
    in_stock: true,
    hp_gain: 28,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_garrett_g35',
    title: 'Garrett G35-1050 Turbocharger (1050HP Rated)',
    brand: 'Garrett Motion',
    category: 'Turbo',
    price: 2450.00,
    description: 'Advanced G-Series point-milled billet compressor wheel with dual ceramic ball bearings and internal speed sensor port. Proven on 1,000HP+ street builds worldwide.',
    image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Nissan', 'Toyota', 'Subaru', 'BMW', 'Ford'],
    compatible_models: ['GT-R', 'Supra 2JZ', 'WRX STI', 'M3', 'Mustang'],
    vendor_name: 'Summit Racing',
    purchase_url: 'https://www.summitracing.com/parts/gar-880986-5002s',
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
    description: 'Gen 5 3.0L rotor profile at 99% volumetric efficiency. Dual-pass intercooler, oversized dual 68mm throttle body. Complete bolt-on kit with full emissions compliance.',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge'],
    compatible_models: ['Mustang GT', 'Camaro SS', 'Challenger Hellcat'],
    vendor_name: 'Lethal Performance',
    purchase_url: 'https://www.lethalperformance.com/whipple-2024-ford-mustang-gt-3-0l-supercharger-kit.html',
    rating: 4.95,
    reviews_count: 67,
    in_stock: true,
    hp_gain: 310,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_brembo_gt6',
    title: 'Brembo GT 6-Piston Big Brake Kit (405mm Slotted)',
    brand: 'Brembo High Performance',
    category: 'Brakes',
    price: 4995.00,
    description: 'Forged aluminum 6-piston radial mount calipers with 405x34mm 2-piece floating slotted disc rotors. Stops 900HP builds from 150mph with consistent fade-free performance.',
    image_url: 'https://images.unsplash.com/photo-1600706432520-74694c215619?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Porsche', 'BMW', 'Nissan', 'Chevrolet', 'Ford', 'Toyota'],
    compatible_models: ['911 GT3 RS', 'M3 Competition', 'GT-R', 'Corvette Z06', 'Mustang GT', 'Supra'],
    vendor_name: 'Tire Rack',
    purchase_url: 'https://www.tirerack.com/brakes/brembo-gran-turismo-brake-kit',
    rating: 4.9,
    reviews_count: 53,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_cobb_ap3',
    title: 'Cobb Accessport V3 ECU Tuner & Flash Monitor',
    brand: 'Cobb Tuning',
    category: 'Tune',
    price: 725.00,
    description: 'Full-color display with real-time gauges, live datalog, and pre-loaded Stage 1/Stage 2/E85 OTS maps. Install and uninstall flashes in under 5 minutes. The #1 OBD tuning device for performance enthusiasts.',
    image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Nissan', 'Porsche', 'Subaru', 'Ford', 'Toyota', 'BMW'],
    compatible_models: ['GT-R', '911 Turbo', 'WRX STI', 'Focus RS', 'Supra', 'M4'],
    vendor_name: 'Cobb Tuning',
    purchase_url: 'https://www.cobbtuning.com/products/accessport',
    rating: 4.88,
    reviews_count: 215,
    in_stock: true,
    hp_gain: 75,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_kw_v4',
    title: 'KW V4 3-Way Adjustable Coilovers (Race)',
    brand: 'KW Suspensions',
    category: 'Suspension',
    price: 5899.00,
    description: '3-way independent damping (rebound, low-speed compression, high-speed compression) with CNC-machined aluminum top mounts. Used on factory GT3 RS customer race programs.',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Porsche', 'BMW', 'Nissan', 'Toyota', 'Chevrolet', 'Ford'],
    compatible_models: ['911 GT3 RS', 'M4', 'GT-R', 'Supra', 'Corvette', 'Mustang GT'],
    vendor_name: 'ECS Tuning',
    purchase_url: 'https://www.ecstuning.com/b-kw-parts/v4-coilover-kit/35210086~kw/',
    rating: 4.92,
    reviews_count: 41,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_afe_intake',
    title: 'aFe Momentum GT Cold Air Intake System',
    brand: 'aFe Power',
    category: 'Intake',
    price: 389.99,
    description: 'Pro DRY S high-flow air filter with sealed carbon fiber airbox. Dyno-proven +15-23 HP and +18 lb-ft torque gains. Oiled or dry media filter options available.',
    image_url: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota', 'BMW', 'Porsche', 'Subaru'],
    compatible_models: ['All V8/V6 Models'],
    vendor_name: 'aFe Power',
    purchase_url: 'https://www.afepower.com/momentum-gt-pro-dry-s-cold-air-intake-system',
    rating: 4.7,
    reviews_count: 328,
    in_stock: true,
    hp_gain: 20,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_mishimoto_ic',
    title: 'Mishimoto Performance Intercooler Kit',
    brand: 'Mishimoto',
    category: 'Intercooler',
    price: 1199.99,
    description: 'Bar-and-plate intercooler core with 50% more cooling capacity. Full aluminum end tanks with TIG-welded fittings. Proven -30°F charge air temperature drop for consistent power.',
    image_url: 'https://images.unsplash.com/photo-1611544634849-f04f2d8c1cda?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Subaru', 'Ford', 'Nissan', 'BMW', 'Toyota'],
    compatible_models: ['WRX STI', 'Focus RS', 'GT-R', 'M2 Competition', 'Supra'],
    vendor_name: 'Mishimoto',
    purchase_url: 'https://www.mishimoto.com/categories/intercoolers.html',
    rating: 4.8,
    reviews_count: 97,
    in_stock: true,
    hp_gain: 35,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_rays_te37',
    title: 'Rays Volk Racing TE37 Saga SL Forged Wheels (18x10.5)',
    brand: 'Rays Engineering',
    category: 'Wheels & Tires',
    price: 3200.00,
    description: 'RAYS VOLK RACING iconic 6-spoke design. Forged JIS aluminum alloy, lightest production forged wheel available. Used on World Time Attack and Super GT race programs.',
    image_url: 'https://images.unsplash.com/photo-1471479917193-f00955256257?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Nissan', 'Toyota', 'Honda', 'Subaru', 'Mitsubishi', 'Porsche'],
    compatible_models: ['GT-R', 'Supra', 'Civic Type R', 'WRX STI', 'Evo X', '911'],
    vendor_name: 'Tire Rack',
    purchase_url: 'https://www.tirerack.com/wheels/rays-volk-racing',
    rating: 5.0,
    reviews_count: 64,
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'ipart_nitrous_zex',
    title: 'ZEX Perimeter Plate Nitrous System (75-175HP)',
    brand: 'ZEX Nitrous',
    category: 'Nitrous',
    price: 699.99,
    description: 'Street/strip dry nitrous system with purge kit and launch control relay. Progressive controller allows 75-175HP power levels. Complete bolt-on kit with 10lb bottle.',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge', 'Nissan', 'Toyota', 'Honda'],
    compatible_models: ['All EFI V8/V6 Models'],
    vendor_name: 'Summit Racing',
    purchase_url: 'https://www.summitracing.com/search/brand/zex/part-type/nitrous-systems',
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
