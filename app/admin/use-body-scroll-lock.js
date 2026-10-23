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
let previousPaddingRight = "";

export function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockCount += 1;
    if (lockCount === 1) {
      previousOverflow = document.body.style.overflow;
      previousPaddingRight = document.body.style.paddingRight;
      const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
      const currentPadding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
      if (scrollbarWidth) document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
      document.body.style.overflow = "hidden";
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
        previousOverflow = "";
        previousPaddingRight = "";
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
