import { SHOP_PRODUCT_IMAGES_BUCKET } from "@/lib/shop/product-images";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

/**
 * Resolves the first product image URL for shop display and validation payloads.
 * Handles full URLs and storage object paths stored in products.images[].
 */
export function resolveProductImageUrl(images: string[] | null | undefined): string | null {
  const raw = images?.[0]?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (!SUPABASE_URL) return raw;

  const path = raw.replace(/^\//, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${SHOP_PRODUCT_IMAGES_BUCKET}/${path}`;
}

/** Alias used by cart/checkout validation responses. */
export function resolveProductImageFields(images: string[] | null | undefined) {
  const url = resolveProductImageUrl(images);
  return {
    product_image_url: url,
    image_display_url: url,
    image_thumbnail_url: url,
  };
}
