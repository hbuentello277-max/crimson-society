"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminProductEditor } from "@/components/admin/shop/AdminProductEditor";
import { RedemptionsTab } from "@/components/admin/rewards/RedemptionsTab";
import { Product } from "@/lib/products";

type AdminShopTab = "products" | "orders" | "redemptions";

export default function AdminShopPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-black px-6 py-20 text-white">Loading…</main>}>
      <AdminShopPageInner />
    </Suspense>
  );
}

function AdminShopPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: AdminShopTab =
    searchParams.get("tab") === "redemptions"
      ? "redemptions"
      : searchParams.get("tab") === "orders"
        ? "orders"
        : "products";
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setProducts((data as Product[]) || []);
  }

  async function syncCreditReward(productId: string) {
    const res = await fetch("/api/admin/shop/products/sync-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Failed to sync credit reward");
    }
    if (data.product) {
      setProducts((prev) =>
        prev.map((item) => (item.id === productId ? { ...item, ...data.product } : item)),
      );
    }
  }

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMsg("You need to be logged in.");
        setLoading(false);
        return;
      }

      const { data: me, error: meError } = await supabase
        .from("profiles")
        .select("id, role, status")
        .eq("id", user.id)
        .maybeSingle();

      if (meError) {
        setErrorMsg(meError.message);
        setLoading(false);
        return;
      }

      if (!me) {
        setErrorMsg("Your profile row was not found.");
        setLoading(false);
        return;
      }

      if (me.role !== "admin" || me.status !== "active") {
        setErrorMsg("You do not have access to this page.");
        setLoading(false);
        return;
      }

      await fetchProducts();
      setLoading(false);
    }

    loadPage();
  }, []);

  async function updateProduct(id: string, patch: Partial<Product>) {
    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.from("products").update(patch).eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      setSavingId(null);
      return;
    }

    const next = { ...products.find((p) => p.id === id)!, ...patch };
    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, ...patch } : product)));

    if (next.product_type === "credit_reward") {
      try {
        await syncCreditReward(id);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Sync failed");
        setSavingId(null);
        return;
      }
    }

    setSuccessMsg("Product updated.");
    setSavingId(null);
  }

  async function createProductFromPatch(patch: Partial<Product>) {
    setCreating(true);
    setErrorMsg("");
    setSuccessMsg("");

    const isCreditReward = patch.product_type === "credit_reward";
    const insert = {
      name: patch.name?.trim() || "Untitled",
      slug: patch.slug?.trim() || `${isCreditReward ? "reward" : "merch"}-${Date.now()}`,
      tagline: patch.tagline ?? "",
      description: patch.description ?? "",
      price: patch.price ?? 0,
      category: patch.category ?? (isCreditReward ? "accessories" : "tees"),
      status: patch.status ?? "coming_soon",
      badge: patch.badge ?? (isCreditReward ? null : "new"),
      sizes: patch.sizes ?? (isCreditReward ? [] : ["S", "M", "L", "XL"]),
      images: patch.images ?? [],
      sort_order: patch.sort_order ?? products.length,
      product_type: patch.product_type ?? "cash_product",
      credit_cost: isCreditReward ? (patch.credit_cost ?? 100) : null,
      reward_category: isCreditReward ? (patch.reward_category ?? "community") : null,
      reward_kind: isCreditReward ? patch.reward_kind ?? "physical" : null,
      requires_shirt_size: patch.requires_shirt_size ?? false,
      inventory_remaining: patch.inventory_remaining ?? null,
      inventory_total: patch.inventory_total ?? null,
    };

    const { data, error } = await supabase.from("products").insert(insert).select("*").single();

    if (error) {
      setErrorMsg(error.message);
      setCreating(false);
      return;
    }

    const created = data as Product;
    setProducts((prev) => [...prev, created]);
    setShowCreateForm(false);

    if (created.product_type === "credit_reward") {
      try {
        await syncCreditReward(created.id);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : "Sync failed");
        setCreating(false);
        return;
      }
    }

    setSuccessMsg("Product created.");
    setCreating(false);
  }

  async function deleteProduct(id: string) {
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      setSavingId(null);
      return;
    }

    setProducts((prev) => prev.filter((product) => product.id !== id));
    setSuccessMsg("Product deleted.");
    setSavingId(null);
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin · Shop</p>
            <h1 className="mt-3 text-4xl font-semibold">Shop Control Room</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Cash products, credit rewards, and redemption fulfillment in one place.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
            >
              Main Admin
            </Link>

            {tab === "products" ? (
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(true);
                  setSuccessMsg("");
                }}
                disabled={creating || showCreateForm}
                className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                New product
              </button>
            ) : null}
          </div>
        </div>

        {loading && (
          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm text-zinc-300">
            Loading products...
          </div>
        )}

        {!loading && errorMsg && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            <p className="text-sm text-red-300">{errorMsg}</p>
          </div>
        )}

        {!loading && !errorMsg && (
          <>
            <div className="mt-8 flex flex-wrap gap-2 border-b border-white/10 pb-4">
              {(
                [
                  { id: "products" as const, label: "Products" },
                  { id: "orders" as const, label: "Orders" },
                  { id: "redemptions" as const, label: "Redemptions" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/admin/shop?tab=${item.id}`)}
                  className={`rounded-full px-4 py-2 text-xs uppercase tracking-[0.2em] ${
                    tab === item.id
                      ? "border border-[#b4141e]/50 bg-[#b4141e]/15 text-[#f1c3c7]"
                      : "border border-white/10 text-zinc-500"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {successMsg && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-300">{successMsg}</p>
              </div>
            )}

            {tab === "orders" ? (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-sm text-zinc-500">
                Order management is coming soon. Cash checkout orders will appear here.
              </div>
            ) : null}

            {tab === "redemptions" ? (
              <div className="mt-8">
                <RedemptionsTab />
              </div>
            ) : null}

            {tab === "products" ? (
              <div className="mt-8 space-y-4">
                {showCreateForm ? (
                  <AdminProductEditor
                    isNew
                    disabled={creating}
                    onCancel={() => setShowCreateForm(false)}
                    onSave={createProductFromPatch}
                  />
                ) : null}

                {products.map((product) => (
                  <AdminProductEditor
                    key={product.id}
                    product={product}
                    disabled={savingId === product.id}
                    onSave={(patch) => updateProduct(product.id, patch)}
                    onDelete={() => void deleteProduct(product.id)}
                  />
                ))}

                {products.length === 0 && !showCreateForm ? (
                  <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                    No products yet. Use New product to add merch or a credit reward.
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
