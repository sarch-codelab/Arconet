import { readFileSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/page.module.css", "utf8");
const asset = "public/arconet-en-numeros.png";

describe("fondo de Arconet en números", () => {
  it("usa la imagen panorámica suministrada y mantiene un peso moderado", () => {
    const png = readFileSync(asset);
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(1920);
    expect(png.readUInt32BE(20)).toBe(452);
    expect(statSync(asset).size).toBeLessThan(300 * 1024);
    expect(css).toMatch(/\.statsBand::before\s*\{[^}]*url\("\/arconet-en-numeros\.png"\)/);
    expect(css).toMatch(/\.statsBand::before\s*\{[^}]*background-size: cover/);
  });

  it("queda detrás de las cifras y no intercepta la interacción", () => {
    const band = css.match(/\.statsBand\s*\{([^}]*)\}/)?.[1] || "";
    const item = css.match(/\.statItem\s*\{([^}]*)\}/)?.[1] || "";
    expect(band).toContain("isolation: isolate");
    expect(item).toContain("z-index: 1");
    expect(item).toContain("background: transparent");
    expect(css).toMatch(/\.statsBand::before,\s*\.statsBand::after\s*\{[^}]*pointer-events: none/);
  });

  it("adapta el velo a los temas claro y oscuro", () => {
    expect(css).toMatch(/:global\(html\[data-theme="light"\]\) \.statsBand\s*\{[^}]*rgba\(250, 249, 246, 0\.1\)/);
    expect(css).toMatch(/:global\(html\[data-theme="dark"\]\) \.statsBand\s*\{[^}]*invert\(1\) hue-rotate\(180deg\) brightness\(1\.35\)/);
    expect(css).toMatch(/:global\(html\[data-theme="dark"\]\) \.statsBand\s*\{[^}]*rgba\(14, 17, 22, 0\.12\)/);
    expect(css).toMatch(/\.statsBand::before\s*\{[^}]*filter: var\(--stats-filter\)/);
    expect(css).toMatch(/\.statsBand::after\s*\{[^}]*background-color: var\(--stats-veil\)/);
  });
});
