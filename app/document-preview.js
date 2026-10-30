"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  closeDocumentPreview,
  getDocumentPreview,
  getServerDocumentPreview,
  subscribeDocumentPreview,
} from "@/lib/document-preview";
import { rememberPrintPaperPreference } from "@/lib/print-preference";
import { useBodyScrollLock } from "./admin/use-body-scroll-lock";
import styles from "./document-preview.module.css";

function DocumentFrame({ preview, frameRef, onLoad }) {
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  const isHtml = typeof preview.html === "string";

  useEffect(() => {
    if (status !== "loading") return;
    // Un iframe bloqueado no siempre dispara error. No dejarlo blanco sin fin.
    const timeout = setTimeout(() => setStatus("error"), 12_000);
    return () => clearTimeout(timeout);
  }, [status, attempt]);

  function loaded(event) {
    if (isHtml) {
      try {
        const doc = event.currentTarget.contentDocument;
        // Algunos motores notifican primero el about:blank inicial.
        if (doc?.URL === "about:blank") return;
        if (!doc?.querySelector("main.sheet")?.textContent.trim()) {
          setStatus("error");
          return;
        }
      } catch {
        setStatus("error");
        return;
      }
    }
    onLoad(event);
    setStatus("ready");
  }

  return (
    <div className={styles.content} aria-busy={status === "loading"}>
      <iframe
        key={attempt}
        ref={frameRef}
        className={`${styles.frame} ${status !== "ready" ? styles.framePending : ""}`}
        src={isHtml ? undefined : preview.url}
        srcDoc={isHtml ? preview.html : undefined}
        title="Documento para imprimir"
        referrerPolicy="no-referrer"
        loading="eager"
        aria-hidden={status !== "ready"}
        onLoad={loaded}
        onError={() => setStatus("error")}
      />
      {status === "loading" ? <p className={styles.loading} role="status">Cargando vista previa…</p> : null}
      {status === "error" ? (
        <div className={styles.error} role="alert">
          <p>No se pudo mostrar la vista previa. Reintenta cargar el documento o guarda una copia.</p>
          <button type="button" onClick={() => { setStatus("loading"); setAttempt(value => value + 1); }}>Reintentar vista previa</button>
        </div>
      ) : null}
    </div>
  );
}

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
    // Si el motor no cargó el documento, descargar el original, no about:blank.
    if (typeof preview.html !== "string" || !doc?.querySelector("main.sheet")) return;
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
        <DocumentFrame key={preview.url} preview={preview} frameRef={frameRef} onLoad={frameLoaded} />
      ) : <p className={styles.loading} role="status">Preparando documento…</p>}
      <p className={styles.help}>
        Deja «Automático» o elige el papel y pulsa «Imprimir / Guardar como PDF».
        Si tu navegador restringe la impresión integrada, guarda una copia y ábrela para imprimir.
      </p>
    </dialog>
  );
}
