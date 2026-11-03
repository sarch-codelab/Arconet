// El navegador controla rueda, trackpad, teclado y touch. Este observador solo
// publica progreso: no preventDefault, interpolación ni bucle RAF permanente.
export function observeNativeScroll(onScroll, { onResize } = {}) {
  let frame = 0;
  let limit = 1;
  let destroyed = false;
  const update = () => {
    frame = 0;
    if (destroyed) return;
    const scroll = window.scrollY;
    onScroll({ scroll, limit, progress: Math.min(1, Math.max(0, scroll / limit)) });
  };
  const schedule = () => {
    if (!destroyed && !frame) frame = window.requestAnimationFrame(update);
  };
  const measure = () => {
    if (destroyed) return;
    limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    onResize?.();
    schedule();
  };
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
  const targets = new Set([document.documentElement, document.body, document.querySelector("main")]);
  targets.forEach(target => { if (target) observer?.observe(target); });
  measure();
  return {
    refresh: measure,
    scrollTo(target, { immediate = false } = {}) {
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const behavior = immediate || reduced ? "instant" : "smooth";
      if (typeof target === "number") window.scrollTo({ top: target, behavior });
      else {
        const element = typeof target === "string" ? document.querySelector(target) : target;
        element?.scrollIntoView({ behavior, block: "start" });
      }
    },
    destroy() {
      destroyed = true;
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    },
  };
}
