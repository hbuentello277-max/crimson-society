"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminUserAvatar } from "@/components/admin/credits/AdminUserAvatar";
import { resolveDisplayLabel, resolveUsernameHandle } from "@/lib/credits/admin-user-display";
import type { AdminCreditUserSnippet } from "@/lib/credits/admin-types";

export type SelectedAdminUser = AdminCreditUserSnippet;

type Props = {
  selected: SelectedAdminUser | null;
  onSelect: (user: SelectedAdminUser | null) => void;
};

export function AdminUserSearch({ selected, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AdminCreditUserSnippet[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/admin/credits/users/search?q=${encodeURIComponent(q.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Search failed");
      }
      setResults(data.users ?? []);
      setOpen(true);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Search failed");
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (selected) return;

    const timer = window.setTimeout(() => {
      void search(query);
    }, 280);

    return () => window.clearTimeout(timer);
  }, [query, search, selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handlePick(user: AdminCreditUserSnippet) {
    onSelect(user);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  function handleClear() {
    onSelect(null);
    setQuery("");
    setResults([]);
  }

  if (selected) {
    const label = resolveDisplayLabel(selected);
    const handle = resolveUsernameHandle(selected);

    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Selected user</p>
            <div className="mt-3 flex items-center gap-3">
              <AdminUserAvatar src={selected.avatar_url} alt={label} size="md" />
              <div>
                <p className="text-base font-medium text-white">{label}</p>
                {handle ? <p className="text-sm text-zinc-500">{handle}</p> : null}
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-600">
                  {selected.membership_label}
                </p>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-zinc-400 hover:border-white/20 hover:text-white"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block">
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Find member</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search username, display name, or email…"
          autoComplete="off"
          className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
        />
      </label>
      <p className="mt-1.5 text-[10px] text-zinc-600">Type at least 2 characters. Email search is admin-only.</p>

      {searching && <p className="mt-2 text-xs text-zinc-500">Searching…</p>}
      {searchError && <p className="mt-2 text-xs text-red-300">{searchError}</p>}

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0c0c0c] py-1 shadow-[0_20px_60px_rgba(0,0,0,0.8)]">
          {results.map((user) => {
            const label = resolveDisplayLabel(user);
            const handle = resolveUsernameHandle(user);
            return (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => handlePick(user)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-white/[0.04]"
                >
                  <AdminUserAvatar src={user.avatar_url} alt={label} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{label}</p>
                    {handle ? <p className="truncate text-xs text-zinc-500">{handle}</p> : null}
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                      {user.membership_label}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {open && !searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="absolute z-20 mt-2 w-full rounded-xl border border-white/10 bg-[#0c0c0c] px-3 py-3 text-xs text-zinc-500">
          No members found.
        </p>
      )}
    </div>
  );
}
