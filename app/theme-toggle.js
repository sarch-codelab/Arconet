"use client";

import { useEffect, useState } from "react";
import { Clock, Moon, Sun } from "lucide-react";

export const THEME_KEY = "arconet-theme";
const MODES = ["auto", "light", "dark"];

export function resolveTheme(mode, date = new Date()) {
  if (mode === "light" || mode === "dark") return mode;
  const hour = date.getHours();
  return hour >= 18 || hour < 6 ? "dark" : "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
  const [mode, setMode] = useState("auto");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (MODES.includes(stored)) setMode(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;

    applyTheme(resolveTheme(mode));

    if (mode === "auto") {
      window.localStorage.removeItem(THEME_KEY);
    } else {
      window.localStorage.setItem(THEME_KEY, mode);
    }

    if (mode !== "auto") return undefined;

    const id = window.setInterval(() => {
      applyTheme(resolveTheme("auto"));
    }, 60000);

    return () => window.clearInterval(id);
  }, [mode, mounted]);

  const cycle = () => {
    setMode((current) => MODES[(MODES.indexOf(current) + 1) % MODES.length]);
  };

  const theme = resolveTheme(mode);
  const Icon = mode === "auto" ? Clock : theme === "dark" ? Moon : Sun;

  const description =
    mode === "auto"
      ? `Modo automático (${theme === "dark" ? "oscuro" : "claro"} según la hora)`
      : theme === "dark"
        ? "Modo oscuro"
        : "Modo claro";

  return (
    <button
      type="button"
      className="themeToggle"
      onClick={cycle}
      aria-label={`Tema: ${description}. Cambiar tema`}
      title={`Tema: ${description}. Clic para cambiar: automático → claro → oscuro`}
    >
      <Icon aria-hidden="true" />
      {mode === "auto" ? <span className="themeToggleBadge" /> : null}
    </button>
  );
}
