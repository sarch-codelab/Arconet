import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("../app/toaster", () => ({ sileo: { show: vi.fn(), error: vi.fn(), success: vi.fn(), warning: vi.fn() } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import NuevaProducto from "../app/admin/productos/nuevo/nuevo-producto";
import ProductoEditor from "../app/admin/producto-editor";

const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

const administrativo = [
  "productos:read",
  "productos:write",
  "productos:delete",
  "precios:write",
  "inventario:read",
];

describe("página completa de nuevo producto", () => {
  it("con permiso para crear muestra página entera con el formulario completo", () => {
    const html = render(NuevaProducto, { session: { nombre: "Admin QA", permisos: administrativo } });
    expect(html).toContain("Nuevo producto · Catálogo");
    expect(html).toContain("Volver a Inventario");
    expect(html).toContain('aria-label="Nuevo producto · Catálogo"');
    expect(html).toContain("Agregar producto");
    // Campos que tenía la ventana emergente.
    expect(html).toContain("Subir imagen principal");
    expect(html).toContain("Agregar imágenes a galería");
    expect(html).toContain("Nombre del producto");
    expect(html).toContain("Código / SKU");
    expect(html).toContain("Código de barras");
    expect(html).toContain("Marca");
    expect(html).toContain("Categoría");
    expect(html).toContain("Unidad");
    expect(html).toContain("Precio");
    expect(html).toContain("Costo");
    expect(html).toContain("Stock");
    expect(html).toContain("Stock mínimo");
    expect(html).toContain("Garantía");
    expect(html).toContain("Ubicación");
    expect(html).toContain("Peso");
    expect(html).toContain("Descripción");
    // Página entera: nunca emergente.
    expect(html).not.toContain("<dialog");
  });

  it("sin permiso para crear muestra aviso y no monta el formulario", () => {
    const html = render(NuevaProducto, { session: { nombre: "Lectura", permisos: ["productos:read"] } });
    expect(html).toContain("No tienes permisos para crear productos y modificar precios.");
    expect(html).not.toContain("Nombre del producto");
    expect(html).not.toContain("Agregar producto");
  });
});

describe("ProductoEditor — formulario completo de producto", () => {
  const productoInicial = {
    id: "p1",
    nombre: "Caja de 40 pozos",
    sku: "CC-40P",
    codigoBarras: "7501234567890",
    marca: "Arconet",
    categoria: "Soluciones de Preconectorizado",
    unidad: "Caja",
    precio: "500",
    precioDescuento: "480",
    precioMayorista: "420",
    costo: "300",
    stock: "12",
    stockMinimo: "3",
    garantia: "2 años",
    ubicacion: "Bodega A",
    peso: "2.5",
    estado: "activo",
    descripcion: "Producto de ejemplo.",
  };

  it("mostrando los valores iniciales y el pie Cancelar / Agregar producto", () => {
    const html = render(ProductoEditor, {
      session: { nombre: "Admin QA", permisos: administrativo },
      initial: productoInicial,
      products: [],
      categorias: [],
    });
    expect(html).toContain("Agregar producto");
    expect(html).toContain("Cancelar");
    expect(html).toContain('value="Caja de 40 pozos"');
    expect(html).toContain('value="CC-40P"');
    expect(html).toContain('value="7501234567890"');
    expect(html).toContain('value="Arconet"');
    expect(html).toContain('value="500"');
    expect(html).toContain('value="300"');
    expect(html).toContain('value="12"');
    expect(html).toContain('value="Bodega A"');
    expect(html).toContain('value="2.5"');
    expect(html).toContain("Producto de ejemplo.");
  });

  it("en edición muestra Guardar cambios y los precios del nivel completo", () => {
    const html = render(ProductoEditor, {
      session: { nombre: "Admin QA", permisos: administrativo },
      initial: productoInicial,
      editing: true,
      products: [],
      categorias: [],
    });
    expect(html).toContain("Guardar cambios");
    expect(html).toContain("Descuento (L)");
    expect(html).toContain("Mayorista (L)");
  });

  it("sin permiso para precios no aparecen los cuadros Valor 1/2/3 y se avisas de la revisión", () => {
    const html = render(ProductoEditor, {
      session: { nombre: "Admin QA", permisos: ["productos:read", "productos:write"] },
      initial: productoInicial,
      products: [],
      categorias: [],
    });
    expect(html).not.toContain("Valor 1 · Normal");
    expect(html).not.toContain("Valor 2 · Descuento");
    expect(html).not.toContain("Valor 3 · Mayorista");
    expect(html).toContain("pendiente de revisión");
  });

  it("en edición de producto pendiente muestra el banner de revisión", () => {
    const html = render(ProductoEditor, {
      session: { nombre: "Admin QA", permisos: administrativo },
      initial: { ...productoInicial, precio: null },
      editing: true,
      products: [],
      categorias: [],
    });
    expect(html).toContain("pendiente de revisión");
    expect(html).toContain("falta el Valor 1");
  });

  it("ofrece como opciones las marcas, categorías y ubicaciones ya usadas", () => {
    const html = render(ProductoEditor, {
      session: { nombre: "Admin QA", permisos: administrativo },
      initial: { ...productoInicial, marca: "", ubicacion: "" },
      products: [
        { id: "a", marca: "Marca usada", ubicacion: "Ubicación usada" },
        { id: "b", marca: "Marca usada", ubicacion: "" },
      ],
      categorias: [{ id: "c1", nombre: "Categoría registrada", estado: "activo" }],
    });
    expect(html).toContain("Marca usada");
    expect(html).toContain("Ubicación usada");
    expect(html).toContain("Categoría registrada");
  });
});

describe("entrada a la página de nuevo producto", () => {
  const page = readFileSync("app/admin/productos/nuevo/page.js", "utf8");
  const section = readFileSync("app/admin/products-section.js", "utf8");

  it("la ruta es un servidor que valida sesión", () => {
    expect(page).not.toContain('"use client"');
    expect(page).toContain("getSession");
    expect(page).toContain('redirect("/login")');
    expect(page).toContain("LocalPreviewEntry");
  });

  it("la ruta adjunta los permisos del rol a la sesión (la cookie no los trae)", () => {
    expect(page).toContain("getPermisos");
    expect(page).toContain("permisos");
    // Sin esto, el cierre del cliente siempre ve [] y niega al administrador.
  });

  it("la ruta aplica la preferencia de tema del panel (AdminPreferences)", () => {
    expect(page).toContain("AdminPreferences");
    // Sin esto, al entrar desde el panel en tema oscuro la página sale en blanco.
  });

  it("el botón Nuevo producto abre la página completa, no una emergente", () => {
    expect(section).toContain('window.location.href = "/admin/productos/nuevo"');
  });

  it("la ventana emergente de edición se monta desde el ProductoEditor compartido", () => {
    expect(section).toContain("ProductoEditor");
    expect(section).toContain('data-drag-scroll=""');
  });
});

describe("alta y revisión de precio (bodega → gerente)", () => {
  const route = readFileSync("app/api/productos/route.js", "utf8");
  const patchRoute = readFileSync("app/api/productos/[id]/route.js", "utf8");

  it("el alta sin precio (rol bodega) nace pendiente de revisión", () => {
    expect(route).toContain('estado: sinPrecios ? "pendiente" : "activo"');
    expect(route).toContain("precioOpcional");
    expect(route).toContain("delete data.precio");
  });

  it("se notifica a gerente/administradores del producto pendiente", () => {
    expect(route).toContain("notificarProductoPendiente");
    expect(route).toContain('type: "producto"');
    expect(route).toContain('"gerente", "administrador"');
  });

  it("definir el Valor 1 en un producto pendiente lo publica", () => {
    expect(patchRoute).toContain('actual.estado === "pendiente"');
    expect(patchRoute).toContain('data: { estado: "activo" }');
  });
});
