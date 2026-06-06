"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  isPathAllowedForRestrictedAccount,
  isRestrictedAccountStatus,
} from "@/lib/account-status";

export function RestrictedAccountGate({ children }: { children: React.ReactNode }) {
  const { loading, session, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isRestricted = isRestrictedAccountStatus(status) && Boolean(session?.user);

  useEffect(() => {
    if (loading || !isRestricted) return;
    if (!pathname || isPathAllowedForRestrictedAccount(pathname)) return;
    router.replace("/account-restricted");
  }, [isRestricted, loading, pathname, router]);

  if (loading) {
    return children;
  }

  if (isRestricted && pathname && !isPathAllowedForRestrictedAccount(pathname)) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center px-6 text-center text-sm text-zinc-400">
        Redirecting to account status…
      </div>
    );
  }

  return children;
}
