"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadActiveSosChatForCurrentUser, sosChatHref, type ActiveSosChatRow } from "@/lib/rider-sos/chat";

export function ActiveSosChatBadge() {
  const [chat, setChat] = useState<ActiveSosChatRow | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const row = await loadActiveSosChatForCurrentUser();
        if (active) setChat(row);
      } catch {
        if (active) setChat(null);
      }
    }

    void load();
    const interval = window.setInterval(() => void load(), 30_000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (!chat) return null;

  return (
    <Link
      href={sosChatHref(chat.conversation_id)}
      className="mb-4 flex items-center justify-between rounded-2xl border border-[#b4141e]/45 bg-[#b4141e]/12 px-4 py-3 text-sm text-[#f1c3c7] transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20"
    >
      <span className="font-medium">🚨 Active SOS Chat</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-[#e87a82]">Open</span>
    </Link>
  );
}

