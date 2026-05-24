"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Category,
  Product,
  ProductBadge,
  ProductStatus,
  formatPrice,
} from "@/lib/products";

export default function AdminShopPage() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
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

    setProducts((prev) =>
      prev.map((product) => (product.id === id ? { ...product, ...patch } : product))
    );

    setSuccessMsg("Product updated.");
    setSavingId(null);
  }

  async function createProduct() {
    setCreating(true);
    setErrorMsg("");
    setSuccessMsg("");

    const { data, error } = await supabase
      .from("products")
      .insert({
        name: "New Piece",
        slug: `new-piece-${Date.now()}`,
        tagline: "",
        description: "",
        price: 0,
        category: "tees",
        status: "coming_soon",
        badge: "new",
        sizes: ["S", "M", "L", "XL"],
        images: [],
        sort_order: products.length,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      setCreating(false);
      return;
    }

    setProducts((prev) => [...prev, data as Product]);
    setSuccessMsg("New product created.");
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
            <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">
              Admin · Shop
            </p>
            <h1 className="mt-3 text-4xl font-semibold">Merch Control Room</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-zinc-300 transition hover:border-white/30"
            >
              Main Admin
            </Link>

            <button
              onClick={createProduct}
              disabled={creating}
              className="rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white transition hover:border-[#b4141e]/70 hover:bg-[#b4141e]/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating..." : "New Product"}
            </button>
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
            {successMsg && (
              <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-300">{successMsg}</p>
              </div>
            )}

            <div className="mt-8 space-y-4">
              {products.map((product) => {
                const isSaving = savingId === product.id;

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Product Name
                          </label>
                          <input
                            value={product.name}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, { name: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Tagline
                          </label>
                          <input
                            value={product.tagline}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, { tagline: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Description
                          </label>
                          <textarea
                            rows={4}
                            value={product.description}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, { description: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Image URLs (comma separated)
                          </label>
                          <textarea
                            rows={3}
                            value={product.images.join(", ")}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                images: e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Sizes (comma separated)
                          </label>
                          <input
                            value={product.sizes.join(", ")}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                sizes: e.target.value
                                  .split(",")
                                  .map((item) => item.trim())
                                  .filter(Boolean),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Price
                          </label>
                          <input
                            type="number"
                            value={product.price}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                price: Number(e.target.value || 0),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                          <p className="mt-2 text-xs text-[#e87a82]">
                            {formatPrice(product.price)}
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Category
                          </label>
                          <select
                            value={product.category}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                category: e.target.value as Exclude<Category, "all">,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          >
                            <option value="tees" className="bg-black text-white">tees</option>
                            <option value="outerwear" className="bg-black text-white">outerwear</option>
                            <option value="headwear" className="bg-black text-white">headwear</option>
                            <option value="accessories" className="bg-black text-white">accessories</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Status
                          </label>
                          <select
                            value={product.status}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                status: e.target.value as ProductStatus,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          >
                            <option value="in_stock" className="bg-black text-white">in_stock</option>
                            <option value="out_of_stock" className="bg-black text-white">out_of_stock</option>
                            <option value="waitlist" className="bg-black text-white">waitlist</option>
                            <option value="coming_soon" className="bg-black text-white">coming_soon</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Badge
                          </label>
                          <select
                            value={product.badge ?? ""}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                badge: (e.target.value || null) as ProductBadge,
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          >
                            <option value="" className="bg-black text-white">none</option>
                            <option value="new" className="bg-black text-white">new</option>
                            <option value="low-stock" className="bg-black text-white">low-stock</option>
                            <option value="best" className="bg-black text-white">best</option>
                            <option value="sold-out" className="bg-black text-white">sold-out</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Slug
                          </label>
                          <input
                            value={product.slug}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, { slug: e.target.value })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                            Sort Order
                          </label>
                          <input
                            type="number"
                            value={product.sort_order}
                            disabled={isSaving}
                            onChange={(e) =>
                              updateProduct(product.id, {
                                sort_order: Number(e.target.value || 0),
                              })
                            }
                            className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition focus:border-[#b4141e]/60"
                          />
                        </div>

                        <button
                          onClick={() => deleteProduct(product.id)}
                          disabled={isSaving}
                          className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs uppercase tracking-[0.25em] text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Delete Product
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </main>
  );
}