import type { ReactNode } from "react";

type IconProps = { className?: string };

function IconBase({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function NexusNavOverviewIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
    </IconBase>
  );
}

export function NexusNavInfraIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="3" y="4" width="14" height="4" rx="1" />
      <rect x="3" y="10" width="14" height="4" rx="1" />
      <circle cx="6" cy="6" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="0.75" fill="currentColor" stroke="none" />
    </IconBase>
  );
}

export function NexusNavWorkflowIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 10h4l2-4 2 8 2-4h2" strokeLinecap="round" strokeLinejoin="round" />
    </IconBase>
  );
}

export function NexusNavMetricsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M4 14V8M8 14V5M12 14V10M16 14V6" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavAlertsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M10 3.5a4 4 0 0 1 4 4v2.5l1.5 2.5H4.5L6 10V7.5a4 4 0 0 1 4-4Z" />
      <path d="M8.5 14.5a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavIncidentsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M10 3.5 16.5 15.5H3.5L10 3.5Z" strokeLinejoin="round" />
      <path d="M10 8v3.5M10 13.5h.01" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavInsightsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M10 3.5a4.5 4.5 0 0 0-2 8.4V14h4v-2.1A4.5 4.5 0 0 0 10 3.5Z" />
      <path d="M8 16.5h4" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavWarRoomsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <rect x="3" y="4" width="14" height="10" rx="1.5" />
      <path d="M7 8h6M7 11h4" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavRunbooksIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M5 4.5h10v11H5z" />
      <path d="M7.5 8h5M7.5 10.5h5M7.5 13h3" strokeLinecap="round" />
      <path d="M8 4.5V3.5h4v1" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavCommandsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M6 5.5h8l-1.5 9H7.5L6 5.5Z" strokeLinejoin="round" />
      <path d="M8 3.5h4" strokeLinecap="round" />
      <path d="M9 9h2M9.5 11.5h1" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavReportsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M5 4.5h10v11H5z" />
      <path d="M7.5 8h5M7.5 10.5h5M7.5 13h3" strokeLinecap="round" />
      <path d="M12 4.5V3.5h2v1" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavBriefingsIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <path d="M5 5.5h10v9H5z" strokeLinejoin="round" />
      <path d="M7.5 9h5M7.5 11.5h3.5" strokeLinecap="round" />
      <path d="M8 5.5V4h4v1.5" strokeLinecap="round" />
    </IconBase>
  );
}

export function NexusNavIntelligenceIcon({ className }: IconProps) {
  return (
    <IconBase className={className}>
      <circle cx="10" cy="10" r="6.5" />
      <path d="M10 6.5v4l2.5 1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 14.5c1.2 1 2.6 1.5 4 1.5s2.8-.5 4-1.5" strokeLinecap="round" />
    </IconBase>
  );
}
