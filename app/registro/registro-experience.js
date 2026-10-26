"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import styles from "../admin/admin-experience.module.css";
import registration from "./registro-experience.module.css";
import { sileo } from "../toaster";
import { fuerzaPassword, validarPassword } from "../../lib/seguridad";
import MobileSiteMenu from "../mobile-site-menu";

const FUERZA_LABEL = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];

export default function RegistroExperience() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [passwordValue, setPasswordValue] = useState("");
  const fuerza = fuerzaPassword(passwordValue);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (!form.get("name") || !form.get("email") || !password) return;
    if (password !== confirm) {
      setFormError("Las contraseñas no coinciden.");
      sileo.error({ title: "Las contraseñas no coinciden." });
      return;
    }
    if (!accepted) {
      setFormError("Acepta los términos y confirma que leíste el aviso de privacidad.");
      sileo.error({ title: "Acepta los términos para crear tu cuenta." });
      return;
    }
    const policy = validarPassword(password);
    if (!policy.ok) {
      setFormError(policy.error);
      sileo.error({ title: policy.error });
      return;
    }
    setFormError("");
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
      sileo.success({
        title: "Tu cuenta está lista",
        description: payload.verificacionEnviada
          ? "Te enviamos un código para verificar tu correo."
          : "Puedes pedir el código de verificación desde tu portal.",
        duration: 7000,
      });
      router.push("/verificar");
    } catch (error) {
      setFormError(error.message || "No se pudo crear la cuenta.");
      sileo.error({
        title: "No se pudo crear la cuenta",
        description: error.message || "Intenta de nuevo en unos minutos.",
        duration: 6500,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <MobileSiteMenu floating />
      <div className={styles.loginCard}>
        <div className={styles.loginVisual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            className={styles.loginVisualImg}
            sizes="(max-width: 900px) 100vw, 53vw"
          />
          <div className={styles.loginVisualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.loginVisualCopy}>
            <p className={styles.eyebrow}><i /> Portal de clientes · Arconet</p>
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

          <div className={styles.loginVisualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.loginPanel} aria-label="Formulario de registro">
          <div className={`${styles.loginPanelBody} ${registration.registrationBody}`}>
            <header>
              <p className={styles.sectionLabel}>Crear cuenta</p>
              <h2>
                Nueva
                <br />
                <em>cuenta.</em>
              </h2>
              <p className={styles.loginIntro}>
                Completa tus datos para crear tu cuenta de cliente Arconet.
              </p>
              <p className={registration.accountHint}>
                ¿Tu correo ya está registrado como cliente? <Link href="/contacto">Solicita que habilitemos tu acceso.</Link>
              </p>
            </header>

            <form className={styles.form} onSubmit={handleSubmit}>
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
                    placeholder="Crea una contraseña"
                    value={passwordValue}
                    onChange={(event) => setPasswordValue(event.target.value)}
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
              <div className={registration.strength} data-level={fuerza} aria-live="polite">
                <span className={registration.strengthBars} aria-hidden="true">
                  {[1, 2, 3, 4].map((level) => (
                    <i key={level} className={level <= fuerza ? registration.on : ""} />
                  ))}
                </span>
                <p className={registration.fieldHint}>
                  {passwordValue
                    ? `${FUERZA_LABEL[fuerza]} · mínimo 12 caracteres, con números o símbolos.`
                    : "Usa al menos 12 caracteres. Tu contraseña se guarda cifrada."}
                </p>
              </div>

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

              <div className={`${styles.formRow} ${registration.consentRow}`}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    name="acceptTerms"
                    required
                    checked={accepted}
                    onChange={(event) => {
                      setAccepted(event.target.checked);
                      if (event.target.checked) setFormError("");
                    }}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Acepto los términos y he leído el aviso de privacidad
                </label>
                <span className={registration.consentLinks}>
                  <Link href="/terminos">Términos</Link>
                  <Link href="/privacidad">Aviso de privacidad</Link>
                </span>
              </div>

              {formError ? <p className={registration.formError} role="alert">{formError}</p> : null}

              <button type="submit" className={styles.submit} disabled={submitting}>
                {submitting ? "Creando cuenta..." : "Crear mi cuenta"} <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <p className={styles.loginFooter}>
              ¿Ya tienes cuenta? <Link href="/login">Inicia sesión</Link>
            </p>
            <p className={styles.loginFooter}>
              <Link href="/">Volver al inicio</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/terminos">Términos</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/privacidad">Privacidad</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
