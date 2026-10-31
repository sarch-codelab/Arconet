"use client";

import { useCallback, useEffect, useRef } from "react";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import { DialogBackdrop } from "./admin-overlay";
import { AlertTriangle } from "lucide-react";
import styles from "./admin-experience.module.css";
import { sileo } from "../toaster";
import { productInitials } from "./products-store";

export function Avatar({ src, name, className, shape }) {
  const circle = shape !== "square";
  const base = `${circle ? styles.avatar : styles.thumb} ${className || ""}`;
  if (src) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
      </span>
    );
  }
  return <span className={base}>{productInitials(name)}</span>;
}

export function useToast() {
  const show = useCallback((message, type = "success") => {
    if (!message) return;
    sileo.show({ type, title: String(message) });
  }, []);
  return { show };
}

export function notifyError(message) {
  if (message) sileo.error({ title: String(message) });
}

export function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  const dialogRef = useRef(null);
  useBodyScrollLock(true);
  useEscapeKey(true, onCancel);
  useEffect(() => {
    const trigger = document.activeElement;
    dialogRef.current?.querySelector("button")?.focus();
    return () => { if (trigger?.isConnected) trigger.focus(); };
  }, []);

  const containFocus = (event) => {
    if (event.key !== "Tab") return;
    const buttons = dialogRef.current?.querySelectorAll("button:not([disabled])");
    if (!buttons?.length) return;
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    /*
     * Se monta en <body> (portal) para que ninguna seccion con
     * `overflow: hidden` recorte el velo, y admite deslice con el mouse.
     */
    <DialogBackdrop onDismiss={onCancel}>
      <div ref={dialogRef} onKeyDown={containFocus} className={styles.confirm} data-drag-scroll="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label={title}>
        <span className={styles.confirmIcon}><AlertTriangle size={22} /></span>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.ghostBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </DialogBackdrop>
  );
}
