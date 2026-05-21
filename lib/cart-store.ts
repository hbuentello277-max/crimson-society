"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  key: string; // productId + size
  productId: string;
  size: string;
  quantity: number;
};

export type ToastPayload = {
  id: number;
  title: string;
  subtitle?: string;
};

export type WaitlistEntry = {
  productId: string;
  email: string;
  addedAt: string;
};

type CartState = {
  items: CartItem[];
  drawerOpen: boolean;
  toast: ToastPayload | null;
  waitlist: WaitlistEntry[];

  addItem: (productId: string, size: string, name: string) => void;
  removeItem: (key: string) => void;
  increment: (key: string) => void;
  decrement: (key: string) => void;
  clear: () => void;

  openDrawer: () => void;
  closeDrawer: () => void;

  showToast: (title: string, subtitle?: string) => void;
  hideToast: () => void;

  joinWaitlist: (productId: string, email: string) => void;
};

const makeKey = (productId: string, size: string) => `${productId}__${size}`;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      toast: null,
      waitlist: [],

      addItem: (productId, size, name) => {
        const key = makeKey(productId, size);
        const existing = get().items.find((i) => i.key === key);
        if (existing) {
          set({
            items: get().items.map((i) =>
              i.key === key ? { ...i, quantity: i.quantity + 1 } : i
            ),
          });
        } else {
          set({
            items: [...get().items, { key, productId, size, quantity: 1 }],
          });
        }
        get().showToast(`${name} added to bag`, `Size ${size}`);
      },

      removeItem: (key) =>
        set({ items: get().items.filter((i) => i.key !== key) }),

      increment: (key) =>
        set({
          items: get().items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + 1 } : i
          ),
        }),

      decrement: (key) =>
        set({
          items: get()
            .items.map((i) =>
              i.key === key ? { ...i, quantity: Math.max(0, i.quantity - 1) } : i
            )
            .filter((i) => i.quantity > 0),
        }),

      clear: () => set({ items: [] }),

      openDrawer: () => set({ drawerOpen: true }),
      closeDrawer: () => set({ drawerOpen: false }),

      showToast: (title, subtitle) =>
        set({ toast: { id: Date.now(), title, subtitle } }),
      hideToast: () => set({ toast: null }),

      joinWaitlist: (productId, email) => {
        const exists = get().waitlist.find(
          (w) => w.productId === productId && w.email === email
        );
        if (!exists) {
          set({
            waitlist: [
              ...get().waitlist,
              { productId, email, addedAt: new Date().toISOString() },
            ],
          });
        }
      },
    }),
    {
      name: "crimson-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, waitlist: state.waitlist }),
    }
  )
);

// Derived helpers
export const useCartCount = () =>
  useCart((s) => s.items.reduce((sum, i) => sum + i.quantity, 0));

export const useCartItems = () => useCart((s) => s.items);