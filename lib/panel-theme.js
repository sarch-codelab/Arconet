export const PANEL_THEMES = ["light", "dark", "system"];
export function resolvePanelTheme(mode, prefersDark = false) {
  return mode === "light" || mode === "dark"
    ? mode
    : prefersDark
      ? "dark"
      : "light";
}
