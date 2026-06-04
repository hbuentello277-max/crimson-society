"use client";

import { useState } from "react";
import {
  SCALAR_INVENTORY_KEY,
  STANDARD_SHIRT_SIZES,
  type InventorySlot,
  type SizeInventoryMap,
  emptySlot,
  formatInventorySummary,
  getInventoryBadgeLevel,
  inventoryBadgeClass,
  inventoryBadgeLabel,
  isPerSizeInventoryMap,
  mergeSizeInventoryForSizes,
  migratePerSizeToScalarInventory,
  migrateScalarToPerSizeInventory,
  parseSizeInventory,
  sumInventory,
} from "@/lib/shop/inventory";

export type AdminInventoryMode = "per_size" | "scalar";

type Props = {
  mode: AdminInventoryMode;
  sizes: string[];
  onSizesChange?: (sizes: string[]) => void;
  sizeInventory: SizeInventoryMap | null;
  unlimited: boolean;
  disabled?: boolean;
  onChange: (map: SizeInventoryMap | null, unlimited: boolean) => void;
};

function slotFromMap(map: SizeInventoryMap | null, key: string): InventorySlot {
  return map?.[key] ?? emptySlot(0);
}

export function AdminInventoryFields({
  mode,
  sizes,
  onSizesChange,
  sizeInventory,
  unlimited,
  disabled = false,
  onChange,
}: Props) {
  const [addSizeInput, setAddSizeInput] = useState("");

  const isPerSize = mode === "per_size";
  const sizeKeys = isPerSize ? (sizes.length > 0 ? sizes : [...STANDARD_SHIRT_SIZES]) : [];
  const totals = isPerSize ? sumInventory(sizeInventory) : sumInventory(sizeInventory);
  const badge = getInventoryBadgeLevel(totals?.available ?? (unlimited ? null : 0));

  const scalarSlot = slotFromMap(sizeInventory, SCALAR_INVENTORY_KEY);

  function emit(map: SizeInventoryMap | null, nextUnlimited: boolean) {
    onChange(map, nextUnlimited);
  }

  function emitSizesAndMap(nextSizes: string[], nextMap: SizeInventoryMap) {
    onSizesChange?.(nextSizes);
    emit(nextMap, false);
  }

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
    emit(next, false);
  }

  function useStandardSizes() {
    const standard = [...STANDARD_SHIRT_SIZES];
    const nextMap = mergeSizeInventoryForSizes(standard, sizeInventory);
    emitSizesAndMap(standard, nextMap);
  }

  function addCustomSize() {
    const label = addSizeInput.trim().toUpperCase();
    if (!label || sizeKeys.includes(label)) return;
    const nextSizes = [...sizeKeys, label];
    const nextMap = mergeSizeInventoryForSizes(nextSizes, sizeInventory);
    setAddSizeInput("");
    emitSizesAndMap(nextSizes, nextMap);
  }

  function removeSize(key: string) {
    if (sizeKeys.length <= 1) return;
    const nextSizes = sizeKeys.filter((s) => s !== key);
    const nextMap = { ...(sizeInventory ?? {}) };
    delete nextMap[key];
    emitSizesAndMap(nextSizes, nextMap);
  }

  function restockAllSizes() {
    if (!isPerSize || !isPerSizeInventoryMap(sizeInventory)) return;
    const next: SizeInventoryMap = {};
    for (const key of sizeKeys) {
      const current = slotFromMap(sizeInventory, key);
      next[key] = {
        total: current.total,
        available: current.total,
        reserved: current.reserved,
        sold: current.sold,
      };
    }
    emit(next, false);
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
          {isPerSize ? "Size inventory" : "Inventory"}
        </p>
        <span
          className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.14em] ${inventoryBadgeClass(badge)}`}
        >
          {unlimited ? "Unlimited" : inventoryBadgeLabel(badge)}
        </span>
      </div>

      {isPerSize ? (
        <p className="text-xs text-zinc-500">
          Set stock per shirt size. Totals roll up automatically for the shop and redemptions.
        </p>
      ) : (
        <p className="text-xs text-zinc-500">
          Simple quantity for store credit, discounts, and non-sized rewards.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input
          type="checkbox"
          checked={unlimited}
          disabled={disabled}
          onChange={(e) => emit(null, e.target.checked)}
        />
        Unlimited inventory
      </label>

      {!unlimited && isPerSize ? (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={useStandardSizes}
              className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#f1c3c7]"
            >
              Use standard shirt sizes
            </button>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[5rem] flex-1">
              <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">Custom size</span>
              <input
                value={addSizeInput}
                disabled={disabled}
                onChange={(e) => setAddSizeInput(e.target.value)}
                placeholder="3XL"
                className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <button
              type="button"
              disabled={disabled || !addSizeInput.trim()}
              onClick={addCustomSize}
              className="rounded-full border border-white/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-zinc-300 hover:border-white/30"
            >
              Add size
            </button>
          </div>

          <div className="space-y-2">
            {sizeKeys.map((key) => {
              const slot = slotFromMap(sizeInventory, key);
              const sizeBadge = getInventoryBadgeLevel(slot.available);
              return (
                <div
                  key={key}
                  className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-white">{key}</p>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[8px] uppercase tracking-[0.12em] ${inventoryBadgeClass(sizeBadge)}`}
                      >
                        {inventoryBadgeLabel(sizeBadge)}
                      </span>
                      {sizeKeys.length > 1 ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => removeSize(key)}
                          className="text-[9px] uppercase tracking-[0.14em] text-red-400/80 hover:text-red-300"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[9px] text-zinc-600">Total</span>
                      <input
                        type="number"
                        min={0}
                        disabled={disabled}
                        value={slot.total}
                        onChange={(e) => updateSlot(key, "total", Number(e.target.value))}
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
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
                        className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
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
            <div className="rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-xs text-zinc-400">
              <p className="font-medium text-zinc-300">Rollup</p>
              <p className="mt-1">{formatInventorySummary(totals.available, totals.reserved, totals.sold)}</p>
            </div>
          ) : null}

          {isPerSizeInventoryMap(sizeInventory) ? (
            <button
              type="button"
              disabled={disabled}
              onClick={restockAllSizes}
              className="text-[10px] uppercase tracking-[0.16em] text-[#e87a82] hover:text-[#f1c3c7]"
            >
              Restock all sizes to total
            </button>
          ) : null}
        </>
      ) : null}

      {!unlimited && !isPerSize ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">Total quantity</span>
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={scalarSlot.total}
              onChange={(e) => updateSlot(SCALAR_INVENTORY_KEY, "total", Number(e.target.value))}
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[9px] uppercase tracking-[0.16em] text-zinc-600">Available quantity</span>
            <input
              type="number"
              min={0}
              disabled={disabled}
              value={scalarSlot.available}
              onChange={(e) => updateSlot(SCALAR_INVENTORY_KEY, "available", Number(e.target.value))}
              className="mt-0.5 w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
            />
          </label>
          <p className="text-[9px] text-zinc-600 sm:col-span-2">
            {scalarSlot.reserved} reserved · {scalarSlot.sold} sold
          </p>
        </div>
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
  usePerSize: boolean,
): { map: SizeInventoryMap | null; unlimited: boolean } {
  const parsed = parseSizeInventory(product?.size_inventory);

  if (parsed && Object.keys(parsed).length > 0) {
    if (usePerSize && !isPerSizeInventoryMap(parsed) && parsed[SCALAR_INVENTORY_KEY]) {
      const sizes =
        product?.sizes?.length ? product.sizes : [...STANDARD_SHIRT_SIZES];
      return {
        map: migrateScalarToPerSizeInventory(parsed, sizes),
        unlimited: false,
      };
    }
    if (usePerSize) {
      const sizes = product?.sizes?.length ? product.sizes : [...STANDARD_SHIRT_SIZES];
      return {
        map: mergeSizeInventoryForSizes(sizes, parsed),
        unlimited: false,
      };
    }
    return { map: parsed, unlimited: false };
  }

  if (product?.inventory_remaining == null) {
    return { map: null, unlimited: true };
  }

  const scalar = product.inventory_remaining;

  if (usePerSize) {
    const sizes = product?.sizes?.length ? product.sizes : [...STANDARD_SHIRT_SIZES];
    const perSize = Math.max(1, Math.floor(scalar / sizes.length));
    const map: SizeInventoryMap = {};
    for (const size of sizes) {
      map[size] = emptySlot(perSize);
    }
    return { map, unlimited: false };
  }

  return {
    map: {
      [SCALAR_INVENTORY_KEY]: emptySlot(scalar),
    },
    unlimited: false,
  };
}

export {
  migratePerSizeToScalarInventory,
  migrateScalarToPerSizeInventory,
  mergeSizeInventoryForSizes,
  STANDARD_SHIRT_SIZES,
};
