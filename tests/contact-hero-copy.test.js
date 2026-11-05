import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/contacto/contact-experience.module.css", "utf8");
const tienda = readFileSync("app/tienda/catalogo-experience.module.css", "utf8");
const jsx = readFileSync("app/contacto/contact-experience.js", "utf8");

const rule = (text, selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
  expect(match, `falta la regla ${selector}`).not.toBeNull();
  return match[1];
};
const prop = (block, name) => {
  const match = block.match(new RegExp(`${name}:\\s*([^;]+);`));
  expect(match, `falta ${name}`).not.toBeNull();
  return match[1].trim();
};

describe("bloque de texto del hero de /contacto", () => {
  it("se alinea a la izquierda y deja libre el lado derecho de la foto", () => {
    const hero = rule(css, ".heroCopy");
    expect(prop(hero, "text-align")).toBe("left");
    expect(prop(hero, "width")).toBe("min(880px, 52%)");
    expect(prop(hero, "margin-left")).toBe("clamp(24px, 6vw, 116px)");
    expect(hero).toContain("margin-top: auto");
    expect(hero).toContain("margin-bottom: auto");
    expect(css).not.toContain("margin: auto;");
    expect(css).toContain(".eyebrow {\n  justify-content: flex-start;\n}");
    expect(css).toContain("margin: 21px 0 26px");
    expect(css).not.toContain("margin: 21px auto 26px");
    expect(css).toContain("rgba(5, 14, 28, 0) 76%");
  });

  it("usa exactamente la tipografía del hero del home de /tienda", () => {
    const contactoH1 = rule(css, ".heroCopy h1");
    const tiendaH1 = rule(tienda, ".heroContent h1");
    for (const name of ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "text-shadow"]) {
      expect(prop(contactoH1, name), name).toBe(prop(tiendaH1, name));
    }
    expect(prop(tiendaH1, "font-family")).toBe("var(--font-display), system-ui, sans-serif");
    expect(prop(contactoH1, "font-family")).not.toContain("--font-heading");
    expect(rule(css, ".heroCopy h1 em")).toContain("color: #c7ddff");

    const contactoP = rule(css, ".heroCopy > p:not(.eyebrow)");
    const tiendaP = rule(tienda, ".heroDescription");
    for (const name of ["font-size", "line-height", "text-shadow", "color"]) {
      expect(prop(contactoP, name), name).toBe(prop(tiendaP, name));
    }
    const contactoEyebrow = rule(css, ".heroCopy .eyebrow");
    const tiendaEyebrow = rule(tienda, ".heroContent .eyebrow");
    for (const name of ["font-size", "line-height", "text-shadow", "color"]) {
      expect(prop(contactoEyebrow, name), name).toBe(prop(tiendaEyebrow, name));
    }
  });

  it("conserva la imagen, los textos y la animación existentes", () => {
    expect(jsx).toContain('src="/contacto-asesoria-fibra.webp"');
    expect(jsx).toContain("Arconet · San Pedro Sula, Honduras");
    expect(jsx).toContain("Tu próximo proyecto<br />empieza con <em>una conversación.</em>");
    expect(jsx).toContain("Cuéntanos qué quieres conectar. Te ayudamos a encontrar el equipo y la ruta correctos para tu red.");
    expect(jsx).toContain('href="#formulario"');
    expect(css).toContain("animation: copyEnter 850ms");
    expect(css).toContain("@keyframes copyEnter");
    expect(css).toContain("object-fit: cover");
  });

  it("mantiene una columna legible y sin desbordamiento en móvil", () => {
    expect(css).toContain("width: calc(100% - 40px); margin-top: auto; margin-bottom: 0; margin-inline: 20px");
    expect(css).toContain("padding: 32px 0 24px");
    expect(css).toContain("font-size: clamp(28px, 6.6vw, 44px)");
    expect(css).toContain(".heroImage { object-position: 64% 42%; }");
    expect(css).not.toContain("font-size: 40px; }");
  });
});
