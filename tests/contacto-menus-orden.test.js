import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = path => readFileSync(path, "utf8");
const shared = read("app/public-site-navigation.js");
const contact = read("app/contacto/contact-experience.js");
const dock = read("app/nav-dock.js");
const css = read("app/nav-dock.module.css");

describe("orden y diseño de navegación en Contacto", () => {
  it("sitúa el menú 1 sobre el hero y conserva el menú 2 flotante", () => {
    expect(contact).toContain('<NavDock variant="hero" menuNumber={1} navigation={STORE_NAVIGATION} />');
    expect(contact.indexOf('<NavDock variant="hero"')).toBeLessThan(contact.indexOf('id="contacto-inicio"'));
    expect(shared).toContain('pathname !== "/contacto" && <NavDock variant="inline" menuNumber={1}');
    expect(shared).toContain('<NavDock variant="scroll" visible={scrolled} navigation={STORE_NAVIGATION} />');
    expect(shared).toContain('window.scrollY > 100');
    expect(contact).not.toContain('className={styles.logoTab}');
    expect(contact).toContain('href="#formulario"');
  });
  it("mantiene contenido compartido, apertura, cierre y acceso en el menú inicial", () => {
    expect(dock).toContain('useDockMenu(initialNavigation !== NAVIGATION, menuNumber)');
    expect(dock).toContain('const esHero = variant === "hero"');
    expect(dock).toContain('aria-expanded={heroMegaOpen && activeMega === item.keyId}');
    expect(dock).toContain('event.key === "Escape"');
    expect(dock).toContain('Ir a {item.label}');
    expect(dock).toContain('href="/login"');
    expect(dock).toContain('href="/admin"');
    expect(css).toContain('.topbarHero[data-hero-menu-open="true"] .desktopMenu');
    expect(css).toContain('.topbarHero .navigation > .megaTrigger { display: none; }');
  });
});
