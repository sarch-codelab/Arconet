import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PUBLIC_PAGES, publicPageForPath, publicPageKey, publicPagesFromRows } from "../lib/public-pages";

describe("política de páginas públicas", () => {
  it("comienza con todas las páginas habilitadas y solo admite claves y valores conocidos", () => {
    const defaults = publicPagesFromRows([]);
    expect(Object.values(defaults)).toHaveLength(PUBLIC_PAGES.length);
    expect(Object.values(defaults).every(Boolean)).toBe(true);
    const pages = publicPagesFromRows([{ clave: publicPageKey("tienda"), valor: "false" }, { clave: publicPageKey("contacto"), valor: "true" }, { clave: publicPageKey("ayuda"), valor: "no" }, { clave: publicPageKey("admin"), valor: "false" }]);
    expect(pages.tienda).toBe(false); expect(pages.contacto).toBe(true); expect(pages.ayuda).toBe(true); expect(pages).not.toHaveProperty("admin");
  });
  it("navega a páginas controladas consultando el servidor, sin reutilizar una precarga antigua", () => {
    const transition = readFileSync("app/page-transition.js", "utf8");
    expect(transition).toContain("if (publicPageForPath(path)) window.location.assign(href)");
    expect(transition).toContain("if (publicPageForPath(new URL(path, window.location.href).pathname)) return");
  });
  it("las secciones incluyen rutas hijas sin confundir prefijos ni assets", () => {
    expect(publicPageForPath("/catalogo/ficha/equipo.jpg")?.id).toBe("catalogo");
    expect(publicPageForPath("/catalogo/destacados")?.id).toBe("catalogo");
    expect(publicPageForPath("/tienda/producto/123.jpg")?.id).toBe("tienda");
    expect(publicPageForPath("/tienda/categoria/pasivos")?.id).toBe("tienda");
    expect(publicPageForPath("/catalogo/prod-otdr.jpg")).toBeNull();
    expect(publicPageForPath("/catalogo/lineas/cards/pasivos.webp")).toBeNull();
    for (const path of ["/", "/login", "/cliente", "/panel-administrativo", "/api/catalogo", "/catalogotest", "/tiendax", "/pagina-no-disponible"]) expect(publicPageForPath(path)).toBeNull();
  });
});
