"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Conversation = {
  id: string;
  name: string;
  handle: string;
  photo: string;
  lastMessage: string;
  timeLabel: string;
  unread: number;
  isGroup?: boolean;
  members?: number;
  online?: boolean;
};

type Message = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  senderPhoto?: string;
  timeLabel: string;
};

const conversations: Conversation[] = [
  {
    id: "marco",
    name: "Marco Vélez",
    handle: "@nightrider",
    photo: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
    lastMessage: "Sunrise run tomorrow. You in?",
    timeLabel: "12m",
    unread: 2,
    online: true,
  },
  {
    id: "elena",
    name: "Elena Ruiz",
    handle: "@ironsaint",
    photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
    lastMessage: "That last reel was unreal.",
    timeLabel: "1h",
    unread: 0,
    online: true,
  },
  {
    id: "canyon-crew",
    name: "Canyon Crew",
    handle: "8 members",
    photo: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=200",
    lastMessage: "Devin: meet at the usual gas stop?",
    timeLabel: "3h",
    unread: 5,
    isGroup: true,
    members: 8,
  },
  {
    id: "aiyana",
    name: "Aiyana Cross",
    handle: "@savagegrace",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
    lastMessage: "Sending the route now.",
    timeLabel: "6h",
    unread: 0,
  },
  {
    id: "night-circle",
    name: "Night Circle",
    handle: "14 members",
    photo: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?w=200",
    lastMessage: "Sofia: 11pm. Don't be late.",
    timeLabel: "1d",
    unread: 0,
    isGroup: true,
    members: 14,
  },
  {
    id: "roman",
    name: "Roman Petrov",
    handle: "@longshadow",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
    lastMessage: "Pulled the cover off her this morning.",
    timeLabel: "2d",
    unread: 0,
  },
];

const seedThreads: Record<string, Message[]> = {
  marco: [
    {
      id: "m1",
      text: "Hill country was insane yesterday. You missed it.",
      senderId: "marco",
      senderName: "Marco",
      senderPhoto: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
      timeLabel: "9:42 PM",
    },
    {
      id: "m2",
      text: "I saw the post. Looked like a movie.",
      senderId: "me",
      timeLabel: "9:48 PM",
    },
    {
      id: "m3",
      text: "Sunrise run tomorrow. You in?",
      senderId: "marco",
      senderName: "Marco",
      senderPhoto: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
      timeLabel: "10:11 PM",
    },
    {
      id: "m4",
      text: "5am at the espresso bar on Westheimer?",
      senderId: "marco",
      senderName: "Marco",
      senderPhoto: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200",
      timeLabel: "10:11 PM",
    },
  ],
  elena: [
    {
      id: "e1",
      text: "That last reel was unreal.",
      senderId: "elena",
      senderName: "Elena",
      senderPhoto: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200",
      timeLabel: "8:30 PM",
    },
    {
      id: "e2",
      text: "Hand-cut at 2am. Worth it.",
      senderId: "me",
      timeLabel: "8:34 PM",
    },
  ],
  "canyon-crew": [
    {
      id: "c1",
      text: "Devin: meet at the usual gas stop?",
      senderId: "devin",
      senderName: "Devin",
      senderPhoto: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200",
      timeLabel: "7:12 PM",
    },
    {
      id: "c2",
      text: "Sofia: I'll be there 10 min late.",
      senderId: "sofia",
      senderName: "Sofia",
      senderPhoto: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200",
      timeLabel: "7:14 PM",
    },
    {
      id: "c3",
      text: "Locked. See you all in 20.",
      senderId: "me",
      timeLabel: "7:22 PM",
    },
  ],
  aiyana: [
    {
      id: "a1",
      text: "Sending the route now.",
      senderId: "aiyana",
      senderName: "Aiyana",
      senderPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200",
      timeLabel: "5:08 PM",
    },
  ],
  "night-circle": [
    {
      id: "n1",
      text: "Sofia: 11pm. Don't be late.",
      senderId: "sofia",
      senderName: "Sofia",
      senderPhoto: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200",
      timeLabel: "Yesterday",
    },
  ],
  roman: [
    {
      id: "r1",
      text: "Pulled the cover off her this morning.",
      senderId: "roman",
      senderName: "Roman",
      senderPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200",
      timeLabel: "Mon",
    },
  ],
};

export default function MessagesPage() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Record<string, Message[]>>(seedThreads);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"all" | "unread" | "groups">("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = conversations.find((c) => c.id === activeId) || null;
  const activeThread = activeId ? threads[activeId] || [] : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeId, threads]);

  const filtered = conversations.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.handle.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q);

    if (!matchesSearch) return false;
    if (tab === "unread") return c.unread > 0;
    if (tab === "groups") return !!c.isGroup;
    return true;
  });

  const sendMessage = () => {
    if (!draft.trim() || !activeId) return;

    const newMsg: Message = {
      id: `me-${Date.now()}`,
      text: draft.trim(),
      senderId: "me",
      timeLabel: new Date().toLocaleTimeString([], {
        hour: "numeric",
        minute: "2-digit",
      }),
    };

    setThreads((prev) => ({
      ...prev,
      [activeId]: [...(prev[activeId] || []), newMsg],
    }));

    setDraft("");
  };

  if (active) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
              radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
              linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
            `,
          }}
        />

        <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
            <button
              onClick={() => setActiveId(null)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Back"
            >
              ‹
            </button>

            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/10">
              <Image
                src={active.photo}
                alt={active.name}
                fill
                sizes="40px"
                className="object-cover"
              />
              {active.online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-[#050505] bg-[#b4141e]" />
              )}
            </div>

            <div className="flex-1">
              <p className="text-sm text-white">{active.name}</p>
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
                {active.isGroup
                  ? `${active.members} riders`
                  : active.online
                  ? `Online · ${active.handle}`
                  : active.handle}
              </p>
            </div>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Call"
            >
              ☎
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Details"
            >
              ⋯
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            <div className="mb-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/30">
              <div className="h-px w-8 bg-white/15" />
              <span>End-to-End · Riders Only</span>
              <div className="h-px w-8 bg-white/15" />
            </div>

            {activeThread.map((m, i) => {
              const isMe = m.senderId === "me";
              const prev = activeThread[i - 1];
              const showAvatar = !isMe && (!prev || prev.senderId !== m.senderId);

              return (
                <div
                  key={m.id}
                  className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                >
                  {!isMe && (
                    <div className="h-7 w-7 flex-shrink-0">
                      {showAvatar && m.senderPhoto && (
                        <div className="relative h-7 w-7 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={m.senderPhoto}
                            alt={m.senderName || ""}
                            fill
                            sizes="28px"
                            className="object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`flex max-w-[78%] flex-col ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {active.isGroup && !isMe && showAvatar && m.senderName && (
                      <span className="mb-0.5 ml-3 text-[10px] uppercase tracking-[0.25em] text-[#e87a82]">
                        {m.senderName}
                      </span>
                    )}

                    <div
                      className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        isMe
                          ? "rounded-br-md bg-gradient-to-br from-[#b4141e] to-[#8a0f17] text-white shadow-[0_0_18px_rgba(180,20,30,0.25)]"
                          : "rounded-bl-md border border-white/10 bg-gradient-to-b from-[#141416] to-[#0a0a0c] text-white/90"
                      }`}
                    >
                      {m.text}
                    </div>

                    <span className="mt-1 px-1 text-[10px] uppercase tracking-[0.25em] text-white/35">
                      {m.timeLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 hover:border-[#b4141e]/60 hover:text-[#e87a82]"
              aria-label="Add"
            >
              ＋
            </button>

            <div className="flex flex-1 items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] px-4 py-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={`Message ${active.name.split(" ")[0]}...`}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
              <button className="text-white/50 hover:text-[#e87a82]" aria-label="Photo">
                ◧
              </button>
            </div>

            <button
              onClick={sendMessage}
              disabled={!draft.trim()}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                draft.trim()
                  ? "bg-[#b4141e] text-white shadow-[0_0_20px_rgba(180,20,30,0.45)] hover:bg-[#d11827]"
                  : "border border-white/10 text-white/30"
              }`}
              aria-label="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050405] text-zinc-100">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 48% at 50% 0%, rgba(104,0,11,0.44), transparent 58%),
            radial-gradient(ellipse 70% 36% at 50% 18%, rgba(127,17,27,0.16), transparent 70%),
            linear-gradient(180deg, rgba(127,17,27,0.06) 0%, rgba(0,0,0,0) 32%)
          `,
        }}
      />

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="w-[72px]" />
            <Link
              href="/connect"
              className="rounded-full bg-[#b4141e] px-4 py-2 text-xs uppercase tracking-[0.25em] text-white shadow-[0_0_20px_rgba(180,20,30,0.35)] hover:bg-[#d11827]"
            >
              + New
            </Link>
          </div>

          <div className="mt-10 text-center">
            <div className="mx-auto flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-white/20" />
              <span className="text-xl text-[#b4141e]">✦</span>
              <span className="h-px w-12 bg-white/20" />
            </div>

            <h1 className="mt-6 font-serif text-7xl leading-none text-white">
              Messages
            </h1>
          </div>

          <div className="mt-10">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] px-4 py-2.5">
              <span className="text-white/40">⌕</span>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search riders, groups..."
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-1.5">
              {(["all", "unread", "groups"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-xl py-2 text-[11px] uppercase tracking-[0.3em] transition ${
                    tab === t
                      ? "bg-[#b4141e] text-white shadow-[0_0_18px_rgba(180,20,30,0.35)]"
                      : "text-white/55 hover:text-white"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto mt-8 max-w-2xl px-5">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-10 text-center">
            <p className="font-serif text-2xl italic text-white">Silence on the line.</p>
            <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/40">
              No conversations match
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="group flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 text-left transition hover:border-[#b4141e]/40 hover:shadow-[0_0_25px_rgba(180,20,30,0.15)]"
              >
                <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full border border-white/10">
                  <Image
                    src={c.photo}
                    alt={c.name}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                  {c.online && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#0c0c0d] bg-[#b4141e]" />
                  )}
                  {c.isGroup && (
                    <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-full border border-[#0c0c0d] bg-[#b4141e] text-[8px] text-white">
                      ◈
                    </span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-white">{c.name}</p>
                    <span className="flex-shrink-0 text-[10px] uppercase tracking-[0.25em] text-white/40">
                      {c.timeLabel}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${
                        c.unread > 0 ? "text-white/90" : "text-white/45"
                      }`}
                    >
                      {c.lastMessage}
                    </p>

                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#b4141e] px-1.5 text-[10px] font-medium text-white shadow-[0_0_12px_rgba(180,20,30,0.5)]">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-center justify-center gap-3 text-white/30">
          <div className="h-px w-12 bg-white/15" />
          <span className="text-xs">✦</span>
          <div className="h-px w-12 bg-white/15" />
        </div>

        <p className="mt-4 text-center text-[10px] uppercase tracking-[0.4em] text-white/30">
          © Crimson Society · MMXXVI
        </p>
      </div>
    </main>
  );
}