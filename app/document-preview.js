"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  closeDocumentPreview,
  getDocumentPreview,
  getServerDocumentPreview,
  subscribeDocumentPreview,
} from "@/lib/document-preview";
import { rememberPrintPaperPreference } from "@/lib/print-preference";
import { useBodyScrollLock } from "./admin/use-body-scroll-lock";
import styles from "./document-preview.module.css";

export default function DocumentPreview() {
  const preview = useSyncExternalStore(subscribeDocumentPreview, getDocumentPreview, getServerDocumentPreview);
  const dialogRef = useRef(null);
  const frameRef = useRef(null);
  const id = preview?.id;
  useBodyScrollLock(Boolean(preview));

  useEffect(() => {
    if (!id) return;
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    // El dialog nativo mantiene el foco dentro y el panel de fondo inerte.
    dialog.showModal();
    const close = () => closeDocumentPreview(id);
    const rememberPaper = event => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow || event.data?.type !== "arconet:print-paper") return;
      rememberPrintPaperPreference(event.data.paper);
    };
    window.addEventListener("message", rememberPaper);
    window.addEventListener("popstate", close);
    window.addEventListener("pagehide", close);
    return () => {
      window.removeEventListener("message", rememberPaper);
      window.removeEventListener("popstate", close);
      window.removeEventListener("pagehide", close);
      dialog.close();
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [id]);

  if (!preview) return null;

  function saveCopy(event) {
    let doc;
    try { doc = frameRef.current?.contentDocument; } catch { return; }
    if (doc?.contentType !== "text/html") return; // PDF: descarga nativa.
    event.preventDefault();
    const html = doc.documentElement.cloneNode(true);
    const selectedPaper = doc.getElementById("paper-size")?.value;
    for (const option of html.querySelectorAll("#paper-size option")) {
      option.toggleAttribute("selected", option.value === selectedPaper);
    }
    // Guardar también la selección visible, no el HTML original de la API.
    const url = URL.createObjectURL(new Blob(["<!doctype html>", html.outerHTML], { type: "text/html;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = preview.filename;
    document.body.appendChild(anchor);
    try { anchor.click(); } finally { anchor.remove(); }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function frameLoaded(event) {
    // Escape dentro del iframe no llega al teclado del documento padre.
    try {
      event.currentTarget.contentWindow?.addEventListener("keydown", event => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          closeDocumentPreview(id);
        }
      });
    } catch {
      // Algunos lectores PDF aíslan su ventana; Cerrar sigue disponible.
    }
  }

  return (
    <dialog
      key={id}
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="document-preview-title"
      onCancel={event => { event.preventDefault(); closeDocumentPreview(id); }}
      onClose={() => closeDocumentPreview(id)}
    >
      <header className={styles.header}>
        <h2 id="document-preview-title">Vista previa de impresión</h2>
        <div className={styles.actions}>
          {preview.url ? <a href={preview.url} download={preview.filename} onClick={saveCopy}>Guardar copia{/\.html?$/i.test(preview.filename) ? " HTML" : ""}</a> : null}
          <button type="button" onClick={() => closeDocumentPreview(id)}>Cerrar</button>
        </div>
      </header>
      {preview.url ? (
        <iframe
          key={preview.url}
          ref={frameRef}
          className={styles.frame}
          src={preview.url}
          title="Documento para imprimir"
          referrerPolicy="no-referrer"
          onLoad={frameLoaded}
        />
      ) : <p className={styles.loading} role="status">Preparando documento…</p>}
      <p className={styles.help}>
        Deja «Automático» o elige el papel y pulsa «Imprimir / Guardar como PDF».
        Si tu navegador restringe la impresión integrada, guarda una copia y ábrela para imprimir.
      </p>
    </dialog>
  );
}
