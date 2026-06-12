import { resolveNativeDeepLinkAction } from "@/lib/navigation/native-deep-link";

export function applyNativeDeepLink(
  incomingUrl: string,
  allowedOrigins: string[],
  navigate: (path: string) => void,
) {
  const action = resolveNativeDeepLinkAction(incomingUrl, allowedOrigins);

  if (action.type === "ignore") {
    return;
  }

  if (action.type === "full-load") {
    window.location.href = action.href;
    return;
  }

  navigate(action.path);
}
