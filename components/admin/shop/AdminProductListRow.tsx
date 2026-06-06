"use client";

import Image from "next/image";
import { Product, formatCreditCost, formatPrice, isCreditRewardProduct } from "@/lib/products";
import {
  getInventoryBadgeLevel,
  inventoryBadgeClass,
  inventoryBadgeLabel,
  parseSizeInventory,
  sumInventory,
} from "@/lib/shop/inventory";

type Props = {
  product: Product;
  onEdit: () => void;
};

function statusLabel(status: Product["status"]) {
  switch (status) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    case "waitlist":
      return "Waitlist";
    case "coming_soon":
      return "Coming soon";
    case "archived":
      return "Archived";
  }
}

export function AdminProductListRow({ product, onEdit }: Props) {
  const isReward = isCreditRewardProduct(product);
  const thumb = product.images?.[0] ?? "/icon.png";
  const sizeMap = parseSizeInventory(product.size_inventory);
  const totals = sumInventory(sizeMap);
  const available = totals?.available ?? product.inventory_remaining;
  const badge = getInventoryBadgeLevel(available);

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-3 transition hover:border-white/20 ${
      product.status === "archived"
        ? "border-white/5 bg-white/[0.01] opacity-70"
        : "border-white/10 bg-white/[0.02]"
    }`}>
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black">
        <Image src={thumb} alt="" fill sizes="56px" className="object-cover" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-white">{product.name}</p>
          <span
            className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] ${
              isReward
                ? "border-[#b4141e]/40 bg-[#b4141e]/12 text-[#e87a82]"
                : "border-white/15 bg-white/5 text-zinc-400"
            }`}
          >
            {isReward ? "Credit reward" : "Merch product"}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] ${inventoryBadgeClass(badge)}`}
          >
            {inventoryBadgeLabel(badge)}
          </span>
          {product.status === "archived" ? (
            <span className="rounded-full border border-zinc-600/40 bg-zinc-800/40 px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] text-zinc-400">
              Archived
            </span>
          ) : null}
        </div>

        <p className="mt-1 text-xs text-zinc-500">
          {isReward
            ? formatCreditCost(product.credit_cost ?? 0)
            : formatPrice(product.price)}
          {" · "}
          {available == null
            ? "Inventory: unlimited"
            : `Inventory: ${available} remaining`}
          {totals && totals.reserved > 0 ? ` · ${totals.reserved} reserved` : ""}
          {" · "}
          {statusLabel(product.status)}
        </p>
      </div>

      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 rounded-full border border-white/15 px-4 py-2 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-[#b4141e]/45 hover:text-[#f1c3c7]"
      >
        Edit
      </button>
    </div>
  );
}
