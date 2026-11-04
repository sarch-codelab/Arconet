import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { canAccessSection } from "@/lib/permisos";
import { resolveAdminSection } from "@/lib/admin-navigation";
const source = readFileSync("app/admin/ia-section.js", "utf8");
const css = readFileSync("app/admin/ia-section.module.css", "utf8");
describe("píldora IA administrativa", () => {
  it("permite navegar directamente y mantiene el control de otras secciones", () => {
    expect(canAccessSection([], "ia")).toBe(true);
    expect(canAccessSection([], "trabajadores")).toBe(false);
    expect(resolveAdminSection("https://example.test/admin?section=ia", [], "mi-perfil")).toBe("ia");
    expect(readFileSync("app/admin/admin-experience.js", "utf8")).toContain('section === "ia"');
  });
  it("monta el orbe en una sección integrada sin modal ni bloqueo de página", () => {
    expect(source).toContain('<AiOrb size={160} />');
    expect(source).toContain('aria-labelledby="ai-chat-title"');
    expect(source).toContain('aria-label="Nueva conversación"');
    expect(source).not.toMatch(/createPortal|useBodyScrollLock|aria-modal|inert/);
    expect(css).not.toMatch(/backdrop-filter|position: fixed/);
  });
  it("presenta a Monica IA y centra el orbe sobre el mensaje de bienvenida", () => {
    expect(source).toContain('<h2 id="ai-chat-title">Monica IA</h2>');
    expect(source).toContain('"Tú" : "Monica IA"');
    expect(source).not.toContain('"Arconet IA"');
    const header = source.slice(source.indexOf("<header"), source.indexOf("</header>"));
    expect(header).not.toContain("<AiOrb");
    const welcome = source.slice(source.indexOf("!messages.length"));
    expect(welcome.indexOf("<AiOrb")).toBeLessThan(welcome.indexOf("¿Qué tienes"));
    expect(css).toMatch(/\.welcome\s*\{[^}]*text-align: center/);
    expect(css).toMatch(/\.welcomeOrb\s*\{[^}]*justify-content: center/);
    expect(readFileSync("app/api/ai/chat/route.js", "utf8")).toContain("Te llamas Monica IA");
  });
  it("amplía el orbe y añade la firma solicitada debajo con Orbitron local", () => {
    expect(source).toContain('<AiOrb size={160} />');
    expect(source).toContain('<p className={styles.orbName}>Monica IA</p>');
    expect(source.indexOf('<AiOrb size={160}')).toBeLessThan(source.indexOf('className={styles.orbName}'));
    expect(css).toContain('font-family: var(--font-display)');
    expect(css).not.toContain('@import');
    expect(readFileSync('app/layout.js', 'utf8')).toContain('orbitron-latin-wght-normal.woff2');
  });
  it("mantiene la conexión privada, aviso y reinicio con cancelación", () => {
    expect(source).toContain('fetch("/api/ai/chat"');
    expect(source).toContain("pending.current?.abort()");
    expect(source).toContain('role="alert"');
    expect(source).toContain("{message.content}");
    expect(source).toContain("setMessages([])");
    expect(source).toContain("se borra al salir de esta sección");
    expect(source).not.toMatch(/NVIDIA_API_KEY|nvapi-|localStorage|dangerouslySetInnerHTML/);
  });
});
