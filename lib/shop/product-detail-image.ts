import { resolveStoredProductImageUrl, normalizeProductImages } from "@/lib/shop/product-image-url";

const FALLBACK_PRODUCT_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800";

export function productImageAt(images: unknown, index = 0) {
  const list = normalizeProductImages(images);
  return resolveStoredProductImageUrl(list[index]) || FALLBACK_PRODUCT_IMAGE;
}
