type Props = {
  label: string;
  options: readonly string[] | readonly number[];
  onSelect: (value: string | number) => void;
  formatOption?: (value: string | number) => string;
};

export function QuickPresetChips({ label, options, onSelect, formatOption }: Props) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => {
          const key = String(option);
          const display = formatOption ? formatOption(option) : key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(option)}
              className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-zinc-400 transition hover:border-[#b4141e]/40 hover:text-[#f1c3c7]"
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
}
