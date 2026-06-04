"use client";

import { useMemo, useState } from "react";
import { ProductImageManager } from "@/components/admin/shop/ProductImageManager";
import {
  Category,
  Product,
  ProductBadge,
  ProductStatus,
  ProductType,
  formatCreditCost,
  formatPrice,
} from "@/lib/products";

const STATUS_OPTIONS: { value: ProductStatus; label: string }[] = [
  { value: "in_stock", label: "In stock" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "waitlist", label: "Waitlist" },
  { value: "coming_soon", label: "Coming soon" },
];

type Draft = Partial<Product> & {
  product_type: ProductType;
  name: string;
  description: string;
  status: ProductStatus;
  images: string[];
};

type Props = {
  product?: Product;
  isNew?: boolean;
  disabled?: boolean;
  onSave: (patch: Partial<Product>) => Promise<void>;
  onDelete?: () => void;
  onCancel?: () => void;
};

function labelClass() {
  return "mb-2 block text-[10px] uppercase tracking-[0.22em] text-zinc-500";
}

function inputClass() {
  return "w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60 disabled:opacity-50";
}

export function AdminProductEditor({
  product,
  isNew = false,
  disabled = false,
  onSave,
  onDelete,
  onCancel,
}: Props) {
  const initialType: ProductType =
    isNew ? "cash_product" : (product?.product_type ?? "cash_product");
  const [productType, setProductType] = useState<ProductType>(initialType);
  const [draft, setDraft] = useState<Draft>(() => ({
    product_type: initialType,
    name: product?.name ?? "",
    description: product?.description ?? "",
    status: product?.status ?? "coming_soon",
    images: product?.images ?? [],
    price: product?.price ?? 0,
    sizes: product?.sizes ?? ["S", "M", "L", "XL"],
    credit_cost: product?.credit_cost ?? 100,
    reward_category: product?.reward_category ?? "community",
    requires_shirt_size: product?.requires_shirt_size ?? false,
    inventory_remaining: product?.inventory_remaining,
    inventory_total: product?.inventory_total,
    slug: product?.slug,
    sort_order: product?.sort_order ?? 0,
    tagline: product?.tagline ?? "",
    badge: product?.badge ?? null,
    category: product?.category ?? "accessories",
    credit_reward_id: product?.credit_reward_id ?? null,
  }));
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isCreditReward = productType === "credit_reward";

  const title = isNew
    ? "New product"
    : isCreditReward
      ? "Credit reward"
      : "Merch product";

  const [inventoryInput, setInventoryInput] = useState(() =>
    product?.inventory_remaining == null ? "" : String(product.inventory_remaining),
  );

  const advancedItems = useMemo(() => {
    const items: { label: string; value: string }[] = [];
    if (draft.slug) items.push({ label: "Slug", value: draft.slug });
    if (draft.sort_order != null) items.push({ label: "Sort order", value: String(draft.sort_order) });
    if (product?.id) items.push({ label: "Product ID", value: product.id });
    if (draft.credit_reward_id) items.push({ label: "Reward link ID", value: draft.credit_reward_id });
    return items;
  }, [draft.slug, draft.sort_order, draft.credit_reward_id, product?.id]);

  function selectProductType(nextType: ProductType) {
    setProductType(nextType);
    setDraft((current) => ({
      ...current,
      product_type: nextType,
      ...(nextType === "credit_reward"
        ? {
            credit_cost: current.credit_cost ?? 100,
            reward_category: current.reward_category ?? "community",
            price: 0,
          }
        : {
            price: current.price ?? 0,
            sizes: current.sizes?.length ? current.sizes : ["S", "M", "L", "XL"],
          }),
    }));
  }

  async function handleSave() {
    if (!draft.name.trim()) return;
    if (isCreditReward && (!draft.credit_cost || draft.credit_cost <= 0)) return;

    setSaving(true);
    try {
      const patch: Partial<Product> = {
        product_type: productType,
        name: draft.name.trim(),
        description: draft.description.trim(),
        status: draft.status,
        images: draft.images,
        inventory_remaining: inventoryInput === "" ? null : Number(inventoryInput),
        inventory_total: inventoryInput === "" ? null : Number(inventoryInput),
      };

      if (isCreditReward) {
        patch.price = 0;
        patch.credit_cost = Number(draft.credit_cost) || 0;
        patch.reward_category = draft.reward_category ?? "community";
        patch.reward_kind =
          draft.reward_category === "cash" ? "merch_discount" : "physical";
        patch.requires_shirt_size = Boolean(draft.requires_shirt_size);
        patch.sizes = draft.requires_shirt_size ? ["S", "M", "L", "XL", "2XL"] : [];
        patch.category = "accessories";
      } else {
        patch.price = Number(draft.price) || 0;
        patch.sizes = draft.sizes ?? [];
        patch.credit_cost = null;
        patch.reward_category = null;
        patch.reward_kind = null;
        patch.requires_shirt_size = false;
        if (advancedOpen) {
          patch.tagline = draft.tagline ?? "";
          patch.badge = draft.badge ?? null;
          patch.category = draft.category ?? "tees";
          if (draft.slug?.trim()) patch.slug = draft.slug.trim();
          patch.sort_order = Number(draft.sort_order) || 0;
        }
      }

      if (advancedOpen && isCreditReward) {
        if (draft.slug?.trim()) patch.slug = draft.slug.trim();
        patch.sort_order = Number(draft.sort_order) || 0;
      }

      if (isNew && !patch.slug) {
        patch.slug = `${isCreditReward ? "reward" : "merch"}-${Date.now()}`;
      }

      await onSave(patch);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[#e87a82]">{title}</p>
          {!isNew && product ? (
            <p className="mt-1 text-sm text-zinc-500">{product.name}</p>
          ) : null}
        </div>
        {isNew && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10px] uppercase tracking-[0.18em] text-zinc-500 hover:text-zinc-300"
          >
            Cancel
          </button>
        ) : null}
      </div>

      <div className="mb-6">
        <p className={labelClass()}>Product type</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { id: "cash_product" as const, label: "Merch product" },
              { id: "credit_reward" as const, label: "Credit reward" },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={disabled || saving}
              onClick={() => selectProductType(option.id)}
              className={`rounded-xl border px-4 py-3 text-left text-xs uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
                productType === option.id
                  ? "border-[#b4141e]/55 bg-[#b4141e]/15 text-[#f1c3c7]"
                  : "border-white/10 text-zinc-500 hover:border-white/20"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          Merch appears in Shop → Merch. Credit rewards appear in Shop → Credit Rewards. You can
          change type when editing; past redemptions are kept.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <label className={labelClass()}>{isCreditReward ? "Reward name" : "Name"}</label>
            <input
              value={draft.name}
              disabled={disabled || saving}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              className={inputClass()}
              placeholder={isCreditReward ? "Sticker Pack" : "Silent Movement Shirt"}
            />
          </div>

          <div>
            <label className={labelClass()}>Description</label>
            <textarea
              rows={4}
              value={draft.description}
              disabled={disabled || saving}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className={inputClass()}
            />
          </div>

          {product?.id ? (
            <ProductImageManager
              productId={product.id}
              images={draft.images}
              disabled={disabled || saving}
              onImagesChange={(images) => setDraft((d) => ({ ...d, images }))}
            />
          ) : (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-xs text-zinc-500">
              Save the product first, then upload images.
            </p>
          )}
        </div>

        <div className="space-y-4">
          {isCreditReward ? (
            <>
              <div>
                <label className={labelClass()}>Credit cost</label>
                <input
                  type="number"
                  min={1}
                  value={draft.credit_cost ?? 0}
                  disabled={disabled || saving}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, credit_cost: Number(e.target.value) }))
                  }
                  className={inputClass()}
                />
                <p className="mt-1 text-xs text-[#e87a82]">
                  {formatCreditCost(draft.credit_cost ?? 0)}
                </p>
              </div>
              <div>
                <label className={labelClass()}>Reward category</label>
                <select
                  value={draft.reward_category ?? "community"}
                  disabled={disabled || saving}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      reward_category: e.target.value as "cash" | "community",
                    }))
                  }
                  className={inputClass()}
                >
                  <option value="cash" className="bg-black">
                    Cash
                  </option>
                  <option value="community" className="bg-black">
                    Community
                  </option>
                </select>
              </div>
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={Boolean(draft.requires_shirt_size)}
                  disabled={disabled || saving}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, requires_shirt_size: e.target.checked }))
                  }
                />
                <span className="text-sm text-zinc-300">Requires shirt size</span>
              </label>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass()}>Price</label>
                <input
                  type="number"
                  min={0}
                  value={draft.price ?? 0}
                  disabled={disabled || saving}
                  onChange={(e) => setDraft((d) => ({ ...d, price: Number(e.target.value) }))}
                  className={inputClass()}
                />
                <p className="mt-1 text-xs text-[#e87a82]">{formatPrice(draft.price ?? 0)}</p>
              </div>
              <div>
                <label className={labelClass()}>Sizes</label>
                <input
                  value={(draft.sizes ?? []).join(", ")}
                  disabled={disabled || saving}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      sizes: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  placeholder="S, M, L, XL"
                  className={inputClass()}
                />
              </div>
            </>
          )}

          <div>
            <label className={labelClass()}>Inventory</label>
            <input
              type="number"
              min={0}
              value={inventoryInput}
              disabled={disabled || saving}
              onChange={(e) => setInventoryInput(e.target.value)}
              placeholder="Leave empty for unlimited"
              className={inputClass()}
            />
            <p className="mt-1 text-[10px] text-zinc-600">Units available to redeem or sell.</p>
          </div>

          <div>
            <label className={labelClass()}>Status</label>
            <select
              value={draft.status}
              disabled={disabled || saving}
              onChange={(e) =>
                setDraft((d) => ({ ...d, status: e.target.value as ProductStatus }))
              }
              className={inputClass()}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-black">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            disabled={disabled || saving || !draft.name.trim()}
            onClick={() => void handleSave()}
            className="w-full rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#f1c3c7] disabled:opacity-50"
          >
            {saving ? "Saving…" : isNew ? "Create product" : "Save changes"}
          </button>

          {!isNew && onDelete ? (
            <button
              type="button"
              disabled={disabled || saving}
              onClick={onDelete}
              className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-red-300"
            >
              Delete product
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
        >
          {advancedOpen ? "Hide advanced details" : "Advanced details"}
        </button>

        {advancedOpen ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass()}>Slug</label>
              <input
                value={draft.slug ?? ""}
                disabled={disabled || saving}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                className={inputClass()}
              />
            </div>
            <div>
              <label className={labelClass()}>Sort order</label>
              <input
                type="number"
                value={draft.sort_order ?? 0}
                disabled={disabled || saving}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, sort_order: Number(e.target.value) }))
                }
                className={inputClass()}
              />
            </div>
            {!isCreditReward ? (
              <>
                <div>
                  <label className={labelClass()}>Tagline</label>
                  <input
                    value={draft.tagline ?? ""}
                    disabled={disabled || saving}
                    onChange={(e) => setDraft((d) => ({ ...d, tagline: e.target.value }))}
                    className={inputClass()}
                  />
                </div>
                <div>
                  <label className={labelClass()}>Merch category</label>
                  <select
                    value={draft.category ?? "tees"}
                    disabled={disabled || saving}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        category: e.target.value as Exclude<Category, "all">,
                      }))
                    }
                    className={inputClass()}
                  >
                    <option value="tees" className="bg-black">
                      Tees
                    </option>
                    <option value="outerwear" className="bg-black">
                      Outerwear
                    </option>
                    <option value="headwear" className="bg-black">
                      Headwear
                    </option>
                    <option value="accessories" className="bg-black">
                      Accessories
                    </option>
                  </select>
                </div>
                <div>
                  <label className={labelClass()}>Badge</label>
                  <select
                    value={draft.badge ?? ""}
                    disabled={disabled || saving}
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        badge: (e.target.value || null) as ProductBadge,
                      }))
                    }
                    className={inputClass()}
                  >
                    <option value="" className="bg-black">
                      None
                    </option>
                    <option value="new" className="bg-black">
                      New
                    </option>
                    <option value="low-stock" className="bg-black">
                      Low stock
                    </option>
                    <option value="best" className="bg-black">
                      Best seller
                    </option>
                    <option value="sold-out" className="bg-black">
                      Sold out
                    </option>
                  </select>
                </div>
              </>
            ) : null}
            {advancedItems.length > 0 ? (
              <div className="sm:col-span-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2 font-mono text-[10px] text-zinc-500">
                {advancedItems.map((item) => (
                  <p key={item.label}>
                    <span className="text-zinc-600">{item.label}: </span>
                    <span className="break-all text-zinc-400">{item.value}</span>
                  </p>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
