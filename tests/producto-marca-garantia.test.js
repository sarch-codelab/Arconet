import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findMarca, formatGarantia } from "../lib/marcas";

const JS = "app/tienda/producto/[id]/product-page.js";
const BRAND = "app/tienda/producto/[id]/product-brand.js";
const CSS = "app/tienda/producto/[id]/product-brand.module.css";

const leer = (f) => readFileSync(f, "utf8");

describe("marca y garantía en la ficha de producto", () => {
  it("reconoce la marca sin importar mayúsculas ni acentos", () => {
    expect(findMarca("Fiberhome")?.id).toBe("fiberhome");
    expect(findMarca("FIBERHOME")?.id).toBe("fiberhome");
    expect(findMarca("fiberhome technologies")?.id).toBe("fiberhome");
    expect(findMarca("Sumitomo")?.logo).toBe("/marcas/sumitomo.png");
    expect(findMarca("Lindsay")?.logo).toBe("/marcas/lindsay.png");
    expect(findMarca("Joinwit")?.logo).toBe("/marcas/joinwit.png");
  });

  it("no inventa un logo para una marca desconocida", () => {
    const marca = findMarca("Marca Rara");
    expect(marca.nombre).toBe("Marca Rara");
    expect(marca.logo).toBe("");
  });

  it("sin marca devuelve null en lugar de un texto vacío", () => {
    expect(findMarca("")).toBeNull();
    expect(findMarca(null)).toBeNull();
  });

  it("formatea la garantía y no inventa una cuando falta", () => {
    expect(formatGarantia("12")).toBe("12 meses");
    expect(formatGarantia("12 meses")).toBe("12 meses");
    expect(formatGarantia("5 años")).toBe("5 años");
    expect(formatGarantia("")).toBe("");
    expect(formatGarantia(null)).toBe("");
    expect(formatGarantia(undefined)).toBe("");
  });

  it("la ficha dibuja la franja de marca debajo del SKU", () => {
    const js = leer(JS);
    expect(js).toContain("<ProductBrand");
    // Va inmediatamente después del bloque de SKU, no suelta en otra parte.
    const meta = js.indexOf("className={styles.meta}");
    const franja = js.indexOf("<ProductBrand");
    expect(meta).toBeGreaterThan(-1);
    expect(franja).toBeGreaterThan(meta);
    const entre = js.slice(meta, franja);
    expect(entre).toContain("SKU {product.sku}");
  });

  it("el logo va sin marco y con tamaño acotado", () => {
    const css = leer(CSS);
    const bloque = css.match(/\.logo \{[\s\S]*?\n\}/)?.[0] || "";
    expect(bloque).toBeTruthy();
    // Tope de tamaño: nunca crece más allá del límite.
    expect(bloque).toContain("max-width");
    expect(bloque).toContain("object-fit: contain");
    // Sin caja: nada de borde, fondo ni sombra alrededor del logo.
    expect(bloque).not.toContain("border");
    expect(bloque).not.toContain("background");
    expect(bloque).not.toContain("box-shadow");
  });

  it("no muestra estrellas ni valoraciones inventadas", () => {
    const brand = leer(BRAND);
    expect(brand).not.toContain("Star");
    expect(brand).not.toMatch(/\d\.\d/);
  });

  it("muestra el nombre de la marca cuando no hay logotipo", () => {
    const brand = leer(BRAND);
    expect(brand).toContain("marcaId.logo ? null");
    expect(brand).toContain("styles.nombre");
  });
});

describe("botón y cantidad en la ficha", () => {
  it("el texto del botón es Añadir al Carrito", () => {
    const js = leer(JS);
    expect(js).toContain("Añadir al Carrito");
    expect(js).not.toContain("Añadir a cotización\n");
  });

  it("la cantidad va pegada al botón, no suelta a la izquierda", () => {
    const js = leer(JS);
    // El selector y el botón comparten un contenedor propio.
    const compra = js.match(/<div className=\{styles\.compra\}>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] || "";
    expect(compra).toContain("styles.qty");
    expect(compra).toContain("styles.primary");
    const css = leer("app/tienda/producto/[id]/product-page.module.css");
    expect(css).toContain(".compra {");
  });

  it("los botones de cantidad tienen nombre accesible y límites", () => {
    const js = leer(JS);
    expect(js).toContain('aria-label="Quitar una unidad"');
    expect(js).toContain('aria-label="Agregar una unidad"');
    // No se puede bajar de 1 ni subir sin tope.
    expect(js).toMatch(/Math\.max\(1, value - 1\)/);
    expect(js).toMatch(/Math\.min\(999, value \+ 1\)/);
  });
});
