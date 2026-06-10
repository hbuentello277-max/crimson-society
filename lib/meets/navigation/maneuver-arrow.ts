import type { NavigationStep } from "@/lib/meets/navigation/types";

export function resolveManeuverArrow(step: NavigationStep | null): string {
  if (!step) return "↑";

  const modifier = step.maneuverModifier?.toLowerCase() ?? "";
  const type = step.maneuverType?.toLowerCase() ?? "";

  if (modifier.includes("left") || type.includes("left")) return "←";
  if (modifier.includes("right") || type.includes("right")) return "→";
  if (modifier.includes("uturn") || type.includes("uturn")) return "↩";
  if (modifier.includes("straight") || type === "continue" || type === "depart") return "↑";

  return "↑";
}
