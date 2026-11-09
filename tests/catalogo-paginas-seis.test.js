import { describe, expect, it } from "vitest";
import { ELEMENTOS_POR_PAGINA, marcasDeTienda, paginaDe, productosDeTienda } from "../app/catalogo/vitrina-paginacion";
import { BRANDS, IDEAS, PRODUCTS } from "../app/catalogo/vitrina-data";

const item = (id, marca = "BEST", stock = 5) => ({
  id, nombre: `Equipo ${id}`, categoria: "Componentes pasivos", marca, stock, foto: "/catalogo/hero-fiber.jpg",
});

describe("páginas de seis en la vitrina", () => {
  it("divide los elementos sin repetir ni omitir y limita los extremos", () => {
    const lista = Array.from({ length: 14 }, (_, i) => i + 1);
    expect(ELEMENTOS_POR_PAGINA).toBe(6);
    expect(paginaDe(lista, 0)).toEqual({ actual: 0, totalPaginas: 3, elementos: [1, 2, 3, 4, 5, 6] });
    expect(paginaDe(lista, 1).elementos).toEqual([7, 8, 9, 10, 11, 12]);
    expect(paginaDe(lista, 99)).toEqual({ actual: 2, totalPaginas: 3, elementos: [13, 14] });
    expect(paginaDe(lista, -1).actual).toBe(0);
    expect(paginaDe([], 5)).toEqual({ actual: 0, totalPaginas: 1, elementos: [] });
    expect(paginaDe(lista.slice(0, 2), 2).actual).toBe(0);
  });

  it("usa referencias disponibles de la tienda y sus fichas reales, sin precios", () => {
    const datos = [item("a/b"), item("agotado", "BEST", 0), item("malo", "BEST", "Infinity"), { id: "sin-nombre", stock: 1 }];
    const productos = productosDeTienda(datos);
    expect(productos).toHaveLength(1);
    expect(productos[0]).toMatchObject({ name: "Equipo a/b", category: "pasivos", href: "/tienda/producto/a%2Fb", origen: "tienda" });
    expect(productos[0]).not.toHaveProperty("price");
    expect(productosDeTienda(null)).toEqual([]);
    expect(productosDeTienda([{ ...item("x"), foto: "//otro.example/foto" }])[0].image).toBe("/catalogo/hero-fiber.jpg");
  });

  it("solo agrega marcas presentes en productos con existencia, sin duplicados", () => {
    const datos = [item("1", "BEST"), item("2", " Best "), item("3", "Joinwit"), item("4", "Agotada", 0), item("5", "ASKA")];
    expect(marcasDeTienda(datos, BRANDS)).toEqual([
      { name: "BEST", logo: "", href: "/tienda/producto/1" },
      { name: "ASKA", logo: "", href: "/tienda/producto/5" },
    ]);
    expect(marcasDeTienda(null, BRANDS)).toEqual([]);
  });

  it("conserva las seis fichas originales y ofrece dos grupos de ideas", () => {
    expect(PRODUCTS).toHaveLength(6);
    expect(IDEAS).toHaveLength(12);
    expect(paginaDe(IDEAS, 0).elementos).toHaveLength(6);
    expect(paginaDe(IDEAS, 1).elementos).toHaveLength(6);
  });
});
