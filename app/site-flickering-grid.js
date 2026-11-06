'use client';

import { useEffect } from 'react';
import { createGrid } from '@/components/ui/flickering-grid/flickering-grid';
import '@/components/ui/flickering-grid/flickering-grid.css';

const SELECTOR = 'main, main > section, main > div > section, [data-flickering-grid="on"]';
export function hasBackgroundImage(element) {
  for (const pseudo of [null, '::before', '::after']) {
    if (/url\(|image-set\(/i.test(getComputedStyle(element, pseudo).backgroundImage)) return true;
  }
  return false;
}
function eligible(element) {
  if (element.closest('[data-flickering-grid="off"]')) return false;
  if (element.tagName === 'MAIN' && element.querySelector(':scope > [data-flickering-grid="on"]')) return false;
  for (let ancestor = element; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
    if (hasBackgroundImage(ancestor)) return false;
  }
  // Don't turn individual cards, forms or photographic hero panels into backgrounds.
  if (element.tagName !== 'MAIN' && element.dataset.flickeringGrid !== 'on') {
    if ([...element.classList].some(name => /Card$|Panel$|Group$/.test(name))) return false;
    const style = getComputedStyle(element);
    if (style.backgroundColor === 'rgba(0, 0, 0, 0)' && style.backgroundImage === 'none') return false;
  }
  return true;
}

export default function SiteFlickeringGrid() {
  useEffect(() => {
    const grids = new Map();
    const visible = new Set();
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, last = 0, scanFrame = 0;
    // Mientras se desplaza la página se suspende el dibujo de los lienzos:
    // cada draw() hace getBoundingClientRect() y miles de fillRect() en el
    // hilo principal, compitiendo con el scroll y con el carrusel de inicio.
    // Al detenerse el gesto se retoma sin acumular un delta gigante.
    let scrolling = false, idleTimer = 0;
    const tick = now => {
      frame = 0;
      if (document.hidden || scrolling || !visible.size) return;
      if (now - last >= (reduced.matches ? 500 : 66)) {
        const delta = Math.min((now - last) / 1000, 1);
        last = now;
        const dark = document.documentElement.dataset.theme === 'dark';
        visible.forEach(element => grids.get(element)?.draw(delta, reduced.matches, dark));
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => { if (!frame && !document.hidden && !scrolling && visible.size) frame = requestAnimationFrame(tick); };
    const onScroll = () => {
      scrolling = true;
      cancelAnimationFrame(frame); frame = 0;
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        scrolling = false; last = performance.now(); start();
      }, 180);
    };
    window.addEventListener('scroll', onScroll, { passive: true, capture: true });
    const intersection = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target));
      start();
    });
    const scan = () => {
      scanFrame = 0;
      grids.forEach((grid, host) => {
        if (!host.isConnected || !eligible(host)) {
          intersection.unobserve(host); visible.delete(host); grid.remove(); grids.delete(host);
        }
      });
      document.querySelectorAll(SELECTOR).forEach(host => {
        if (!grids.has(host) && eligible(host)) { grids.set(host, createGrid(host)); intersection.observe(host); }
      });
    };
    const queueScan = () => { if (!scanFrame) scanFrame = requestAnimationFrame(scan); };
    const observer = new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && !node.matches?.('.flickering-grid, .border-glow-effect')))) queueScan();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const theme = new MutationObserver(queueScan);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const visibility = () => {
      cancelAnimationFrame(frame); frame = 0; last = performance.now(); start();
    };
    document.addEventListener('visibilitychange', visibility);
    scan();
    return () => {
      observer.disconnect(); theme.disconnect(); intersection.disconnect();
      cancelAnimationFrame(frame); cancelAnimationFrame(scanFrame);
      clearTimeout(idleTimer); scrolling = false;
      window.removeEventListener('scroll', onScroll, true);
      document.removeEventListener('visibilitychange', visibility);
      grids.forEach(grid => grid.remove()); grids.clear(); visible.clear();
    };
  }, []);
  return null;
}
