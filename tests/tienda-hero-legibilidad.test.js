import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const css = readFileSync("app/tienda/catalogo-experience.module.css", "utf8");
const rule = selector => css.slice(css.indexOf(`${selector} {`)).split("}")[0];

describe("portada de tienda: adaptación y contraste localizado", () => {
  it("pinta el protector encima de la foto, con salida transparente hacia el técnico", () => {
    const overlay = [...css.matchAll(/(?:^|\n)\.heroOverlay\s*\{([^}]*)\}/g)].find(([, body]) => body.includes("mask-image"))?.[1] || "";
    expect(overlay).toContain("z-index: 1");
    expect(overlay).toContain("pointer-events: none");
    expect(overlay).toContain("rgba(5, 14, 28, 0) 80%");
    expect(overlay).toContain("mask-image: radial-gradient");
    expect(overlay).not.toMatch(/backdrop-filter:|filter:/);
  });
  it("mantiene los colores de la foto y no oculta contenido para ganar contraste", () => {
    expect(rule(".heroImage")).not.toMatch(/filter:|mix-blend-mode:/);
    expect(rule(".heroContent")).toContain("animation: heroArrive");
    expect(rule(".heroContent")).not.toMatch(/overflow:\s*hidden|display:\s*none/);
  });
  it("usa un acento claro propio y texto sólido, independiente del tema", () => {
    expect(rule(".heroContent h1 em")).toContain("color: #c7ddff");
    expect(rule(".heroDescription")).toContain("color: #f3f6fc");
    expect(rule(".heroContent .eyebrow")).toContain("color: #e0eaff");
    expect(rule(".ghostButton")).toContain("background: rgba(5, 14, 28, 0.45)");
  });
  it("limita la columna y adapta título, párrafos y márgenes en móvil", () => {
    expect(rule(".heroContent")).toContain("width: min(880px, 52%)");
    expect(rule(".heroContent h1")).toContain("overflow-wrap: anywhere");
    expect(rule(".heroDescription")).toContain("text-wrap: pretty");
    const mobile = css.slice(css.indexOf("@media (max-width: 760px)", css.indexOf("@media (max-width: 900px)")));
    expect(mobile).toContain("width: calc(100% - 40px)");
    expect(mobile).toContain("margin-inline: 20px");
    expect(mobile).toContain("font-size: clamp(28px, 6.6vw, 44px)");
    expect(mobile).toContain("min-height: 44px");
  });
});
