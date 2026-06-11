type Props = {
  className?: string;
};

export function AchievementBadgeIcon({ className = "h-10 w-10" }: Props) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={`shrink-0 ${className}`}
    >
      <circle cx="20" cy="20" r="18" stroke="#b4141e" strokeWidth="1.5" fill="rgba(180,20,30,0.12)" />
      <path
        d="M20 8 22.4 15.2 30 15.2 24 19.6 26.2 27 20 22.8 13.8 27 16 19.6 10 15.2 17.6 15.2 20 8Z"
        fill="#e87a82"
        stroke="#f1c3c7"
        strokeWidth="0.75"
        strokeLinejoin="round"
      />
      <circle cx="20" cy="20" r="16" stroke="rgba(241,195,199,0.25)" strokeWidth="0.75" />
    </svg>
  );
}
