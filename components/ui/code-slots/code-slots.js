'use client';

// Adapted from React Bits CodeSlots (MIT + Commons Clause); see LICENSE.
// A real valued input preserves native editing, paste, autofill and form validity.
import { useEffect, useId, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Tick02Icon } from '@hugeicons/core-free-icons';
import './code-slots.css';
export const codeDigits = (raw, length = 6) => String(raw ?? '').replace(/\D/g, '').slice(0, length);

export default function CodeSlots({ length = 6, value, defaultValue = '', onChange, onComplete, status = 'idle',
  mask = false, caret = true, disabled = false, autoFocus = false, ariaLabel = 'Código de autenticación',
  accentColor = 'var(--otp-accent)', inkColor = 'var(--otp-ink)', slotColor = 'var(--otp-slot)',
  digitColor = 'var(--otp-digit)', dangerColor = '#e23b35', slotSize = 44, gap = 8, radius = 12,
  bounce = .2, settle = .3, rise = 8, cascade = 20, className = '', describedBy, required = true }) {
  const size = Math.max(1, Math.min(12, Math.floor(length) || 6));
  const reduce = useReducedMotion();
  const id = useId(), input = useRef(null), completed = useRef(null);
  const [internal, setInternal] = useState(() => codeDigits(defaultValue, size));
  const [active, setActive] = useState(0), [focused, setFocused] = useState(false);
  const code = codeDigits(value === undefined ? internal : value, size);
  const locked = disabled || status === 'success' || status === 'error';
  const update = next => {
    const clean = codeDigits(next, size);
    if (value === undefined) setInternal(clean);
    onChange?.(clean);
    setActive(Math.min(clean.length, size - 1));
  };
  useEffect(() => {
    if (code.length !== size) { completed.current = null; return; }
    if (completed.current !== code) { completed.current = code; onComplete?.(code); }
  }, [code, size, onComplete]);
  useEffect(() => {
    if (status !== 'error') return;
    const timer = setTimeout(() => {
      if (value === undefined) setInternal('');
      onChange?.('');
      setActive(0);
    }, reduce ? 300 : Math.max(0, settle * 1000 + (size - 1) * cascade));
    return () => clearTimeout(timer);
  }, [status, onChange, size, settle, cascade, reduce, value]);
  return <div className={`code-slots ${className}`} style={{
    '--cs-accent': accentColor, '--cs-ink': inkColor, '--cs-slot': slotColor, '--cs-digit': digitColor,
    '--cs-danger': dangerColor, '--cs-size': `${slotSize}px`, '--cs-gap': `${gap}px`,
    '--cs-radius': `${Math.min(radius, slotSize / 2)}px`, '--cs-count': size,
  }}>
    <div className="code-slots__row" data-status={status} data-disabled={disabled ? '' : undefined}>
      <input ref={input} className="code-slots__input" type="text" inputMode="numeric" autoComplete="one-time-code"
        aria-label={ariaLabel} aria-invalid={status === 'error'} aria-describedby={[`${id}-count`, describedBy].filter(Boolean).join(' ')}
        pattern={`[0-9]{${size}}`} maxLength={size} value={code} required={required} disabled={disabled}
        readOnly={status === 'success' || status === 'error'} autoFocus={autoFocus}
        onChange={event => { if (!locked) update(event.target.value); }}
        onSelect={event => setActive(Math.min(event.currentTarget.selectionStart ?? code.length, size - 1))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onPointerDown={event => {
          if (locked) return;
          event.preventDefault();
          const rect = event.currentTarget.getBoundingClientRect();
          const index = Math.min(code.length, size - 1, Math.max(0, Math.floor((event.clientX - rect.left) / (rect.width / size))));
          input.current.focus(); input.current.setSelectionRange(index, Math.min(code.length, index + 1)); setActive(index);
        }}
        onPaste={event => {
          if (locked) return;
          event.preventDefault();
          const text = codeDigits(event.clipboardData.getData('text'), size);
          if (!text) return;
          const start = event.currentTarget.selectionStart ?? code.length, end = event.currentTarget.selectionEnd ?? start;
          update(text.length === size ? text : code.slice(0, start) + text + code.slice(end));
        }} />
      {Array.from({ length: size }, (_, i) => {
        const filled = Boolean(code[i]);
        const delay = reduce ? 0 : (status === 'error' ? size - 1 - i : i) * cascade / 1000;
        return <span key={i} className="code-slots__slot" aria-hidden="true" data-active={focused && active === i ? '' : undefined}>
          <motion.span className="code-slots__fill" initial={false} animate={{ scale: filled && status !== 'error' ? 1 : 0 }}
            transition={{ type: 'spring', duration: reduce ? 0 : settle, bounce: reduce ? 0 : bounce, delay }} />
          <motion.span className="code-slots__digit" initial={false}
            animate={{ opacity: filled && status !== 'error' ? 1 : 0, y: reduce ? 0 : filled ? 0 : rise }}
            transition={{ duration: reduce ? .1 : settle, delay }}>{mask && filled ? '•' : code[i]}</motion.span>
          {caret && focused && active === i && !filled && !locked && <span className="code-slots__caret" />}
        </span>;
      })}
      <motion.span className="code-slots__wash" aria-hidden="true" initial={false}
        animate={{ opacity: status === 'success' ? 1 : 0, scaleX: reduce || status === 'success' ? 1 : 0 }} transition={{ duration: reduce ? .15 : .3 }}>
        <HugeiconsIcon icon={Tick02Icon} size={26} strokeWidth={2.2} />
      </motion.span>
    </div>
    <span id={`${id}-count`} className="code-slots__sr" role="status">{status === 'success' ? 'Código verificado' : status === 'error' ? 'Código rechazado. Inténtalo de nuevo.' : `${code.length} de ${size} dígitos ingresados`}</span>
  </div>;
}
