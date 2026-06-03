"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isPathAllowedDuringDeletionPending } from "@/lib/account-deletion/types";

export function DeletionPendingGate({ children }: { children: React.ReactNode }) {
  const { loading, session, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPending = status === "deletion_pending" && Boolean(session?.user);

  useEffect(() => {
    if (loading || !isPending) return;
    if (!pathname || isPathAllowedDuringDeletionPending(pathname)) return;
    router.replace("/deletion-pending");
  }, [isPending, loading, pathname, router]);

  if (loading) {
    return children;
  }

  if (isPending && pathname && !isPathAllowedDuringDeletionPending(pathname)) {
    return (
      <div className="flex min-h-[50dvh] items-center justify-center px-6 text-center text-sm text-zinc-400">
        Redirecting to account deletion status…
      </div>
    );
  }

  return children;
}
