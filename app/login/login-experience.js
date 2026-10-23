"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "./login-experience.module.css";
import { sileo } from "../toaster";

export default function LoginExperience() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/cliente-auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: email, password, recordarme: remember }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo iniciar sesión.");
      router.push("/cliente");
    } catch (error) {
      sileo.error({ title: error.message || "No se pudo iniciar sesión." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.visual}>
          <Image
            src="/neto-pensando.png"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 55vw"
            className={styles.visualImage}
          />
          <div className={styles.visualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}>
              <i /> Acceso de clientes · Arconet
            </p>
            <h1>
              Tu red, tus proyectos,
              <br />
              <em>en un solo lugar.</em>
            </h1>
            <p className={styles.lead}>
              Ingresa para dar seguimiento a tus solicitudes, cotizaciones y
              entregas de fibra óptica, CATV e infraestructura.
            </p>
          </div>

          <div className={styles.visualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.panel} aria-label="Formulario de acceso">
          <div className={styles.panelTop}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={15} /> Volver al inicio
            </Link>
            <span>HN · 2026</span>
          </div>

          <div className={styles.panelBody}>
            <header className={styles.panelHeader}>
              <p className={styles.sectionLabel}>Iniciar sesión</p>
              <h2>
                Bienvenido
                <br />
                <em>de nuevo.</em>
              </h2>
              <p className={styles.panelIntro}>
                Usa tu correo y contraseña para acceder a tu cuenta Arconet.
              </p>
            </header>

            <form className={styles.loginForm} onSubmit={submit}>
              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="nombre@empresa.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
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
                <Link className={styles.textLink} href="/contacto">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? "Verificando..." : "Ingresar a mi cuenta"} <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <Link className={styles.ghost} href="/contacto">
              Solicitar acceso corporativo
            </Link>

            <p className={styles.panelFooter}>
              ¿Aún no tienes cuenta?{" "}
              <Link href="/registro">Crea una aquí</Link>
            </p>
          </div>

          <div className={styles.panelBottom}>
            <span>© 2026 Arconet, S.A.</span>
            <Link href="/terminos">Términos de uso</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
