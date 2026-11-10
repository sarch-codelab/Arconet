"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useEffect, useRef, useState } from "react";
import { setThemeMode } from "../theme-toggle";
import { Settings, ShieldCheck, Globe, ChevronDown } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast } from "./admin-ui";
import { Topbar } from "./topbar";
import FiscalSettingsPanel from "./fiscal-settings-panel";
import PublicPagesSettings from "./public-pages-settings";
import DockMenuSettings from "./dock-menu-settings";
import BusinessNotice, { focusBusinessNotice } from "./business-notice";
import business from "./business-feedback.module.css";
import organization from "./ajustes-organizacion.module.css";

function SettingsDisclosure({ title, description, pending, children }) {
  return <details className={organization.disclosure}>
    <summary><span className={organization.summaryText}><strong>{title}</strong><small>{description}</small></span>{pending && <span className={organization.pending}>Sin guardar</span>}<ChevronDown className={organization.chevron} size={18} aria-hidden="true" /></summary>
    <div className={organization.contents}>{children}</div>
  </details>;
}

export default function AjustesSection({ session, workers = [] }) {
  const [settings, setSettings] = useState(null);
  const [menu1Dirty, setMenu1Dirty] = useState(false);
  const [menu2Dirty, setMenu2Dirty] = useState(false);
  const [companyDirty, setCompanyDirty] = useState(false);
  const [fiscalDirty, setFiscalDirty] = useState(false);
  const savedTheme = useRef(null);
  const inFlight = useRef(false);
  const [notice, setNotice] = useState(null);
  const canWrite = session?.permisos?.includes("ajustes:write");
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
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
        setCompanyDirty(false);
        savedTheme.current = data.theme;
      }
    }).catch((loadError) => { if (active) setError(loadError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  async function handleSave(event) {
    event.preventDefault();
    if (!settings || inFlight.current || !canWrite) return;
    const previousTheme = savedTheme.current;
    focusBusinessNotice("company-settings-feedback");
    inFlight.current = true;
    setSaving(true);
    setNotice({ kind: "pending", title: "Guardando datos de empresa…" });
    try {
      const response = await fetch("/api/configuracion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setSettings(data);
      setCompanyDirty(false);
      savedTheme.current = data.theme;
      // El tema solo se aplica cuando el usuario lo cambia y guarda: antes se
      // imponía al abrir la sección y el sitio cambiaba de color "de la nada".
      if (data.theme && data.theme !== previousTheme) {
        setThemeMode(data.theme === "system" ? "auto" : data.theme === "dark" ? "dark" : "light");
      }
      setNotice({ kind: "success", title: "Datos de empresa guardados", message: "Los datos actualizados estarán disponibles en las próximas consultas y documentos. Los importes guardados no se convierten al cambiar la moneda general." });
      window.dispatchEvent(new Event("arconet:company-settings-updated"));
      show("Configuración guardada.");
    } catch (saveError) { setNotice({ kind: "error", title: "No se pudo guardar la empresa", message: saveError.message }); }
    finally { inFlight.current = false; setSaving(false); }
  }

  function changeField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
    setCompanyDirty(true);
  }

  return (
    <>
      <Topbar
        title="Ajustes"
        subtitle="Páginas públicas, datos empresariales y autorización fiscal. Cambios sensibles solo para usuarios autorizados."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <p className={organization.intro}>Elige una sección para abrirla. Cerrar una sección no borra los cambios pendientes; recuerda guardarlos antes de salir de Ajustes.</p>
        <div className={organization.group}>
          <h2 className={organization.groupHeading}><Globe size={17} aria-hidden="true" /> Sitio público</h2>
          <SettingsDisclosure title="Páginas públicas" description="Activar o desactivar páginas del sitio.">
            <PublicPagesSettings session={session} />
          </SettingsDisclosure>
          <SettingsDisclosure title="Menú de navegación 1" description="Barra inicial y desplegables." pending={menu1Dirty}>
            <DockMenuSettings session={session} menuNumber={1} onDirtyChange={setMenu1Dirty} />
          </SettingsDisclosure>
          <SettingsDisclosure title="Menú de navegación 2" description="Barra al desplazarse y desplegables." pending={menu2Dirty}>
            <DockMenuSettings session={session} menuNumber={2} onDirtyChange={setMenu2Dirty} />
          </SettingsDisclosure>
        </div>
        <div className={organization.group}>
          <h2 className={organization.groupHeading}><Settings size={17} aria-hidden="true" /> Empresa y facturación</h2>
          <SettingsDisclosure title="Configuración general" description="Nombre, contacto, moneda y tema público." pending={companyDirty}>
        <section className={styles.card} aria-label="Configuración general">
          <header className={styles.cardHeader}>
            <h3><Settings size={18} /> Configuración general</h3>
          </header>
          {notice && <BusinessNotice id="company-settings-feedback" {...notice} />}
          {loading ? <p className={styles.cardBody}>Cargando configuración…</p> : error ? <div className={styles.cardBody}><p className={styles.dangerText} role="alert">{error}</p><button type="button" className={styles.ghostBtn} onClick={() => { setError("");setLoading(true);setReload(value => value + 1); }}>Reintentar</button></div> : <form className={`${styles.form} ${business.settingsBody}`} onSubmit={handleSave}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Nombre comercial de la empresa
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
                Moneda general de visualización
                <select disabled={!canWrite} value={settings.currency} onChange={(event) => changeField("currency", event.target.value)}>
                  <option value="L">Lempiras (L)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
                <small className={styles.fieldHint}>No convierte precios ni importes ya guardados. La emisión fiscal actual conserva HNL.</small>
              </label>
              <label className={styles.field}>
                Tema del sitio público
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
          </SettingsDisclosure>
          <SettingsDisclosure title="Datos fiscales y CAI" description="Autorización, serie, rango y vigencia para facturación." pending={fiscalDirty}>
            <FiscalSettingsPanel session={session} onDirtyChange={setFiscalDirty} />
          </SettingsDisclosure>
        </div>
        <div className={organization.group}>
          <h2 className={organization.groupHeading}><ShieldCheck size={17} aria-hidden="true" /> Sistema</h2>
          <SettingsDisclosure title="Información del sistema" description="Versión y entorno de la aplicación.">
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
          </SettingsDisclosure>
          <p className={organization.intro}>Las credenciales del servidor no se muestran aquí. La apariencia personal se configura en Mi perfil.</p>
        </div>
      </div>

    </>
  );
}
