import { getAutomationTemplate } from "@/lib/automation-studio/templates";
import type { AutomationRuleStatus } from "@/lib/automation-studio/types";

export function parseAutomationTemplateId(transcript: string): string | null {
  const normalized = transcript.toLowerCase();
  if (/\bblackcard growth\b/.test(normalized)) return "blackcard_growth";
  if (/\blaunch protection\b/.test(normalized)) return "launch_protection";
  if (/\bshop automation\b/.test(normalized) || /\bshop\b/.test(normalized)) return "shop_inventory";
  if (/\bcommunity growth\b/.test(normalized)) return "community_growth";
  if (/\bplatform risk\b/.test(normalized)) return "platform_risk";
  return null;
}

export function parseAutomationStatusChange(
  transcript: string,
): { status: AutomationRuleStatus; label: string } | null {
  const normalized = transcript.toLowerCase();
  if (/\bpause automation\b/.test(normalized)) {
    return { status: "paused", label: "Pause automation" };
  }
  if (/\benable automation\b/.test(normalized)) {
    return { status: "active", label: "Enable automation" };
  }
  if (/\bdisable automation\b/.test(normalized)) {
    return { status: "disabled", label: "Disable automation" };
  }
  return null;
}

export function parseAutomationRuleName(transcript: string): string | null {
  const quoted = transcript.match(/automation\s+"([^"]{3,120})"/i);
  if (quoted?.[1]) return quoted[1].trim();

  const named = transcript.match(/\bfor\s+(.+)$/i);
  if (named?.[1]) return named[1].trim().slice(0, 120);

  return null;
}

export function buildAutomationRuleDraftSummary(templateId: string | null): string {
  if (!templateId) {
    return "Custom automation rule draft";
  }

  const template = getAutomationTemplate(templateId);
  return template?.name ?? "Automation rule draft";
}
