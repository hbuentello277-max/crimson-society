type CrimsonOrbIconProps = {
  className?: string;
  size?: number;
};

/** Branded Crimson Society orb for system/shop/credits notifications. */
export function CrimsonOrbIcon({ className = "", size = 44 }: CrimsonOrbIconProps) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-[#b4141e]/50 bg-[#0a0405] shadow-[0_0_20px_-8px_rgba(180,20,30,0.45)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 35% 30%, rgba(232,122,130,0.35), transparent 55%), radial-gradient(circle at 65% 70%, rgba(180,20,30,0.5), transparent 50%), linear-gradient(145deg, #1a0508 0%, #0a0405 100%)",
        }}
      />
      <span className="relative flex h-full w-full items-center justify-center text-[#e87a82]">
        ✦
      </span>
    </div>
  );
}
