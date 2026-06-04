"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { AdminCreditRewardRow, AdminRewardUpsertBody } from "@/lib/credits/admin-rewards-types";
import {
  defaultRewardKindForCategory,
  isRewardCategory,
  isRewardKind,
} from "@/lib/credits/admin-rewards-validation";
import type { CrimsonCreditRewardCategory, CrimsonCreditRewardKind } from "@/lib/credits/types";

type EditorState = {
  id: string | null;
  slug: string;
  title: string;
  description: string;
  credit_cost: string;
  reward_category: CrimsonCreditRewardCategory;
  reward_kind: CrimsonCreditRewardKind;
  inventory_total: string;
  inventory_remaining: string;
  requires_shirt_size: boolean;
  is_active: boolean;
  sort_order: string;
  image_path: string | null;
  image_url: string | null;
};

const emptyEditor = (): EditorState => ({
  id: null,
  slug: "",
  title: "",
  description: "",
  credit_cost: "100",
  reward_category: "community",
  reward_kind: "physical",
  inventory_total: "",
  inventory_remaining: "",
  requires_shirt_size: false,
  is_active: true,
  sort_order: "0",
  image_path: null,
  image_url: null,
});

function editorFromReward(reward: AdminCreditRewardRow): EditorState {
  return {
    id: reward.id,
    slug: reward.slug,
    title: reward.title,
    description: reward.description ?? "",
    credit_cost: String(reward.credit_cost),
    reward_category: reward.reward_category,
    reward_kind: reward.reward_kind,
    inventory_total: reward.inventory_total == null ? "" : String(reward.inventory_total),
    inventory_remaining:
      reward.inventory_remaining == null ? "" : String(reward.inventory_remaining),
    requires_shirt_size: reward.requires_shirt_size,
    is_active: reward.is_active,
    sort_order: String(reward.sort_order),
    image_path: reward.image_path,
    image_url: reward.image_url,
  };
}

type Props = {
  refreshKey?: number;
};

export function CatalogTab({ refreshKey = 0 }: Props) {
  const [rewards, setRewards] = useState<AdminCreditRewardRow[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/rewards");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load rewards");
      setRewards(data.rewards ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  function openCreate() {
    setEditor(emptyEditor());
    setSuccess(null);
    setError(null);
  }

  function openEdit(reward: AdminCreditRewardRow) {
    setEditor(editorFromReward(reward));
    setSuccess(null);
    setError(null);
  }

  async function saveEditor() {
    if (!editor) return;

    const creditCost = Number.parseInt(editor.credit_cost, 10);
    if (!Number.isFinite(creditCost) || creditCost <= 0) {
      setError("Credit cost must be a positive number.");
      return;
    }

    const payload: AdminRewardUpsertBody = {
      slug: editor.slug.trim() || undefined,
      title: editor.title.trim(),
      description: editor.description.trim() || null,
      credit_cost: creditCost,
      reward_category: editor.reward_category,
      reward_kind: editor.reward_kind,
      inventory_total: editor.inventory_total.trim()
        ? Number.parseInt(editor.inventory_total, 10)
        : null,
      inventory_remaining: editor.inventory_remaining.trim()
        ? Number.parseInt(editor.inventory_remaining, 10)
        : null,
      requires_shirt_size: editor.requires_shirt_size,
      is_active: editor.is_active,
      sort_order: Number.parseInt(editor.sort_order, 10) || 0,
      image_path: editor.image_path,
    };

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(
        editor.id ? `/api/admin/rewards/${editor.id}` : "/api/admin/rewards",
        {
          method: editor.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");

      setSuccess(editor.id ? "Reward updated." : "Reward created.");
      setEditor(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function uploadImage(file: File) {
    if (!editor?.id) {
      setError("Save the reward first, then upload an image.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const form = new FormData();
      form.set("reward_id", editor.id);
      form.set("file", file);

      const res = await fetch("/api/admin/rewards/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");

      setEditor((current) =>
        current
          ? {
              ...current,
              image_path: data.path,
              image_url: data.url,
            }
          : current,
      );
      setSuccess("Image uploaded.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Manage launch rewards and inventory.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400 hover:border-white/20"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/15 px-4 py-2 text-xs uppercase tracking-[0.18em] text-[#f1c3c7]"
          >
            New reward
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {success}
        </p>
      ) : null}

      {editor ? (
        <div className="rounded-2xl border border-[#b4141e]/25 bg-black/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#e87a82]">
            {editor.id ? "Edit reward" : "Create reward"}
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Title</span>
              <input
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Slug</span>
              <input
                value={editor.slug}
                onChange={(e) => setEditor({ ...editor, slug: e.target.value })}
                placeholder="auto from title"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Credit cost
              </span>
              <input
                type="number"
                min={1}
                value={editor.credit_cost}
                onChange={(e) => setEditor({ ...editor, credit_cost: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Description
              </span>
              <textarea
                value={editor.description}
                onChange={(e) => setEditor({ ...editor, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Category</span>
              <select
                value={editor.reward_category}
                onChange={(e) => {
                  const category = e.target.value;
                  if (!isRewardCategory(category)) return;
                  setEditor({
                    ...editor,
                    reward_category: category,
                    reward_kind: defaultRewardKindForCategory(category),
                  });
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="cash" className="bg-black">
                  Cash
                </option>
                <option value="community" className="bg-black">
                  Community
                </option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Kind</span>
              <select
                value={editor.reward_kind}
                onChange={(e) => {
                  const kind = e.target.value;
                  if (!isRewardKind(kind)) return;
                  setEditor({ ...editor, reward_kind: kind });
                }}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="merch_discount" className="bg-black">
                  Merch discount
                </option>
                <option value="cash_value" className="bg-black">
                  Cash value
                </option>
                <option value="physical" className="bg-black">
                  Physical
                </option>
              </select>
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Inventory total
              </span>
              <input
                value={editor.inventory_total}
                onChange={(e) => setEditor({ ...editor, inventory_total: e.target.value })}
                placeholder="Unlimited if empty"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Inventory remaining
              </span>
              <input
                value={editor.inventory_remaining}
                onChange={(e) => setEditor({ ...editor, inventory_remaining: e.target.value })}
                placeholder="Matches total if empty"
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                Sort order
              </span>
              <input
                type="number"
                value={editor.sort_order}
                onChange={(e) => setEditor({ ...editor, sort_order: e.target.value })}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              />
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={editor.requires_shirt_size}
                onChange={(e) =>
                  setEditor({ ...editor, requires_shirt_size: e.target.checked })
                }
                className="h-4 w-4 rounded border-white/20"
              />
              <span className="text-sm text-zinc-300">Requires shirt size</span>
            </label>
            <label className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={editor.is_active}
                onChange={(e) => setEditor({ ...editor, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-white/20"
              />
              <span className="text-sm text-zinc-300">Active (visible to members)</span>
            </label>
          </div>

          {editor.image_url ? (
            <div className="relative mt-4 h-24 w-24 overflow-hidden rounded-xl border border-white/10">
              <Image src={editor.image_url} alt="" fill className="object-cover" sizes="96px" />
            </div>
          ) : null}

          <label className="mt-4 block">
            <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Image</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={uploading || !editor.id}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadImage(file);
                e.target.value = "";
              }}
              className="mt-1 block w-full text-sm text-zinc-400 file:mr-3 file:rounded-full file:border file:border-white/10 file:bg-white/5 file:px-3 file:py-1.5 file:text-xs file:uppercase file:tracking-[0.16em] file:text-zinc-300"
            />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveEditor()}
              className="rounded-full border border-[#b4141e]/50 bg-[#b4141e]/20 px-5 py-2 text-xs uppercase tracking-[0.18em] text-[#f1c3c7] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save reward"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditor(null)}
              className="rounded-full border border-white/10 px-5 py-2 text-xs uppercase tracking-[0.18em] text-zinc-400"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? <p className="text-sm text-zinc-500">Loading catalog…</p> : null}

      {!loading && rewards.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-zinc-500">
          No rewards in catalog.
        </p>
      ) : null}

      <div className="space-y-2">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center"
          >
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {reward.image_url ? (
                <Image src={reward.image_url} alt="" fill className="object-cover" sizes="64px" />
              ) : (
                <div className="flex h-full items-center justify-center text-[9px] uppercase text-zinc-600">
                  No img
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-white">{reward.title}</p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] ${
                    reward.reward_category === "cash"
                      ? "border border-amber-500/30 text-amber-200"
                      : "border border-sky-500/30 text-sky-200"
                  }`}
                >
                  {reward.reward_category}
                </span>
                {!reward.is_active ? (
                  <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                    Disabled
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {reward.credit_cost} credits · {reward.slug}
                {reward.inventory_remaining != null
                  ? ` · ${reward.inventory_remaining} left`
                  : " · unlimited"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openEdit(reward)}
              className="shrink-0 rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 hover:border-[#b4141e]/40"
            >
              Edit
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
