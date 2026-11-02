import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const JS = readFileSync("app/cart-drawer.js", "utf8");
const CSS = readFileSync("app/cart.module.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("cierre suave y carga diferida del carrito", () => {
  it("la capa espera a que termine la salida antes de ocultarse", () => {
    const capa = CSS.match(/\.layer\s*\{([^}]*)\}/)?.[1] || "";
    const abierta = CSS.match(/\.layerOpen\s*\{([^}]*)\}/)?.[1] || "";
    const panel = CSS.match(/\.panel\s*\{([^}]*)\}/)?.[1] || "";

    expect(capa).toContain("visibility: hidden");
    expect(capa).toContain("pointer-events: none");
    expect(capa).toContain("transition: visibility 0s linear 380ms");
    expect(abierta).toContain("visibility: visible");
    expect(abierta).toContain("transition: visibility 0s linear 0s");
    expect(panel).toContain("transition: transform 380ms");
  });

  it("no descarga la configuración de contacto hasta abrir el carrito", () => {
    expect(JS).toContain("if (!isOpen || contactLoaded) return undefined;");
    expect(JS).toContain("setContactLoaded(true)");
    expect(JS).toContain("[isOpen, contactLoaded]");
  });
});
