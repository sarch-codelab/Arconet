"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, MailCheck, ShieldCheck } from "lucide-react";
import styles from "./verificar.module.css";
import { sileo } from "../toaster";

const REENVIO_ESPERA = 60;

export default function VerificarExperience() {
  const router = useRouter();
  const [estado, setEstado] = useState("cargando");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [espera, setEspera] = useState(0);
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      try {
        const response = await fetch("/api/cliente-auth/session", { cache: "no-store" });
        if (response.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "No pudimos verificar tu sesión.");
        if (!activo) return;
        setCorreo(data.correo || "");
        setEstado(data.verificado ? "verificado" : "pendiente");
      } catch (err) {
        if (!activo) return;
        setError(err.message || "No pudimos verificar tu sesión.");
        setEstado("error");
      }
    }
    cargar();
    return () => {
      activo = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [router]);

  function iniciarEspera() {
    setEspera(REENVIO_ESPERA);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setEspera((valor) => {
        if (valor <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return valor - 1;
      });
    }, 1000);
  }

  async function reenviar() {
    if (enviando || espera > 0) return;
    setEnviando(true);
    setError("");
    try {
      const response = await fetch("/api/cliente-auth/verificacion", { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pudimos enviar el código.");
      if (payload.yaVerificado) {
        setEstado("verificado");
        return;
      }
      iniciarEspera();
      sileo.success({
        title: "Código enviado",
        description: `Revisa ${correo}. Puede tardar un minuto.`,
      });
    } catch (err) {
      setError(err.message || "No pudimos enviar el código.");
    } finally {
      setEnviando(false);
    }
  }

  async function verificar(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (codigo.length !== 6) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/cliente-auth/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "El código no es válido.");
      setEstado("verificado");
      sileo.success({ title: "Correo verificado", description: "Tu cuenta quedó confirmada." });
    } catch (err) {
      setError(err.message || "El código no es válido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Arconet, inicio">
          <img src="/arconet.png" alt="Arconet" />
        </Link>
        <Link className={styles.back} href="/cliente">
          <ArrowLeft size={14} /> Ir a mi portal
        </Link>
      </div>

      <section className={styles.card} aria-live="polite">
        {estado === "cargando" && <p className={styles.muted}>Comprobando tu sesión…</p>}

        {estado === "error" && (
          <>
            <h1>No pudimos abrir la verificación</h1>
            <p className={styles.muted}>{error}</p>
            <Link className={styles.primary} href="/cliente">
              Volver al portal <ArrowRight size={15} />
            </Link>
          </>
        )}

        {estado === "verificado" && (
          <>
            <span className={styles.badgeOk}><Check size={26} strokeWidth={3} /></span>
            <h1>Correo verificado</h1>
            <p className={styles.muted}>
              {correo ? `${correo} quedó confirmado.` : "Tu correo quedó confirmado."} Ya puedes
              recibir avisos de tus cotizaciones y proyectos.
            </p>
            <Link className={styles.primary} href="/cliente">
              Ir a mi portal <ArrowRight size={15} />
            </Link>
          </>
        )}

        {estado === "pendiente" && (
          <>
            <span className={styles.badge}><MailCheck size={24} /></span>
            <h1>Verifica tu correo</h1>
            <p className={styles.muted}>
              Revisa <strong>{correo || "tu correo registrado"}</strong> y escribe aquí el código
              de 6 dígitos. ¿No llegó en un par de minutos? Pide uno nuevo.
            </p>

            <form className={styles.form} onSubmit={verificar} noValidate>
              <label className={styles.field}>
                Código de verificación
                <input
                  type="text"
                  name="codigo"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  placeholder="000000"
                  value={codigo}
                  onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </label>

              {error ? <p className={styles.error} role="alert">{error}</p> : null}

              <button type="submit" className={styles.primary} disabled={submitting}>
                {submitting ? "Verificando..." : "Verificar correo"} <ShieldCheck size={15} />
              </button>
            </form>

            <div className={styles.resend}>
              <button type="button" onClick={reenviar} disabled={enviando || espera > 0}>
                {espera > 0 ? `Podrás reenviar en ${espera}s` : enviando ? "Enviando..." : "Enviar otro código"}
              </button>
              <span aria-hidden="true">·</span>
              <Link href="/recuperar">Cambiar contraseña</Link>
            </div>
          </>
        )}
      </section>

      <p className={styles.footnote}>
        ¿Problemas para recibir el código? Escríbenos desde{" "}
        <Link href="/contacto">la página de contacto</Link>.
      </p>
    </main>
  );
}
