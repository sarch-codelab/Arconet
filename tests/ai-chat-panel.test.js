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
    expect(source).toContain('<AiOrb size={64} />');
    expect(source).toContain('aria-labelledby="ai-chat-title"');
    expect(source).toContain('aria-label="Nueva conversación"');
    expect(source).not.toMatch(/createPortal|useBodyScrollLock|aria-modal|inert/);
    expect(css).not.toMatch(/backdrop-filter|position: fixed/);
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
