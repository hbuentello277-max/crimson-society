"use client";

import { Suspense } from "react";
import InboxSwipeTabs from "@/components/inbox/InboxSwipeTabs";

export default function InboxPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#050405] px-5 pt-[calc(env(safe-area-inset-top)+5rem)] text-white">
          <div className="mx-auto max-w-2xl space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-white/10 bg-white/[0.025] p-4">
                <div className="flex animate-pulse items-center gap-3">
                  <div className="h-11 w-11 rounded-full bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-36 rounded-full bg-white/10" />
                    <div className="h-2 w-52 max-w-full rounded-full bg-white/10" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      }
    >
      <InboxSwipeTabs />
    </Suspense>
  );
}
