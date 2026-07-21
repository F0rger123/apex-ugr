import { useMarketplaceStore } from '../stores/marketplaceStore';

describe('Phase 4 Marketplace & Fitment Verification', () => {
  test('Adding product to cart updates cart quantity and items', () => {
    const { products, addToCart, cart, clearCart } = useMarketplaceStore.getState();
    clearCart();

    const sampleProduct = products[0];
    addToCart(sampleProduct);

    const updatedCart = useMarketplaceStore.getState().cart;
    expect(updatedCart.length).toBe(1);
    expect(updatedCart[0].product.id).toBe(sampleProduct.id);
  });

  test('Checking out cart creates new order with tracking number', () => {
    const { checkoutCart, orders } = useMarketplaceStore.getState();
    const initialOrderCount = orders.length;

    const newOrder = checkoutCart('1042 Apex Speedway Blvd, Los Angeles, CA 90015');

    expect(newOrder.id).toBeDefined();
    expect(newOrder.tracking_number).toContain('APX-');
    expect(useMarketplaceStore.getState().orders.length).toBe(initialOrderCount + 1);
    expect(useMarketplaceStore.getState().cart.length).toBe(0);
  });
});
