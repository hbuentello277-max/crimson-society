"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCart, useCartItems } from "@/lib/cart-store";
import { getProduct, formatPrice } from "@/lib/products";

type FormState = {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const initialForm: FormState = {
  name: "",
  email: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartItems();
  const clear = useCart((s) => s.clear);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const subtotal = items.reduce((sum, i) => {
    const p = getProduct(i.productId);
    return sum + (p?.price || 0) * i.quantity;
  }, 0);
  const shipping = subtotal === 0 ? 0 : subtotal >= 200 ? 0 : 12;
  const tax = Math.round(subtotal * 0.0825 * 100) / 100;
  const total = subtotal + shipping + tax;

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email needed";
    if (!form.address.trim()) e.address = "Required";
    if (!form.city.trim()) e.city = "Required";
    if (!form.state.trim()) e.state = "Required";
    if (!form.zip.trim() || form.zip.length < 5) e.zip = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setTimeout(() => {
      const orderId = `CS-${Date.now().toString().slice(-6)}`;
      sessionStorage.setItem(
        "cs-last-order",
        JSON.stringify({ orderId, total, items, form })
      );
      clear();
      router.push("/checkout/success");
    }, 900);
  };

  const update = (k: keyof FormState, v: string) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#050505] pb-32 text-white">
        <div className="mx-auto max-w-2xl px-5 pt-20 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Checkout</p>
          <h1 className="mt-2 font-serif text-4xl italic text-white">Your bag is empty.</h1>
          <p className="mt-3 text-sm text-white/55">There's nothing to check out yet.</p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-full bg-[#b4141e] px-6 py-3 text-xs uppercase tracking-[0.3em] text-white shadow-[0_0_25px_rgba(180,20,30,0.4)] hover:bg-[#d11827]"
          >
            Browse Shop
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] pb-32 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4">
          <Link
            href="/shop"
            className="text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white"
          >
            ← Shop
          </Link>
          <div className="text-center">
            <p className="text-[10px] uppercase tracking-[0.4em] text-[#e87a82]">Secure</p>
            <h1 className="font-serif text-xl italic text-white">Checkout</h1>
          </div>
          <span className="text-xs uppercase tracking-[0.25em] text-white/40">SSL · 256-bit</span>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-5 pt-8">
        <div className="grid gap-8 lg:grid-cols-[1.4fr,1fr]">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Section I</p>
              <h2 className="mb-4 font-serif text-2xl italic text-white">Contact</h2>
              <div className="space-y-3">
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => update("name", v)}
                  error={errors.name}
                  placeholder="Hector Buentello"
                />
                <Field
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  error={errors.email}
                  placeholder="you@example.com"
                />
              </div>
            </section>

            {/* Shipping */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Section II</p>
              <h2 className="mb-4 font-serif text-2xl italic text-white">Shipping</h2>
              <div className="space-y-3">
                <Field
                  label="Street Address"
                  value={form.address}
                  onChange={(v) => update("address", v)}
                  error={errors.address}
                  placeholder="123 Heritage Ave"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr,1fr,1fr]">
                  <Field
                    label="City"
                    value={form.city}
                    onChange={(v) => update("city", v)}
                    error={errors.city}
                    placeholder="Houston"
                  />
                  <Field
                    label="State"
                    value={form.state}
                    onChange={(v) => update("state", v.toUpperCase().slice(0, 2))}
                    error={errors.state}
                    placeholder="TX"
                  />
                  <Field
                    label="ZIP"
                    value={form.zip}
                    onChange={(v) => update("zip", v.replace(/\D/g, "").slice(0, 5))}
                    error={errors.zip}
                    placeholder="77002"
                  />
                </div>
              </div>
            </section>

            {/* Payment placeholder */}
            <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Section III</p>
              <h2 className="mb-2 font-serif text-2xl italic text-white">Payment</h2>
              <p className="mb-4 text-xs uppercase tracking-[0.25em] text-white/40">
                Stripe element mounts here
              </p>

              <div className="rounded-xl border border-dashed border-white/15 bg-black/40 p-5 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-[#b4141e]/40 bg-[#b4141e]/10 text-xl text-[#e87a82]">
                  ▢
                </div>
                <p className="font-serif text-lg italic text-white">Stripe Integration</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/40">
                  Card · Apple Pay · Google Pay
                </p>
                <p className="mt-3 text-[11px] text-white/55">
                  Connect your Stripe keys in <code className="text-[#e87a82]">.env.local</code> and
                  mount the
                  <code className="mx-1 text-[#e87a82]">PaymentElement</code>
                  here.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
                <span>🔒</span>
                <span>Encrypted end-to-end · PCI compliant</span>
              </div>
            </section>

            <motion.button
              type="submit"
              disabled={submitting}
              whileTap={{ scale: 0.98 }}
              className={`w-full rounded-full px-6 py-4 text-xs uppercase tracking-[0.3em] transition ${
                submitting
                  ? "cursor-not-allowed border border-white/10 bg-black/40 text-white/50"
                  : "bg-[#b4141e] text-white shadow-[0_0_28px_rgba(180,20,30,0.45)] hover:bg-[#d11827]"
              }`}
            >
              {submitting ? "Processing..." : `Place Order · ${formatPrice(total)}`}
            </motion.button>
          </form>

          {/* Summary */}
          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-5">
              <p className="mb-1 text-[10px] uppercase tracking-[0.35em] text-[#e87a82]">Order</p>
              <h2 className="mb-4 font-serif text-2xl italic text-white">Summary</h2>

              <div className="space-y-3">
                {items.map((item) => {
                  const p = getProduct(item.productId);
                  if (!p) return null;
                  return (
                    <div key={item.key} className="flex gap-3">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10">
                        <Image src={p.images[0]} alt={p.name} fill className="object-cover" />
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-[#050505] bg-[#b4141e] text-[10px] text-white">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-serif text-base italic text-white">{p.name}</p>
                        <p className="mt-0.5 text-[10px] uppercase tracking-[0.25em] text-white/45">
                          Size {item.size}
                        </p>
                      </div>
                      <p className="text-sm text-[#e87a82]">{formatPrice(p.price * item.quantity)}</p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-1.5 border-t border-white/10 pt-4 text-sm">
                <Row label="Subtotal" value={formatPrice(subtotal)} />
                <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
                <Row label="Tax (est.)" value={formatPrice(tax)} />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-[10px] uppercase tracking-[0.3em] text-white/50">Total</span>
                <span className="font-serif text-2xl italic text-[#e87a82]">
                  {formatPrice(total)}
                </span>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-[#0c0c0d] to-[#070707] p-4 text-center">
              <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                Hand-pressed in 48 hours
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-white/40">
                30-day returns · Free over $200
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.3em] text-white/40">
        <span>{label}</span>
        {error && <span className="text-[#e87a82]">{error}</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-xl border bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 ${
          error
            ? "border-[#b4141e] focus:border-[#e87a82]"
            : "border-white/10 focus:border-white/30"
        }`}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-white/70">
      <span>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}