import { Linking, Platform } from 'react-native';
import { MarketplaceProduct } from '../types/database.types';

const VENDOR_SEARCH_URLS: Record<string, string> = {
  'Summit Racing': 'https://www.summitracing.com/search?keyword=',
  AmericanMuscle: 'https://www.americanmuscle.com/search?query=',
  'CJ Pony Parts': 'https://www.cjponyparts.com/search?query=',
  'Tire Rack': 'https://www.tirerack.com/content/tirerack/desktop/en/search.html?query=',
  'eBay Motors': 'https://www.ebay.com/sch/i.html?_nkw=',
  Amazon: 'https://www.amazon.com/s?k=',
};

export const getVendorUrl = (product: MarketplaceProduct) => {
  const candidate = product.purchase_url?.trim();
  if (candidate && /^https?:\/\//i.test(candidate)) return candidate;
  const base = VENDOR_SEARCH_URLS[product.vendor_name] || 'https://www.google.com/search?q=';
  return `${base}${encodeURIComponent(`${product.brand} ${product.title}`)}`;
};

export const openVendorUrl = async (product: MarketplaceProduct) => {
  const url = getVendorUrl(product);
  if (Platform.OS === 'web') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return true;
  }
  if (!(await Linking.canOpenURL(url))) return false;
  await Linking.openURL(url);
  return true;
};
