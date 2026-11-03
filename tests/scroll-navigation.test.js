import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");
const layout = readFileSync("app/layout.js", "utf8");

describe("navegación nativa entre secciones", () => {
  it("suaviza las anclas sin instalar un motor de rueda", () => {
    expect(css).toMatch(/html\s*\{\s*scroll-behavior:\s*smooth/);
    const helper = readFileSync("lib/native-scroll.js", "utf8");
    expect(helper).not.toMatch(/addEventListener\(["'](?:wheel|touchmove|keydown)/);
  });
  it("permite que Next 16 restaure posiciones sin animar el cambio de ruta", () => {
    expect(layout).toMatch(/<html[\s\S]*?data-scroll-behavior="smooth"/);
  });
  it("conserva enlaces y sus márgenes para no taparlos con la cabecera", () => {
    const home = readFileSync("app/home-experience.js", "utf8");
    const styles = readFileSync("app/page.module.css", "utf8");
    expect(home).toContain('href="#soluciones"');
    expect(home).toContain('href="#contacto"');
    expect(styles).toContain("scroll-margin-top: 78px");
    expect(home).not.toContain('addEventListener("click"');
  });
});

// El historial debe conservar el árbol de Next al navegar por anclas; una
// navegación hash nativa seguida de router.push dejaba URL y contenido distintos.
import { resolveSectionHref } from "../lib/section-navigation";
const anchor = (href, extra = {}) => ({
  target: "", dataset: {}, hasAttribute: () => false,
  getAttribute: () => href, ...extra,
});
const current = "https://arconethn.com/?vista=web";

describe("anclas y estado del App Router", () => {
  it.each(["#empresa", "/?vista=web#empresa", "https://arconethn.com/?vista=web#empresa"])("resuelve el destino de la misma página: %s", href => {
    expect(resolveSectionHref(anchor(href), current)).toEqual({ href: "/?vista=web#empresa", id: "empresa" });
  });
  it.each(["/tienda#empresa", "?vista=otra#empresa", "https://otro.test/#empresa", "mailto:a@b.test", "javascript:alert(1)", "#", "#%ZZ", ""])("no se apodera de otro tipo de enlace: %s", href => {
    expect(resolveSectionHref(anchor(href), current)).toBeNull();
  });
  it("respeta nueva pestaña, descargas, opt-out e ids codificados", () => {
    expect(resolveSectionHref(anchor("#empresa", { target: "_blank" }), current)).toBeNull();
    expect(resolveSectionHref(anchor("#empresa", { hasAttribute: () => true }), current)).toBeNull();
    expect(resolveSectionHref(anchor("#empresa", { dataset: { noTransition: "true" } }), current)).toBeNull();
    expect(resolveSectionHref(anchor("#secci%C3%B3n"), current)?.id).toBe("sección");
    expect(resolveSectionHref(null, current)).toBeNull();
  });
  it("usa el listener existente y evita la cortina solo para destinos presentes", () => {
    const transition = readFileSync("app/page-transition.js", "utf8");
    expect(transition).toContain("section && document.getElementById(section.id)");
    expect(transition).toContain("routerRef.current.push(section.href)");
    expect(transition).toContain("event.metaKey || event.ctrlKey || event.shiftKey || event.altKey");
  });
});
