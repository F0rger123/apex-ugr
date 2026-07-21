import { create } from 'zustand';
import { MarketplaceProduct, MarketplaceOrder } from '../types/database.types';

export interface CartItem {
  product: MarketplaceProduct;
  quantity: number;
}

interface MarketplaceState {
  products: MarketplaceProduct[];
  cart: CartItem[];
  wishlistIds: string[];
  orders: MarketplaceOrder[];
  selectedCategory: string;
  searchQuery: string;

  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;
  addToCart: (product: MarketplaceProduct) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  checkoutCart: (address: string) => MarketplaceOrder;
  getFilteredProducts: (vehicleMake?: string, vehicleModel?: string) => MarketplaceProduct[];
}

const SAMPLE_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod-1',
    title: 'Akrapovič Titanium Evolution Line Exhaust',
    brand: 'Akrapovič',
    category: 'Exhaust',
    price: 8490.00,
    vendor_name: 'Summit Racing',
    image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=600&auto=format&fit=crop',
    description: 'Ultra-lightweight race-grade titanium exhaust system designed for maximum exhaust flow velocity, deep aggressive acoustic frequency, and up to 35lbs weight reduction.',
    compatible_makes: ['Nissan', 'Porsche', 'BMW'],
    compatible_models: ['GT-R', '911 GT3', 'M4'],
    rating: 4.9,
    reviews_count: 142,
    purchase_url: 'https://www.summitracing.com',
    in_stock: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    title: 'Garrett GTX3582R Gen II Dual Ball Bearing Turbo',
    brand: 'Garrett',
    category: 'Turbo',
    price: 2850.00,
    vendor_name: 'eBay Motors',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=600&auto=format&fit=crop',
    description: 'Aerodynamically optimized forged billet compressor wheel supporting up to 850 HP per turbo with ultra-fast spool dynamics.',
    compatible_makes: ['Toyota', 'Nissan', 'Ford', 'Chevrolet'],
    compatible_models: ['Supra', 'GT-R', 'Mustang GT', 'Corvette Z06'],
    rating: 5.0,
    reviews_count: 98,
    purchase_url: 'https://www.ebay.com/motors',
    in_stock: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    title: 'Cobb Accessport V3 In-Cabin Flasher',
    brand: 'Cobb Tuning',
    category: 'Tune',
    price: 795.00,
    vendor_name: 'AmericanMuscle',
    image_url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=600&auto=format&fit=crop',
    description: 'Full-color digital telemetry monitor with on-the-fly map switching, high-frequency logging, and customized launch control profiles.',
    compatible_makes: ['Nissan', 'Ford', 'Subaru'],
    compatible_models: ['GT-R', 'Mustang GT', 'WRX STI'],
    rating: 4.8,
    reviews_count: 310,
    purchase_url: 'https://www.americanmuscle.com',
    in_stock: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-4',
    title: 'Brembo GT-R Monobloc 6-Piston Big Brake Kit',
    brand: 'Brembo',
    category: 'Brakes',
    price: 5995.00,
    vendor_name: 'Tire Rack',
    image_url: 'https://images.unsplash.com/photo-1600706432523-991475712e02?q=80&w=600&auto=format&fit=crop',
    description: 'Monobloc aluminum calipers coated in thermal-resistant nickel, paired with slotted two-piece carbon-ceramic discs.',
    compatible_makes: ['Porsche', 'BMW', 'Chevrolet', 'Nissan'],
    compatible_models: ['911 GT3', 'M4', 'Corvette Z06', 'GT-R'],
    rating: 4.9,
    reviews_count: 87,
    purchase_url: 'https://www.tirerack.com',
    in_stock: true,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    title: 'BBS FI-R Forged Monobloc Wheels (Set of 4)',
    brand: 'BBS Wheels',
    category: 'Wheels & Tires',
    price: 9800.00,
    vendor_name: 'Tire Rack',
    image_url: 'https://images.unsplash.com/photo-1588636142475-a62d56692870?q=80&w=600&auto=format&fit=crop',
    description: 'Forged aerospace-grade aluminum wheels engineered specifically for supercar brake clearance and minimal rotational mass.',
    compatible_makes: ['Porsche', 'BMW', 'Audi'],
    compatible_models: ['911 GT3', 'M4', 'R8'],
    rating: 4.9,
    reviews_count: 64,
    purchase_url: 'https://www.tirerack.com',
    in_stock: true,
    created_at: new Date().toISOString()
  }
];

const INITIAL_ORDERS: MarketplaceOrder[] = [
  {
    id: 'ord-98234',
    user_id: '00000000-0000-0000-0000-000000000001',
    items: [
      {
        product_id: 'prod-3',
        title: 'Cobb Accessport V3 In-Cabin Flasher',
        price: 795.00,
        quantity: 1
      }
    ],
    total_amount: 795.00,
    shipping_status: 'in_transit',
    tracking_number: 'APX-982341902-US',
    shipping_address: '1042 Apex Speedway Blvd, Los Angeles, CA 90015',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  products: SAMPLE_PRODUCTS,
  cart: [],
  wishlistIds: ['prod-1'],
  orders: INITIAL_ORDERS,
  selectedCategory: 'All',
  searchQuery: '',

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  addToCart: (product) => {
    set((state) => {
      const existing = state.cart.find((c) => c.product.id === product.id);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c
          )
        };
      }
      return { cart: [...state.cart, { product, quantity: 1 }] };
    });
  },

  removeFromCart: (productId) => {
    set((state) => ({
      cart: state.cart.filter((c) => c.product.id !== productId)
    }));
  },

  updateCartQuantity: (productId, quantity) => {
    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }
    set((state) => ({
      cart: state.cart.map((c) =>
        c.product.id === productId ? { ...c, quantity } : c
      )
    }));
  },

  clearCart: () => set({ cart: [] }),

  toggleWishlist: (productId) => {
    set((state) => ({
      wishlistIds: state.wishlistIds.includes(productId)
        ? state.wishlistIds.filter((id) => id !== productId)
        : [...state.wishlistIds, productId]
    }));
  },

  checkoutCart: (shippingAddress) => {
    const { cart } = get();
    const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const newOrder: MarketplaceOrder = {
      id: `ord-${Math.floor(10000 + Math.random() * 90000)}`,
      user_id: '00000000-0000-0000-0000-000000000001',
      items: cart.map((item) => ({
        product_id: item.product.id,
        title: item.product.title,
        price: item.product.price,
        quantity: item.quantity
      })),
      total_amount: totalAmount,
      shipping_status: 'processing',
      tracking_number: `APX-${Math.floor(100000000 + Math.random() * 900000000)}-US`,
      shipping_address: shippingAddress || '1042 Apex Speedway Blvd, Los Angeles, CA 90015',
      created_at: new Date().toISOString()
    };

    set((state) => ({
      orders: [newOrder, ...state.orders],
      cart: []
    }));

    return newOrder;
  },

  getFilteredProducts: (vehicleMake, vehicleModel) => {
    const { products, selectedCategory, searchQuery } = get();
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMake = !vehicleMake || p.compatible_makes.includes(vehicleMake);
      const matchModel = !vehicleModel || p.compatible_models.includes(vehicleModel);

      return matchCategory && matchSearch && matchMake && matchModel;
    });
  }
}));
