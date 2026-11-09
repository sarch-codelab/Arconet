import { existsSync, readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Al dar clic en uno de los 6 «Productos destacados» de /catalogo se abre una
// ficha propia con la estructura de la referencia (galería, precio, cantidad,
// botones de compra, confianza, pestañas, tabla y relacionados), adaptada a los
// equipos de Arconet. Son fichas editoriales: NO son artículos de la BD.

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo/ficha/fusionadora",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import nextConfig from "../next.config.mjs";
import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { PRODUCTS } from "../app/catalogo/vitrina-data";
import {
  CONFIANZA_FICHA,
  FICHA_BASE,
  FICHA_SLUGS,
  FICHAS,
  NOTA_PRECIOS,
  TABS_FICHA,
  formatearPrecio,
  rutaFicha,
} from "../app/catalogo/ficha-data";
import FichaProducto from "../app/catalogo/ficha/[slug]/ficha-producto";

const DIRECTORIO = "app/catalogo/ficha/[slug]";
const PAGINA = `${DIRECTORIO}/page.js`;
const COMPONENTE = `${DIRECTORIO}/ficha-producto.js`;
const CSS = `${DIRECTORIO}/ficha-producto.module.css`;
const DOCS = "docs/catalogo-vitrina.md";
const leer = (ruta) => readFileSync(ruta, "utf8");
const CONTACTO = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };

const producto = PRODUCTS[0];
const ficha = FICHAS.fusionadora;
const html = renderToStaticMarkup(
  createElement(ContactProvider, { contact: CONTACTO },
    createElement(CartProvider, null,
      createElement(FichaProducto, {
        producto,
        ficha,
        relacionados: PRODUCTS.slice(1, 6).map((item) => ({
          id: item.id,
          name: item.name,
          image: item.image,
          line: item.line,
          precio: FICHAS[item.id].precio,
          precioAnterior: FICHAS[item.id].precioAnterior,
        })),
      })
    )
  )
);

describe("los 6 productos destacados abren una ficha propia", () => {
  it("hay una ficha por producto y todas apuntan a /catalogo/ficha/[slug]", () => {
    expect(FICHA_BASE).toBe("/catalogo/ficha");
    expect(FICHA_SLUGS).toEqual(PRODUCTS.map((item) => item.id));
    expect(FICHA_SLUGS).toHaveLength(6);
    for (const item of PRODUCTS) {
      expect(item.href, item.id).toBe(rutaFicha(item.id));
    }
    const vitrina = renderToStaticMarkup(
      createElement(ContactProvider, { contact: CONTACTO },
        createElement(CartProvider, null, createElement(CatalogoExperience))
      )
    );
    for (const item of PRODUCTS) {
      expect(vitrina).toContain(`href="${rutaFicha(item.id)}"`);
    }
  });

  it("la ruta elegida no choca con el 301 heredado de /catalogo/producto/:slug", async () => {
    const origenes = (await nextConfig.redirects()).map((regla) => regla.source);
    // El 301 legacy se conserva: los enlaces guardados a fichas reales de
    // /tienda siguen funcionando. Por eso la ficha editorial vive en /ficha/.
    expect(origenes).toContain("/catalogo/producto/:slug");
    expect(origenes).not.toContain("/catalogo/ficha/:slug");
    expect(origenes).not.toContain("/catalogo/ficha/:path*");
    expect(leer(PAGINA)).toContain("dynamicParams = false");
    expect(leer(PAGINA)).toContain("generateStaticParams");
    expect(leer(PAGINA)).toContain("generateMetadata");
    expect(leer(PAGINA)).toContain("notFound()");
  });

  it("las demás tarjetas de /catalogo siguen enlazando a /tienda", () => {
    const datos = leer("app/catalogo/vitrina-data.js");
    expect(datos.match(/href: "\/tienda/g)?.length || 0).toBeGreaterThan(15);
    for (const ruta of ["/tienda", "/tienda/categoria/componentes-pasivos"]) {
      expect(datos).toContain(ruta);
    }
  });
});

describe("la ficha es editorial y no inventa artículos en la base de datos", () => {
  it("precios y especificaciones son de referencia y se avisa en pantalla", () => {
    expect(NOTA_PRECIOS).toContain("referencia");
    expect(html).toContain(NOTA_PRECIOS);
    expect(html).toContain(formatearPrecio(ficha.precio));
    expect(formatearPrecio(42800)).toMatch(/^L [\d,]+$/);
    expect(leer(COMPONENTE)).toContain("carrito global es de COTIZACIÓN");
    expect(leer(COMPONENTE)).not.toContain("/api/productos");
    expect(leer(COMPONENTE)).not.toContain("fetch(");
    expect(leer(PAGINA)).not.toContain("prisma");
  });

  it("no copia los textos, marcas ni precios en dólares de la referencia", () => {
    const fuentes = `${leer(COMPONENTE)}\n${leer("app/catalogo/ficha-data.js")}`;
    for (const ajeno of ["SoundWave", "AirPods", "Pick a Color", "Buy Now", "Add to Cart", "$49.00", "Reviews"]) {
      expect(fuentes, ajeno).not.toContain(ajeno);
    }
    expect(html).not.toMatch(/\$\s?\d/);
    expect(html).toContain("Disponibilidad a confirmar");
  });

  it("cada ficha trae descripción, 3 presentaciones, 3 destacados y 6 filas de tabla", () => {
    for (const [slug, datos] of Object.entries(FICHAS)) {
      expect(datos.descripcion.length, slug).toBeGreaterThan(80);
      expect(datos.destacados, slug).toHaveLength(3);
      expect(datos.presentaciones, slug).toHaveLength(3);
      expect(datos.especificaciones, slug).toHaveLength(6);
      expect(datos.galeria, slug).toHaveLength(4);
      expect(datos.precio, slug).toBeGreaterThan(0);
      for (const fila of datos.especificaciones) {
        for (const clave of ["nombre", "detalle", "extra", "observacion"]) {
          expect(fila[clave], `${slug}/${fila.nombre}`).toBeTruthy();
        }
      }
    }
    expect(TABS_FICHA.map((t) => t.id)).toEqual(["descripcion", "especificaciones", "envio"]);
    expect(CONFIANZA_FICHA).toHaveLength(3);
  });

  it("las 24 imágenes de galería existen y las miniaturas son recortes WebP", () => {
    let webp = 0;
    for (const datos of Object.values(FICHAS)) {
      for (const imagen of datos.galeria) {
        const ruta = `public${imagen}`;
        expect(existsSync(ruta), ruta).toBe(true);
        expect(statSync(ruta).size, ruta).toBeGreaterThan(1000);
        if (imagen.endsWith(".webp")) {
          webp += 1;
          const bytes = readFileSync(ruta);
          expect(bytes.subarray(0, 4).toString("ascii"), ruta).toBe("RIFF");
          expect(bytes.subarray(8, 12).toString("ascii"), ruta).toBe("WEBP");
        }
      }
    }
    expect(webp).toBe(18);
  });
});

describe("la ficha trae toda la estructura en el primer HTML", () => {
  it("galería, precio, presentación, cantidad y botones de compra", () => {
    expect(html).toContain(producto.name);
    expect(html).toContain("Vistas del equipo");
    expect(html.match(/Ver vista \d de 4/g)).toHaveLength(4);
    expect(html).toContain("Presentación:");
    expect(html).toContain("Quitar una unidad");
    expect(html).toContain("Agregar una unidad");
    expect(html).toContain("Comprar ahora");
    expect(html).toContain("Agregar al carrito");
    expect(html).toContain("Abrir carrito de cotización");
    expect(html).toContain("Línea recomendada por instaladores");
    expect(html).toContain("Volver al catálogo");
  });

  it("pestañas con la tabla de especificaciones ya renderizada", () => {
    expect(html).toContain('role="tablist"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain("Especificación");
    expect(html).toContain("Más información");
    expect(html).toContain("Observaciones");
    expect(html).toContain("Fusión por arco eléctrico");
    expect(html).toContain('role="tabpanel"');
  });

  it("beneficios, relacionados y sus flechas", () => {
    for (const item of CONFIANZA_FICHA) expect(html).toContain(item.titulo);
    expect(html).toContain("También te puede servir");
    expect(html).toContain("Relacionados anteriores");
    expect(html).toContain("Relacionados siguientes");
    expect(html.match(/href="\/catalogo\/ficha\//g)).toHaveLength(5);
    expect(html).toContain("prod-otdr.jpg");
  });

  it("no intercepta la rueda y no añade un pie de página propio", () => {
    const js = leer(COMPONENTE);
    expect(js).not.toMatch(/onWheel|onTouch|addEventListener\(\s*["']wheel/);
    expect(js).not.toContain("<footer");
    expect(js).not.toContain("useRouter");
  });
});

describe("la ficha conserva el azul de Arconet y es responsive", () => {
  it("usa el acento azul, modo oscuro y tres cortes de pantalla", () => {
    const css = leer(CSS);
    expect(css).toContain("--accent: #1544b5;");
    expect(css).toContain("--accent-dark: #11358f;");
    expect(css).toContain(':global(html[data-theme="dark"]) .page');
    expect(css).toContain("--accent-ink: #7fa6ff;");
    for (const corte of ["max-width: 900px", "max-width: 620px"]) {
      expect(css).toContain(`@media (${corte})`);
    }
    for (const rojo of ["#e11b22", "#bd151b"]) expect(css).not.toContain(rojo);
    // El contrato global de animaciones enumera los únicos CSS con reduce.
    expect(css).not.toContain("prefers-reduced-motion");
    expect(css).not.toContain("@keyframes");
  });

  it("la documentación explica la ruta, los precios de referencia y el carrito", () => {
    const docs = leer(DOCS);
    expect(docs).toContain("/catalogo/ficha/[slug]");
    expect(docs).toContain("precios de referencia");
    expect(docs).toContain("cotización");
  });
});
