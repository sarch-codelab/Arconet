import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";

// Las fotos del panel se guardaban en la base como data URL. Con 16 productos
// con imagen la columna `foto` pesaba 6,1 MB y cada listado arrastraba el
// contenido completo. Ahora el data URL se escribe una vez en disco y en la
// base queda solo su ruta (/media/<carpeta>/<archivo>); el nombre lleva un hash
// del contenido, así que la misma imagen no se duplica y se puede servir con
// caché inmutable.
//
// Este archivo comprueba el contrato del almacén: qué acepta, qué rechaza y
// cuándo borra.

const dir = mkdtempSync(path.join(tmpdir(), "arconet-media-"));
process.env.MEDIA_DIR = dir;

// El módulo lee MEDIA_DIR al importarse: hay que cargarlo después de fijarlo.
const { borrarImagen, guardarImagen, guardarImagenSiHaceFalta, esRutaGuardada, leerImagen, rutaEnDisco } = await import(
  "../lib/almacen-fotos.js"
);

// PNG generado aquí mismo para no depender de archivos del repo.
function png(lado, semilla) {
  const crudo = Buffer.alloc((lado * 3 + 1) * lado);
  for (let y = 0; y < lado; y += 1) {
    crudo[y * (lado * 3 + 1)] = 0;
    for (let x = 0; x < lado; x += 1) {
      const o = y * (lado * 3 + 1) + 1 + x * 3;
      crudo[o] = (x * semilla) % 256;
      crudo[o + 1] = (y * semilla) % 256;
      crudo[o + 2] = (x + y) % 256;
    }
  }
  const bloque = (tipo, datos) => {
    const largo = Buffer.alloc(4);
    largo.writeUInt32BE(datos.length);
    const t = Buffer.from(tipo);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(Buffer.concat([t, datos])) >>> 0);
    return Buffer.concat([largo, t, datos, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0);
  ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8; // bits por canal
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloque("IHDR", ihdr),
    bloque("IDAT", zlib.deflateSync(crudo, { level: 9 })),
    bloque("IEND", Buffer.alloc(0)),
  ]);
}

const dataUrl = (bytes) => `data:image/png;base64,${bytes.toString("base64")}`;
const enDisco = (ruta) => {
  const [, , carpeta, archivo] = ruta.split("/");
  return rutaEnDisco(carpeta, archivo);
};

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("el almacén escribe la foto en disco y devuelve su ruta", () => {
  it("guarda una imagen y la deja legible en /media", async () => {
    const ruta = await guardarImagen({ carpeta: "productos", dataUrl: dataUrl(png(120, 7)), base: "SKU-1" });
    expect(ruta).toMatch(/^\/media\/productos\/sku-1-[0-9a-f]{16}\.png$/);
    expect(existsSync(enDisco(ruta))).toBe(true);
    // Una ruta corta, no un data URL de cientos de KB.
    expect(ruta.length).toBeLessThan(60);
  });

  it("la misma imagen dos veces da el mismo archivo (no duplica)", async () => {
    const imagen = dataUrl(png(90, 3));
    const primera = await guardarImagen({ carpeta: "productos", dataUrl: imagen, base: "REPE" });
    const segunda = await guardarImagen({ carpeta: "productos", dataUrl: imagen, base: "REPE" });
    expect(segunda).toBe(primera);
  });

  it("una imagen distinta con el mismo nombre base ocupa otro archivo", async () => {
    const a = await guardarImagen({ carpeta: "productos", dataUrl: dataUrl(png(64, 2)), base: "MISMO" });
    const b = await guardarImagen({ carpeta: "productos", dataUrl: dataUrl(png(64, 5)), base: "MISMO" });
    expect(a).not.toBe(b);
    expect(statSync(enDisco(a)).size).not.toBe(statSync(enDisco(b)).size);
  });

  it("una ruta que ya es del almacén se respeta (editar sin tocar la foto)", async () => {
    const ruta = await guardarImagen({ carpeta: "productos", dataUrl: dataUrl(png(50, 9)), base: "EDIT" });
    expect(await guardarImagen({ carpeta: "productos", dataUrl: ruta, base: "EDIT" })).toBe(ruta);
    // Una URL externa tampoco se descarga ni se reescribe.
    expect(await guardarImagen({ carpeta: "productos", dataUrl: "https://cdn.example.com/x.png", base: "X" })).toBe(
      "https://cdn.example.com/x.png",
    );
  });

  it("se puede leer de vuelta para servirla", async () => {
    const ruta = await guardarImagen({ carpeta: "clientes", dataUrl: dataUrl(png(30, 6)), base: "L-1" });
    const leida = await leerImagen("clientes", ruta.split("/").pop());
    expect(leida?.mime).toBe("image/png");
    expect(leida?.bytes.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });
});

describe("el almacén rechaza lo que no es una imagen utilizable", () => {
  it("no acepta texto ni un data URL que no sea de imagen", async () => {
    await expect(guardarImagen({ carpeta: "productos", dataUrl: "hola" })).rejects.toThrow();
    await expect(
      guardarImagen({ carpeta: "productos", dataUrl: "data:text/html;base64,PGgxPmhvbGE8L2gxPg==" }),
    ).rejects.toThrow();
  });

  it("rechaza un archivo cuya firma no es de imagen (aunque diga image/png)", async () => {
    const falso = `data:image/png;base64,${Buffer.from("<script>alert(1)</script>").toString("base64")}`;
    await expect(guardarImagen({ carpeta: "productos", dataUrl: falso })).rejects.toThrow(/no es válida/i);
  });

  it("rechaza pasarse del tope de tamaño", async () => {
    const enorme = `data:image/png;base64,${Buffer.concat([png(20, 1), Buffer.alloc(500 * 1024, 1)]).toString("base64")}`;
    await expect(guardarImagen({ carpeta: "productos", dataUrl: enorme })).rejects.toThrow(/400 KB/);
  });

  it("rechaza una carpeta que no existe en el almacén", async () => {
    await expect(guardarImagen({ carpeta: "../fuera", dataUrl: dataUrl(png(20, 1)) })).rejects.toThrow(/carpeta/i);
  });
});

describe("las rutas del almacén no se pueden salir de su carpeta", () => {
  it("ignora los intentos de traversal", () => {
    expect(rutaEnDisco("productos", "../../package.json")).toBe(null);
    expect(rutaEnDisco("productos", "..")).toBe(null);
    expect(rutaEnDisco("productos", "/etc/passwd")).toBe(null);
    expect(rutaEnDisco("../", "a.png")).toBe(null);
  });

  it("solo reconoce el formato /media/<carpeta>/<archivo>", () => {
    expect(esRutaGuardada("/media/productos/a-1234567890abcdef.png")).toBe(true);
    expect(esRutaGuardada("/api/productos/p-1/foto")).toBe(false);
    expect(esRutaGuardada("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("borrar una foto no se lleva por delante nada más", () => {
  it("elimina el archivo y deja en paz los ajenos", async () => {
    const ruta = await guardarImagen({ carpeta: "clientes", dataUrl: dataUrl(png(40, 4)), base: "C-1" });
    expect(existsSync(enDisco(ruta))).toBe(true);
    await borrarImagen(ruta);
    expect(existsSync(enDisco(ruta))).toBe(false);
    // Borrar dos veces no es un error.
    await expect(borrarImagen(ruta)).resolves.toBeUndefined();
    // Una ruta del catálogo o externa no se toca.
    await expect(borrarImagen("/catalogo/fibra.jpg")).resolves.toBeUndefined();
    await expect(borrarImagen("https://cdn.example.com/x.png")).resolves.toBeUndefined();
  });
});

describe("un valor que puede venir guardado o nuevo", () => {
  it("deja pasar lo que ya está y convierte solo el data URL", async () => {
    const ruta = await guardarImagen({ carpeta: "trabajadores", dataUrl: dataUrl(png(25, 8)), base: "T-1" });
    expect(await guardarImagenSiHaceFalta({ carpeta: "trabajadores", valor: ruta, base: "T-1" })).toBe(ruta);
    const nueva = await guardarImagenSiHaceFalta({
      carpeta: "trabajadores",
      valor: dataUrl(png(28, 11)),
      base: "T-2",
    });
    expect(nueva).toMatch(/^\/media\/trabajadores\/t-2-/);
    expect(await guardarImagenSiHaceFalta({ carpeta: "trabajadores", valor: "", base: "T-3" })).toBe("");
  });
});

describe("el endpoint /media no mezcla lo público con lo privado", () => {
  it("las fotos de clientes, trabajadores y usuarios piden sesión", async () => {
    const fuente = readFileSync(path.join(process.cwd(), "app/media/[...ruta]/route.js"), "utf8");
    const privadas = /CARPETAS_PRIVADAS = new Set\(\[([^\]]+)\]\)/.exec(fuente)?.[1] ?? "";
    // Datos personales: nunca se sirven sin sesión.
    expect(privadas).toContain('"clientes"');
    expect(privadas).toContain('"trabajadores"');
    expect(privadas).toContain('"usuarios"');
    expect(fuente).toContain("requireSession");
    // Y su caché no se comparte con proxies.
    expect(fuente).toContain('"private, max-age=31536000, immutable"');
    // El catálogo de la tienda sí es público.
    expect(privadas).not.toContain('"productos"');
  });
});
