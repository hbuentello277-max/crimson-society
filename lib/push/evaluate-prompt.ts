import {
  ensurePushSubscription,
  getPushPermissionState,
  hasActivePushSubscription,
  isPushSupported,
} from "@/lib/push/client";
import { isPushConfiguredOnClient } from "@/lib/push/firebase-public";
import {
  clearPushPromptPending,
  hasPushPromptTrigger,
  isIosBrowser,
  isPushPromptDismissed,
  isStandalonePwa,
} from "@/lib/push/prompt-state";

export type PushPromptMode = "hidden" | "enable" | "install" | "denied";

export type PushPromptEvaluation = {
  mode: PushPromptMode;
  permission: ReturnType<typeof getPushPermissionState>;
  hasLocalSubscription: boolean;
  hasServerSubscription: boolean;
};

export type EvaluatePushPromptOptions = {
  /** Show settings guidance when permission is denied (e.g. inbox). */
  allowDeniedGuidance?: boolean;
};

function canBypassDismiss() {
  return hasPushPromptTrigger();
}

export async function evaluatePushPromptState(
  options: EvaluatePushPromptOptions = {},
): Promise<PushPromptEvaluation> {
  const permission = getPushPermissionState();
  const base = {
    permission,
    hasLocalSubscription: false,
    hasServerSubscription: false,
  };

  if (typeof window === "undefined" || !isPushConfiguredOnClient()) {
    return { mode: "hidden", ...base };
  }

  const bypassDismiss = canBypassDismiss();

  if (!isPushSupported()) {
    if (isIosBrowser() && !isStandalonePwa()) {
      if (!bypassDismiss && isPushPromptDismissed()) {
        return { mode: "hidden", ...base };
      }
      return { mode: "install", ...base };
    }
    return { mode: "hidden", ...base };
  }

  if (permission === "granted") {
    const ensured = await ensurePushSubscription();
    if (ensured.subscribed) {
      clearPushPromptPending();
      return {
        mode: "hidden",
        permission,
        hasLocalSubscription: true,
        hasServerSubscription: ensured.serverRegistered,
      };
    }

    if (!bypassDismiss && isPushPromptDismissed()) {
      return { mode: "hidden", ...base };
    }

    return {
      mode: "enable",
      permission,
      hasLocalSubscription: Boolean(ensured.token),
      hasServerSubscription: ensured.serverRegistered,
    };
  }

  if (permission === "denied") {
    const status = await hasActivePushSubscription();
    if (
      options.allowDeniedGuidance &&
      !status.subscribed &&
      (!isPushPromptDismissed() || bypassDismiss)
    ) {
      return {
        mode: "denied",
        permission,
        hasLocalSubscription: status.hasLocalToken,
        hasServerSubscription: status.serverRegistered,
      };
    }
    return { mode: "hidden", ...base };
  }

  if (permission === "unsupported") {
    return { mode: "hidden", ...base };
  }

  const status = await hasActivePushSubscription();
  if (status.subscribed) {
    clearPushPromptPending();
    return {
      mode: "hidden",
      permission,
      hasLocalSubscription: status.hasLocalToken,
      hasServerSubscription: status.serverRegistered,
    };
  }

  if (!bypassDismiss && isPushPromptDismissed()) {
    return {
      mode: "hidden",
      permission,
      hasLocalSubscription: status.hasLocalToken,
      hasServerSubscription: status.serverRegistered,
    };
  }

  return {
    mode: "enable",
    permission,
    hasLocalSubscription: status.hasLocalToken,
    hasServerSubscription: status.serverRegistered,
  };
}
