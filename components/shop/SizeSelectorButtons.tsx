"use client";

import {
  getSizeAvailable,
  isSizePurchasable,
  parseSizeInventory,
  type SizeInventoryMap,
} from "@/lib/shop/inventory";

type Props = {
  sizes: string[];
  sizeInventory?: SizeInventoryMap | null;
  selected: string | null;
  onSelect: (size: string) => void;
  disabled?: boolean;
  lowStockThreshold?: number;
};

export function SizeSelectorButtons({
  sizes,
  sizeInventory,
  selected,
  onSelect,
  disabled = false,
  lowStockThreshold = 10,
}: Props) {
  const map = parseSizeInventory(sizeInventory ?? null);
  const hasPerSize = map != null && Object.keys(map).some((k) => k !== "_all");

  return (
    <div className="flex flex-wrap gap-2">
      {sizes.map((size) => {
        const available = hasPerSize ? getSizeAvailable(map, size) : null;
        const oos = hasPerSize && !isSizePurchasable(map, size);
        const isSelected = selected === size;
        const showLow =
          available != null && available > 0 && available < lowStockThreshold;

        return (
          <button
            key={size}
            type="button"
            disabled={disabled || oos}
            onClick={() => onSelect(size)}
            className={`min-w-[3rem] rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.2em] transition ${
              isSelected
                ? "border-[#b4141e] bg-[#b4141e]/20 text-[#e87a82]"
                : "border-white/10 bg-black/30 text-white/70 hover:border-white/30"
            } ${oos ? "cursor-not-allowed opacity-40 line-through" : ""}`}
          >
            {size}
            {showLow ? (
              <span className="ml-1 text-[8px] normal-case tracking-normal text-zinc-500">
                ({available})
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
