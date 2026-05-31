"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MessagesPanel from "@/components/inbox/MessagesPanel";
import NotificationsPanel from "@/components/inbox/NotificationsPanel";

function InboxTabs() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "notifications" ? "notifications" : "messages";

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[90] border-b border-white/10 bg-[#050505]/90 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto grid max-w-sm grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
          <Link
            href="/inbox"
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "messages"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Messages
          </Link>
          <Link
            href="/inbox?tab=notifications"
            className={`rounded-lg px-4 py-2.5 text-center text-[10px] uppercase tracking-[0.18em] transition ${
              activeTab === "notifications"
                ? "bg-[#7f111b]/35 text-[#f4dadd]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Notifications
          </Link>
        </div>
      </div>

      <div className="pt-[calc(env(safe-area-inset-top)+4.25rem)]">
        {activeTab === "notifications" ? <NotificationsPanel /> : <MessagesPanel />}
      </div>
    </>
  );
}

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#050405] text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Opening inbox</p>
        </main>
      }
    >
      <InboxTabs />
    </Suspense>
  );
}
