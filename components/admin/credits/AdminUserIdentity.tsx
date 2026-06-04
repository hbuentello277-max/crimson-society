import { AdminUserAvatar } from "@/components/admin/credits/AdminUserAvatar";
import {
  resolveDisplayLabel,
  resolveUsernameHandle,
  type AdminUserIdentityFields,
} from "@/lib/credits/admin-user-display";

type Props = {
  profile: AdminUserIdentityFields;
  showAvatar?: boolean;
  avatarSize?: "sm" | "md";
  membershipLabel?: string | null;
  compact?: boolean;
};

export function AdminUserIdentity({
  profile,
  showAvatar = true,
  avatarSize = "sm",
  membershipLabel,
  compact = false,
}: Props) {
  const label = resolveDisplayLabel(profile);
  const handle = resolveUsernameHandle(profile);
  const avatar = profile.profile_image_url || profile.avatar_url || null;

  return (
    <div className={`flex items-center gap-2.5 ${compact ? "" : "min-w-0"}`}>
      {showAvatar ? <AdminUserAvatar src={avatar} alt={label} size={avatarSize} /> : null}
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{label}</p>
        {handle ? <p className="truncate text-xs text-zinc-500">{handle}</p> : null}
        {membershipLabel ? (
          <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-zinc-600">{membershipLabel}</p>
        ) : null}
      </div>
    </div>
  );
}
