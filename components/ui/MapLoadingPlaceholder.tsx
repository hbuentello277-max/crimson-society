type MapLoadingPlaceholderProps = {
  className?: string;
  label?: string;
};

export function MapLoadingPlaceholder({
  className = "h-full w-full",
  label = "Loading map…",
}: MapLoadingPlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-[#07080a] ${className}`}
      aria-busy="true"
      aria-label={label}
    >
      <div className="space-y-2 text-center">
        <div className="mx-auto h-8 w-8 animate-pulse rounded-full border border-white/15 bg-white/5" />
        <p className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      </div>
    </div>
  );
}
