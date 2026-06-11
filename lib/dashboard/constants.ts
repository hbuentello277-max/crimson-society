export const FEED_POST_LIMIT = 15;
export const FEED_FOCUS_RELOAD_DEBOUNCE_MS = 1500;
export const DASHBOARD_PULL_THRESHOLD = 70;
export const DASHBOARD_MAX_PULL = 120;

export const dashboardStatusBgMap: Record<string, string> = {
  noir: "bg-gradient-to-br from-[#050505] via-[#0c0c0d] to-[#050505]",
  crimson: "bg-gradient-to-br from-[#3a0709] via-[#b4141e] to-[#3a0709]",
  carbon: "bg-gradient-to-br from-[#1a1a1c] via-[#2a2a2e] to-[#0a0a0c]",
  ember: "bg-gradient-to-br from-[#1a0405] via-[#6a0d14] to-[#0a0102]",
};
