import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");

const page = leer("app", "page.js");
const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");
const servicio = leer("lib", "home-categorias.js");

describe("portada: categorías desde la base de datos", () => {
  it("la página obtiene las categorías en el servidor y las pasa al componente", () => {
    expect(page).toContain("getHomeCategorias");
    expect(page).toContain("categorias={categorias}");
    // Sin esto la portada se congelaría en el build y no vería categorías nuevas.
    expect(page).toMatch(/export const revalidate\s*=\s*\d+/);
  });

  it("la consulta filtra por estado activo y respeta el orden del panel", () => {
    expect(servicio).toContain('estado: "activo"');
    expect(servicio).toContain('orden: "asc"');
  });

  it("cada categoría enlaza a su ruta real de la tienda", () => {
    expect(servicio).toContain("/tienda/categoria/");
  });

  it("la lista ya no tiene categorías escritas a mano", () => {
    expect(casa).not.toContain("PRODUCT_LINES");
    expect(casa).not.toContain("Splitters ópticos");
    expect(casa).not.toContain("Patch cords y pigtails de fibra");
  });

  it("el título de la sección dice Nuestras categorías", () => {
    expect(casa).toContain("01 / NUESTRAS CATEGORÍAS");
    expect(casa).not.toContain("01 / NUESTRO CATÁLOGO");
  });

  it("la numeración usa dos dígitos y se genera sola", () => {
    expect(casa).toContain('String(index + 1).padStart(2, "0")');
  });

  it("la consulta falla sin romper la portada", () => {
    expect(servicio).toContain("catch");
    expect(servicio).toContain("return []");
  });
});

describe("portada: tipografía en pantallas grandes", () => {
  it("la lista de categorías crece en monitores grandes", () => {
    const grande = css.slice(css.indexOf("@media (min-width: 1440px)"));
    expect(grande).toMatch(/\.productList li strong\s*\{[^}]*font-size:\s*17px/);
    const enorme = css.slice(css.indexOf("@media (min-width: 1800px)"));
    expect(enorme).toMatch(/\.productList li strong\s*\{[^}]*font-size:\s*19px/);
  });

  it("el menú de navegación escala con la pantalla, no en pasos fijos", () => {
    // Antes eran escalones de 14px y 15px: a 1900px seguía viéndose chico.
    const nav = css.match(/\.navigation a\s*\{[^}]*\}/)?.[0] ?? "";
    const tamano = nav.match(/font-size:\s*clamp\(\s*([\d.]+)px\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)px/);
    expect(tamano).not.toBeNull();
    const [, minimo, fluido, maximo] = tamano.map(Number);
    expect(fluido).toBeGreaterThan(0);
    expect(maximo).toBeGreaterThan(minimo);
    // A 1900px de ancho debe superar los 15px que se veían chicos.
    expect((fluido * 1900) / 100).toBeGreaterThan(15);
  });

  it("la cápsula y el logo acompañan el crecimiento del menú", () => {
    expect(css).toMatch(/\.topbarShell\s*\{[^}]*height:\s*clamp\(62px/);
    expect(css).toMatch(/\.brand img\s*\{[^}]*width:\s*clamp\(128px/);
  });

  it("ya no queda texto de lista en 11px, que obligaba a forzar la vista", () => {
    expect(css).not.toMatch(/\.productList li strong\s*\{[^}]*font-size:\s*11px/);
  });
});

describe("portada: desplegable Acceder", () => {
  it("el panel tiene ancho propio para que los dos cuadros no se aplasten", () => {
    expect(css).toMatch(/\.accessMenuPanel\s*\{[^}]*min-width:\s*268px/);
    expect(css).toMatch(/\.accessMenuPanel\s*\{[^}]*width:\s*max-content/);
  });

  it("Login y Admin van lado a lado en dos columnas", () => {
    expect(css).toMatch(/\.accessMenuPanel\s*\{[^}]*grid-template-columns:\s*repeat\(2/);
  });
});
