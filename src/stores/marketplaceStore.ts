import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type MarketplaceProduct = Database['public']['Tables']['marketplace_products']['Row'];
type MarketplaceOrder = Database['public']['Tables']['marketplace_orders']['Row'];

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

// ─── Default Vendor Catalog (American Muscle, Summit Racing, eBay Motors, Amazon) ───────
const DEFAULT_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'part-am-1',
    title: 'Corsa Performance Xtreme Cat-Back Exhaust System',
    brand: 'Corsa Performance',
    category: 'Exhaust',
    price: 1849.99,
    vendor_name: 'American Muscle',
    image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=800&auto=format&fit=crop',
    description: '3.0-Inch Stainless Steel Dual Rear Exit Exhaust with Quad Black Tips. Aggressive sound, zero cabin drone.',
    compatible_makes: ['Ford', 'Chevrolet', 'Dodge'],
    compatible_models: ['Mustang GT', 'Camaro SS', 'Challenger SRT'],
    rating: 4.9,
    reviews_count: 128,
    purchase_url: 'https://www.americanmuscle.com',
    in_stock: true,
    hp_gain: 24,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-am-2',
    title: 'Roush Phase 2 750HP Supercharger Kit',
    brand: 'Roush Performance',
    category: 'Supercharger',
    price: 8999.99,
    vendor_name: 'American Muscle',
    image_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?q=80&w=800&auto=format&fit=crop',
    description: 'TVX 2650 Twin-Vane Supercharger pushing 750 HP and 670 lb-ft Torque at 12 PSI.',
    compatible_makes: ['Ford'],
    compatible_models: ['Mustang GT'],
    rating: 5.0,
    reviews_count: 84,
    purchase_url: 'https://www.americanmuscle.com',
    in_stock: true,
    hp_gain: 290,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-sr-1',
    title: 'KW Suspension Variant 3 Coilovers',
    brand: 'KW Suspension',
    category: 'Suspension',
    price: 2699.00,
    vendor_name: 'Summit Racing',
    image_url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?q=80&w=800&auto=format&fit=crop',
    description: 'Independently adjustable compression and rebound damping for maximum cornering precision.',
    compatible_makes: ['BMW', 'Toyota', 'Nissan', 'Ford', 'Chevrolet'],
    compatible_models: ['M3', 'Supra', 'GT-R', 'Mustang GT'],
    rating: 4.8,
    reviews_count: 42,
    purchase_url: 'https://www.summitracing.com',
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-sr-2',
    title: 'Brembo GT 6-Piston Monoblock Big Brake Kit',
    brand: 'Brembo',
    category: 'Brakes',
    price: 3895.00,
    vendor_name: 'Summit Racing',
    image_url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=800&auto=format&fit=crop',
    description: '380mm 2-Piece Drilled Rotors with 6-Piston Aluminum Calipers for unmatched track braking force.',
    compatible_makes: ['Chevrolet', 'Dodge', 'Ford', 'BMW'],
    compatible_models: ['Corvette Z06', 'Challenger Hellcat', 'Mustang Shelby GT500'],
    rating: 4.9,
    reviews_count: 67,
    purchase_url: 'https://www.summitracing.com',
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-eb-1',
    title: 'Garrett G35-1050 Dual Ball Bearing Turbocharger',
    brand: 'Garrett Motion',
    category: 'Turbo',
    price: 2249.50,
    vendor_name: 'eBay Motors',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=800&auto=format&fit=crop',
    description: 'Supports up to 1050 HP. Billet Compressor Wheel with V-Band Inlet/Outlet.',
    compatible_makes: ['Toyota', 'Nissan', 'Honda', 'Subaru'],
    compatible_models: ['Supra', 'GT-R', 'Civic Type R', 'WRX STI'],
    rating: 4.7,
    reviews_count: 31,
    purchase_url: 'https://www.ebay.com/b/Auto-Parts-and-Vehicles/6000/bn_1865334',
    in_stock: true,
    hp_gain: 350,
    created_at: new Date().toISOString(),
  },
  {
    id: 'part-amz-1',
    title: 'Mishimoto Performance Aluminum Radiator & Fan Shroud',
    brand: 'Mishimoto',
    category: 'Cooling',
    price: 349.95,
    vendor_name: 'Amazon',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=800&auto=format&fit=crop',
    description: '30% increase in cooling efficiency with TIG-welded aluminum end tanks.',
    compatible_makes: ['Ford', 'Chevrolet', 'Subaru', 'Toyota', 'Nissan'],
    compatible_models: ['Mustang', 'Camaro', 'WRX', 'Supra', '370Z'],
    rating: 4.6,
    reviews_count: 215,
    purchase_url: 'https://www.amazon.com',
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString(),
  }
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

  // Fetch
  fetchProducts: (vehicleMake?: string, vehicleModel?: string) => Promise<void>;
  fetchFromEbayAPI: (vehicleMake?: string, vehicleModel?: string) => Promise<void>;
  fetchOrders: (userId: string) => Promise<void>;

  // Filters
  setCategory: (category: string) => void;
  setVendor: (vendor: string) => void;
  setMaxBudget: (budget: number) => void;
  setSearchQuery: (query: string) => void;

  // Cart
  addToCart: (product: MarketplaceProduct) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;

  // Wishlist
  toggleWishlist: (productId: string) => void;

  // Checkout (Supabase order + optional Stripe)
  checkoutCart: (userId: string, shippingAddress: string) => Promise<{ order: MarketplaceOrder | null; error: string | null }>;

  // Computed
  getFilteredProducts: (vehicleMake?: string, vehicleModel?: string) => MarketplaceProduct[];
  getCartTotal: () => number;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  products: DEFAULT_PRODUCTS,
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

  // ─── Fetch products from Supabase ──────────────────────────────────────────
  fetchProducts: async (vehicleMake, vehicleModel) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('marketplace_products')
        .select('*')
        .eq('in_stock', true)
        .order('rating', { ascending: false })
        .limit(100);

      // Filter by vehicle fitment if provided
      if (vehicleMake) {
        query = query.contains('compatible_makes', [vehicleMake]);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // If no products in DB yet, fetch from eBay API or default vendor catalog
      if (!data || data.length === 0) {
        set({ products: DEFAULT_PRODUCTS, isLoading: false });
        return;
      }

      set({ products: data, isLoading: false });
    } catch (err: any) {
      set({ products: DEFAULT_PRODUCTS, isLoading: false });
    }
  },

  // ─── eBay Motors API ──────────────────────────────────────────────────────
  fetchFromEbayAPI: async (vehicleMake?: string, vehicleModel?: string) => {
    const EBAY_APP_ID = process.env.EXPO_PUBLIC_EBAY_APP_ID;

    if (!EBAY_APP_ID) {
      console.warn('[Marketplace] eBay API key not configured. Using Supabase catalog only.');
      set({ isLoading: false });
      return;
    }

    try {
      const keywords = vehicleMake && vehicleModel
        ? `${vehicleMake} ${vehicleModel} performance parts`
        : 'performance car parts modifications';

      const response = await fetch(
        `https://svcs.ebay.com/services/search/FindingService/v1` +
        `?OPERATION-NAME=findItemsByKeywords` +
        `&SERVICE-VERSION=1.0.0` +
        `&SECURITY-APPNAME=${EBAY_APP_ID}` +
        `&RESPONSE-DATA-FORMAT=JSON` +
        `&keywords=${encodeURIComponent(keywords)}` +
        `&categoryId=6030` + // eBay Motors category
        `&sortOrder=BestMatch` +
        `&paginationInput.entriesPerPage=20`
      );

      const json = await response.json();
      const items = json?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];

      const products: MarketplaceProduct[] = items.map((item: any) => ({
        id: item.itemId?.[0] || `ebay-${Date.now()}`,
        title: item.title?.[0] || 'Performance Part',
        brand: item.sellerInfo?.[0]?.sellerUserName?.[0] || 'eBay Seller',
        category: 'Performance',
        price: parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || '0'),
        vendor_name: 'eBay Motors',
        image_url: item.galleryURL?.[0] || '',
        description: item.subtitle?.[0] || item.title?.[0] || '',
        compatible_makes: vehicleMake ? [vehicleMake] : [],
        compatible_models: vehicleModel ? [vehicleModel] : [],
        rating: 4.5,
        reviews_count: 0,
        purchase_url: item.viewItemURL?.[0] || '',
        in_stock: item.sellingStatus?.[0]?.sellingState?.[0] === 'Active',
        hp_gain: 0,
        created_at: new Date().toISOString(),
      }));

      set({ products, isLoading: false });
    } catch (err: any) {
      console.error('[Marketplace] eBay API error:', err);
      set({ isLoading: false });
    }
  },

  // ─── Fetch orders ─────────────────────────────────────────────────────────
  fetchOrders: async (userId) => {
    set({ isLoadingOrders: true });
    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        set({ orders: data });
      }
    } finally {
      set({ isLoadingOrders: false });
    }
  },

  // ─── Filters ──────────────────────────────────────────────────────────────
  setCategory: (category) => set({ selectedCategory: category }),
  setVendor: (vendor) => set({ selectedVendor: vendor }),
  setMaxBudget: (budget) => set({ maxBudget: budget }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ─── Cart ──────────────────────────────────────────────────────────────────
  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find((c) => c.product.id === product.id);
      if (existing) {
        return { cart: state.cart.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c) };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({ cart: state.cart.filter((c) => c.product.id !== productId) }));
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((c) => c.product.id === productId ? { ...c, quantity } : c),
    }));
  },

  clearCart: () => set({ cart: [] }),

  // ─── Wishlist ─────────────────────────────────────────────────────────────
  toggleWishlist: (productId) => {
    set((state) => ({
      wishlistIds: state.wishlistIds.includes(productId)
        ? state.wishlistIds.filter((id) => id !== productId)
        : [...state.wishlistIds, productId],
    }));
  },

  // ─── Checkout ─────────────────────────────────────────────────────────────
  checkoutCart: async (userId, shippingAddress) => {
    const { cart } = get();
    if (cart.length === 0) return { order: null, error: 'Cart is empty' };

    const totalAmount = get().getCartTotal();
    const trackingNumber = `APX-${Math.floor(100000000 + Math.random() * 900000000)}-US`;

    try {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .insert({
          user_id: userId,
          items: cart.map((item) => ({
            product_id: item.product.id,
            title: item.product.title,
            price: item.product.price,
            quantity: item.quantity,
          })),
          total_amount: totalAmount,
          shipping_status: 'processing',
          tracking_number: trackingNumber,
          shipping_address: shippingAddress,
        })
        .select()
        .single();

      if (error) return { order: null, error: error.message };

      set((state) => ({
        orders: [data, ...state.orders],
        cart: [],
      }));

      return { order: data, error: null };
    } catch (err: any) {
      return { order: null, error: err?.message || 'Checkout failed' };
    }
  },

  // ─── Computed ─────────────────────────────────────────────────────────────
  getFilteredProducts: (vehicleMake, vehicleModel) => {
    const { products, selectedCategory, selectedVendor, maxBudget, searchQuery } = get();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const matchVendor = selectedVendor === 'All' || p.vendor_name === selectedVendor;
      const matchBudget = p.price <= maxBudget;
      const matchSearch =
        !searchQuery ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMake = !vehicleMake || p.compatible_makes.includes(vehicleMake);
      return matchCat && matchVendor && matchBudget && matchSearch && matchMake;
    });
  },

  getCartTotal: () => {
    return get().cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  },
}));
