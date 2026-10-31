"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "arconet-cart-v1";

const CartContext = createContext(null);

function itemKey(slug, presentation) {
  return `${slug}::${presentation}`;
}

function readStoredItems() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && item.slug && Number(item.quantity) > 0)
      .map((item) => {
        const slug = String(item.slug);
        const detailHref = item.href || (slug.startsWith("p-")
          ? `/tienda/producto/${encodeURIComponent(slug)}`
          : "/tienda");
        return {
          key: item.key || itemKey(slug, item.presentation || "Estándar"),
          slug,
          href: detailHref,
          title: item.title || slug,
          category: item.category || "",
          index: item.index || "",
          image: item.image || null,
          presentation: item.presentation || "Estándar",
          quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
        };
      });
  } catch {
    return [];
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setItems(readStoredItems());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* almacenamiento no disponible */
    }
  }, [items, hydrated]);

  const addItem = useCallback((entry, quantity = 1) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const presentation = entry.presentation || "Estándar";
    const key = itemKey(entry.slug, presentation);
    setItems((current) => {
      const existing = current.find((item) => item.key === key);
      if (existing) {
        return current.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + qty } : item
        );
      }
      return [
        ...current,
        {
          key,
          slug: entry.slug,
          href: entry.href || "/tienda",
          title: entry.title || entry.slug,
          category: entry.category || "",
          index: entry.index || "",
          image: entry.image || null,
          presentation,
          quantity: qty,
        },
      ];
    });
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((key, quantity) => {
    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, quantity: qty } : item))
    );
  }, []);

  const removeItem = useCallback((key) => {
    setItems((current) => current.filter((item) => item.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((value) => !value), []);

  const count = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );

  const value = useMemo(
    () => ({
      items,
      count,
      isOpen,
      addItem,
      setQuantity,
      removeItem,
      clear,
      open,
      close,
      toggle,
    }),
    [items, count, isOpen, addItem, setQuantity, removeItem, clear, open, close, toggle]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de <CartProvider>.");
  return context;
}

export function buildCartMessage(items) {
  if (!items.length) return "";
  const lines = items.map((item, position) => {
    const meta = item.category ? ` — ${item.category}` : "";
    return `${position + 1}. ${item.title}${meta}\n   Presentación: ${item.presentation} · Cantidad: ${item.quantity}`;
  });
  const units = items.reduce((total, item) => total + item.quantity, 0);
  return [
    "Solicitud de cotización — Arconet",
    "",
    ...lines,
    "",
    `Total de unidades: ${units}`,
    "",
    "Datos de contacto:",
    "Nombre: ",
    "Empresa: ",
    "Teléfono: ",
  ].join("\n");
}
