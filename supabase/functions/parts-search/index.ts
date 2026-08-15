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

function providerSearches(vehicle: Vehicle, query: string) {
  const rawTerms = `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim || ""} ${query}`.replace(/\s+/g, " ").trim();
  const terms = encodeURIComponent(rawTerms);
  const make = vehicle.make.toLowerCase();
  const providers = [
    { name: "AutoZone", mode: "direct_search", url: `https://www.autozone.com/searchresult?searchText=${terms}` },
    { name: "Summit Racing", mode: "direct_search", url: `https://www.summitracing.com/search?keyword=${terms}` },
    { name: "Vivid Racing", mode: "direct_search", url: `https://www.vividracing.com/catalogsearch/result/?q=${terms}` },
  ];

  const jdmMakes = new Set(["acura", "honda", "infiniti", "lexus", "mazda", "mitsubishi", "nissan", "scion", "subaru", "suzuki", "toyota"]);
  const americanMakes = new Set(["buick", "cadillac", "chevrolet", "chrysler", "dodge", "ford", "gmc", "jeep", "lincoln", "pontiac", "ram"]);
  const europeanMakes = new Set(["alfa romeo", "audi", "bentley", "bmw", "fiat", "jaguar", "land rover", "mercedes-benz", "mini", "porsche", "saab", "volkswagen", "volvo"]);

  if (jdmMakes.has(make)) {
    providers.push(
      { name: "Enjuku Racing", mode: "direct_search", url: `https://www.enjukuracing.com/search.php?search_query=${terms}` },
      { name: "MAPerformance", mode: "direct_search", url: `https://www.maperformance.com/search?type=product&q=${terms}` },
      { name: "Nengun Performance", mode: "direct_search", url: `https://www.nengun.com/search?q=${terms}` },
    );
  }
  if (americanMakes.has(make)) {
    providers.push(
      { name: "AmericanMuscle", mode: "direct_search", url: `https://www.americanmuscle.com/search?keywords=${terms}` },
      { name: "JEGS", mode: "direct_search", url: `https://www.jegs.com/webapp/wcs/stores/servlet/SearchResultsPageCmd?Ntt=${terms}` },
    );
  }
  if (europeanMakes.has(make)) {
    providers.push(
      { name: "ECS Tuning", mode: "direct_search", url: `https://www.ecstuning.com/Search/SiteSearch/${terms}/` },
      { name: "FCP Euro", mode: "direct_search", url: `https://www.fcpeuro.com/page/search?query=${terms}` },
    );
  }
  return providers;
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
        ...providerSearches(vehicle, cleanQuery),
      ],
    });
  } catch {
    return json({ error: "INVALID_REQUEST" }, 400);
  }
});
