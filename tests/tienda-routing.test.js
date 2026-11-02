import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FAMILIES } from "../app/tienda/catalogo-data";
import nextConfig from "../next.config.mjs";

// El catálogo vive en /tienda. Estos tests fijan las dos condiciones que más
// fácil se rompen: que las URLs viejas redirijan, y que las imágenes de
// `public/catalogo/` NO se redirijan (un comodín general las dejaría en 404 y
// la home se quedaría sin fotos).
describe("/tienda sustituye a /catalogo", () => {
  it("las rutas de página viven en app/tienda", async () => {
    for (const ruta of ["page.js", "layout.js", "[slug]/page.js", "categoria/[slug]/page.js", "producto/[id]/page.js"]) {
      expect(existsSync(`app/tienda/${ruta}`), `falta app/tienda/${ruta}`).toBe(true);
    }
    expect(existsSync("app/catalogo")).toBe(false);
  });

  it("redirige con 301 las URLs antiguas principales", async () => {
    const redirects = await nextConfig.redirects();
    const porOrigen = Object.fromEntries(redirects.map((r) => [r.source, r]));

    expect(porOrigen["/catalogo"]).toMatchObject({ destination: "/tienda", statusCode: 301 });
    expect(porOrigen["/catalogo/categoria/:slug"]).toMatchObject({ destination: "/tienda/categoria/:slug", statusCode: 301 });
    expect(porOrigen["/catalogo/producto/:slug"]).toMatchObject({ destination: "/tienda/producto/:slug", statusCode: 301 });
  });

  it("redirige cada familia y cada alias en uso", async () => {
    const redirects = await nextConfig.redirects();
    const origenes = new Set(redirects.map((r) => r.source));
    for (const family of FAMILIES) {
      expect(origenes.has(`/catalogo/${family.slug}`), `falta redirección de ${family.slug}`).toBe(true);
      for (const alias of family.aliases || []) {
        expect(origenes.has(`/catalogo/${alias}`), `falta redirección del alias ${alias}`).toBe(true);
      }
    }
  });

  it("no redirige los archivos estáticos de public/catalogo", async () => {
    const redirects = await nextConfig.redirects();
    // Ningún patrón de redirección debe ser un comodín sobre todo /catalogo.
    for (const { source } of redirects) {
      expect(source).not.toBe("/catalogo/:path*");
      expect(source).not.toBe("/catalogo/:path");
      expect(source.includes(".*")).toBe(false);
    }
    // Las imágenes siguen servidas desde su ruta original.
    expect(existsSync("public/catalogo/infraestructura.jpg")).toBe(true);
    expect(existsSync("public/catalogo/hero-fiber.jpg")).toBe(true);
  });
});

describe("el copy visible acompaña al nombre de la ruta", () => {
  it("la navegación y el pie dicen Tienda, no Catálogo", async () => {
    const { readFileSync } = await import("node:fs");
    const footer = readFileSync("app/footer.js", "utf8");
    expect(footer).toContain('label: "Tienda"');
    expect(footer).not.toContain('label: "Catálogo"');

    const home = readFileSync("app/home-experience.js", "utf8");
    const navigation = readFileSync("app/navigation-data.js", "utf8");
    expect(navigation).toContain('{ label: "Tienda", href: "/tienda"');
    expect(navigation).not.toContain('{ label: "Catálogo", href: "/tienda"');
    expect(home).toContain('import { NAVIGATION } from "./navigation-data"');
    expect(home).toContain("mobileMenuPrimaryLabel}>Tienda<");

    const menu = readFileSync("app/mobile-site-menu.js", "utf8");
    expect(menu).toContain('["Tienda", "/tienda"]');
  });

  it("los títulos de página dicen Tienda", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["app/tienda/page.js", "app/tienda/layout.js"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).toContain('title: "Tienda"');
      expect(src, f).not.toContain('title: "Catálogo"');
    }
  });
});
