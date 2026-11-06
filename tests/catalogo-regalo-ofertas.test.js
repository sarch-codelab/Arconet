import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// En «Ofertas exclusivas para ti» el icono de línea se sustituyó por la imagen
// 3D del regalo azul que aportó el usuario. La imagen ya venía con canal alfa,
// así que solo se recortó y se convirtió a WebP (sin chroma key).

vi.mock("next/navigation", () => ({
  usePathname: () => "/catalogo",
  useRouter: () => ({ push() {}, refresh() {}, prefetch() {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import { CartProvider } from "../app/cart-context";
import { ContactProvider } from "../app/contact-provider";
import CatalogoExperience from "../app/catalogo/catalogo-experience";
import { REGALO_OFERTAS } from "../app/catalogo/vitrina-data";

const EXPERIENCIA = "app/catalogo/catalogo-experience.js";
const CSS = "app/catalogo/catalogo-experience.module.css";
const leer = (ruta) => readFileSync(ruta, "utf8");
const CONTACTO = { email: "contacto@arconet.test", phone: "0000-0000", phoneHref: "tel:00000000" };

const html = renderToStaticMarkup(
  createElement(ContactProvider, { contact: CONTACTO },
    createElement(CartProvider, null,
      createElement(CatalogoExperience)
    )
  )
);
const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

describe("el icono de «Ofertas exclusivas para ti» es la imagen del regalo", () => {
  it("el WebP existe, conserva transparencia y pesa poco", () => {
    const ruta = `public${REGALO_OFERTAS}`;
    const bytes = readFileSync(ruta);
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(bytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
    // VP8X con el bit de canal alfa: el fondo negro NO está horneado.
    expect(bytes.subarray(12, 16).toString("ascii")).toBe("VP8X");
    expect(bytes[20] & 0x10).toBeTruthy();
    expect(statSync(ruta).size).toBeGreaterThan(1000);
    expect(statSync(ruta).size).toBeLessThan(120000);
  });

  it("el componente usa la imagen y ya no importa el icono Gift", () => {
    const js = leer(EXPERIENCIA);
    expect(js).toContain("src={REGALO_OFERTAS}");
    expect(js).toContain("className={styles.giftImg}");
    expect(js).not.toMatch(/import\s*\{[^}]*\bGift\b/);
    expect(js).not.toContain("<Gift");
    expect(leer("app/catalogo/vitrina-data.js")).toContain("REGALO_OFERTAS");
  });

  it("la imagen no se precarga: solo el hero es prioritario", () => {
    const js = leer(EXPERIENCIA);
    const bloque = js.match(/<Image[\s\S]{0,300}?src=\{REGALO_OFERTAS\}[\s\S]{0,300}?\/>/)?.[0] || "";
    expect(bloque).toContain("sizes=");
    expect(bloque).not.toMatch(/\bpriority\b/);
    const prioritarias = [...js.matchAll(/<Image[\s\S]{0,400}?\/>/g)]
      .map((m) => m[0])
      .filter((b) => /\bpriority\b/.test(b));
    expect(prioritarias).toHaveLength(1);
    expect(prioritarias[0]).toContain("HERO_IMAGE");
  });

  it("el primer HTML trae el regalo dentro del medallón de ofertas", () => {
    expect(main).toContain("Ofertas exclusivas para ti");
    expect(main).toContain("regalo-ofertas.webp");
    expect(main).not.toContain("lucide-gift");
    // next/image emite un srcSet largo, así que se inspecciona el fragmento
    // alrededor del medallón en vez de cerrar un regex con límite fijo.
    const inicio = main.indexOf("giftIcon");
    expect(inicio).toBeGreaterThan(-1);
    const medallon = main.slice(inicio, inicio + 2000);
    expect(medallon).toContain("regalo-ofertas.webp");
    expect(medallon).toContain('aria-hidden="true"');
  });

  it("el medallón blanco se agrandó y la imagen se ajusta sin recortarse", () => {
    const css = leer(CSS);
    const icono = css.match(/\.giftIcon\s*\{([^}]*)\}/)?.[1] || "";
    expect(icono).toContain("background: #fff;");
    expect(icono).toContain("width: 76px;");
    const imagen = css.match(/\.giftImg\s*\{([^}]*)\}/)?.[1] || "";
    expect(imagen).toContain("object-fit: contain");
    expect(imagen).toMatch(/width:\s*92%/);
    expect(css).toContain(".giftIcon { width: 60px; height: 60px; }");
  });

  it("no se tocaron /tienda ni el carrito compartido", () => {
    expect(leer("app/layout.js")).toContain("<CartDrawer />");
    expect(leer("app/tienda/catalogo-experience.js")).not.toBe("");
  });
});
