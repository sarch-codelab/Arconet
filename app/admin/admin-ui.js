"use client";

import { useCallback } from "react";
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
  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.confirm} role="dialog" aria-modal="true" aria-label={title}>
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
    </div>
  );
}
