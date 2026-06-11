import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SCALAR_INVENTORY_KEY,
  getSizeAvailable,
  isPerSizeInventoryMap,
  parseSizeInventory,
  sizeKeysFromMap,
} from "@/lib/shop/inventory";
import type { CheckoutCartItemPayload, ShopDeliveryMethod } from "@/lib/shop/orders";
import { computeShippingCents } from "@/lib/shop/shipping";
import { resolveProductImageFields, describeProductImagesRaw } from "@/lib/shop/product-image-url";
import { isMerchProduct } from "@/lib/products";

type ProductRow = {
  id: string;
  name: string;
  price: number;
  status: string;
  product_type: string;
  images: string[] | null;
  sizes: string[] | null;
  size_inventory: unknown;
};

export type ValidatedCheckoutLine = {
  product_id: string;
  product_name: string;
  product_image_url: string | null;
  image_display_url: string | null;
  image_thumbnail_url: string | null;
  size: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  available: number | null;
};

export type CheckoutCartValidationError = {
  product_id: string;
  size: string;
  code: string;
  message: string;
};

export type CheckoutCartValidationResult = {
  ok: boolean;
  items: ValidatedCheckoutLine[];
  errors: CheckoutCartValidationError[];
  delivery_method: ShopDeliveryMethod;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
};

function priceToCents(price: number): number {
  if (!Number.isFinite(price)) return 0;
  return Math.round(price * 100);
}

function purchasableStatuses(status: string) {
  return status === "in_stock" || status === "waitlist";
}

function isCashPurchasableProduct(
  product: Pick<ProductRow, "product_type" | "price">,
  options?: { allowCreditRewardCashPurchase?: boolean },
) {
  if (isMerchProduct({ product_type: product.product_type as "cash_product" | "credit_reward" })) {
    return true;
  }
  return (
    Boolean(options?.allowCreditRewardCashPurchase) &&
    product.product_type === "credit_reward" &&
    Number(product.price) > 0
  );
}

export async function validateCheckoutCart(
  supabase: SupabaseClient,
  cartItems: CheckoutCartItemPayload[],
  deliveryMethod: ShopDeliveryMethod = "shipping",
  options?: { allowCreditRewardCashPurchase?: boolean },
): Promise<CheckoutCartValidationResult> {
  const errors: CheckoutCartValidationError[] = [];
  const validated: ValidatedCheckoutLine[] = [];

  if (!cartItems.length) {
    return {
      ok: false,
      items: [],
      errors: [{ product_id: "", size: "", code: "empty_cart", message: "Your bag is empty." }],
      subtotal_cents: 0,
      shipping_cents: 0,
      total_cents: 0,
      delivery_method: deliveryMethod,
    };
  }

  const productIds = [...new Set(cartItems.map((i) => i.product_id))];

  const { data: products, error } = await supabase
    .from("products")
    .select("id, name, price, status, product_type, images, sizes, size_inventory")
    .in("id", productIds);

  if (error) {
    return {
      ok: false,
      items: [],
      errors: [
        {
          product_id: "",
          size: "",
          code: "database_error",
          message: error.message,
        },
      ],
      subtotal_cents: 0,
      shipping_cents: 0,
      total_cents: 0,
      delivery_method: deliveryMethod,
    };
  }

  const productMap = new Map((products as ProductRow[] | null)?.map((p) => [p.id, p]) ?? []);

  for (const line of cartItems) {
    const productId = line.product_id?.trim();
    const size = line.size?.trim() ?? "";
    const quantity = Math.trunc(Number(line.quantity));

    if (!productId) {
      errors.push({
        product_id: "",
        size,
        code: "invalid_product",
        message: "Invalid product in bag.",
      });
      continue;
    }

    if (!size) {
      errors.push({
        product_id: productId,
        size,
        code: "size_required",
        message: "Select a size for each item.",
      });
      continue;
    }

    if (!Number.isFinite(quantity) || quantity < 1) {
      errors.push({
        product_id: productId,
        size,
        code: "invalid_quantity",
        message: "Quantity must be at least 1.",
      });
      continue;
    }

    const product = productMap.get(productId);
    if (!product) {
      errors.push({
        product_id: productId,
        size,
        code: "not_found",
        message: "Product no longer exists.",
      });
      continue;
    }

    if (!isCashPurchasableProduct(product, options)) {
      errors.push({
        product_id: productId,
        size,
        code: "not_merch",
        message: "Credit rewards cannot be purchased in the shop bag.",
      });
      continue;
    }

    if (!purchasableStatuses(product.status)) {
      errors.push({
        product_id: productId,
        size,
        code: "unavailable",
        message: `${product.name} is not available for purchase.`,
      });
      continue;
    }

    const sizeMap = parseSizeInventory(product.size_inventory);
    const perSizeKeys = sizeKeysFromMap(sizeMap);
    const catalogSizes = product.sizes?.length ? product.sizes : [];

    if (perSizeKeys.length > 0 || catalogSizes.length > 0) {
      const allowed =
        perSizeKeys.length > 0
          ? perSizeKeys
          : catalogSizes;
      if (!allowed.includes(size)) {
        errors.push({
          product_id: productId,
          size,
          code: "invalid_size",
          message: `Size ${size} is not available for ${product.name}.`,
        });
        continue;
      }
    }

    if (sizeMap && isPerSizeInventoryMap(sizeMap)) {
      const available = getSizeAvailable(sizeMap, size);
      if (available !== null && available < quantity) {
        errors.push({
          product_id: productId,
          size,
          code: "insufficient_stock",
          message:
            available <= 0
              ? `Size ${size} is out of stock for ${product.name}.`
              : `Only ${available} left in size ${size} for ${product.name}.`,
        });
        continue;
      }
    } else if (sizeMap) {
      const available = getSizeAvailable(sizeMap, SCALAR_INVENTORY_KEY);
      if (available !== null && available < quantity) {
        errors.push({
          product_id: productId,
          size,
          code: "insufficient_stock",
          message: `Not enough stock for ${product.name}.`,
        });
        continue;
      }
    }

    const unitPriceCents = priceToCents(Number(product.price));
    if (unitPriceCents <= 0) {
      errors.push({
        product_id: productId,
        size,
        code: "invalid_price",
        message: `${product.name} is not available for purchase at this price. Contact support if this persists.`,
      });
      continue;
    }

    const lineTotalCents = unitPriceCents * quantity;
    const available =
      sizeMap && isPerSizeInventoryMap(sizeMap)
        ? getSizeAvailable(sizeMap, size)
        : sizeMap
          ? getSizeAvailable(sizeMap, SCALAR_INVENTORY_KEY)
          : null;

    const imageFields = resolveProductImageFields(product.images);
    if (!imageFields.product_image_url) {
      const debug = describeProductImagesRaw(product.images);
      if (debug.normalizedCount > 0) {
        console.warn("[shop-image] could not resolve product image", {
          product_id: productId,
          ...debug,
        });
      }
    }

    validated.push({
      product_id: productId,
      product_name: product.name,
      ...imageFields,
      size,
      quantity,
      unit_price_cents: unitPriceCents,
      line_total_cents: lineTotalCents,
      available,
    });
  }

  const subtotal_cents = validated.reduce((sum, line) => sum + line.line_total_cents, 0);
  const shipping_cents = computeShippingCents(subtotal_cents, deliveryMethod);
  const total_cents = subtotal_cents + shipping_cents;

  if (validated.length > 0 && subtotal_cents <= 0) {
    errors.push({
      product_id: "",
      size: "",
      code: "zero_subtotal",
      message: "Your bag total must be greater than $0 to checkout.",
    });
  }

  return {
    ok: errors.length === 0 && validated.length === cartItems.length && subtotal_cents > 0,
    items: validated,
    errors,
    delivery_method: deliveryMethod,
    subtotal_cents,
    shipping_cents,
    total_cents,
  };
}
