"use client";

/**
 * Deslice de las pantallas emergentes del panel con el mouse.
 *
 * Las emergentes del panel desplazan su propio contenido con la barra del
 * dialogo (`overflow: auto`). En un PC o una tableta con mouse, muchos
 * usuarios intentan "deslizar" el contenido con el boton izquierdo sostenido,
 * como en el telefono, y no pasa nada: la rueda y el trackpad funcionan, pero
 * arrastrar el contenido no. Este helper traduce ese arrastre en
 * desplazamiento real del contenedor.
 *
 * Reglas para no estorbar al resto de la interfaz:
 *  - Solo con mouse (`pointerType === "mouse"`); el dedo y el lapiz ya deslizan
 *    de forma nativa.
 *  - Solo boton principal y sin modificadores (Ctrl/Shift/Alt/Meta).
 *  - Nunca si el gesto empieza sobre un control (boton, campo, select, enlace,
 *    casilla, etiqueta…), porque ahi el arrastre tiene otro significado.
 *  - Los parrafos, celdas y montos conservan la seleccion de texto para copiar.
 *  - Tras un arrastre real se cancela el clic que el navegador emite al soltar,
 *    para no activar botones ni abrir enlaces sin querer.
 *  - Un arrastre horizontal en un dialogo sin desborde lateral se descarta.
 *  - No se instala con puntero grueso (tactil) ni con movimiento reducido.
 */

const DRAG_THRESHOLD = 4;
const CLICK_GUARD_MS = 260;

// Controles con gesto propio (arrastrar el pulgar de un slider, seleccionar
// texto de un textarea, marcar una casilla). El deslice no se apodera de ellos.
const INTERACTIVE_SELECTOR = [
  "input",
  "textarea",
  "select",
  "button",
  "summary",
  "label",
  "a[href]",
  "video",
  "audio",
  "iframe",
  "object",
  "embed",
  "[contenteditable='true']",
  "[role='slider']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='switch']",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='option']",
  "[data-no-drag-scroll]",
].join(",");

// Zonas donde el arrastre significa "seleccionar texto para copiar".
const TEXT_SELECTOR = [
  "p",
  "span",
  "strong",
  "b",
  "em",
  "small",
  "code",
  "pre",
  "li",
  "dd",
  "dt",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "td",
  "th",
  "output",
].join(",");

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Puntero grueso: telefono o tableta tactil, donde el gesto nativo ya existe. */
export function isCoarsePointer() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Numero de emergentes abiertas en toda la aplicacion.
 *
 * Las emergentes del panel viven dentro de la pagina (y la Vista previa de
 * impresion usa un `<dialog>` con capa superior). Con una emergente abierta,
 * quien consume este modulo debe detener el scroll suave de la pagina para que
 * la rueda no siga moviendo el fondo mientras el dialogo ya ocupa la pantalla.
 */
let openDialogs = 0;
const dialogListeners = new Set();

export function subscribeToOpenDialogs(listener) {
  dialogListeners.add(listener);
  listener(openDialogs);
  return () => dialogListeners.delete(listener);
}

export function registerOpenDialog() {
  openDialogs += 1;
  dialogListeners.forEach((listener) => listener(openDialogs));
  return () => {
    openDialogs = Math.max(0, openDialogs - 1);
    dialogListeners.forEach((listener) => listener(openDialogs));
  };
}

export function countOpenDialogs() {
  return openDialogs;
}

function canScrollVertically(element) {
  return element.scrollHeight - element.clientHeight > 1;
}

function canScrollHorizontally(element) {
  return element.scrollWidth - element.clientWidth > 1;
}

/**
 * Contenedor con scroll que corresponde al gesto.
 *
 * Se recorre desde el objetivo hacia arriba y se toma el primer elemento
 * marcado con `data-drag-scroll` que realmente pueda desplazarse. Asi una
 * emergente sobre otra (por ejemplo, el escaner sobre el formulario de
 * producto) mueve solo la de arriba y no la de abajo.
 */
function findScroller(event, host) {
  let node = event.target;
  while (node && node !== host) {
    if (node.nodeType === 1 && node.hasAttribute?.("data-drag-scroll")) return node;
    node = node.parentElement;
  }
  return host?.hasAttribute?.("data-drag-scroll") ? host : host || null;
}

/** ¿El elemento puede desplazarse en la direccion del gesto? */
function scrollableInDirection(element, vertical) {
  return vertical ? canScrollVertically(element) : canScrollHorizontally(element);
}

function startsOnInteractive(target, scroller) {
  if (!target || typeof target.closest !== "function") return true;
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return Boolean(interactive && scroller?.contains(interactive));
}

function startsOnSelectableText(target, scroller) {
  if (!target || typeof target.closest !== "function") return false;
  const text = target.closest(TEXT_SELECTOR);
  return Boolean(text && scroller?.contains(text));
}

/**
 * Activa el deslice con el mouse sobre un contenedor con scroll.
 *
 * @param {HTMLElement|null} host Elemento con `overflow: auto` (la emergente).
 * @returns {() => void} Funcion para retirar los listeners.
 */
export function enableDragScroll(host) {
  if (!host || typeof window === "undefined") return () => {};
  if (isCoarsePointer() || prefersReducedMotion()) return () => {};

  let pointerId = null;
  let scroller = null;
  let startX = 0;
  let startY = 0;
  let startTop = 0;
  let startLeft = 0;
  let axis = "";
  let dragging = false;
  let allowText = false;
  let guardTimer = 0;

  const clearGuard = (delay = CLICK_GUARD_MS) => {
    window.clearTimeout(guardTimer);
    guardTimer = window.setTimeout(() => {
      delete host.dataset.dragScrollClickGuard;
    }, delay);
  };

  const reset = () => {
    if (dragging) delete host.dataset.dragScrollActive;
    if (pointerId !== null && host.hasPointerCapture?.(pointerId)) {
      try {
        host.releasePointerCapture(pointerId);
      } catch {
        /* el puntero ya se libero */
      }
    }
    pointerId = null;
    scroller = null;
    axis = "";
    dragging = false;
    allowText = false;
  };

  const onPointerDown = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (event.button !== 0) return;
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    const candidate = findScroller(event, host);
    if (!candidate) return;
    // El control bajo el puntero manda: si es interactivo, el arrastre le
    // pertenece (seleccionar texto de un campo, mover un slider).
    if (startsOnInteractive(event.target, candidate)) return;
    if (!canScrollVertically(candidate) && !canScrollHorizontally(candidate)) return;

    pointerId = event.pointerId;
    scroller = candidate;
    startX = event.clientX;
    startY = event.clientY;
    startTop = candidate.scrollTop;
    startLeft = candidate.scrollLeft;
    axis = "";
    dragging = false;
    allowText = startsOnSelectableText(event.target, candidate);
  };

  const onPointerMove = (event) => {
    if (pointerId === null || event.pointerId !== pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (!dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) return;

      const vertical = Math.abs(deltaY) >= Math.abs(deltaX);
      // Arrastre horizontal en una emergente sin desborde lateral: se deja
      // libre (seleccionar texto) en vez de apoderarse del puntero.
      if (!scrollableInDirection(scroller, vertical)) {
        reset();
        return;
      }
      // La intencion era copiar texto y el contenido igual se puede leer
      // completo: no se desplaza.
      if (allowText && vertical) {
        reset();
        return;
      }

      dragging = true;
      axis = vertical ? "y" : "x";
      host.dataset.dragScrollActive = "true";
      host.setPointerCapture?.(pointerId);
      event.preventDefault();
    }

    if (axis === "y") scroller.scrollTop = startTop - deltaY;
    else scroller.scrollLeft = startLeft - deltaX;
    event.preventDefault();
  };

  const onPointerUp = (event) => {
    if (pointerId === null || (event.pointerId !== undefined && event.pointerId !== pointerId)) return;
    const moved = scroller && (scroller.scrollTop !== startTop || scroller.scrollLeft !== startLeft);
    if (dragging || moved) {
      // El navegador emite un clic al soltar el boton; se neutraliza para que
      // el arrastre no active botones ni enlaces.
      host.dataset.dragScrollClickGuard = "true";
      clearGuard();
    }
    reset();
  };

  const onPointerCancel = () => reset();

  const onClickCapture = (event) => {
    if (!host.dataset.dragScrollClickGuard) return;
    event.preventDefault();
    event.stopPropagation();
  };

  host.addEventListener("pointerdown", onPointerDown, { passive: true });
  host.addEventListener("pointermove", onPointerMove, { passive: false });
  host.addEventListener("pointerup", onPointerUp);
  host.addEventListener("pointercancel", onPointerCancel);
  host.addEventListener("click", onClickCapture, true);

  return () => {
    window.clearTimeout(guardTimer);
    delete host.dataset.dragScrollActive;
    delete host.dataset.dragScrollClickGuard;
    host.removeEventListener("pointerdown", onPointerDown);
    host.removeEventListener("pointermove", onPointerMove);
    host.removeEventListener("pointerup", onPointerUp);
    host.removeEventListener("pointercancel", onPointerCancel);
    host.removeEventListener("click", onClickCapture, true);
  };
}
