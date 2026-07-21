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
  selectedVendor: string;
  maxBudget: number;
  searchQuery: string;

  setCategory: (category: string) => void;
  setVendor: (vendor: string) => void;
  setMaxBudget: (budget: number) => void;
  setSearchQuery: (query: string) => void;
  addToCart: (product: MarketplaceProduct) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  checkoutCart: (address: string) => MarketplaceOrder;
  getFilteredProducts: (vehicleMake?: string, vehicleModel?: string) => MarketplaceProduct[];
}

const EXTENDED_PRODUCTS: MarketplaceProduct[] = [
  {
    id: 'prod-1',
    title: 'Akrapovič Titanium Evolution Line Exhaust System',
    brand: 'Akrapovič',
    category: 'Exhaust',
    price: 8490.00,
    vendor_name: 'Summit Racing',
    image_url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?q=80&w=600&auto=format&fit=crop',
    description: 'Ultra-lightweight race-grade titanium exhaust system designed for maximum exhaust flow velocity, deep aggressive acoustic frequency, and up to 35lbs weight reduction.',
    compatible_makes: ['Nissan', 'Porsche', 'BMW', 'Toyota', 'Chevrolet', 'Ford'],
    compatible_models: ['GT-R', '911 GT3', 'M4', 'Supra', 'Corvette Z06', 'Mustang GT'],
    rating: 4.9,
    reviews_count: 142,
    purchase_url: 'https://www.summitracing.com/parts/akr-s-n35e7t',
    in_stock: true,
    hp_gain: 28,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-2',
    title: 'Garrett GTX3582R Gen II Dual Ball Bearing Turbo',
    brand: 'Garrett Motorsport',
    category: 'Turbo',
    price: 2850.00,
    vendor_name: 'eBay Motors',
    image_url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?q=80&w=600&auto=format&fit=crop',
    description: 'Aerodynamically optimized forged billet compressor wheel supporting up to 850 HP per turbo with ultra-fast spool dynamics.',
    compatible_makes: ['Toyota', 'Nissan', 'Ford', 'Chevrolet'],
    compatible_models: ['Supra', 'GT-R', 'Mustang GT', 'Corvette Z06'],
    rating: 5.0,
    reviews_count: 98,
    purchase_url: 'https://www.ebay.com/itm/garrett-gtx3582r-gen2',
    in_stock: true,
    hp_gain: 350,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-3',
    title: 'Cobb Accessport V3 In-Cabin ECU Flasher & Logger',
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
    purchase_url: 'https://www.americanmuscle.com/cobb-accessport-v3',
    in_stock: true,
    hp_gain: 120,
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
    purchase_url: 'https://www.tirerack.com/brakes/brembo-gt-r',
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-5',
    title: 'BBS FI-R Forged Monobloc Centerlock Wheels (Set of 4)',
    brand: 'BBS Wheels',
    category: 'Wheels & Tires',
    price: 9800.00,
    vendor_name: 'Amazon',
    image_url: 'https://images.unsplash.com/photo-1588636142475-a62d56692870?q=80&w=600&auto=format&fit=crop',
    description: 'Forged aerospace-grade aluminum wheels engineered specifically for supercar brake clearance and minimal rotational mass.',
    compatible_makes: ['Porsche', 'BMW', 'Audi', 'Nissan'],
    compatible_models: ['911 GT3', 'M4', 'R8', 'GT-R'],
    rating: 4.9,
    reviews_count: 64,
    purchase_url: 'https://www.amazon.com/bbs-fi-r-wheels',
    in_stock: true,
    hp_gain: 0,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-6',
    title: 'Roush Phase 2 Supercharger Kit 750 HP',
    brand: 'Roush Performance',
    category: 'Supercharger',
    price: 8999.00,
    vendor_name: 'CJ Pony Parts',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=600&auto=format&fit=crop',
    description: 'TV2650 rotor technology producing 750 HP and 670 lb-ft of torque with factory-style fitment.',
    compatible_makes: ['Ford'],
    compatible_models: ['Mustang GT'],
    rating: 4.9,
    reviews_count: 112,
    purchase_url: 'https://www.cjponyparts.com/roush-supercharger',
    in_stock: true,
    hp_gain: 290,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-7',
    title: 'NOS Direct Port Nitrous Injection Kit 150-250 Shot',
    brand: 'Holley NOS',
    category: 'Nitrous',
    price: 1250.00,
    vendor_name: 'AutoZone',
    image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop',
    description: 'Direct fogger nozzle system with progressive electronic nitrous controller for instant quarter-mile spooling.',
    compatible_makes: ['Nissan', 'Toyota', 'Chevrolet', 'Ford'],
    compatible_models: ['GT-R', 'Supra', 'Corvette Z06', 'Mustang GT'],
    rating: 4.7,
    reviews_count: 53,
    purchase_url: 'https://www.autozone.com/nos-nitrous-kit',
    in_stock: true,
    hp_gain: 200,
    created_at: new Date().toISOString()
  },
  {
    id: 'prod-8',
    title: 'Meguiar’s Pro Ceramic Coating & Hyper-Wash Detailing Kit',
    brand: 'Meguiar’s',
    category: 'Cleaning Supplies',
    price: 149.00,
    vendor_name: 'Amazon',
    image_url: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=600&auto=format&fit=crop',
    description: 'SiO2 active hybrid ceramic sealant producing hydrophobic water bead protection and extreme gloss paint reflections.',
    compatible_makes: ['Nissan', 'Toyota', 'Ford', 'Chevrolet', 'BMW', 'Porsche'],
    compatible_models: ['GT-R', 'Supra', 'Mustang GT', 'Corvette Z06', 'M4', '911 GT3'],
    rating: 4.9,
    reviews_count: 520,
    purchase_url: 'https://www.amazon.com/meguiars-ceramic-kit',
    in_stock: true,
    hp_gain: 0,
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
  products: EXTENDED_PRODUCTS,
  cart: [],
  wishlistIds: ['prod-1'],
  orders: INITIAL_ORDERS,
  selectedCategory: 'All',
  selectedVendor: 'All',
  maxBudget: 10000,
  searchQuery: '',

  setCategory: (category) => set({ selectedCategory: category }),
  setVendor: (vendor) => set({ selectedVendor: vendor }),
  setMaxBudget: (budget) => set({ maxBudget: budget }),
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
    const { products, selectedCategory, selectedVendor, maxBudget, searchQuery } = get();
    return products.filter((p) => {
      const matchCategory = selectedCategory === 'All' || p.category === selectedCategory;
      const matchVendor = selectedVendor === 'All' || p.vendor_name === selectedVendor;
      const matchBudget = p.price <= maxBudget;
      const matchSearch =
        searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMake = !vehicleMake || p.compatible_makes.includes(vehicleMake);
      const matchModel = !vehicleModel || p.compatible_models.includes(vehicleModel);

      return matchCategory && matchVendor && matchBudget && matchSearch && matchMake && matchModel;
    });
  }
}));
