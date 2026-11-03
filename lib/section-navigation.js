// Resolver anclas sin perder el estado del historial del App Router.
// No toca wheel/touch ni crea una animación o un listener adicional.
export function resolveSectionHref(anchor, currentHref) {
  if (!anchor || (anchor.target && anchor.target !== "_self")) return null;
  if (anchor.hasAttribute("download") || anchor.dataset.noTransition === "true") return null;
  const href = anchor.getAttribute("href");
  if (!href) return null;
  try {
    const current = new URL(currentHref);
    const target = new URL(href, current);
    if (target.origin !== current.origin || target.pathname !== current.pathname || target.search !== current.search) return null;
    if (target.hash.length < 2) return null;
    return { href: target.pathname + target.search + target.hash, id: decodeURIComponent(target.hash.slice(1)) };
  } catch {
    return null;
  }
}
