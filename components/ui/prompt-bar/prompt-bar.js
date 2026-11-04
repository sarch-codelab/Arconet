'use client';

// Adapted from React Bits PromptBar (MIT + Commons Clause); see LICENSE.
// Only capabilities supported by the chat are exposed: text, send and stop.
import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { SparklesIcon } from '@hugeicons/core-free-icons';
import './prompt-bar.css';

const ARROW = [12, 4.5, 18.5, 11, 14.25, 11, 14.25, 19.5, 9.75, 19.5, 9.75, 11, 5.5, 11];
const SQUARE = [12, 6, 18, 6, 18, 12, 18, 18, 6, 18, 6, 12, 6, 6];
export function sendPath(t) {
  return ARROW.reduce((d, a, i) => `${d}${i % 2 ? ' ' : i ? 'L' : 'M'}${(a + (SQUARE[i] - a) * t).toFixed(2)}`, '') + 'Z';
}

function SendGlyph({ busy }) {
  const reduce = useReducedMotion();
  const path = useRef(null);
  const svg = useRef(null);
  const [initial] = useState(busy ? 1 : 0);
  const progress = useMotionValue(initial);
  useEffect(() => {
    const controls = animate(progress, busy ? 1 : 0, { duration: reduce ? 0 : .24, ease: [.77, 0, .175, 1] });
    return () => controls.stop();
  }, [busy, progress, reduce]);
  useMotionValueEvent(progress, 'change', value => {
    path.current?.setAttribute('d', sendPath(value));
    const pinch = reduce ? 0 : Math.sin(value * Math.PI);
    const sx = 1 - .12 * pinch;
    if (svg.current) svg.current.style.transform = `rotate(${(busy ? 8 : -8) * pinch}deg) scale(${sx}, ${1 / sx})`;
  });
  return <svg ref={svg} className="prompt-bar__glyph" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path ref={path} d={sendPath(initial)} /></svg>;
}

export default function PromptBar({ value, onChange, onSend, onStop, busy = false, inputRef,
  placeholder = 'Escribe tu mensaje…', maxLength = 2000, maxRows = 5, className = '' }) {
  useLayoutEffect(() => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = '0px';
    const max = Math.max(1, maxRows) * 22;
    const height = field.scrollHeight;
    field.style.height = `${Math.min(height, max)}px`;
    field.style.overflowY = height > max ? 'auto' : 'hidden';
  }, [value, maxRows, inputRef]);
  const canSend = Boolean(value.trim());
  const send = () => { if (!busy && canSend) onSend(value); };
  return <form className={`prompt-bar ${className}`} data-busy={busy ? '' : undefined} aria-label="Escribir a Monica IA"
    onSubmit={event => { event.preventDefault(); if (busy) onStop?.(); else send(); }}>
    <div className="prompt-bar__field">
      <label className="prompt-bar__sr" htmlFor="ai-chat-message">Tu mensaje</label>
      <textarea ref={inputRef} id="ai-chat-message" className="prompt-bar__input" value={value} rows={1}
        maxLength={maxLength} disabled={busy} placeholder={placeholder} aria-describedby="ai-chat-privacy"
        onChange={event => onChange(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault(); send();
          }
        }} />
      <div className="prompt-bar__bar">
        <span className="prompt-bar__identity"><HugeiconsIcon icon={SparklesIcon} size={15} strokeWidth={1.8} aria-hidden="true" />Monica IA <span>· NVIDIA</span></span>
        <span className="prompt-bar__spacer" />
        <button type="submit" className="prompt-bar__send" aria-label={busy ? 'Detener respuesta' : 'Enviar mensaje'}
          disabled={!busy && !canSend} data-armed={busy || canSend ? '' : undefined}>
          <SendGlyph busy={busy} />
        </button>
      </div>
    </div>
  </form>;
}
