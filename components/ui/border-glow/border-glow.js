'use client';

import { useEffect, useRef } from 'react';
import { decorateGlow, paintGlow, pointerGlowValues } from './border-glow-utils';
import './border-glow.css';

// Componente reutilizable; el realce global usa el mismo dibujo sin envolver tarjetas.
export default function BorderGlow({ children, className = '', edgeSensitivity = 30, glowColor = '40 80 80',
  backgroundColor = '#120F17', borderRadius = 28, glowRadius = 40, glowIntensity = 1,
  coneSpread = 25, animated = false, colors, fillOpacity = 0.08 }) {
  const ref = useRef(null);
  useEffect(() => {
    const card = ref.current;
    const cleanup = decorateGlow(card, { edgeSensitivity, glowColor, glowRadius, glowIntensity, coneSpread, colors, fillOpacity });
    let frame = 0;
    if (animated) {
      const start = performance.now();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const sweep = now => {
        if (document.hidden) { paintGlow(card, 0); return; }
        const t = Math.min(1, (now - start) / (reduced ? 700 : 1500));
        paintGlow(card, Math.sin(Math.PI * t) * (reduced ? 70 : 100), 110 + (reduced ? 60 : 355) * t);
        if (t < 1 && !document.hidden) frame = requestAnimationFrame(sweep);
      };
      frame = requestAnimationFrame(sweep);
    }
    return () => { cancelAnimationFrame(frame); cleanup(); };
  }, [edgeSensitivity, glowColor, glowRadius, glowIntensity, coneSpread, colors, fillOpacity, animated]);
  return <div ref={ref} data-border-glow="" data-border-glow-managed="component" className={className}
    style={{ backgroundColor, borderRadius }}
    onPointerMove={event => {
      if (event.pointerType === 'touch') return;
      const { proximity, angle } = pointerGlowValues(event.currentTarget.getBoundingClientRect(), event.clientX, event.clientY);
      paintGlow(event.currentTarget, proximity, angle);
    }} onPointerLeave={event => paintGlow(event.currentTarget, event.currentTarget.contains(document.activeElement) ? 100 : 0)}
    onFocusCapture={event => paintGlow(event.currentTarget, 100, 180)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) paintGlow(event.currentTarget, 0); }}>
    {children}
  </div>;
}
