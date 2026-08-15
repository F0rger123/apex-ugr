import "jsr:@supabase/functions-js/edge-runtime.d.ts";

type Vehicle = {
  year: number;
  make: string;
  model: string;
  trim?: string;
  engine?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

let tokenCache: { value: string; expiresAt: number } | null = null;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function vendorSearchUrl(vendor: "autozone" | "americanmuscle", vehicle: Vehicle, query: string) {
  const terms = encodeURIComponent(`${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""} ${query}`.trim());
  if (vendor === "autozone") return `https://www.autozone.com/searchresult?searchText=${terms}`;
  return `https://www.americanmuscle.com/search?keywords=${terms}`;
}

async function getEbayToken() {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 60_000) return tokenCache.value;
  const clientId = Deno.env.get("EBAY_CLIENT_ID");
  const clientSecret = Deno.env.get("EBAY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("EBAY_NOT_CONFIGURED");

  const response = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });
  if (!response.ok) throw new Error(`EBAY_AUTH_${response.status}`);
  const payload = await response.json();
  tokenCache = { value: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
  return tokenCache.value;
}

async function searchEbay(vehicle: Vehicle, query: string) {
  const token = await getEbayToken();
  const compatibility = [
    `Year:${vehicle.year}`,
    `Make:${vehicle.make}`,
    `Model:${vehicle.model}`,
    vehicle.trim ? `Trim:${vehicle.trim}` : "",
    vehicle.engine ? `Engine:${vehicle.engine}` : "",
  ].filter(Boolean).join(";");
  const url = new URL("https://api.ebay.com/buy/browse/v1/item_summary/search");
  url.searchParams.set("q", query);
  url.searchParams.set("category_ids", "6030");
  url.searchParams.set("compatibility_filter", compatibility);
  url.searchParams.set("filter", "buyingOptions:{FIXED_PRICE},itemEndDate:[NOW..]");
  url.searchParams.set("limit", "30");

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });
  if (!response.ok) throw new Error(`EBAY_SEARCH_${response.status}`);
  const payload = await response.json();
  return (payload.itemSummaries || [])
    .filter((item: any) => item.compatibilityMatch !== "NOT_COMPATIBLE")
    .map((item: any) => ({
      id: item.itemId,
      provider: "eBay Motors",
      title: item.title,
      imageUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null,
      price: Number(item.price?.value || 0),
      currency: item.price?.currency || "USD",
      condition: item.condition || null,
      seller: item.seller?.username || null,
      shipping: item.shippingOptions?.[0]?.shippingCost?.value === "0.00" ? "Free shipping" : null,
      purchaseUrl: item.itemWebUrl,
      compatibility: item.compatibilityMatch || (item.compatibilityProperties?.length ? "MATCHED" : "UNVERIFIED"),
    }));
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  try {
    const { vehicle, query = "performance parts" } = await request.json() as { vehicle: Vehicle; query?: string };
    if (!vehicle || !Number.isInteger(vehicle.year) || !vehicle.make?.trim() || !vehicle.model?.trim()) {
      return json({ error: "VALID_VEHICLE_REQUIRED" }, 400);
    }
    const cleanQuery = String(query).trim().slice(0, 80) || "performance parts";
    let ebayItems: unknown[] = [];
    let ebayStatus: "live" | "credentials_required" | "unavailable" = "live";
    try {
      ebayItems = await searchEbay(vehicle, cleanQuery);
    } catch (error) {
      ebayStatus = error instanceof Error && error.message === "EBAY_NOT_CONFIGURED" ? "credentials_required" : "unavailable";
    }

    return json({
      vehicle,
      query: cleanQuery,
      products: ebayItems,
      providers: [
        { name: "eBay Motors", mode: ebayStatus },
        { name: "AutoZone", mode: "vendor_search", url: vendorSearchUrl("autozone", vehicle, cleanQuery) },
        { name: "AmericanMuscle", mode: "vendor_search", url: vendorSearchUrl("americanmuscle", vehicle, cleanQuery) },
      ],
    });
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
});
