"use client";

import {
  SCALAR_INVENTORY_KEY,
  type InventorySlot,
  type SizeInventoryMap,
  emptySlot,
  formatInventorySummary,
  getInventoryBadgeLevel,
  inventoryBadgeClass,
  inventoryBadgeLabel,
  parseSizeInventory,
  sumInventory,
} from "@/lib/shop/inventory";

type Props = {
  sizes: string[];
  isSizedMerch: boolean;
  isScalarReward: boolean;
  sizeInventory: SizeInventoryMap | null;
  unlimited: boolean;
  disabled?: boolean;
  onChange: (map: SizeInventoryMap | null, unlimited: boolean) => void;
};

function slotFromMap(map: SizeInventoryMap | null, key: string): InventorySlot {
  return map?.[key] ?? emptySlot(0);
}

export function AdminInventoryFields({
  sizes,
  isSizedMerch,
  isScalarReward,
  sizeInventory,
  unlimited,
  disabled = false,
  onChange,
}: Props) {
  const keys = isScalarReward
    ? [SCALAR_INVENTORY_KEY]
    : isSizedMerch
      ? sizes.length > 0
        ? sizes
        : ["S", "M", "L", "XL"]
      : [SCALAR_INVENTORY_KEY];

  const totals = sumInventory(sizeInventory);
  const badge = getInventoryBadgeLevel(totals?.available ?? (unlimited ? null : 0));

  function updateSlot(key: string, field: keyof InventorySlot, value: number) {
    const next = { ...(sizeInventory ?? {}) };
    const current = slotFromMap(next, key);
    const updated = { ...current, [field]: Math.max(0, value) };

    if (field === "total") {
      const delta = value - current.total;
      updated.available = Math.max(0, current.available + delta);
      updated.total = value;
    }

    next[key] = updated;
    onChange(next, false);
  }

  function restockAll() {
    const next: SizeInventoryMap = {};
    for (const key of keys) {
      const current = slotFromMap(sizeInventory, key);
      next[key] = {
        total: current.total,
        available: current.total,
        reserved: 0,
        sold: current.sold,
      };
    }
    onChange(next, false);
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Inventory</p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] ${inventoryBadgeClass(badge)}`}
        >
          {unlimited ? "Unlimited" : inventoryBadgeLabel(badge)}
        </span>
      </div>

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={unlimited}
          disabled={disabled}
          onChange={(e) => onChange(null, e.target.checked)}
        />
        Unlimited inventory
      </label>

      {!unlimited ? (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {keys.map((key) => {
              const label = key === SCALAR_INVENTORY_KEY ? "Units" : key;
              const slot = slotFromMap(sizeInventory, key);
              return (
                <div
                  key={key}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[9px] text-zinc-600">Total</span>
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={slot.total}
                        onChange={(e) => updateSlot(key, "total", Number(e.target.value))}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[9px] text-zinc-600">Available</span>
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={slot.available}
                        onChange={(e) => updateSlot(key, "available", Number(e.target.value))}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm text-white"
                      />
                    </label>
                  </div>
                  <p className="mt-1 text-[9px] text-zinc-600">
                    {slot.reserved} reserved · {slot.sold} sold
                  </p>
                </div>
              );
            })}
          </div>

          {totals ? (
            <p className="text-xs text-zinc-500">{formatInventorySummary(totals.available, totals.reserved, totals.sold)}</p>
          ) : null}

          <button
            type="button"
            disabled={disabled}
            onClick={restockAll}
            className="text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
          >
            Restock all sizes to total
          </button>
        </>
      ) : null}
    </div>
  );
}

export function initSizeInventoryFromProduct(
  product: {
    size_inventory?: unknown;
    inventory_remaining?: number | null;
    sizes?: string[];
    requires_shirt_size?: boolean;
    product_type?: string;
  } | undefined,
  isCreditReward: boolean,
): { map: SizeInventoryMap | null; unlimited: boolean } {
  const parsed = parseSizeInventory(product?.size_inventory);
  if (parsed && Object.keys(parsed).length > 0) {
    return { map: parsed, unlimited: false };
  }

  if (product?.inventory_remaining == null) {
    return { map: null, unlimited: true };
  }

  const scalar = product.inventory_remaining;
  if (isCreditReward && product.requires_shirt_size && product.sizes?.length) {
    const perSize = Math.floor(scalar / product.sizes.length);
    const map: SizeInventoryMap = {};
    for (const size of product.sizes) {
      map[size] = emptySlot(perSize);
    }
    return { map, unlimited: false };
  }

  return { map: { [SCALAR_INVENTORY_KEY]: emptySlot(scalar) }, unlimited: false };
}
