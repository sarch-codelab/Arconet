import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = ["app/page.module.css", "app/nav-dock.module.css"];
const luminance = (hex) => {
  const channels = hex.match(/[\da-f]{2}/gi).map(c => parseInt(c, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe("contraste del acceso Admin en Soluciones", () => {
  it.each(files)("prioriza el color sobre los enlaces generales en %s", file => {
    const css = readFileSync(file, "utf8");
    const light = css.match(/\.desktopMenuAuth \.desktopMenuAdmin\s*\{([^}]+)\}/)?.[1] || "";
    const dark = css.match(/:global\(html\[data-theme="dark"\]\) \.desktopMenuAuth \.desktopMenuAdmin\s*\{([^}]+)\}/)?.[1] || "";
    expect(light).toContain("background: #171a22");
    expect(light).toContain("color: #fff");
    expect(dark).toContain("background: #eef1f7");
    expect(dark).toContain("color: #101827");
    expect(ratio("ffffff", "171a22")).toBeGreaterThan(4.5);
    expect(ratio("101827", "eef1f7")).toBeGreaterThan(4.5);
  });
});
