import { readFileSync, existsSync, globSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Hay un solo pie de página y se usa en todas partes.
//
// Antes cada pantalla montaba su propio cierre: el home tenía cuatro columnas
// planas con todo el texto gris, las páginas legales repetían otra versión y el
// acceso, el registro y el portal de cliente simplemente terminaban en seco.
// Ahora `app/footer.js` es el único footer del sitio y las páginas lo importan
// en vez de copiarlo.
//
// Este archivo evita que vuelvan las copias.

const raiz = process.cwd();
const leer = (f) => readFileSync(f, "utf8");
const APP = globSync("app/**/*.js", { cwd: raiz }).map((f) => [f, leer(f)]);

// Páginas y experiencias que deben cerrar con el footer.
const CON_FOOTER = [
  // Home
  "app/home-experience.js",
  // Acceso
  "app/login/login-experience.js",
  "app/registro/registro-experience.js",
  "app/recuperar/recuperar-experience.js",
  // Portal de cliente
  "app/cliente/cliente-experience.js",
  // Tienda y fichas
  "app/tienda/catalogo-experience.js",
  "app/tienda/categoria/[slug]/category-products.js",
  "app/tienda/[slug]/product-detail.js",
  "app/tienda/producto/[id]/product-page.js",
  // Contenido y legales
  "app/contacto/contact-experience.js",
  "app/ayuda/page.js",
  "app/garantias/page.js",
  "app/privacidad/page.js",
  "app/cookies/page.js",
  "app/aviso-legal/page.js",
  "app/terminos/terminos-experience.js",
  "app/not-found-experience.js",
];

describe("el footer es uno solo", () => {
  it("existe un único componente de footer", () => {
    expect(existsSync("app/footer.js")).toBe(true);
    expect(existsSync("app/footer.module.css")).toBe(true);

    // Cualquier otro archivo que se llame footer sería una copia.
    const copias = APP.map(([f]) => f).filter((f) => /\/footer[^/]*\.(js|css)$/.test(f) && f !== "app/footer.js" && f !== "app/footer.module.css");
    expect(copias).toEqual([]);
  });

  it("nadie escribe un <footer> propio con enlaces sueltos", () => {
    // Un pie de página copiado se reconoce por llevar enlaces dentro. Los demás
    // <footer> del proyecto son barras de acciones de un modal o del selector
    // de sucursal: texto y botones, sin navegación.
    const bloques = (texto) => {
      const salida = [];
      let i = texto.indexOf("<footer");
      while (i !== -1) {
        const fin = texto.indexOf("</footer>", i);
        salida.push(texto.slice(i, fin === -1 ? i + 800 : fin));
        i = texto.indexOf("<footer", i + 7);
      }
      return salida;
    };

    const copias = APP.filter(([f, texto]) => f !== "app/footer.js" && bloques(texto).some((b) => b.includes("<Link")));
    expect(copias.map(([f]) => f)).toEqual([]);
  });
});

describe("el footer llega a todas las páginas que lo necesitan", () => {
  it("importan el componente compartido", () => {
    const faltan = CON_FOOTER.filter((ruta) => {
      const archivo = APP.find(([f]) => f === ruta);
      return !archivo || !/import Footer from "\.\.?\/.*footer"/.test(archivo[1]);
    });
    expect(faltan).toEqual([]);
  });

  it("lo montan en el marcado", () => {
    const sinMontar = CON_FOOTER.filter((ruta) => {
      const archivo = APP.find(([f]) => f === ruta);
      return !archivo || !archivo[1].includes("<Footer />");
    });
    expect(sinMontar).toEqual([]);
  });

  it("no se cuela en el panel de administración", () => {
    // El admin es una herramienta de trabajo a pantalla completa: no lleva el
    // footer público, igual que no lleva el menú del sitio.
    const admin = APP.filter(([f]) => f.startsWith("app/admin/") && f.endsWith(".js"));
    const conFooter = admin.filter(([, texto]) => texto.includes("<Footer />"));
    expect(conFooter.map(([f]) => f)).toEqual([]);
  });
});

describe("el footer no se rompe en las pantallas que lo reciben", () => {
  it("va fuera del <main> flexible del acceso y del portal", () => {
    // `loginPage` es display:flex en fila para que la tarjeta ocupe la
    // pantalla. Un <Footer /> dentro de ese main entraba como tercera columna
    // y salía deformado (1055 px de alto en una franja de 400).
    for (const ruta of [
      "app/login/login-experience.js",
      "app/registro/registro-experience.js",
      "app/recuperar/recuperar-experience.js",
      "app/cliente/cliente-experience.js",
    ]) {
      const [, texto] = APP.find(([f]) => f === ruta);
      const cierre = texto.lastIndexOf("</main>");
      const footer = texto.lastIndexOf("<Footer />");
      expect(footer, ruta).toBeGreaterThan(cierre);
    }
  });

  it("el componente se puede usar en el cliente", () => {
    // Usa useContact() y los iconos de lucide: necesita "use client" o Next
    // falla al montarlo desde un componente de servidor.
    expect(leer("app/footer.js").startsWith('"use client"')).toBe(true);
  });
});
