"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "./admin-experience.module.css";
import { notifyError } from "./admin-ui";
import { authenticate } from "./workers-store";
import { isLocalPreview } from "@/lib/local-preview";

export default function LoginView() {
  const router = useRouter();
  const localPreview = isLocalPreview();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    let user;
    try {
      user = await authenticate(email, password, verificationCode);
    } catch (error) {
      notifyError(error.message || "No se pudo iniciar sesión.");
      setSubmitting(false);
      return;
    }
    if (user?.twoFactorRequired) {
      setTwoFactorRequired(true);
      setSubmitting(false);
      return;
    }
    if (!user) {
      notifyError("Correo o contraseña incorrectos.");
      setSubmitting(false);
      return;
    }
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const next = params?.get("next");
    router.replace(next && next.startsWith("/panel-administrativo") ? next : "/panel-administrativo");
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginVisual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.loginVisualImg}
          />
          <div className={styles.loginVisualOverlay} />

          <a className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arconet.png" alt="Arconet" width={2172} height={362} />
          </a>

          <div className={styles.loginVisualCopy}>
            <p className={styles.eyebrow}><i /> Panel interno · Arconet</p>
            <h1>
              Gestiona a tu equipo,
              <br />
              <em>desde un solo lugar.</em>
            </h1>
            <p className={styles.lead}>
              Administra trabajadores, productos, roles y sucursales de Arconet con un
              panel pensado para el personal autorizado.
            </p>
          </div>

          <div className={styles.loginVisualFooter}>
            <span>ACCESO RESTRINGIDO · PERSONAL AUTORIZADO</span>
            <a href="/">Volver al sitio <ArrowRight size={14} /></a>
          </div>
        </div>

        <section className={styles.loginPanel} aria-label="Formulario de acceso">
          <div className={styles.loginPanelBody}>
            <header>
              <p className={styles.sectionLabel}>Iniciar sesión</p>
              <h2>
                Acceso
                <br />
                <em>administrativo.</em>
              </h2>
              <p className={styles.loginIntro}>
                Ingresa con tus credenciales de personal para administrar el panel de
                Arconet.
              </p>
            </header>

            {localPreview && <p className={styles.loginIntro} role="note">
              Pruebas locales: usuario <strong>admin</strong> y contraseña <strong>1234</strong>.
              Los cambios solo afectan la base de demostración.
            </p>}

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                {localPreview ? "Correo o usuario" : "Correo electrónico"}
                <input
                  type={localPreview ? "text" : "email"}
                  name="email"
                  autoComplete="username"
                  required
                  placeholder={localPreview ? "admin" : "usuario@arconethn.com"}
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); }}
                />
              </label>

              <label className={styles.field}>
                Contraseña
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); }}
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              {twoFactorRequired && <label className={styles.field}>
                Código de autenticación
                <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" aria-describedby="two-factor-help" />
                <small id="two-factor-help">Ingresa el código actual de tu aplicación de autenticación.</small>
              </label>}

              <div className={styles.formRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Recordarme
                </label>
                <a href="/recuperar">¿Olvidaste tu contraseña?</a>
              </div>

              <button type="submit" className={styles.submit} disabled={submitting}>
                Entrar al panel <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <p className={styles.loginFooter}>
              <a href="/"><ArrowLeft size={14} /> Volver al inicio</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
