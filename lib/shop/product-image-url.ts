import { SHOP_PRODUCT_IMAGES_BUCKET } from "@/lib/shop/product-images";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

/** Normalize products.images from DB (string[], JSON, or object entries). */
export function normalizeProductImages(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed ? [trimmed] : [];
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const candidate =
          record.url ?? record.publicUrl ?? record.public_url ?? record.src ?? record.path;
        if (typeof candidate === "string" && candidate.trim()) {
          return [candidate.trim()];
        }
      }
      return [];
    });
  }

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        return normalizeProductImages(JSON.parse(trimmed) as unknown);
      } catch {
        return [trimmed];
      }
    }
    return [trimmed];
  }

  return [];
}

/**
 * Resolves the first product image URL for shop display, validation, and order snapshots.
 * Handles full public URLs and Supabase storage paths.
 */
export function resolveProductImageUrl(images: unknown): string | null {
  const list = normalizeProductImages(images);
  const raw = list[0];
  if (!raw) return null;

  return resolveStoredProductImageUrl(raw);
}

/** Resolve a single stored URL or storage path (e.g. shop_order_items.product_image_url). */
export function resolveStoredProductImageUrl(stored: string | null | undefined): string | null {
  const raw = stored?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  if (!SUPABASE_URL) return raw;

  if (raw.includes(`${SHOP_PRODUCT_IMAGES_BUCKET}/`)) {
    const path = raw.split(`${SHOP_PRODUCT_IMAGES_BUCKET}/`).pop()?.replace(/^\//, "");
    if (path) {
      return `${SUPABASE_URL}/storage/v1/object/public/${SHOP_PRODUCT_IMAGES_BUCKET}/${path}`;
    }
  }

  if (raw.includes("/storage/v1/object/public/")) {
    return raw.startsWith("http") ? raw : `${SUPABASE_URL}${raw.startsWith("/") ? "" : "/"}${raw}`;
  }

  const path = raw.replace(/^\//, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${SHOP_PRODUCT_IMAGES_BUCKET}/${path}`;
}

/** Fields returned by checkout validation for cart UI. */
export function resolveProductImageFields(images: unknown) {
  const url = resolveProductImageUrl(images);
  return {
    product_image_url: url,
    image_display_url: url,
    image_thumbnail_url: url,
  };
}

/** Pick the best resolved image URL from a validated line or stored snapshot. */
export function resolveLineImageUrl(line: {
  product_image_url?: string | null;
  image_display_url?: string | null;
  image_thumbnail_url?: string | null;
} | null | undefined): string | null {
  if (!line) return null;
  return (
    resolveStoredProductImageUrl(line.image_display_url) ??
    resolveStoredProductImageUrl(line.image_thumbnail_url) ??
    resolveStoredProductImageUrl(line.product_image_url)
  );
}
