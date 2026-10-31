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
