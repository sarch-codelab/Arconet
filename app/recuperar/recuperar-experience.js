"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import styles from "../admin/admin-experience.module.css";
import extra from "./recuperar.module.css";
import { sileo } from "../toaster";
import { fuerzaPassword, validarPassword } from '@/lib/seguridad';
import MobileSiteMenu from "../mobile-site-menu";

const FUERZA_LABEL = ["Muy débil", "Débil", "Aceptable", "Fuerte", "Muy fuerte"];

export default function RecuperarExperience() {
  const [step, setStep] = useState("solicitar");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");

  const fuerza = fuerzaPassword(password);

  async function solicitar(event) {
    event?.preventDefault();
    if (submitting) return;
    setError("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())) {
      setError("Ingresa un correo electrónico válido.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/cuenta/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim() }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pudimos enviar el código.");
      setAviso(payload.mensaje || "");
      setStep("codigo");
      sileo.success({
        title: "Revisa tu correo",
        description: "Si la cuenta existe, el código ya va en camino.",
      });
    } catch (err) {
      setError(err.message || "No pudimos enviar el código.");
    } finally {
      setSubmitting(false);
    }
  }

  async function restablecer(event) {
    event.preventDefault();
    if (submitting) return;
    setError("");
    if (codigo.replace(/\D/g, "").length !== 6) {
      setError("El código tiene 6 dígitos.");
      return;
    }
    if (password !== confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    const policy = validarPassword(password);
    if (!policy.ok) {
      setError(policy.error);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/cuenta/restablecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo: correo.trim(), codigo, password }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "No pudimos restablecer la contraseña.");
      setStep("listo");
      sileo.success({ title: "Contraseña actualizada", description: "Ya puedes iniciar sesión." });
    } catch (err) {
      setError(err.message || "No pudimos restablecer la contraseña.");
    } finally {
      setSubmitting(false);
    }
  }

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
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.loginVisualImg}
          />
          <div className={styles.loginVisualOverlay} />

          <Link className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            <Image src="/arconet.png" alt="Arconet" width={2172} height={362} priority />
          </Link>

          <div className={styles.loginVisualCopy}>
            <p className={styles.eyebrow}><i /> Recuperar acceso · Arconet</p>
            <h1>
              Vuelve a tus proyectos
              <br />
              <em>sin perder el hilo.</em>
            </h1>
            <p className={styles.lead}>
              Te enviamos un código de un solo uso al correo de tu cuenta. Con él
              defines una contraseña nueva y segura.
            </p>
          </div>

          <div className={styles.loginVisualFooter}>
            <span>FIBRA ÓPTICA · CATV · TELECOMUNICACIONES</span>
            <Link href="/contacto">
              ¿Necesitas ayuda? Escríbenos <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        <section className={styles.loginPanel} aria-label="Recuperar contraseña">
          <div className={styles.loginPanelBody}>
            <header>
              <p className={styles.sectionLabel}>Recuperar contraseña</p>
              <h2>
                {step === "listo" ? "Todo" : "Nueva"}
                <br />
                <em>{step === "listo" ? "listo." : "contraseña."}</em>
              </h2>
              <p className={styles.loginIntro}>
                {step === "solicitar" && "Escribe el correo con el que accedes a tu cuenta Arconet."}
                {step === "codigo" && `Escribe el código de 6 dígitos que enviamos a ${correo.trim()}.`}
                {step === "listo" && "Tu contraseña fue actualizada. Inicia sesión con la nueva."}
              </p>
            </header>

            <ol className={extra.steps} aria-label="Pasos de la recuperación">
              <li className={step === "solicitar" ? extra.stepActive : extra.stepDone}>
                <span>1</span> Correo
              </li>
              <li className={step === "codigo" ? extra.stepActive : step === "listo" ? extra.stepDone : ""}>
                <span>2</span> Código
              </li>
              <li className={step === "listo" ? extra.stepActive : ""}>
                <span>3</span> Listo
              </li>
            </ol>

            {step === "solicitar" && (
              <form className={styles.form} onSubmit={solicitar} noValidate>
                <label className={styles.field}>
                  Correo electrónico
                  <input
                    type="email"
                    name="correo"
                    autoComplete="email"
                    required
                    placeholder="nombre@empresa.com"
                    value={correo}
                    onChange={(event) => setCorreo(event.target.value)}
                  />
                </label>

                {error ? <p className={extra.formError} role="alert">{error}</p> : null}

                <button type="submit" className={styles.submit} disabled={submitting}>
                  {submitting ? "Enviando..." : "Enviar código"} <span><Mail size={15} /></span>
                </button>
              </form>
            )}

            {step === "codigo" && (
              <form className={styles.form} onSubmit={restablecer} noValidate>
                {aviso ? <p className={extra.note} role="status">{aviso}</p> : null}

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
                    className={extra.codeInput}
                    value={codigo}
                    onChange={(event) => setCodigo(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                </label>

                <label className={styles.field}>
                  Nueva contraseña
                  <span className={styles.passwordWrap}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      autoComplete="new-password"
                      required
                      placeholder="Mínimo 12 caracteres"
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

                <div className={extra.strength} data-level={fuerza} aria-live="polite">
                  <span className={extra.strengthBars} aria-hidden="true">
                    {[1, 2, 3, 4].map((level) => (
                      <i key={level} className={level <= fuerza ? extra.on : ""} />
                    ))}
                  </span>
                  <small>{password ? FUERZA_LABEL[fuerza] : "Mínimo 12 caracteres, con números o símbolos."}</small>
                </div>

                <label className={styles.field}>
                  Confirmar contraseña
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmar"
                    autoComplete="new-password"
                    required
                    placeholder="Repite tu contraseña"
                    value={confirmar}
                    onChange={(event) => setConfirmar(event.target.value)}
                  />
                </label>

                {error ? <p className={extra.formError} role="alert">{error}</p> : null}

                <button type="submit" className={styles.submit} disabled={submitting}>
                  {submitting ? "Guardando..." : "Cambiar contraseña"} <span><KeyRound size={15} /></span>
                </button>

                <button
                  type="button"
                  className={extra.linkButton}
                  onClick={solicitar}
                  disabled={submitting}
                >
                  Enviar otro código
                </button>
              </form>
            )}

            {step === "listo" && (
              <div className={extra.success} role="status">
                <span className={extra.successIcon}><Check size={24} strokeWidth={3} /></span>
                <p>
                  Tu contraseña quedó guardada. Por seguridad cerramos las sesiones que
                  estaban abiertas en otras computadoras.
                </p>
                <Link className={styles.submit} href="/login">
                  Iniciar sesión <span><ArrowRight size={15} /></span>
                </Link>
              </div>
            )}

            <p className={styles.loginFooter}>
              <Link href="/login">Volver a iniciar sesión</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/registro">Crear una cuenta</Link>
            </p>
            <p className={styles.loginFooter}>
              <Link href="/terminos">Términos de uso</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/privacidad">Privacidad</Link>
              <span aria-hidden="true"> · </span>
              <Link href="/ayuda">Ayuda</Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
