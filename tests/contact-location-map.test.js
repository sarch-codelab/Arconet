import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La sección 01 de /contacto era una lista de cinco áreas de interés. Ahora es
// un mapa de ubicación de la sede de Barrio Guamilito. Este archivo evita que
// vuelva la lista y comprueba que el iframe no quede bloqueado por el CSP.

const jsx = readFileSync("app/contacto/contact-experience.js", "utf8");
const css = readFileSync("app/contacto/contact-experience.module.css", "utf8");
const config = readFileSync("next.config.mjs", "utf8");

describe("sección 01 de /contacto: mapa de ubicación", () => {
  it("sustituye la lista de áreas por el mapa de OpenStreetMap", () => {
    expect(jsx).toContain('id="ubicacion"');
    expect(jsx).toContain("01 / DÓNDE ESTAMOS");
    expect(jsx).toContain("https://www.openstreetmap.org/export/embed.html?bbox=");
    expect(jsx).toContain("&layer=mapnik&marker=");
    expect(jsx).toContain("src={MAP_EMBED}");
    expect(jsx).toContain("latitude: 15.5089");
    expect(jsx).toContain("longitude: -88.0313");
    expect(jsx).not.toContain('id="areas"');
    expect(jsx).not.toContain("data-areas");
    expect(jsx).not.toContain("styles.areaList");
    expect(jsx).not.toContain("¿Qué quieres");
    expect(jsx).not.toContain("useState");
    expect(jsx).not.toContain("setActiveArea");
  });

  it("muestra la dirección del footer, el horario y los accesos al mapa", () => {
    expect(jsx).toContain('address: "4 Calle 11 Avenida, Barrio Guamilito"');
    expect(jsx).toContain("San Pedro Sula, Cortés · Honduras");
    expect(jsx).toContain("Lun–Vie 8:00–17:00 · Sáb 8:00–12:00");
    expect(jsx).toContain("href={MAP_LINK}");
    expect(jsx).toContain("href={DIRECTIONS_LINK}");
    expect(jsx).toContain('target="_blank" rel="noopener noreferrer"');
    expect(jsx).toContain('href="#ubicacion"');
    expect(jsx).toContain('title="Mapa de ubicación de Arconet en Barrio Guamilito, San Pedro Sula"');
    expect(jsx).toContain('loading="lazy"');
    expect(jsx).toContain("Marcador aproximado");
  });

  it("el CSP permite el iframe del mapa sin relajar el resto", () => {
    expect(config).toContain("frame-src 'self' blob: https://www.openstreetmap.org;");
    expect(config).toContain("frame-ancestors 'none'");
    expect(config).toContain("frame-src 'self' blob:");
  });

  it("conserva la portada, las secciones 02/03 y el formulario", () => {
    for (const text of [
      'src="/contacto-asesoria-fibra.webp"',
      'src="/neto-conducioendo.png"',
      "02 / ASÍ TRABAJAMOS",
      "03 / CUÉNTANOS",
      'id="formulario"',
      'name="message"',
      "Otro proyecto",
    ]) {
      expect(jsx).toContain(text);
    }
    expect(jsx).toContain("INTERESTS.map((interest)");
    expect(jsx).not.toContain("AREAS.map");
  });

  it("el mapa es responsive y tiene estilos de tema oscuro", () => {
    expect(css).toContain(".mapEmbed {");
    expect(css).toContain("height: 400px;");
    expect(css).toContain(".locationSection { grid-template-columns: 1fr;");
    expect(css).toContain(".mapEmbed { height: 300px; }");
    expect(css).toContain(':global(html[data-theme="dark"]) .mapFrame');
    expect(css).not.toContain(".areaRow");
    expect(css).not.toContain(".areasSection");
    expect(css).not.toContain(".areaCopy");
  });
});
