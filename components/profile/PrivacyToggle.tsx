"use client";

type Props = {
  label: string;
  description: string;
  enabled: boolean;
  disabled?: boolean;
  onChange: (enabled: boolean) => void;
};

export default function PrivacyToggle({
  label,
  description,
  enabled,
  disabled = false,
  onChange,
}: Props) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="mt-1 text-xs leading-6 text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={`shrink-0 rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.2em] transition disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled
            ? "border-[#b4141e]/50 bg-[#b4141e]/20 text-[#e87a82]"
            : "border-white/10 bg-white/[0.03] text-zinc-500"
        }`}
      >
        {enabled ? "On" : "Off"}
      </button>
    </div>
  );
}
