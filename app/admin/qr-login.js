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
export default function QrLogin() {
  const router = useRouter();
  const [challenge, setChallenge] = useState(null);
  const [status, setStatus] = useState("closed");
  const [error, setError] = useState("");
  const [seconds, setSeconds] = useState(120);
  const creating = useRef(null);
  const closeButton = useRef(null);
  const collapse = useRef(null);
  const abierto = status !== "closed";
  useEffect(() => () => creating.current?.abort(), []);
  // El foco entra en el panel al abrirlo y `Esc` lo pliega como un diálogo.
  // La función de cierre se lee de una referencia para no volver a enfocar en
  // cada render.
  useEffect(() => {
    if (!abierto) return;
    closeButton.current?.focus({ preventScroll: true });
    function onKey(event) { if (event.key === "Escape") collapse.current?.(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [abierto]);
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
  }
  return (
    <section className={styles.root} data-qr-open={abierto ? "true" : "false"}>
      {/* Carril derecho: solo el icono, centrado dentro de la tarjeta. Al
          pulsarlo, el panel se extiende hacia la derecha. */}
      <div className={styles.rail}>
        <button
          type="button"
          className={styles.toggle}
          onClick={abierto ? close : generate}
          aria-expanded={abierto}
          aria-controls="qr-login-panel"
          aria-label={abierto ? "Cerrar acceso con QR" : "Acceso rápido con QR"}
          title={abierto ? "Cerrar acceso con QR" : "Acceso rápido con QR"}
        >
          <QrCode size={20} aria-hidden="true" />
        </button>
      </div>
      <div
        className={styles.panel}
        id="qr-login-panel"
        role="region"
        aria-label="Acceso rápido con QR"
        aria-hidden={abierto ? undefined : "true"}
      >
        {abierto && (
          <div className={styles.panelInner}>
            <div className={styles.panelHead}>
              <p className={styles.eyebrow}>Acceso rápido</p>
              <button ref={closeButton} type="button" className={styles.close} onClick={close} aria-label="Cerrar acceso con QR">
                <X size={16} aria-hidden="true" />
              </button>
            </div>
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
          </div>
        )}
      </div>
    </section>
  );
}
