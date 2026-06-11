type IconProps = { className?: string };

const base = "shrink-0";
export const PROFILE_TAB_ICON_CLASS = "h-6 w-6";

export function IconEdit({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <path d="M4 20h4l10.5-10.5a2.12 2.12 0 0 0-3-3L5 17v3z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m13.5 6.5 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShare({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="M8.2 10.7 15.8 7.3M8.2 13.3l7.6 3.4" strokeLinecap="round" />
    </svg>
  );
}

export function IconAdmin({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <path d="M12 3 14.5 8.5 20.5 9.2 16 13.2 17.2 19.2 12 16.3 6.8 19.2 8 13.2 3.5 9.2 9.5 8.5 12 3z" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTabPosts({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

export function IconTabRides({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className}`} aria-hidden>
      <path
        d="M12 21s6-5.2 6-10.5a6 6 0 1 0-12 0C6 15.8 12 21 12 21z"
        fill="rgba(180,20,30,0.16)"
        stroke="#e87a82"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10.5" r="2.25" fill="#b4141e" stroke="#f1c3c7" strokeWidth="1" />
      <path
        d="M8.8 18.2c1.2.7 5.2.7 6.4 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
        opacity="0.55"
      />
    </svg>
  );
}

export function IconTabGarage({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconTabSaved({ className = "h-3.5 w-3.5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={`${base} ${className}`} aria-hidden>
      <path d="M6 4h12v16l-6-4-6 4V4z" strokeLinejoin="round" />
    </svg>
  );
}

export const PROFILE_TAB_ICONS = {
  posts: IconTabPosts,
  rides: IconTabRides,
  garage: IconTabGarage,
  saved: IconTabSaved,
} as const;
