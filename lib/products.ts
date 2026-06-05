import { supabase } from "@/lib/supabase";
import type { SizeInventoryMap } from "@/lib/shop/inventory";

export type Category = "all" | "tees" | "outerwear" | "headwear" | "accessories";

export type ProductType = "cash_product" | "credit_reward";

export type ProductStatus =
  | "in_stock"
  | "out_of_stock"
  | "waitlist"
  | "coming_soon";

export type ProductBadge = "new" | "low-stock" | "sold-out" | "best" | null;

export type Product = {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  price: number;
  category: Exclude<Category, "all">;
  images: string[];
  sizes: string[];
  badge: ProductBadge;
  status: ProductStatus;
  description: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  product_type: ProductType;
  credit_cost: number | null;
  reward_category: "cash" | "community" | null;
  reward_kind: "merch_discount" | "cash_value" | "physical" | null;
  requires_shirt_size: boolean;
  inventory_total: number | null;
  inventory_remaining: number | null;
  size_inventory: SizeInventoryMap | null;
  credit_reward_id: string | null;
};

export const categoryLabels: Record<Category, string> = {
  all: "All",
  tees: "Tees",
  outerwear: "Outerwear",
  headwear: "Headwear",
  accessories: "Accessories",
};

export const formatPrice = (n: number) => {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
};

export const formatCreditCost = (credits: number) =>
  `${credits.toLocaleString()} Credits`;

export const badgeStyle = (b?: Product["badge"]) => {
  if (b === "new") return "border-[#e87a82]/60 bg-[#b4141e]/15 text-[#e87a82]";
  if (b === "low-stock") return "border-amber-500/40 bg-amber-500/10 text-amber-300";
  if (b === "best") return "border-white/30 bg-black/60 text-white";
  if (b === "sold-out") return "border-white/20 bg-black/80 text-white/60";
  return "";
};

export const badgeLabel = (b?: Product["badge"]) => {
  if (b === "new") return "New";
  if (b === "low-stock") return "Low Stock";
  if (b === "best") return "Best Seller";
  if (b === "sold-out") return "Sold Out";
  return "";
};

export function isCreditRewardProduct(product: Pick<Product, "product_type">) {
  return product.product_type === "credit_reward";
}

export function isMerchProduct(product: Pick<Product, "product_type">) {
  return product.product_type !== "credit_reward";
}

export async function fetchProducts(options?: { productType?: ProductType | "all" }) {
  let query = supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (options?.productType && options.productType !== "all") {
    query = query.eq("product_type", options.productType);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Product[];
}

export async function fetchMerchProducts() {
  const all = await fetchProducts();
  return all.filter(isMerchProduct);
}

export async function fetchCreditRewardProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("product_type", "credit_reward")
    .neq("status", "coming_soon")
    .order("sort_order", { ascending: true })
    .order("credit_cost", { ascending: true });

  if (error) throw error;

  return ((data || []) as Product[]).filter((p) => p.credit_reward_id);
}

export async function fetchProductById(id: string) {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data as Product | null) ?? null;
}

export function getProduct(id: string, productList?: Product[]) {
  if (!productList) return null;
  return productList.find((p) => p.id === id) ?? null;
}
