export type ProductCondition = "new" | "like_new" | "lightly_used" | "used";
export type ItemCondition = "like_new" | "good" | "fair" | "poor";

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort: number;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category_id: string;
  condition: ProductCondition;
  description: string;
  specs: Record<string, string>;
  fits: string[];
  price_cents: number;
  compare_at_cents: number | null;
  stock: number;
  image_url: string | null;
  featured: boolean;
  source: "retail" | "trade_in";
  condition_note: string | null;
  categories?: Category;
}

export interface TradeInCatalogEntry {
  id: string;
  category_id: string;
  name: string;
  brand: string;
  base_value_cents: number;
  ebay_comp_cents: number | null;
  comp_confidence: "solid" | "estimated" | null;
  comp_note: string | null;
  active: boolean;
  replaces_with_product_id: string | null;
  upgrade_note: string | null;
  categories?: Category;
  replaces_with?: Pick<Product, "slug" | "name" | "brand" | "price_cents"> | null;
}

export type SwapLikelihood = "very_common" | "common" | "occasional";

export type BikeTier = "halo" | "volume";

export interface BikeModel {
  id: string;
  slug: string;
  brand: string;
  model: string;
  style: string;
  motor: string;
  battery: string;
  years: string;
  blurb: string | null;
  sort: number;
  tier: BikeTier;
}

export interface BikeStockPart {
  id: string;
  bike_id: string;
  catalog_id: string | null;
  component: string;
  stock_part: string;
  swap_likelihood: SwapLikelihood;
  sort: number;
  years: string | null;
  trade_in_catalog?: TradeInCatalogEntry | null;
}

export const SWAP_LIKELIHOOD_LABELS: Record<SwapLikelihood, string> = {
  very_common: "First-month swap",
  common: "Common swap",
  occasional: "Occasional swap",
};

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  brand: string;
  priceCents: number;
  qty: number;
  stock: number;
  condition: ProductCondition;
}

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New",
  like_new: "Like new",
  lightly_used: "Lightly used",
  used: "Used",
};

export const ITEM_CONDITION_LABELS: Record<ItemCondition, string> = {
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  poor: "Rough",
};

// Mirrors the multipliers inside the submit_trade_in RPC.
export const ITEM_CONDITION_MULTIPLIER: Record<ItemCondition, number> = {
  like_new: 1.0,
  good: 0.8,
  fair: 0.6,
  poor: 0.35,
};
