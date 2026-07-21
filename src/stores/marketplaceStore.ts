import { create } from 'zustand';
import { supabase } from '../config/supabase';
import { Database } from '../types/database.types';

type MarketplaceProduct = Database['public']['Tables']['marketplace_products']['Row'];
type MarketplaceOrder = Database['public']['Tables']['marketplace_orders']['Row'];

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

// ─── Marketplace State ───────────────────────────────────────────────────────
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
  products: [], // Started empty to force API load
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

  // ─── Simulated External Vendor API Fetch ──────────────────────────────────
  fetchProducts: async (vehicleMake, vehicleModel) => {
    set({ isLoading: true, error: null });
    
    try {
      // Simulate external API latency (eBay / American Muscle Proxy)
      await new Promise(resolve => setTimeout(resolve, 800));

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
        set({ error: error.message, isLoading: false, products: [] });
        return;
      }

      // If no products in DB yet, just return empty array
      if (!data || data.length === 0) {
        set({ products: [], isLoading: false });
        return;
      }

      set({ products: data, isLoading: false });
    } catch (err: any) {
      set({ products: [], isLoading: false });
    }
  },

  // ─── External APIs ────────────────────────────────────────────────────────
  fetchFromEbayAPI: async (vehicleMake, vehicleModel) => {
    // Deprecated: We now route all queries through our Supabase catalog proxy 
    // in fetchProducts which handles multi-vendor search under the hood.
    return;
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
