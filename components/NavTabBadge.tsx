import { CS_BADGE_NAV } from "@/lib/crimson-accent";

type NavTabBadgeProps = {
  count: number;
};

function formatNavBadgeLabel(count: number) {
  if (count > 99) return "99+";
  if (count > 9) return "9+";
  return String(count);
}

export function NavTabBadge({ count }: NavTabBadgeProps) {
  if (count <= 0) return null;

  return (
    <span
      className={`${CS_BADGE_NAV} pointer-events-none absolute left-[calc(100%-6px)] top-0 z-10 -translate-y-1/4 translate-x-0 whitespace-nowrap shadow-[0_0_0_2px_#050505]`}
      aria-hidden
    >
      {formatNavBadgeLabel(count)}
    </span>
  );
}
