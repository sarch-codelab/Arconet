"use client";

import { useEffect, useState } from "react";

export function useCategorias() {
  const [state, setState] = useState({ categorias: [], loaded: false });

  useEffect(() => {
    let alive = true;
    fetch("/api/categorias?estado=activo", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("No se pudieron cargar las categorías.");
        return response.json();
      })
      .then((data) => {
        if (!alive || !Array.isArray(data)) return;
        setState({ categorias: data, loaded: true });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
