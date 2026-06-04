/** Scalar bucket for rewards without per-size stock. */
export const SCALAR_INVENTORY_KEY = "_all";

export type InventorySlot = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
};

export type SizeInventoryMap = Record<string, InventorySlot>;

export type InventoryTotals = {
  total: number;
  available: number;
  reserved: number;
  sold: number;
};

export type InventoryBadgeLevel = "unlimited" | "in_stock" | "low_stock" | "critical" | "out_of_stock";

export function parseSizeInventory(raw: unknown): SizeInventoryMap | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as SizeInventoryMap;
}

export function sumInventory(map: SizeInventoryMap | null): InventoryTotals | null {
  if (!map) return null;
  const values = Object.values(map);
  if (values.length === 0) return null;

  return values.reduce<InventoryTotals>(
    (acc, slot) => ({
      total: acc.total + (slot.total ?? 0),
      available: acc.available + (slot.available ?? 0),
      reserved: acc.reserved + (slot.reserved ?? 0),
      sold: acc.sold + (slot.sold ?? 0),
    }),
    { total: 0, available: 0, reserved: 0, sold: 0 },
  );
}

export function getInventoryBadgeLevel(available: number | null | undefined): InventoryBadgeLevel {
  if (available == null) return "unlimited";
  if (available <= 0) return "out_of_stock";
  if (available < 5) return "critical";
  if (available < 10) return "low_stock";
  return "in_stock";
}

export function inventoryBadgeLabel(level: InventoryBadgeLevel) {
  switch (level) {
    case "unlimited":
      return "Unlimited";
    case "in_stock":
      return "In Stock";
    case "low_stock":
      return "Low Stock";
    case "critical":
      return "Very Low";
    case "out_of_stock":
      return "Out of Stock";
  }
}

export function inventoryBadgeClass(level: InventoryBadgeLevel) {
  switch (level) {
    case "unlimited":
      return "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
    case "in_stock":
      return "border-emerald-500/35 bg-emerald-500/10 text-emerald-300";
    case "low_stock":
      return "border-amber-500/35 bg-amber-500/10 text-amber-200";
    case "critical":
      return "border-red-500/35 bg-red-500/10 text-red-300";
    case "out_of_stock":
      return "border-red-500/40 bg-red-500/15 text-red-300";
  }
}

export function getSizeAvailable(map: SizeInventoryMap | null, size: string): number | null {
  if (!map) return null;
  const slot = map[size];
  if (!slot) return 0;
  return slot.available ?? 0;
}

export function isSizePurchasable(map: SizeInventoryMap | null, size: string): boolean {
  const available = getSizeAvailable(map, size);
  if (available === null) return true;
  return available > 0;
}

export function emptySlot(total = 0): InventorySlot {
  return { total, available: total, reserved: 0, sold: 0 };
}

export function buildSizeInventoryFromTotals(
  sizes: string[],
  totalsBySize: Record<string, number>,
): SizeInventoryMap {
  const map: SizeInventoryMap = {};
  for (const size of sizes) {
    const total = Math.max(0, totalsBySize[size] ?? 0);
    map[size] = emptySlot(total);
  }
  return map;
}

export function buildScalarInventory(total: number): SizeInventoryMap {
  return { [SCALAR_INVENTORY_KEY]: emptySlot(Math.max(0, total)) };
}

export function scalarInventoryTotal(map: SizeInventoryMap | null): number | null {
  if (!map?.[SCALAR_INVENTORY_KEY]) return null;
  return map[SCALAR_INVENTORY_KEY].total;
}

export function formatInventorySummary(available: number | null, reserved = 0, sold = 0) {
  if (available == null) return "Unlimited";
  return `${available} available · ${reserved} reserved · ${sold} sold`;
}
