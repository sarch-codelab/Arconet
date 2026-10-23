"use client";

import { useEffect } from "react";

/**
 * Bloqueo compartido del desplazamiento del fondo.
 *
 * Se mantiene un contador a nivel de modulo para que varios componentes
 * (cajon lateral y modales del panel) puedan bloquear el
 * desplazamiento sin que uno restaure el valor original mientras otro sigue
 * abierto.
 */
let lockCount = 0;
let previousOverflow = "";

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockCount += 1;
    if (lockCount === 1) {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        previousOverflow = "";
      }
    };
  }, [active]);
}

/** Cierra el elemento activo al pulsar Escape. */
export function useEscapeKey(active, handler) {
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") handler();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, handler]);
}
