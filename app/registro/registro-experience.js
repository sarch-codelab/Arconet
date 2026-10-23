"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "../login/login-experience.module.css";
import scroll from "./registro-experience.module.css";
import { sileo } from "../toaster";

export default function RegistroExperience() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (!form.get("name") || !form.get("email") || !password) return;
    if (password !== confirm) {
      sileo.error({ title: "Las contraseñas no coinciden." });
      return;
    }
    if (!accepted) {
      sileo.error({ title: "Acepta los términos para crear tu cuenta." });
      return;
    }
    if (password.length < 12) {
      sileo.error({ title: "La contraseña debe tener al menos 12 caracteres." });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/cliente-auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.get("name"),
          empresa: form.get("company"),
          correo: form.get("email"),
          password,
          aceptaTerminos: accepted,
          recordarme: true,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No se pudo crear la cuenta.");
      sileo.success({ title: "Cuenta creada. Bienvenido a Arconet." });
      router.push("/cliente");
    } catch (error) {
      sileo.error({ title: error.message || "No se pudo crear la cuenta." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.visual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            className={styles.visualImage}
            sizes="(max-width: 900px) 100vw, 53vw"
          />
          <div className={styles.visualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.visualCopy}>
            <p className={styles.eyebrow}>Registro de clientes · Arconet</p>
            <h1>
              Crea tu cuenta
              <br />
              <em>y gestiona tus proyectos.</em>
            </h1>
            <p className={styles.lead}>
              Registra tu empresa para solicitar cotizaciones, dar seguimiento a tus
              órdenes y administrar tus servicios de fibra óptica, CATV e infraestructura.
            </p>
          </div>

          <div className={styles.visualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.panel} aria-label="Formulario de registro">
          <div className={styles.panelTop}>
            <Link className={styles.backLink} href="/">
              <ArrowLeft size={15} /> Volver al inicio
            </Link>
            <span>HN · 2026</span>
          </div>

          <div className={`${styles.panelBody} ${scroll.body}`}>
            <header className={styles.panelHeader}>
              <p className={styles.sectionLabel}>Crear cuenta</p>
              <h2>
                Nueva
                <br />
                <em>cuenta.</em>
              </h2>
              <p className={styles.panelIntro}>
                Completa tus datos para crear tu cuenta de cliente Arconet.
              </p>
            </header>

            <form className={styles.loginForm} onSubmit={handleSubmit}>
              <label className={styles.field}>
                Nombre completo
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  required
                  placeholder="Nombre y apellido"
                />
              </label>

              <label className={styles.field}>
                Empresa
                <input
                  type="text"
                  name="company"
                  autoComplete="organization"
                  placeholder="Nombre de tu empresa (opcional)"
                />
              </label>

              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  placeholder="nombre@empresa.com"
                />
              </label>

              <label className={styles.field}>
                Contraseña
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={12}
                    placeholder="Crea una contraseña"
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

              <label className={styles.field}>
                Confirmar contraseña
                <input
                  type={showPassword ? "text" : "password"}
                  name="confirm"
                  autoComplete="new-password"
                  required
                  placeholder="Repite tu contraseña"
                />
              </label>

              <div className={styles.formRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(event) => setAccepted(event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Acepto los términos y he leído el aviso de privacidad
                </label>
                <Link className={styles.textLink} href="/terminos">
                  Términos
                </Link>
                <Link className={styles.textLink} href="/privacidad">Privacidad</Link>
              </div>

              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? "Creando cuenta..." : "Crear mi cuenta"} <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <div className={styles.divider}>
              <span>o</span>
            </div>

            <p className={styles.panelFooter}>
              ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
            </p>
          </div>

          <div className={styles.panelBottom}>
            <span>© 2026 Arconet, S.A.</span>
            <Link href="/terminos">Términos de uso</Link>
            <Link href="/privacidad">Aviso de privacidad</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
