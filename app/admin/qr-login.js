"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { QrCode, X } from "lucide-react";
import { apiFetch, rememberLocalPreviewSession } from "@/lib/api-fetch";
import styles from "./qr-login.module.css";

export async function qrRequest(body, signal) {
  const response = await apiFetch("/api/auth/qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || "No se pudo conectar. Intenta de nuevo."), { status: response.status });
  return data;
}
export default function QrLogin({ onOpenChange, disabled = false, fitViewport = false } = {}) {
  const router = useRouter();
  const [challenge, setChallenge] = useState(null);
  const [status, setStatus] = useState("closed");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(120);
  const creating = useRef(null);
  const triggerRef = useRef(null);
  const headingRef = useRef(null);
  const wasOpen = useRef(false);
  const open = status !== "closed";
  useEffect(() => {
    if (open && status === "creating") headingRef.current?.focus({ preventScroll: true });
    else if (!open && wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open, status]);
  useEffect(() => () => creating.current?.abort(), []);
  useEffect(() => {
    if (!challenge || status !== "waiting") return;
    const controller = new AbortController();
    let pollTimer;
    const ticker = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(challenge.expiresAt).getTime() - Date.now()) / 1000));
      setSeconds(remaining);
      if (!remaining) setStatus("expired");
    }, 1000);
    async function poll() {
      if (controller.signal.aborted) return;
      if (Date.now() >= new Date(challenge.expiresAt).getTime()) { setStatus("expired"); return; }
      try {
        if (!document.hidden) {
          const result = await qrRequest({ action: "poll", id: challenge.id }, controller.signal);
          if (controller.signal.aborted) return;
          if (result.status === "approved") {
            if (result.localPreviewToken) rememberLocalPreviewSession("admin", result.localPreviewToken);
            setStatus("approved");
            router.replace("/panel-administrativo");
            return;
          }
          if (result.status === "rejected") { setStatus("rejected"); return; }
        }
        pollTimer = window.setTimeout(poll, 3000);
      } catch (e) {
        if (!controller.signal.aborted) { setError(e.message); setStatus(e.status === 410 ? "expired" : "error"); }
      }
    }
    pollTimer = window.setTimeout(poll, 3000);
    return () => { controller.abort(); window.clearTimeout(pollTimer); window.clearInterval(ticker); };
  }, [challenge, status, router]);
  async function generate() {
    if (disabled) return;
    onOpenChange?.(true);
    creating.current?.abort();
    const controller = new AbortController();
    creating.current = controller;
    setChallenge(null); setError(""); setStatus("creating");
    try {
      const data = await qrRequest({ action: "create" }, controller.signal);
      if (!controller.signal.aborted) { setChallenge(data); setSeconds(120); setStatus("waiting"); }
    } catch (e) { if (!controller.signal.aborted) { setError(e.message); setStatus("error"); } }
  }
  function close() {
    creating.current?.abort();
    if (challenge) qrRequest({ action: "cancel", id: challenge.id }).catch(() => {});
    setChallenge(null); setStatus("closed"); setError("");
    onOpenChange?.(false);
  }
  return <section className={`${styles.root} ${open ? styles.open : ""}`} aria-label="Acceso rápido con QR" data-fit-viewport={fitViewport || undefined} onKeyDown={event => {
    if (open && event.key === "Escape") { event.preventDefault(); close(); }
  }}>
    <button ref={triggerRef} type="button" className={styles.trigger} onClick={generate} disabled={disabled || open} aria-hidden={open ? true : undefined} tabIndex={open ? -1 : undefined}><QrCode size={20} /> Acceso rápido con QR</button>
    {open && <>
      <div className={styles.panel}>
        <h3 ref={headingRef} tabIndex={-1} className={styles.title}>Acceso con QR</h3>
        <p className={styles.status} role="status">{status === "creating" ? "Generando QR seguro…" : status === "expired" ? "Este QR caducó." : status === "rejected" ? "El acceso fue rechazado." : status === "approved" ? "Acceso aprobado. Abriendo el panel…" : status === "waiting" ? "Escanea y aprueba desde tu teléfono" : "No se pudo completar el acceso."}</p>
        {challenge && status === "waiting" && <>
          <div className={styles.frame}><Image unoptimized src={challenge.image} alt="QR para aprobar el acceso a esta computadora" width={336} height={336} /></div>
          <p className={styles.help}>Compara este código con el que aparece en tu teléfono:</p>
          <strong className={styles.code}>{challenge.codigo}</strong>
          <p className={styles.help}>Caduca en {seconds} s. Escanear no inicia sesión: debes aprobar en el teléfono.</p>
        </>}
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.help}>Abre el QR en el mismo navegador del teléfono donde ya tienes una sesión administrativa. Nunca apruebes accesos que no hayas solicitado.</p>
        {["expired", "rejected", "error"].includes(status) && <button className={styles.trigger} type="button" onClick={generate}>Generar otro QR</button>}
        <button type="button" className={styles.secondary} onClick={close}><X size={16} /> Usar correo y contraseña</button>
      </div>
    </>}
  </section>;
}
