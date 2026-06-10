import { CS_BADGE_NAV } from "@/lib/crimson-accent";
import { formatNavBadgeCount } from "@/lib/nav-badge-format";

type NavTabBadgeProps = {
  count: number;
  label?: string;
};

export function NavTabBadge({ count, label }: NavTabBadgeProps) {
  if (count <= 0) return null;

  const badgeLabel = formatNavBadgeCount(count);

  return (
    <span
      className={`${CS_BADGE_NAV} pointer-events-none absolute left-[calc(100%-6px)] top-0 z-10 -translate-y-1/4 translate-x-0 whitespace-nowrap shadow-[0_0_0_2px_#050505]`}
      aria-label={label ? `${label}: ${badgeLabel} unread` : `${badgeLabel} unread`}
    >
      {badgeLabel}
    </span>
  );
}
