type InboxIconProps = {
  className?: string;
};

export function IconCamera({ className = "h-6 w-6" }: InboxIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 9a2 2 0 012-2h1.5l1-2h9l1 2H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <circle cx="12" cy="13" r="3.25" />
    </svg>
  );
}

export function IconGallery({ className = "h-6 w-6" }: InboxIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="10" r="1.5" />
      <path strokeLinecap="round" d="M21 16l-5.5-5.5L6 19" />
    </svg>
  );
}

export function IconMicrophone({ className = "h-6 w-6" }: InboxIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14a3 3 0 003-3V7a3 3 0 10-6 0v4a3 3 0 003 3z"
      />
      <path strokeLinecap="round" d="M6 11v1a6 6 0 0012 0v-1M12 17v3" />
    </svg>
  );
}

export function IconSend({ className = "h-5 w-5" }: InboxIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M3.4 20.6 21 12 3.4 3.4l2.8 7.2L17 12l-10.8 1.4-2.8 7.2z" />
    </svg>
  );
}

export function IconCheck({ className = "h-3 w-3" }: InboxIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}
