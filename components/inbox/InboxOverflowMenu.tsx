"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/AuthProvider";
import { PushNotificationSettings } from "@/components/push/PushNotificationSettings";
import { supabase } from "@/lib/supabase";

type InboxTab = "messages" | "notifications";

type InboxOverflowMenuProps = {
  activeTab?: InboxTab;
};

export function InboxOverflowMenu({ activeTab = "messages" }: InboxOverflowMenuProps) {
  const { session } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!settingsOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  const markAllNotificationsRead = useCallback(async () => {
    const userId = session?.user?.id;
    if (!userId || markingAll) return;

    setMarkingAll(true);
    const readAt = new Date().toISOString();
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: readAt })
      .eq("user_id", userId)
      .is("read_at", null);

    setMarkingAll(false);
    setMenuOpen(false);

    if (error) {
      console.error("Failed to mark all notifications read:", error);
      return;
    }

    window.dispatchEvent(new CustomEvent("crimson-notifications-read"));
  }, [markingAll, session?.user?.id]);

  const settingsModal =
    settingsOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[300] flex flex-col justify-end bg-black/80 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
            role="presentation"
            onClick={() => setSettingsOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="notification-settings-title"
              className="flex max-h-[min(90dvh,760px)] w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-[#0b0b0d] shadow-2xl sm:max-w-lg sm:rounded-3xl"
              style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <h2 id="notification-settings-title" className="font-serif text-2xl text-white">
                  Notification Settings
                </h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white"
                  aria-label="Close notification settings"
                >
                  ✕
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-2">
                <PushNotificationSettings
                  embedded
                  showBuildDebug={process.env.NODE_ENV === "development"}
                />
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((current) => !current)}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-lg leading-none text-zinc-300 transition hover:border-white/25 hover:text-white"
          aria-label="Inbox options"
          aria-expanded={menuOpen}
        >
          ⋯
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-11 z-[120] min-w-[220px] overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl">
            {activeTab === "notifications" && (
              <button
                type="button"
                disabled={markingAll}
                onClick={() => void markAllNotificationsRead()}
                className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05] disabled:opacity-50"
              >
                <span className="text-base" aria-hidden>
                  ✓
                </span>
                Mark all as read
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setSettingsOpen(true);
              }}
              className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-zinc-200 hover:bg-white/[0.05]"
            >
              <span className="text-base" aria-hidden>
                ⚙
              </span>
              Notification settings
            </button>
            {activeTab === "messages" && (
              <p className="border-t border-white/10 px-4 py-2 text-[10px] leading-relaxed text-zinc-600">
                Push alerts for DMs and meets
              </p>
            )}
          </div>
        )}
      </div>

      {settingsModal}
    </>
  );
}
