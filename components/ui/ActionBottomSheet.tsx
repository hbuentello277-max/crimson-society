"use client";

import type { ReactNode } from "react";

export type ActionSheetItem = {
  key: string;
  label: string;
  icon?: string;
  tone?: "default" | "danger" | "accent";
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
};

type Props = {
  open: boolean;
  title?: string;
  subtitle?: string;
  items: ActionSheetItem[];
  onClose: () => void;
  footer?: ReactNode;
};

const toneClasses: Record<NonNullable<ActionSheetItem["tone"]>, string> = {
  default: "text-zinc-100",
  accent: "text-[#f1c3c7]",
  danger: "text-[#ffb4bc]",
};

export function ActionBottomSheet({ open, title, subtitle, items, onClose, footer }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close menu"
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-[91] w-full max-w-lg px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
        <div className="overflow-hidden rounded-[28px] border border-white/10 bg-[#09090b]/95 shadow-[0_30px_80px_rgba(0,0,0,0.65)] backdrop-blur-xl">
          {(title || subtitle) && (
            <div className="border-b border-white/8 px-5 py-4">
              {title ? <p className="font-serif text-xl text-white">{title}</p> : null}
              {subtitle ? <p className="mt-1 text-sm text-zinc-500">{subtitle}</p> : null}
            </div>
          )}

          <div className="p-2">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                disabled={item.disabled}
                onClick={() => {
                  void item.onSelect();
                  onClose();
                }}
                className="flex w-full items-center gap-4 rounded-2xl px-4 py-4 text-left transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-45"
              >
                {item.icon ? (
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#b4141e]/30 bg-[#b4141e]/12 text-lg"
                    aria-hidden
                  >
                    {item.icon}
                  </span>
                ) : null}
                <span
                  className={`text-[15px] font-medium tracking-[0.01em] ${toneClasses[item.tone || "default"]}`}
                >
                  {item.label}
                </span>
              </button>
            ))}
          </div>

          {footer ? <div className="border-t border-white/8 px-4 py-3">{footer}</div> : null}

          <div className="border-t border-white/8 p-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl px-4 py-4 text-center text-sm uppercase tracking-[0.18em] text-zinc-400 transition hover:bg-white/[0.04]"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
