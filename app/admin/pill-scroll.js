"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Desplazamiento de las filas de píldoras del panel.
 *
 * Las filas de píldoras (secciones de la cabecera y sub-secciones de cada
 * área) desbordan en cuanto la ventana no es muy ancha: en 1366 px falta un
 * trozo de la última píldora, y en tabletas y celulares falta casi la mitad de
 * la fila. El desborde era alcanzable con el dedo, pero no con un mouse: la
 * rueda movía la página hacia arriba y hacia abajo, y arrastrar con el botón
 * izquierdo no hacía nada. Las píldoras de la derecha quedaban fuera de
 * alcance.
 *
 * Este módulo completa el gesto sin sustituir el desplazamiento nativo:
 *
 *  - Rueda vertical sobre una fila que desborda: se traduce en desplazamiento
 *    horizontal. Al llegar a un extremo se libera, para que la rueda vuelva a
 *    mover la página y no quede atrapada en la cabecera.
 *  - Arrastre con el mouse (botón principal, sin modificadores): mueve la
 *    fila como en el teléfono. Se distingue del clic con un umbral, y tras un
 *    arrastre real se cancela el clic que el navegador emite al soltar para no
 *    cambiar de sección sin querer.
 *  - El dedo y el lápiz siguen deslizando de forma nativa; no se interceptan.
 *  - Si la fila cabe entera, no se instala ningún gesto.
 *
 * Los puntos de anclaje (scroll-snap) se suspenden mientras dura el gesto para
 * que la fila siga al puntero sin saltar a la píldora más cercana en cada
 * cuadro, y se restauran al soltar.
 */

const DRAG_THRESHOLD = 5;
const CLICK_GUARD_MS = 220;
const SNAP_RESUME_MS = 160;

function overflow(el) {
  return el.scrollWidth - el.clientWidth;
}

/**
 * Instala los gestos sobre una fila concreta.
 * @param {HTMLElement} el
 * @returns {() => void} limpieza
 */
function attachPillScroll(el) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let dragging = false;
  let clickGuardTimer = 0;
  let snapTimer = 0;

  /** Marca la fila solo cuando hay contenido fuera de la vista. */
  const syncOverflow = () => {
    const hasOverflow = overflow(el) > 1;
    const value = hasOverflow ? "true" : "false";
    if (el.dataset.pillOverflow !== value) el.dataset.pillOverflow = value;
    if (!hasOverflow && el.scrollLeft !== 0) el.scrollLeft = 0;
  };

  const pauseSnap = (delay = SNAP_RESUME_MS) => {
    el.style.scrollSnapType = "none";
    window.clearTimeout(snapTimer);
    snapTimer = window.setTimeout(() => {
      el.style.scrollSnapType = "";
    }, delay);
  };

  const onWheel = (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey) return;
    const max = overflow(el);
    if (max <= 1) return;
    // Un trackpad que ya envía desplazamiento lateral lo maneja el navegador.
    if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1;
    const delta = event.deltaY * unit;
    if (!delta) return;
    // En los extremos la rueda vuelve a la página.
    if ((delta > 0 && el.scrollLeft >= max - 1) || (delta < 0 && el.scrollLeft <= 1)) return;
    event.preventDefault();
    pauseSnap();
    el.scrollLeft = Math.max(0, Math.min(max, el.scrollLeft + delta));
  };

  const onPointerDown = (event) => {
    // El dedo y el lápiz ya deslizan solos; aquí solo se rescata el mouse.
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    if (overflow(el) <= 1) return;
    delete el.dataset.pillClickGuard;
    window.clearTimeout(clickGuardTimer);
    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startLeft = el.scrollLeft;
    dragging = false;
  };

  const onPointerMove = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD) return;
      // Intención vertical: se abandona el arrastre y la página sigue su curso.
      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        pointerId = null;
        return;
      }
      dragging = true;
      el.dataset.pillDragging = "true";
      pauseSnap();
      el.setPointerCapture?.(pointerId);
    }

    event.preventDefault();
    el.scrollLeft = Math.max(0, Math.min(overflow(el), startLeft - deltaX));
  };

  const endDrag = (event) => {
    if (pointerId === null) return;
    if (event?.pointerId !== undefined && event.pointerId !== pointerId) return;
    if (dragging) {
      // El navegador emite un clic al soltar: se neutraliza para que el
      // arrastre no cambie de sección.
      el.dataset.pillClickGuard = "true";
      window.clearTimeout(clickGuardTimer);
      clickGuardTimer = window.setTimeout(() => {
        delete el.dataset.pillClickGuard;
      }, CLICK_GUARD_MS);
      delete el.dataset.pillDragging;
      pauseSnap();
    }
    if (el.hasPointerCapture?.(pointerId)) {
      try {
        el.releasePointerCapture(pointerId);
      } catch {
        /* el puntero ya se liberó */
      }
    }
    pointerId = null;
    dragging = false;
  };

  const onClickCapture = (event) => {
    if (!el.dataset.pillClickGuard) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const onScroll = () => syncOverflow();
  const onResize = () => syncOverflow();

  el.addEventListener("wheel", onWheel, { passive: false });
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", endDrag);
  el.addEventListener("pointercancel", endDrag);
  el.addEventListener("click", onClickCapture, true);
  el.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  syncOverflow();
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(syncOverflow);
  observer?.observe(el);

  return () => {
    window.clearTimeout(clickGuardTimer);
    window.clearTimeout(snapTimer);
    delete el.dataset.pillOverflow;
    delete el.dataset.pillDragging;
    delete el.dataset.pillClickGuard;
    el.style.scrollSnapType = "";
    observer?.disconnect();
    window.removeEventListener("resize", onResize);
    el.removeEventListener("wheel", onWheel);
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    el.removeEventListener("click", onClickCapture, true);
    el.removeEventListener("scroll", onScroll);
  };
}

/**
 * Ref para la fila de píldoras.
 *
 * Es un ref de callback a propósito: la fila puede montarse después del
 * primer render (una sección que espera sus permisos antes de pintar
 * pestañas). Con un ref de objeto los listeners se habrían quedado sin
 * instalar y el mouse seguiría sin poder desplazar la fila.
 */
export function usePillScroll() {
  const cleanupRef = useRef(null);

  const ref = useCallback((node) => {
    cleanupRef.current?.();
    cleanupRef.current = node ? attachPillScroll(node) : null;
  }, []);

  useEffect(() => () => {
    cleanupRef.current?.();
    cleanupRef.current = null;
  }, []);

  return ref;
}
