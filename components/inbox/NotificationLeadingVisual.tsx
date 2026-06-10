import Image from "next/image";
import { CrimsonOrbIcon } from "@/components/inbox/CrimsonOrbIcon";
import { CS_AVATAR_FALLBACK, CS_AVATAR_RING } from "@/lib/crimson-accent";
import { actorDisplayName, actorPhotoUrl, type NotificationActor } from "@/lib/notifications";
import type { NotificationLeadingVisualKind } from "@/lib/notifications/notification-avatar";

function actorInitials(actor: NotificationActor | null | undefined, fallback: string) {
  const name = actorDisplayName(actor) || fallback || "Crimson";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join("");

  return initials || "C";
}

type NotificationLeadingVisualProps = {
  kind: NotificationLeadingVisualKind;
  actor: NotificationActor | null;
  fallbackLabel: string;
  size?: number;
};

export function NotificationLeadingVisual({
  kind,
  actor,
  fallbackLabel,
  size = 44,
}: NotificationLeadingVisualProps) {
  if (kind === "crimson-orb") {
    return <CrimsonOrbIcon size={size} />;
  }

  const photo = actorPhotoUrl(actor);
  const name = actorDisplayName(actor);

  return (
    <div
      className={`relative shrink-0 ${CS_AVATAR_RING}`}
      style={{ width: size, height: size }}
    >
      {photo ? (
        <Image
          src={photo}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized={photo.includes("supabase")}
        />
      ) : (
        <div className={`${CS_AVATAR_FALLBACK} text-xs font-semibold not-italic`}>
          {actorInitials(actor, fallbackLabel)}
        </div>
      )}
    </div>
  );
}
