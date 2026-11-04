/** Keep navigation visible without scrollIntoView (which also moves the page). */
export function revealActivePill(nav) {
  const active = nav?.querySelector('[aria-current="page"]');
  if (!active) return;
  const outer = nav.getBoundingClientRect(), inner = active.getBoundingClientRect();
  const inset = 4;
  if (inner.left < outer.left + inset) nav.scrollLeft += inner.left - outer.left - inset;
  else if (inner.right > outer.right - inset) nav.scrollLeft += inner.right - outer.right + inset;
}

/** Native touch/trackpad scrolling plus a vertical mouse wheel and mouse drag.
 * Do not capture zoom, horizontal gestures, or wheel events at either end.
 */
export function attachPillScroll(nav) {
  if (!nav) return () => {};
  let pointer = null, suppressClick = false;
  const wheel = event => {
    if (event.ctrlKey || event.shiftKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const max = nav.scrollWidth - nav.clientWidth;
    if (max <= 1) return;
    const scale = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? nav.clientWidth : 1;
    const next = Math.max(0, Math.min(max, nav.scrollLeft + event.deltaY * scale));
    if (Math.abs(next - nav.scrollLeft) < 1) return;
    event.preventDefault();
    nav.scrollLeft = next;
  };
  const down = event => {
    suppressClick = false;
    if (event.pointerType !== 'mouse' || event.button !== 0 || nav.scrollWidth <= nav.clientWidth) return;
    pointer = { id: event.pointerId, x: event.clientX, left: nav.scrollLeft, dragging: false };
  };
  const move = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (event.buttons === 0) { pointer = null; return; }
    const delta = event.clientX - pointer.x;
    if (!pointer.dragging && Math.abs(delta) < 6) return;
    if (!pointer.dragging) {
      pointer.dragging = true;
      nav.setPointerCapture?.(pointer.id);
    }
    suppressClick = true;
    event.preventDefault();
    nav.scrollLeft = pointer.left - delta;
  };
  const up = event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    if (nav.hasPointerCapture?.(pointer.id)) nav.releasePointerCapture(pointer.id);
    pointer = null;
  };
  const cancel = () => { pointer = null; suppressClick = false; };
  const click = event => {
    if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); }
    suppressClick = false;
  };
  const focus = event => {
    const button = event.target.closest?.('button');
    if (!button || !nav.contains(button)) return;
    const outer = nav.getBoundingClientRect(), inner = button.getBoundingClientRect();
    if (inner.left < outer.left) nav.scrollLeft += inner.left - outer.left - 4;
    else if (inner.right > outer.right) nav.scrollLeft += inner.right - outer.right + 4;
  };
  nav.addEventListener('wheel', wheel, { passive: false });
  nav.addEventListener('pointerdown', down);
  nav.addEventListener('pointermove', move);
  nav.addEventListener('pointerup', up);
  nav.addEventListener('pointercancel', cancel);
  nav.addEventListener('lostpointercapture', up);
  nav.addEventListener('click', click, true);
  nav.addEventListener('focusin', focus);
  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => revealActivePill(nav)) : null;
  resize?.observe(nav);
  for (const child of nav.children || []) resize?.observe(child);
  return () => {
    if (pointer && nav.hasPointerCapture?.(pointer.id)) nav.releasePointerCapture(pointer.id);
    pointer = null;
    resize?.disconnect();
    nav.removeEventListener('wheel', wheel);
    nav.removeEventListener('pointerdown', down);
    nav.removeEventListener('pointermove', move);
    nav.removeEventListener('pointerup', up);
    nav.removeEventListener('pointercancel', cancel);
    nav.removeEventListener('lostpointercapture', up);
    nav.removeEventListener('click', click, true);
    nav.removeEventListener('focusin', focus);
  };
}
