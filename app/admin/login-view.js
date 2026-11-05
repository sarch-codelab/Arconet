"use client";

import Link from "next/link";
import CodeSlots from "@/components/ui/code-slots/code-slots";
import QrLogin from "./qr-login";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "./admin-experience.module.css";
import { notifyError } from "./admin-ui";
import { authenticate } from "./workers-store";
import { isLocalPreview } from "@/lib/local-preview";

export default function LoginView() {
  const router = useRouter();
  const localPreview = isLocalPreview();
  const [qrOpen, setQrOpen] = useState(false);
  const bodyRef = useRef(null);
  const credentialScroll = useRef(0);
  function changeQrMode(open) {
    if (open) credentialScroll.current = bodyRef.current?.scrollTop || 0;
    setQrOpen(open);
  }
  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = qrOpen ? 0 : credentialScroll.current;
  }, [qrOpen]);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [codeStatus, setCodeStatus] = useState("idle");

  async function submit(event) {
    event.preventDefault();
    if (submitting || codeStatus === "error" || codeStatus === "success") return;
    setSubmitting(true);
    let user;
    try {
      user = await authenticate(email, password, verificationCode);
    } catch (error) {
      if (twoFactorRequired) setCodeStatus("error");
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
    if (twoFactorRequired) setCodeStatus("success");
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const next = params?.get("next");
    router.replace(next && next.startsWith("/panel-administrativo") ? next : "/panel-administrativo");
  }

  return (
    <main className={`${styles.loginPage} ${styles.adminLoginPage}`}>
      <div className={styles.loginCard}>
        <section className={styles.loginPanel} aria-label="Formulario de acceso">
          <div ref={bodyRef} className={styles.loginPanelBody} data-qr-open={qrOpen || undefined}>
            <header className={qrOpen ? styles.loginCredentialsHidden : undefined} inert={qrOpen ? true : undefined}>
              <div className={styles.loginBrand}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/arconet.png" alt="Arconet" width={1200} height={200} />
              </div>
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

            {localPreview && <p className={`${styles.loginIntro} ${qrOpen ? styles.loginCredentialsHidden : ""}`} inert={qrOpen ? true : undefined} role="note">
              Pruebas locales: usuario <strong>admin</strong> y contraseña <strong>1234</strong>.
              Los cambios solo afectan la base de demostración.
            </p>}

            <form className={`${styles.form} ${qrOpen ? styles.loginCredentialsHidden : ""}`} inert={qrOpen ? true : undefined} onSubmit={submit}>
              <label className={styles.field}>
                {localPreview ? "Correo o usuario" : "Correo electrónico"}
                <input
                  type={localPreview ? "text" : "email"}
                  name="email"
                  autoComplete="username"
                  required
                  placeholder={localPreview ? "admin" : "usuario@arconethn.com"}
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); setCodeStatus("idle"); }}
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
                    onChange={(event) => { setPassword(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); setCodeStatus("idle"); }}
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
                <CodeSlots value={verificationCode} status={codeStatus} disabled={submitting} describedBy="two-factor-help" onChange={code => { setVerificationCode(code); setCodeStatus("idle"); }} />
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

              <button type="submit" className={styles.submit} disabled={submitting || codeStatus === "error"}>
                Entrar al panel <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <QrLogin onOpenChange={changeQrMode} disabled={submitting} fitViewport />

            <p className={`${styles.loginFooter} ${qrOpen ? styles.loginCredentialsHidden : ""}`} inert={qrOpen ? true : undefined}>
              <Link href="/"><ArrowLeft size={14} /> Volver al inicio</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
