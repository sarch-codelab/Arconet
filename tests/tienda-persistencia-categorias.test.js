import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Dos fallos de persistencia que hacían que al reiniciar se vieran "las
// imágenes anteriores": la página pedía las categorías al navegador después de
// montar, y el seed reescribía la foto de cada categoría con la del código.

const PAGE = "app/tienda/page.js";
const EXPERIENCE = "app/tienda/catalogo-experience.js";
const SEED = "prisma/seed.ts";

const leer = (f) => readFileSync(f, "utf8");

describe("persistencia de las imágenes de categoría", () => {
  it("la tienda recibe las categorías ya resueltas desde el servidor", () => {
    const page = leer(PAGE);
    // Si se piden al navegador, el primer render pinta las de reserva y se ve
    // un salto cuando llegan las de la base.
    expect(page).toContain("prisma.categoria.findMany");
    expect(page).toContain("categoriasIniciales={categorias}");
    expect(page).toContain('dynamic = "force-dynamic"');
  });

  it("el componente no vuelve a pedirlas por su cuenta", () => {
    const js = leer(EXPERIENCE);
    expect(js).not.toContain("useCategorias");
    expect(js).not.toContain("categorias-store");
    // Usa lo que recibe y solo cae al catálogo estático si viene vacío.
    expect(js).toContain("categoriasIniciales.length ? categoriasIniciales : FALLBACK_CATEGORIES");
  });

  it("el seed no sobreescribe la foto que se editó en el panel", () => {
    const seed = leer(SEED);
    const bloque = seed.slice(
      seed.indexOf("for (const [id, nombre, slug, descripcion, foto, orden] of CATEGORIAS)"),
      seed.indexOf("for (const [id, nombre, slug, descripcion, permisos, estado] of ROLES)")
    );
    expect(bloque).toContain("upsert");
    // La foto se siembra al crear, pero no se reescribe al actualizar: es el
    // dato que el usuario cambia desde el panel.
    const update = bloque.match(/update: \{([^}]*)\}/)?.[1] || "";
    expect(update.length).toBeGreaterThan(0);
    expect(update).not.toContain("foto");
    // Al crear sí lleva la foto del código, para una base nueva.
    expect(bloque).toMatch(/create: \{ id, \.\.\.data \}/);
  });
});

describe("sección de acompañamiento retirada de la tienda", () => {
  it("ya no se renderiza", () => {
    const js = leer(EXPERIENCE);
    expect(js).not.toContain("acompanamiento");
    expect(js).not.toContain("supportSection");
    expect(js).not.toContain("El equipo importa");
    expect(js).not.toContain("Nos cuentas tu proyecto");
  });

  it("se conserva la banda de detalles con su cierre 01 — 05", () => {
    const js = leer(EXPERIENCE);
    expect(js).toContain("detailBand");
    expect(js).toContain("San Pedro Sula, Cortés");
    expect(js).toContain("Hablas con el equipo técnico");
    expect(js).toContain("Soporte antes y después");
    expect(js).toContain("01 — 05");
  });

  it("no queda su CSS ni la constante de pasos", () => {
    const css = leer("app/tienda/catalogo-experience.module.css");
    for (const clase of [
      ".supportSection",
      ".supportIntro",
      ".supportText",
      ".supportLink",
      ".supportMedia",
      ".supportImage",
      ".supportCaption",
      ".stepsList",
    ]) {
      expect(css, `quedó ${clase}`).not.toContain(clase);
    }
    expect(leer(EXPERIENCE)).not.toContain("const STEPS");
  });
});
