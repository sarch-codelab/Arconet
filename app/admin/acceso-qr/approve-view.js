"use client";
import CodeSlots from "@/components/ui/code-slots/code-slots";
import Link from "next/link";
import { useEffect, useState } from "react";
import { qrRequest } from "../qr-login";
import styles from "../qr-login.module.css";
export default function ApproveView() {
  const [info, setInfo] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [checked, setChecked] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [codeStatus, setCodeStatus] = useState("idle");
  const [signedOut, setSignedOut] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    async function inspect() {
      try {
        const [id, token, extra] = window.location.hash.slice(1).split(".");
        if (!id || !token || extra) throw new Error("Enlace incompleto. Vuelve a escanear el QR de la computadora.");
        const data = await qrRequest({ action: "inspect", id, token }, controller.signal);
        if (!controller.signal.aborted) { setInfo({ ...data, id, token }); setStatus("ready"); }
      } catch (e) {
        if (!controller.signal.aborted) { setSignedOut(e.status === 401); setError(e.message); setStatus("error"); }
      }
    }
    inspect();
    return () => controller.abort();
  }, []);
  async function decide(approve) {
    if (status === "sending" || (approve && codeStatus !== "idle")) return;
    setError(""); setStatus("sending");
    try {
      await qrRequest({ action: approve ? "approve" : "reject", id: info.id, token: info.token, codigo });
      if (approve) setCodeStatus("success");
      setStatus(approve ? "approved" : "rejected");
      window.history.replaceState(window.history.state, "", window.location.pathname);
    } catch (e) { if (approve && info.twoFactorRequired) setCodeStatus("error"); setError(e.message); setStatus(e.status === 410 || e.status === 401 ? "error" : "ready"); }
  }
  return <main className={styles.phone}><section className={styles.card} aria-label="Aprobar acceso a otra computadora">
    <h1>Acceso rápido a Arconet</h1>
    {status === "loading" && <p role="status">Verificando tu sesión y el QR…</p>}
    {status === "approved" ? <p className={styles.status} role="status">Acceso aprobado. La computadora abrirá el panel. Puedes cerrar esta página; tu sesión del teléfono sigue abierta.</p> : status === "rejected" ? <p role="status">Acceso rechazado. No se abrió ninguna sesión mediante este QR.</p> : info && status !== "error" ? <>
      <p className={styles.help}>Hola, {info.nombre}. Se solicita iniciar sesión con tu cuenta en:</p>
      <strong>{info.dispositivo}</strong>
      <p className={styles.help}>Compara el código con la pantalla de la computadora. Autoriza solo si tú generaste este QR.</p>
      <strong className={styles.code}>{info.codigo}</strong>
      <p className={styles.help}>Válido hasta {new Date(info.expiresAt).toLocaleTimeString()}. Si el teléfono no es tuyo, no continúes.</p>
      <label className={styles.confirm}><input type="checkbox" checked={checked} onChange={e => setChecked(e.target.checked)} />El código coincide y quiero abrir mi cuenta en esa computadora.</label>
      {info.twoFactorRequired && <label className={styles.field}>Código de tu aplicación de autenticación<CodeSlots value={codigo} status={codeStatus} disabled={status === "sending"} onChange={code => { setCodigo(code); setCodeStatus("idle"); }} /></label>}
      <button className={styles.approve} type="button" disabled={!checked || status === "sending" || codeStatus !== "idle" || (info.twoFactorRequired && codigo.length !== 6)} onClick={() => decide(true)}>Aprobar acceso a la computadora</button>
      <button className={styles.secondary} type="button" disabled={status === "sending"} onClick={() => decide(false)}>Rechazar acceso</button>
    </> : null}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {signedOut && <><Link href="/admin" target="_blank" rel="noopener noreferrer">Iniciar sesión administrativa</Link><p className={styles.help}>Después vuelve a escanear un QR vigente, en este mismo navegador. La sesión de otro navegador o aplicación del teléfono no se comparte.</p></>}
    <Link href="/admin">Volver al acceso administrativo</Link>
  </section></main>;
}
