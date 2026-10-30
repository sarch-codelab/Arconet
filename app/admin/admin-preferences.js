"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { PANEL_THEMES } from "@/lib/panel-theme";
import { setAdminTheme } from "../theme-toggle";
import styles from "./admin-experience.module.css";
import appearance from "./admin-preferences.module.css";
const Context = createContext(null);
export function AdminPreferences({ children, account }) {
  const [mode, setMode] = useState("system"),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [error, setError] = useState("");
  const active = useRef(true),
    inFlight = useRef(false);
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    apiFetch("/api/perfil/preferencias", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "No se pudo cargar el tema.");
        if (controller.signal.aborted) return;
        const selected = PANEL_THEMES.includes(data.theme)
          ? data.theme
          : "system";
        setMode(selected);
        setAdminTheme(selected);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setAdminTheme(document.documentElement.dataset.adminTheme || "system");
    media.addEventListener("change", sync);
    return () => {
      active.current = false;
      controller.abort();
      media.removeEventListener("change", sync);
      setAdminTheme(null);
    };
  }, [account]);
  async function update(theme) {
    if (!PANEL_THEMES.includes(theme) || inFlight.current) return;
    const previous = mode;
    inFlight.current = true;
    setSaving(true);
    setMode(theme);
    setAdminTheme(theme);
    setError("");
    try {
      const response = await apiFetch("/api/perfil/preferencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "No se pudo guardar el tema.");
    } catch (error) {
      if (active.current) {
        setMode(previous);
        setAdminTheme(previous);
        setError(error.message);
      }
    } finally {
      inFlight.current = false;
      if (active.current) setSaving(false);
    }
  }
  return (
    <Context.Provider value={{ mode, loading, saving, error, update }}>
      {children}
    </Context.Provider>
  );
}
export function AppearanceSettings() {
  const theme = useContext(Context);
  if (!theme) return null;
  return (
    <section className={styles.card} aria-label="Apariencia del panel">
      <header className={styles.cardHeader}>
        <h3>Tema de mi panel</h3>
      </header>
      <div className={styles.cardBody}>
        <p>
          Preferencia personal para tu cuenta. No cambia el tema de otros
          usuarios ni el sitio público.
        </p>
        <fieldset
          disabled={theme.loading || theme.saving}
          className={appearance.options}
        >
          <legend>Modo de apariencia</legend>
          {[
            ["light", "Claro"],
            ["dark", "Oscuro"],
            ["system", "Según el dispositivo"],
          ].map(([mode, label]) => (
            <label key={mode} className={appearance.option}>
              <input
                type="radio"
                name="panel-theme"
                value={mode}
                checked={theme.mode === mode}
                onChange={() => theme.update(mode)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p role="status">
          {theme.loading
            ? "Cargando preferencia…"
            : theme.saving
              ? "Guardando apariencia…"
              : "La selección se guarda automáticamente en tu cuenta."}
        </p>
        {theme.error ? <p role="alert">{theme.error}</p> : null}
      </div>
    </section>
  );
}
