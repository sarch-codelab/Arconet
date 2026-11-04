'use client';

// Circle reveal adapted from Magic UI Animated Theme Toggler (MIT, Nazam Kalsi).
import { flushSync } from 'react-dom';
let active = null;
export function circleThemeClipPaths(x, y, width, height) {
  const radius = Math.hypot(Math.max(x, width - x), Math.max(y, height - y));
  const center = `${x / width * 100}% ${y / height * 100}%`;
  const end = radius / (Math.hypot(width, height) / Math.SQRT2) * 100;
  return [`circle(0% at ${center})`, `circle(${end}% at ${center})`];
}
function finishThemeColors() {
  // Finish only color transitions so snapshots contain the final palette.
  // Existing text/transform/opacity animations keep running untouched.
  document.getAnimations?.().forEach(animation => {
    if (/color$|^(fill|stroke)$/.test(animation.transitionProperty || '')) {
      try { animation.finish(); } catch { /* A detached transition is harmless. */ }
    }
  });
}
export function cancelThemeTransition() { active?.cancel(); }

export async function animateThemeChange(origin, apply, { duration = 400, fromCenter = false } = {}) {
  if (active) return false;
  const root = document.documentElement;
  let applied = false;
  const applyOnce = () => {
    if (applied) return;
    applied = true;
    flushSync(apply);
    finishThemeColors();
  };
  if (typeof document.startViewTransition !== 'function' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
    applyOnce();
    return true;
  }
  const width = window.innerWidth, height = window.innerHeight;
  const rect = !fromCenter && origin?.getBoundingClientRect?.();
  const x = rect ? Math.min(width, Math.max(0, rect.left + rect.width / 2)) : width / 2;
  const y = rect ? Math.min(height, Math.max(0, rect.top + rect.height / 2)) : height / 2;
  const clipPath = circleThemeClipPaths(x, y, width, height);
  let animation, transition, watchdog, release;
  const cancelled = new Promise(resolve => { release = resolve; });
  const owner = { cancelled: false, cancel: () => {
    owner.cancelled = true;
    try { transition?.skipTransition?.(); } finally { release(); cleanup(); }
  } };
  const cleanup = () => {
    clearTimeout(watchdog);
    animation?.cancel();
    if (active !== owner) return;
    active = null;
    delete root.dataset.arconetThemeVt;
    root.style.removeProperty('--theme-vt-duration');
    root.style.removeProperty('--theme-vt-from');
  };
  active = owner;
  root.dataset.arconetThemeVt = 'active';
  root.style.setProperty('--theme-vt-duration', `${duration}ms`);
  root.style.setProperty('--theme-vt-from', clipPath[0]);
  try {
    transition = document.startViewTransition(() => { if (!owner.cancelled) applyOnce(); });
    watchdog = setTimeout(() => { if (!owner.cancelled) applyOnce(); owner.cancel(); }, duration + 1500);
    try {
      const ready = await Promise.race([transition.ready.then(() => true), cancelled.then(() => false)]);
      if (ready && !owner.cancelled) animation = root.animate({ clipPath }, {
        duration, easing: 'ease-in-out', fill: 'forwards', pseudoElement: '::view-transition-new(root)',
      });
    } catch { /* Unsupported/hidden snapshots still apply the selected theme. */ }
    await Promise.race([transition.finished, cancelled]);
    if (!applied && !owner.cancelled) applyOnce();
  } catch {
    if (!owner.cancelled) applyOnce();
    transition?.skipTransition?.();
  } finally {
    cleanup();
  }
  return applied;
}
