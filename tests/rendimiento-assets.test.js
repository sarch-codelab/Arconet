import { readFileSync, statSync, existsSync, globSync } from "node:fs";
import { describe, expect, it } from "vitest";

// La web se notaba lenta. Al medir en una build de producción, el problema no
// era el JavaScript (247 KB, sin tareas largas ni siquiera con la CPU 4 veces
// más lenta) sino los siguientes lastres:
//
//   1. El logo se pedía a 3840px (48 KB) para un hueco de 176px, porque el
//      `clamp()` del CSS impedía deducir el ancho. Y el PNG original (308 KB)
//      se precargaba en todas las páginas.
//   2. Un video en bucle se reproducía siempre, aunque no se estuviera mirando.
//   3. Siete PNG de hasta 3.9 MB (23.5 MB en total) seguían en public/ sin que
//      nadie los usara, y un .bak de 1400 líneas estaba versionado.
//
// Este archivo evita que vuelvan.

const raiz = process.cwd();
const APP = globSync("app/**/*.js", { cwd: raiz });
const CSS = globSync("app/**/*.css", { cwd: raiz });
const leer = (f) => readFileSync(f, "utf8");
const todosApp = APP.map(leer).join("\n");
const todosCss = CSS.map(leer).join("\n");

describe("el logo se sirve al tamaño que se ve", () => {
  it("todas las apariciones declaran `sizes`", () => {
    // Cada <Image src="/arconet.png"> debe decir cuánto ocupa, o Next elige
    // la variante mayor del srcSet.
    const apariciones = [...todosApp.matchAll(/<Image[\s\S]{0,300}?arconet\.png[\s\S]{0,300}?\/>/g)];
    expect(apariciones.length).toBeGreaterThan(5);
    const sinSizes = apariciones.filter((m) => !m[0].includes("sizes="));
    expect(sinSizes).toEqual([]);
  });

  it("el CSS del logo no usa clamp()", () => {
    // Un ancho variable impide acotar el srcSet: Next no puede saber el tamaño
    // final y descarga la variante más grande.
    expect(todosCss).not.toMatch(/\.brand img\s*\{[^}]*width:\s*clamp\(/);
    expect(todosCss).not.toMatch(/\.heroLogoImg\s*\{[^}]*width:\s*clamp\(/);
  });

  it("el PNG original ya no es la imagen inicial grande", () => {
    // Se recodificó a 1200x200 y quedó en ~113 KB (antes 308 KB a 2172x362).
    const peso = statSync("public/arconet.png").size;
    expect(peso).toBeLessThan(160 * 1024);
  });

  it("no se precarga el logo en todas las páginas", () => {
    // Ese preload competía por el ancho de banda con la foto del hero.
    expect(leer("app/layout.js")).not.toContain('rel="preload" as="image" href="/arconet.png"');
  });
});

describe("las fuentes no se precargan donde no se utilizan", () => {
  it("sólo la fuente de texto conserva preload global", () => {
    const layout = leer("app/layout.js");
    const fuente = (nombre) => layout.match(new RegExp(`const ${nombre} = localFont\\(\\{([\\s\\S]*?)\\n\\}\\);`))?.[1] || "";
    // Nueva venta siempre usa Inter, pero no necesariamente la marca Orbitron
    // ni la variante itálica de Exo 2. Estas últimas se cargan bajo demanda.
    expect(fuente("inter")).not.toContain("preload: false");
    expect(fuente("orbitron")).toContain("preload: false");
    expect(fuente("exo2")).toContain("preload: false");
  });
});

describe("el beacon de Cloudflare no se inyecta en páginas privadas", () => {
  const RUTAS_PRIVADAS = [
    "/admin/:path*",
    "/panel-administrativo/:path*",
    "/login",
    "/recuperar",
    "/verificar",
    "/registro",
    "/cliente/:path*",
  ];
  it("marca el HTML privado como no cacheable y no transformable", async () => {
    const { default: config } = await import("../next.config.mjs");
    const rules = await config.headers();
    const privateRules = rules.filter(({ source }) => RUTAS_PRIVADAS.includes(source));
    expect(privateRules.map(({ source }) => source)).toEqual(RUTAS_PRIVADAS);
    for (const { headers } of privateRules) {
      expect(headers.find(({ key }) => key === "Cache-Control")?.value).toBe("private, no-store, no-transform");
    }
    // No convertir el sitio público en no-store ni desactivar sus optimizaciones.
    const general = rules.find(({ source }) => source === "/(.*)");
    expect(general.headers.some(({ key }) => key === "Cache-Control")).toBe(false);
  });
  it("no marca como privadas las páginas públicas que sí usan analítica", async () => {
    const { default: config } = await import("../next.config.mjs");
    const rules = await config.headers();
    const fuentes = rules.map(({ source }) => source);
    for (const publica of ["/tienda", "/contacto", "/terminos", "/garantias", "/ayuda", "/cookies", "/privacidad", "/aviso-legal"]) {
      expect(fuentes).not.toContain(publica);
      expect(fuentes).not.toContain(`${publica}/:path*`);
    }
  });
});

describe("no quedan archivos muertos en public/", () => {
  const sinUso = [
    "public/neto-manana.png",
    "public/neto-tarde.png",
    "public/neto-noche.png",
    "public/neto-servicio-cliente.png",
    "public/neto-pensando.png",
    "public/linea-1.png",
    "public/linea-2.png",
  ];

  it("las imágenes que nadie usaba están fuera", () => {
    const presentes = sinUso.filter((f) => existsSync(f));
    expect(presentes).toEqual([]);
  });

  it("no hay copias de respaldo versionadas", () => {
    expect(globSync("app/**/*.bak", { cwd: raiz })).toEqual([]);
  });

  it("no queda la lista de imágenes por hora del hero", () => {
    // TIME_IMAGES apuntaba a tres PNG de 1.6–3.9 MB que el hero ya no pinta.
    expect(leer("app/home-experience.js")).not.toContain("TIME_IMAGES");
  });
});

describe("las imágenes grandes piden la variante de su tamaño", () => {
  it("la foto de contacto declara sizes y carga diferida", () => {
    const contacto = leer("app/contacto/contact-experience.js");
    const img = contacto.match(/<Image[\s\S]{0,400}?neto-conducioendo\.png[\s\S]{0,400}?\/>/)?.[0] ?? "";
    expect(img).toContain("sizes=");
    expect(img).toContain('loading="lazy"');
  });

  it("la foto del hero mantiene su prioridad", () => {
    // Es la imagen que se ve al entrar: ahí `priority` sí está bien puesto.
    const home = leer("app/home-experience.js");
    expect(home).toMatch(/src="\/empresa\.webp"[\s\S]{0,200}?priority/);
  });
});
