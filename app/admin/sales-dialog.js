"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { useBodyScrollLock } from "./use-body-scroll-lock";
import adminStyles from "./admin-experience.module.css";
import styles from "./ventas-section.module.css";

// Un único contexto modal, también en Safari móvil: centrado, foco nativo,
// fondo inerte y restauración del foco sin nuevas ventanas ni navegación.
export default function SalesDialog({ open, title, subtitle, onClose, canClose, children }) {
  const dialog = useRef(null);
  const titleId = useId();
  useBodyScrollLock(open);
  useEffect(() => {
    const element = dialog.current;
    if (!open || !element) return;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);
  function requestClose() {
    if (!canClose || canClose()) onClose();
  }
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); requestClose(); }}
      onClick={event => {
        // Un click sobre padding interno no es un click en el backdrop.
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose();
      }}
    >
      <header className={adminStyles.modalHead}>
        <div>
          {subtitle ? <p className={adminStyles.eyebrow}>{subtitle}</p> : null}
          <h2 id={titleId}>{title}</h2>
        </div>
        <button type="button" className={adminStyles.iconBtn} onClick={requestClose} aria-label="Cerrar"><X size={18} /></button>
      </header>
      {children}
    </dialog>
  );
}
