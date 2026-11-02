import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../lib/api-fetch", () => ({
  clientApiFetch: vi.fn(),
  rememberLocalPreviewSession: vi.fn(),
}));
vi.mock("../app/toaster", () => ({ sileo: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../lib/local-preview", () => ({ isLocalPreview: () => false }));
vi.mock("../app/mobile-site-menu", () => ({ default: () => null }));
vi.mock("../app/footer", () => ({ default: () => null }));

import LoginExperience from "../app/login/login-experience";

const source = readFileSync("app/login/login-experience.js", "utf8");
const css = readFileSync("app/admin/admin-experience.module.css", "utf8");
const html = renderToStaticMarkup(createElement(LoginExperience));

describe("acceso de clientes con el fondo y vidrio compartidos", () => {
  it("retira el antiguo panel visual y usa la tarjeta centrada del acceso administrativo", () => {
    expect(source).toContain('import styles from "../admin/admin-experience.module.css"');
    expect(source).not.toContain('import Image from "next/image"');
    expect(source).not.toContain("loginVisual");
    expect(source).not.toContain("infraestructura.jpg");
    expect(source).not.toContain("logoTab");
    expect(html).not.toContain("Tus proyectos");
    expect(html).toContain("Formulario de acceso");
    expect(html).toContain("Bienvenido");
    expect(html).toContain("de nuevo.");
  });

  it("conserva los campos, la autenticación de clientes y todos sus enlaces", () => {
    for (const text of [
      "Correo electrónico", "Contraseña", "Recordarme",
      "¿Olvidaste tu contraseña?", "Ingresar a mi cuenta", "Crea una aquí",
      "Solicitar acceso corporativo", "Términos de uso", "Privacidad", "Ayuda",
    ]) expect(html).toContain(text);
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
    for (const href of ["/recuperar", "/registro", "/contacto", "/terminos", "/privacidad", "/ayuda"]) {
      expect(html).toContain(`href="${href}"`);
    }
    expect(source).toContain('fetch("/api/cliente-auth/login"');
    expect(source).toContain("recordarme: remember");
    expect(source).toContain('router.push("/cliente")');
    expect(source).toContain("styles.clientLoginSubmit");
    expect(css).toMatch(/\.loginPanelBody \.clientLoginSubmit\s*\{[^}]*white-space: nowrap;/);
  });

  it("mantiene la navegación pública y el footer fuera del fondo a pantalla completa", () => {
    expect(source).toContain("<MobileSiteMenu floating />");
    expect(source.indexOf("<Footer />")).toBeGreaterThan(source.indexOf("</main>"));
  });
});
