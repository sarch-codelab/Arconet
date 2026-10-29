"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useEffect, useRef, useState } from "react";
import { setThemeMode } from "../theme-toggle";
import { Settings, ShieldCheck } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast } from "./admin-ui";
import { Topbar } from "./topbar";

export default function AjustesSection({ session, workers = [] }) {
  const [settings, setSettings] = useState(null);
  const savedTheme = useRef(null);
  const canWrite = session?.permisos?.includes("ajustes:write");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    let active = true;
    fetch("/api/configuracion", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la configuración.");
      if (active) {
        setSettings(data);
        savedTheme.current = data.theme;
      }
    }).catch((loadError) => { if (active) setError(loadError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    if (!settings || saving || !canWrite) return;
    const previousTheme = savedTheme.current;
    setSaving(true);
    try {
      const response = await fetch("/api/configuracion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setSettings(data);
      savedTheme.current = data.theme;
      // El tema solo se aplica cuando el usuario lo cambia y guarda: antes se
      // imponía al abrir la sección y el sitio cambiaba de color "de la nada".
      if (data.theme && data.theme !== previousTheme) {
        setThemeMode(data.theme === "system" ? "auto" : data.theme === "dark" ? "dark" : "light");
      }
      show("Configuración guardada.");
    } catch (saveError) { show(saveError.message, "error"); }
    finally { setSaving(false); }
  }

  function changeField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <Topbar
        title="Ajustes"
        subtitle="Configuración general del sistema."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <section className={styles.card} aria-label="Configuración general">
          <header className={styles.cardHeader}>
            <h3><Settings size={18} /> Configuración general</h3>
          </header>
          {loading ? <p className={styles.cardBody}>Cargando configuración…</p> : error ? <div className={styles.cardBody}><p className={styles.dangerText} role="alert">{error}</p><button type="button" className={styles.ghostBtn} onClick={() => window.location.reload()}>Reintentar</button></div> : <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Nombre de la empresa
                <input
                  disabled={!canWrite}
                  type="text"
                  value={settings.companyName}
                  onChange={(event) => changeField("companyName", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                Email de contacto
                <input
                  disabled={!canWrite}
                  type="email"
                  value={settings.email}
                  onChange={(event) => changeField("email", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                Teléfono
                <input
                  disabled={!canWrite}
                  type="tel"
                  value={settings.phone}
                  onChange={(event) => changeField("phone", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                WhatsApp de cotizaciones
                <input
                  disabled={!canWrite}
                  type="tel"
                  value={settings.whatsapp}
                  onChange={(event) => changeField("whatsapp", event.target.value)}
                  placeholder="504XXXXXXXX"
                />
              </label>
              <label className={styles.field}>
                Moneda
                <select disabled={!canWrite} value={settings.currency} onChange={(event) => changeField("currency", event.target.value)}>
                  <option value="L">Lempiras (L)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </label>
              <label className={styles.field}>
                Tema
                <select disabled={!canWrite} value={settings.theme} onChange={(event) => changeField("theme", event.target.value)}>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="system">Automático (según la hora)</option>
                </select>
                <small className={styles.fieldHint}>
                  Se aplica al sitio público al guardar. &quot;Automático&quot; cambia entre claro y oscuro según la hora.
                </small>
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button type="submit" className={styles.submit} disabled={saving || !canWrite}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </footer>
          </form>}
        </section>

        <section className={styles.card} aria-label="Información del sistema">
          <header className={styles.cardHeader}>
            <h3><ShieldCheck size={18} /> Información del sistema</h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span>Versión</span>
              <strong>0.1.0</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Entorno</span>
              <strong>{process.env.NODE_ENV === "production" ? "Producción" : "Desarrollo"}</strong>
            </div>
          </div>
        </section>
      </div>

    </>
  );
}
