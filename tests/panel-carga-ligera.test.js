import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { fotoComoUrl, galeriaComoUrls, huellaFoto, imagenDesdeValor, esDataUrl } from "../lib/imagenes";

// El panel tardaba en abrir. No era el servidor (cada API respondía en 10–40 ms)
// sino dos cosas:
//
//   1. Los listados devolvían las fotos completas. Están guardadas en la base
//      como data URL de hasta 200 KB, así que /api/productos pesaba 16.8 MB con
//      apenas 16 productos con imagen. El panel pide ese listado al entrar: en
//      una conexión normal se quedaba segundos cargando sin que el usuario
//      hubiera abierto siquiera Productos.
//   2. Al montar, el panel pedía siete listados a la vez -trabajadores,
//      productos, categorías, roles, sucursales, órdenes y clientes- aunque la
//      sección abierta fuera el Resumen, que no usa ninguno.
//
// Además, el carrito y la marca del panel (montados en el layout raíz y en el
// topbar) precargaban la home, la tienda y sus categorías: seis peticiones que
// nadie había pedido.
//
// Este archivo evita que vuelvan las tres cosas.

const raiz = process.cwd();
const leer = (f) => readFileSync(f, "utf8");

const PNG_1PX = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("las fotos no viajan dentro del JSON", () => {
  it("un listado cambia el data URL por la ruta que sirve la imagen", () => {
    const url = fotoComoUrl(PNG_1PX, "/api/productos/p-1/foto?v=abc");
    expect(url).toBe("/api/productos/p-1/foto?v=abc");
    expect(url.length).toBeLessThan(80);
    // El data URL original mide miles de caracteres: ese es el ahorro.
    expect(PNG_1PX.length).toBeGreaterThan(100);
  });

  it("respeta una ruta o URL que ya venía guardada", () => {
    expect(fotoComoUrl("/catalogo/fibra.jpg", "/api/productos/p-1/foto")).toBe("/catalogo/fibra.jpg");
    expect(fotoComoUrl("https://cdn.example.com/a.png", "/api/productos/p-1/foto")).toBe("https://cdn.example.com/a.png");
    expect(fotoComoUrl("", "/x")).toBe("");
    expect(fotoComoUrl(null, "/x")).toBe("");
  });

  it("la galería se sirve por el mismo endpoint, con su índice", () => {
    const galeria = galeriaComoUrls([PNG_1PX, "/catalogo/otra.jpg", PNG_1PX], "/api/productos/p-1/foto");
    expect(galeria).toEqual([
      "/api/productos/p-1/foto?i=0",
      "/catalogo/otra.jpg",
      "/api/productos/p-1/foto?i=2",
    ]);
  });

  it("la huella cambia cuando cambia la foto", () => {
    expect(huellaFoto(PNG_1PX)).not.toBe(huellaFoto(PNG_1PX + "A"));
    expect(huellaFoto(PNG_1PX)).toBe(huellaFoto(PNG_1PX));
    expect(huellaFoto("")).toBe("");
  });

  it("reconoce un data URL y descarta lo que no es una imagen", () => {
    expect(esDataUrl(PNG_1PX)).toBe(true);
    expect(esDataUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe(false);
    expect(esDataUrl("/catalogo/fibra.jpg")).toBe(false);
    expect(imagenDesdeValor("javascript:alert(1)")).toBeNull();
  });

  it("devuelve el tipo y los bytes de la imagen", () => {
    const imagen = imagenDesdeValor(PNG_1PX);
    expect(imagen.mime).toBe("image/png");
    expect(Buffer.from(imagen.cuerpo, "base64").subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});

describe("los listados entregan rutas, no imágenes", () => {
  const serialize = leer("lib/serialize.js");

  it("productos usa la versión ligera en el listado y conserva la completa en la ficha", () => {
    expect(serialize).toContain("export function toProductoParaListado");
    const ruta = leer("app/api/productos/route.js");
    expect(ruta).toContain("toProductoParaListado");
    // La ficha concreta sigue devolviendo la imagen para la vista previa.
    expect(leer("app/api/productos/[id]/route.js")).toContain("toProductoForRead");
  });

  it("clientes y trabajadores también listan con rutas", () => {
    expect(leer("app/api/clientes/route.js")).toContain("toClienteParaListado");
    expect(leer("app/api/trabajadores/route.js")).toContain("toTrabajadorParaListado");
  });

  it("cada listado tiene su endpoint de imagen", () => {
    for (const archivo of [
      "app/api/productos/[id]/foto/route.js",
      "app/api/clientes/[id]/foto/route.js",
      "app/api/trabajadores/[id]/foto/route.js",
    ]) {
      const ruta = leer(archivo);
      expect(ruta, archivo).toContain("requireSession");
      expect(ruta, archivo).toContain("respuestaImagenConEtag");
    }
  });

  it("la imagen se sirve cacheable y sin poder ejecutar nada", () => {
    const respuesta = leer("lib/imagen-respuesta.js");
    expect(respuesta).toContain("private, max-age");
    expect(respuesta).toContain("ETag");
    expect(respuesta).toContain("nosniff");
    expect(respuesta).toContain("sandbox");
  });

  it("sin `?i=` se sirve la foto principal, no la primera de la galería", () => {
    // Number(null) es 0: sin la guarda se leía la galería y el listado salía
    // con las iniciales en vez de la imagen.
    const ruta = leer("app/api/productos/[id]/foto/route.js");
    expect(ruta).toContain('searchParams.get("i")');
    expect(ruta).toContain("crudo === null");
  });
});

describe("el panel pide solo lo que la sección necesita", () => {
  const shell = leer("app/admin/admin-experience.js");

  it("ya no carga los siete listados al montar", () => {
    // Antes: siete llamadas seguidas en un único efecto sin condición.
    const montajeViejo = /load\("trabajadores:read"[\s\S]{0,600}?load\("clientes:read"/;
    expect(shell).not.toMatch(montajeViejo);
    expect(shell).toContain("NECESITA");
  });

  it("el Resumen no arrastra ningún listado", () => {
    const mapa = shell.slice(shell.indexOf("const NECESITA"), shell.indexOf("// Se elige todo lo pendiente"));
    const resumen = mapa.match(/const resumen[^\n]*/);
    // El Resumen no aparece en el mapa: tiene su propio endpoint agregado.
    expect(resumen).toBeNull();
  });

  it("cada sección declara sus recursos", () => {
    for (const seccion of ["clientes", "ventas", "inventario", "trabajadores", "categorias"]) {
      expect(shell, seccion).toContain(`${seccion}: [`);
    }
  });

  it("la carga no se cancela cuando React repite el montaje", () => {
    // Una bandera `active` en el cleanup descartaba la respuesta: en desarrollo
    // el efecto se ejecuta dos veces y la sección quedaba vacía ("Sin
    // clientes" con la base llena).
    const efecto = shell.slice(shell.indexOf("useEffect(() => {\n    // Sin bandera"), shell.indexOf("}, [section, session?.permisos, cargados]);"));
    expect(efecto).not.toContain("let active");
    expect(efecto).not.toContain("if (active)");
  });
});

describe("el panel no precarga el sitio público", () => {
  it("la marca del topbar y sus enlaces no precargan", () => {
    const topbar = leer("app/admin/topbar.js");
    const marca = topbar.match(/<Link prefetch=\{false\} href="\/" className=\{styles\.topbarBrand\}/);
    expect(marca).not.toBeNull();
    // Los dos enlaces del menú de cuenta también van sin precarga.
    expect(topbar.match(/prefetch=\{false\}/g).length).toBeGreaterThanOrEqual(3);
  });

  it("el carrito no precarga la tienda desde el panel", () => {
    const carrito = leer("app/cart-drawer.js");
    expect(carrito).toContain("panel-administrativo");
    expect(carrito).toContain("prefetch={precargar}");
    // En el sitio público la precarga se mantiene: ahí sí sirve.
    expect(carrito).not.toMatch(/usePathname\(\) \|\| "";\s*const precargar = false/);
  });
});

describe("no quedan copias de los datos pesados en el cliente", () => {
  it("el panel no recibe imágenes dentro de los listados", () => {
    const archivos = globSync("app/admin/*.js", { cwd: raiz }).map((f) => [f, leer(f)]);
    // Se permite leer `foto` (es una ruta) pero no construir data URL en el
    // listado: eso solo pasa en el editor al comprimir un archivo nuevo.
    const sospechosos = archivos.filter(([f, texto]) =>
      texto.includes("toDataURL") && !/image-utils|products-section|clientes-section|workers-section|perfil-section/.test(f),
    );
    expect(sospechosos.map(([f]) => f)).toEqual([]);
  });
});
