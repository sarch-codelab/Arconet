import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const raiz = process.cwd();
const leer = (...ruta) => readFileSync(join(raiz, ...ruta), "utf8");

const casa = leer("app", "home-experience.js");
const css = leer("app", "page.module.css");

describe("menú 1 (el del hero): Soluciones despliega", () => {
  it("Soluciones deja de ser un enlace plano y pasa a ser un botón", () => {
    const nav = casa.slice(casa.indexOf('aria-label="Navegación del hero"'));
    const bloque = nav.slice(0, nav.indexOf("</nav>"));
    expect(bloque).toContain("item.mega ?");
    expect(bloque).toContain("cardMegaTrigger");
    expect(bloque).toContain("aria-expanded={heroMenuOpen && heroMegaId === item.keyId}");
  });

  it("el panel se abre con estado propio, no solo con CSS", () => {
    expect(casa).toContain("const [heroMenuOpen, setHeroMenuOpen] = useState(false)");
    // Al pasar el mouse también debe abrir, como el menú 2. Va por el helper
    // que además cancela un cierre pendiente y evita que un roce lo abra de
    // golpe sin querer.
    expect(casa).toMatch(/onMouseEnter=\{\(event\) => abrirMenuHero\(item, event.currentTarget\)\}/);
  });

  it("el panel no se recorta con el overflow: hidden del hero", () => {
    // El hero recorta; un absoluto quedaría cortado, así que va en fixed.
    expect(css).toMatch(/\.heroCard\s*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.cardMegaPanel\s*\{[^}]*position:\s*fixed/);
  });

  it("se cierra con Escape y al hacer clic fuera", () => {
    expect(casa).toMatch(/setHeroMenuOpen\(false\)/);
    expect(casa).toContain("pointerdown");
  });

  it("el panel usa los grupos, acceso destacado, Login/Admin y legales del menú 1", () => {
    expect(casa).toContain("cardMegaGroups");
    const panel = casa.slice(casa.indexOf("{heroMenu.items.some((item) => item.mega) && heroPanelMounted"), casa.indexOf("{/* Dock de navegación secundaria"));
    for (const value of ["heroMenu.primary.label", "heroMenu.primary.description", "heroMenu.primary.href", "heroMenu.legal.map", 'href="/login"', 'href="/admin"']) expect(panel).toContain(value);
    expect(panel).not.toContain("dockMenu.");
  });

  it("el panel se mantiene dentro de la pantalla en cualquier ancho", () => {
    expect(casa).toMatch(/Math\.max\(16, Math\.min\(/);
    expect(casa).toContain("window.innerWidth - ancho - 16");
  });
});

describe("menú 1: logo, enlaces y botón Acceder", () => {
  it("los enlaces del hero escalan con la pantalla", () => {
    const nav = css.match(/\.cardCenterNav a\s*\{[^}]*\}/)?.[0] ?? "";
    expect(nav).toMatch(/font-size:\s*clamp\(13\.5px,\s*0\.95vw,\s*18px\)/);
  });

  it("el disparador de Soluciones mide igual que los enlaces", () => {
    const trig = css.match(/\.cardMegaTrigger\s*\{[^}]*\}/)?.[0] ?? "";
    expect(trig).toMatch(/font-size:\s*clamp\(13\.5px,\s*0\.95vw,\s*18px\)/);
  });

  it("el logo del hero tiene un ancho fijo para no pedir variantes enormes", () => {
    // Antes era clamp(): el navegador no podía deducir el ancho desde `sizes`
    // y descargaba la variante más grande disponible.
    expect(css).toMatch(/\.heroLogoImg\s*\{[^}]*width:\s*232px/);
    expect(casa).toContain('sizes="(max-width: 760px) 130px, 232px"');
  });

  it("la barra del hero crece en alto para que quepa el logo", () => {
    for (const sel of ["cardHeader", "cardLogoTab", "cardActionTab", "cardCenterNav"]) {
      expect(css).toMatch(
        new RegExp(`\\.${sel}\\s*\\{[^}]*height:\\s*clamp\\(72px,\\s*4\\.3vw,\\s*92px\\)`)
      );
    }
  });

  it("el botón Acceder del hero escala junto al resto", () => {
    const pill = css.match(/\.cardTopPill\s*\{[^}]*\}/)?.[0] ?? "";
    expect(pill).toMatch(/font-size:\s*clamp\(13px,\s*0\.9vw,\s*17px\)/);
    expect(css).toMatch(/\.cardTopPillIcon\s*\{[^}]*width:\s*clamp\(30px,\s*2vw,\s*40px\)/);
  });

  it("el botón Acceder es un button y no un enlace que navegue", () => {
    expect(casa).toMatch(/className=\{styles\.cardTopPill\}[\s\S]{0,120}aria-haspopup="true"/);
  });
});
