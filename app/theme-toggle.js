"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { animateThemeChange, cancelThemeTransition } from "@/lib/theme-transition";
import { resolvePanelTheme } from "@/lib/panel-theme";
import { Clock, Moon, Sun } from "lucide-react";

export const THEME_KEY = "arconet-theme";
const MODES = ["auto", "light", "dark"];

export const THEME_LABELS = {
  auto: "Automático (según la hora)",
  light: "Claro",
  dark: "Oscuro",
};

export function resolveTheme(mode, date = new Date()) {
  if (mode === "light" || mode === "dark") return mode;
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const panel = document.documentElement.dataset.adminTheme;
  if (panel) theme = resolvePanelTheme(panel, window.matchMedia?.("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

// El modo vive en un store único y compartido: el botón flotante y el control
// del menú móvil se montan a la vez (uno puede quedar oculto por CSS), así que
// deben leer y escribir el mismo estado o el tema elegido por el usuario se
// pierde en cuanto el otro componente vuelve a aplicar el suyo.
function readStoredMode() {
  if (typeof window === "undefined") return "auto";
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    return MODES.includes(stored) ? stored : "auto";
  } catch { return "auto"; }
}

let currentMode = readStoredMode();
let autoTimer = null;
const listeners = new Set();

function syncAutoTimer() {
  if (typeof window === "undefined") return;
  if (currentMode !== "auto") {
    if (autoTimer) {
      window.clearInterval(autoTimer);
      autoTimer = null;
    }
    return;
  }
  if (autoTimer) return;
  autoTimer = window.setInterval(() => applyTheme(resolveTheme("auto")), 60000);
}

export function getThemeMode() {
  return currentMode;
}

export function setThemeMode(next) {
  if (!MODES.includes(next) || next === currentMode) return;
  currentMode = next;
  applyTheme(resolveTheme(next));
  try {
    if (next === "auto") window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  } catch { /* Restricted storage still allows an in-memory theme choice. */ }
  syncAutoTimer();
  listeners.forEach((listener) => listener());
}

export function setAdminTheme(mode) {
  if (mode) document.documentElement.dataset.adminTheme = mode;
  else delete document.documentElement.dataset.adminTheme;
  applyTheme(resolveTheme(currentMode));
}

export function cycleThemeMode(event) {
  const next = MODES[(MODES.indexOf(currentMode) + 1) % MODES.length];
  return animateThemeChange(event?.currentTarget, () => setThemeMode(next));
}

function subscribeTheme(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Estado del tema para cualquier control: { mode, theme, label, cycle }. */
export function useThemeMode() {
  // El snapshot del servidor es "auto"; useSyncExternalStore realiza la
  // hidratación con ese valor y después suscribe el modo real, sin un estado
  // `mounted` ni un render sincrónico adicional desde un efecto.
  const mode = useSyncExternalStore(subscribeTheme, getThemeMode, () => "auto");

  useEffect(() => {
    // Aplica lo guardado (o el modo automático) la primera vez.
    setThemeMode(readStoredMode());
  }, []);

  useEffect(() => {
    // Reevalúa el modo automático cada minuto mientras haya controles montados.
    syncAutoTimer();
  }, [mode]);

  const active = mode;
  const theme = resolveTheme(active);

  return {
    mode: active,
    theme,
    label: THEME_LABELS[active],
    Icon: active === "auto" ? Clock : theme === "dark" ? Moon : Sun,
    cycle: cycleThemeMode,
  };
}

export default function ThemeToggle() {
  useEffect(() => cancelThemeTransition, []);
  const { mode, theme, label, Icon, cycle } = useThemeMode();
  // En el panel el botón flotante quedaba encima de tablas y formularios:
  // robaba clics y cambiaba el tema sin querer. Ahí el tema se controla desde
  // Mi perfil (Apariencia), así que el botón flotante no se muestra.
  const pathname = usePathname() || "";
  if (pathname.startsWith("/panel-administrativo") || pathname.startsWith("/admin")) return null;

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={cycle}
      aria-label={`Tema: ${label}. Cambiar tema`}
      title={`Tema: ${label}. Clic para cambiar: automático → claro → oscuro`}
    >
      <Icon aria-hidden="true" />
      {mode === "auto" ? <span className="themeToggleBadge" /> : null}
    </button>
  );
}
