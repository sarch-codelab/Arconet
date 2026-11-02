import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PAGE = readFileSync("app/tienda/categoria/[slug]/page.js", "utf8");
const COMPONENT = readFileSync("app/tienda/categoria/[slug]/category-products.js", "utf8");

describe("render seguro de la categoría", () => {
  it("el registro de Categoria no cruza como objeto al componente cliente", () => {
    expect(PAGE).not.toContain("category={categoria}");
    expect(PAGE).toContain("categoryName={categoria?.nombre ?? null}");
    expect(PAGE).toContain('categoryDescription={categoria?.descripcion ?? ""}');
    expect(PAGE).toContain('categoryPhoto={categoria?.foto ?? ""}');
  });

  it("el componente consume texto y no renderiza el objeto de base", () => {
    expect(COMPONENT).toContain("categoryName = null");
    expect(COMPONENT).toContain('categoryDescription = ""');
    expect(COMPONENT).toContain('categoryPhoto = ""');
    expect(COMPONENT).toContain("category: categoryName");
    expect(COMPONENT).toContain("title: categoryName");
    expect(COMPONENT).toContain("imageAlt: categoryName");
    expect(COMPONENT).not.toContain("{category}");
    expect(COMPONENT).not.toContain("category.nombre");
    expect(COMPONENT).not.toContain("category.descripcion");
  });
});
