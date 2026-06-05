import { SHOP_PRODUCT_IMAGES_BUCKET } from "@/lib/shop/product-images";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

/** Public storage base: …/storage/v1/object/public/shop-product-images */
export function shopProductImagesPublicBase(): string | null {
  if (!SUPABASE_URL) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${SHOP_PRODUCT_IMAGES_BUCKET}`;
}

/** Build a public URL from a storage object path (no bucket prefix). */
export function shopProductImagePublicUrl(objectPath: string | null | undefined): string | null {
  const path = objectPath?.trim().replace(/^\//, "");
  if (!path) return null;

  const base = shopProductImagesPublicBase();
  if (!base) return path;

  if (path.startsWith(`${SHOP_PRODUCT_IMAGES_BUCKET}/`)) {
    return `${SUPABASE_URL}/storage/v1/object/public/${path}`;
  }

  return `${base}/${path}`;
}

/** Parse Postgres text[] literal: {"url1","url2"} or {url1,url2} */
function parsePostgresTextArrayLiteral(raw: string): string[] {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) return [];

  const inner = trimmed.slice(1, -1).trim();
  if (!inner) return [];

  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < inner.length; i += 1) {
    const char = inner[i];

    if (char === '"') {
      if (inQuotes && inner[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      const piece = current.trim();
      if (piece) values.push(piece);
      current = "";
      continue;
    }

    current += char;
  }

  const tail = current.trim();
  if (tail) values.push(tail);

  return values;
}

/** Normalize products.images from DB (string[], JSON, Postgres literal, or object entries). */
export function normalizeProductImages(raw: unknown): string[] {
  if (raw == null) return [];

  if (Array.isArray(raw)) {
    return raw.flatMap((item) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        if (!trimmed) return [];
        if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
          return parsePostgresTextArrayLiteral(trimmed);
        }
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
          try {
            return normalizeProductImages(JSON.parse(trimmed) as unknown);
          } catch {
            return [trimmed];
          }
        }
        return [trimmed];
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
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return parsePostgresTextArrayLiteral(trimmed);
    }
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

function extractStorageObjectPath(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const publicMarker = `/storage/v1/object/public/${SHOP_PRODUCT_IMAGES_BUCKET}/`;
  const publicIdx = trimmed.indexOf(publicMarker);
  if (publicIdx >= 0) {
    const path = trimmed.slice(publicIdx + publicMarker.length).split("?")[0]?.replace(/^\//, "");
    return path || null;
  }

  const bucketMarker = `${SHOP_PRODUCT_IMAGES_BUCKET}/`;
  if (trimmed.includes(bucketMarker)) {
    const path = trimmed.split(bucketMarker).pop()?.split("?")[0]?.replace(/^\//, "");
    return path || null;
  }

  if (!trimmed.includes("/") && !trimmed.includes("://")) {
    return trimmed.replace(/^\//, "");
  }

  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("//")) {
    return trimmed.replace(/^\//, "");
  }

  return null;
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
    return raw.split("?")[0] ?? raw;
  }

  if (raw.startsWith("//")) {
    return `https:${raw.split("?")[0]}`;
  }

  if (raw.includes("/storage/v1/object/public/")) {
    if (raw.startsWith("http")) {
      return raw.split("?")[0] ?? raw;
    }
    if (SUPABASE_URL) {
      const path = raw.startsWith("/") ? raw : `/${raw}`;
      return `${SUPABASE_URL}${path}`.split("?")[0] ?? null;
    }
    return raw;
  }

  const objectPath = extractStorageObjectPath(raw);
  if (objectPath) {
    return shopProductImagePublicUrl(objectPath);
  }

  if (!SUPABASE_URL) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[shop-image] NEXT_PUBLIC_SUPABASE_URL missing; cannot resolve path:", raw);
    }
    return null;
  }

  return shopProductImagePublicUrl(raw);
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
export function resolveLineImageUrl(
  line:
    | {
        product_image_url?: string | null;
        image_display_url?: string | null;
        image_thumbnail_url?: string | null;
      }
    | null
    | undefined,
): string | null {
  if (!line) return null;
  return (
    resolveStoredProductImageUrl(line.image_display_url) ??
    resolveStoredProductImageUrl(line.image_thumbnail_url) ??
    resolveStoredProductImageUrl(line.product_image_url)
  );
}

/** Dev helper: describe raw products.images shape for debugging. */
export function describeProductImagesRaw(raw: unknown) {
  const normalized = normalizeProductImages(raw);
  return {
    rawType: raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw,
    rawPreview: typeof raw === "string" ? raw.slice(0, 120) : raw,
    normalizedCount: normalized.length,
    firstRaw: normalized[0] ?? null,
    firstResolved: resolveProductImageUrl(raw),
  };
}
