"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AdminProductEditor } from "@/components/admin/shop/AdminProductEditor";
import { AdminProductListRow } from "@/components/admin/shop/AdminProductListRow";
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
  const [editorMode, setEditorMode] = useState<"closed" | "create" | "edit">("closed");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
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

  async function applyInventoryMap(productId: string, sizeInventory: Product["size_inventory"]) {
    if (sizeInventory === undefined) return;

    const { error } = await supabase.rpc("product_inventory_apply_map", {
      p_product_id: productId,
      p_size_inventory: sizeInventory,
    });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = await supabase.from("products").select("*").eq("id", productId).maybeSingle();
    if (data) {
      setProducts((prev) => prev.map((p) => (p.id === productId ? (data as Product) : p)));
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

  function closeEditor() {
    setEditorMode("closed");
    setEditingProductId(null);
  }

  function openCreate() {
    setSuccessMsg("");
    setEditorMode("create");
    setEditingProductId(null);
  }

  function openEdit(id: string) {
    setSuccessMsg("");
    setEditorMode("edit");
    setEditingProductId(id);
  }

  const editingProduct =
    editingProductId != null ? products.find((p) => p.id === editingProductId) : null;

  async function updateProduct(id: string, patch: Partial<Product>) {
    setSavingId(id);
    setErrorMsg("");
    setSuccessMsg("");

    const { size_inventory, ...rowPatch } = patch;

    const { error } = await supabase.from("products").update(rowPatch).eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      setSavingId(null);
      return;
    }

    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, ...rowPatch } : product)));

    try {
      if (size_inventory !== undefined) {
        await applyInventoryMap(id, size_inventory);
      }
      await syncCreditReward(id);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Sync failed");
      setSavingId(null);
      return;
    }

    setSuccessMsg("Product updated.");
    setSavingId(null);
    closeEditor();
  }

  async function createProductFromPatch(patch: Partial<Product>) {
    setCreating(true);
    setErrorMsg("");
    setSuccessMsg("");

    const isCreditReward = patch.product_type === "credit_reward";
    const { size_inventory, ...rowPatch } = patch;

    const insert = {
      name: rowPatch.name?.trim() || "Untitled",
      slug: rowPatch.slug?.trim() || `${isCreditReward ? "reward" : "merch"}-${Date.now()}`,
      tagline: rowPatch.tagline ?? "",
      description: rowPatch.description ?? "",
      price: rowPatch.price ?? 0,
      category: rowPatch.category ?? (isCreditReward ? "accessories" : "tees"),
      status: rowPatch.status ?? "coming_soon",
      badge: rowPatch.badge ?? (isCreditReward ? null : "new"),
      sizes: rowPatch.sizes ?? (isCreditReward ? [] : ["S", "M", "L", "XL"]),
      images: rowPatch.images ?? [],
      sort_order: rowPatch.sort_order ?? products.length,
      product_type: rowPatch.product_type ?? "cash_product",
      credit_cost: isCreditReward ? (rowPatch.credit_cost ?? 100) : null,
      reward_category: isCreditReward ? (rowPatch.reward_category ?? "community") : null,
      reward_kind: isCreditReward ? rowPatch.reward_kind ?? "physical" : null,
      requires_shirt_size: rowPatch.requires_shirt_size ?? false,
      inventory_remaining: rowPatch.inventory_remaining ?? null,
      inventory_total: rowPatch.inventory_total ?? null,
      size_inventory: size_inventory ?? null,
    };

    const { data, error } = await supabase.from("products").insert(insert).select("*").single();

    if (error) {
      setErrorMsg(error.message);
      setCreating(false);
      return;
    }

    const created = data as Product;
    setProducts((prev) => [...prev, created]);

    try {
      if (size_inventory) {
        await applyInventoryMap(created.id, size_inventory);
      }
      if (created.product_type === "credit_reward") {
        await syncCreditReward(created.id);
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Sync failed");
      setCreating(false);
      return;
    }

    setSuccessMsg("Product created.");
    setCreating(false);
    closeEditor();
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
    closeEditor();
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">Admin · Shop</p>
            <h1 className="mt-3 text-4xl font-semibold">Shop Control Room</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Merch, credit rewards, inventory, and redemption fulfillment.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
            >
              Main Admin
            </Link>

            {tab === "products" && editorMode === "closed" ? (
              <button
                type="button"
                onClick={openCreate}
                disabled={creating}
                className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Add product / reward
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
                Order management is coming soon. Merch checkout with inventory reservations will
                connect here.
              </div>
            ) : null}

            {tab === "redemptions" ? (
              <div className="mt-8">
                <RedemptionsTab />
              </div>
            ) : null}

            {tab === "products" ? (
              <div className="mt-8 space-y-4">
                {editorMode === "create" ? (
                  <AdminProductEditor
                    key="admin-new-product"
                    isNew
                    disabled={creating}
                    onCancel={closeEditor}
                    onSave={createProductFromPatch}
                  />
                ) : null}

                {editorMode === "edit" && editingProduct ? (
                  <AdminProductEditor
                    key={editingProduct.id}
                    product={editingProduct}
                    disabled={savingId === editingProduct.id}
                    onCancel={closeEditor}
                    onSave={(patch) => updateProduct(editingProduct.id, patch)}
                    onDelete={() => void deleteProduct(editingProduct.id)}
                  />
                ) : null}

                {editorMode === "closed" ? (
                  <>
                    {products.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-zinc-500">
                        No products yet. Add a merch product or credit reward to get started.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {products.map((product) => (
                          <AdminProductListRow
                            key={product.id}
                            product={product}
                            onEdit={() => openEdit(product.id)}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
