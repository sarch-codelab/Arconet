import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("../app/mobile-site-menu", () => ({ default: () => null }));
vi.mock("../app/toaster", () => ({ sileo: { success: vi.fn(), error: vi.fn() } }));
import RegistroExperience from "../app/registro/registro-experience";

const login = readFileSync("app/login/login-experience.js", "utf8");
const recuperar = readFileSync("app/recuperar/recuperar-experience.js", "utf8");
const registro = readFileSync("app/registro/registro-experience.js", "utf8");
const registroCss = readFileSync("app/registro/registro-experience.module.css", "utf8");
const css = readFileSync("app/admin/admin-experience.module.css", "utf8");
const html = renderToStaticMarkup(createElement(RegistroExperience));

const ACCESOS = { login, recuperar, registro };

describe("accesos de clientes ajustados al viewport como /admin", () => {
  it("comparten la clase de ajuste sin adoptar la clase administrativa ni el QR", () => {
    for (const [nombre, source] of Object.entries(ACCESOS)) {
      expect(source, nombre).toContain("${styles.loginPage} ${styles.clientLoginPage}");
      expect(source, nombre).not.toContain("styles.adminLoginPage");
    }
    expect(css).toMatch(/\.clientLoginPage,\s*\.adminLoginPage\s*\{[^}]*height: 100dvh/);
    expect(css).toMatch(/\.clientLoginPage,\s*\.adminLoginPage\s*\{[^}]*overflow: hidden/);
    expect(css).toMatch(/\.clientLoginPage \.loginCard,\s*\.adminLoginPage \.loginCard\s*\{[^}]*max-height: 100%/);
    expect(css).toMatch(/\.clientLoginPage \.loginPanelBody,\s*\.adminLoginPage \.loginPanelBody\s*\{[^}]*justify-content: safe center[^}]*overflow-y: auto/);
    expect(css).toContain("@media (max-height: 600px)");
    expect(css).toContain(".adminLoginPage .loginPanelBody[data-qr-open] { overflow-y: hidden; }");
    expect(registro).toContain("${styles.loginPage} ${styles.clientLoginPage} ${styles.clientRegisterPage}");
    expect(css).toContain(".clientRegisterPage .loginCard { height: min(100%, 960px); }");
    expect(css).toContain(".clientRegisterPage .loginPanelBody { gap: 12px; }");
  });

  it("/registro usa la misma tarjeta única de /login y /admin, sin panel visual ni footer obsoleto", () => {
    expect(registro).toContain('import styles from "../admin/admin-experience.module.css"');
    for (const name of ["loginCard", "loginPanel", "loginPanelBody", "loginBrand", "clientLoginSubmit", "loginFooter"]) {
      expect(registro).toContain(`styles.${name}`);
    }
    for (const old of ["loginVisual", "logoTab", "styles.lead", "infraestructura.jpg", "<Footer", "import Footer", "import Image"]) {
      expect(registro).not.toContain(old);
    }
    expect(registroCss).not.toContain("min-height: 100%");
    expect(registroCss).not.toContain(":global(.checkbox)");
    expect(html).toContain('src="/arconet.png"');
    expect(html).toContain('alt="Arconet"');
    expect(html).not.toContain("infraestructura.jpg");
    expect(html).not.toContain("FIBRA ÓPTICA · CATV · TELECOMUNICACIONES");
  });

  it("/registro conserva todos sus campos, consentimiento, enlaces y alta de cuenta", () => {
    for (const value of [
      'name="name"', 'name="company"', 'name="email"', 'name="password"', 'name="confirm"',
      'name="acceptTerms"', "Nombre completo", "Empresa", "Correo electrónico",
      "Contraseña", "Confirmar contraseña", "Crear mi cuenta",
      "Acepto los términos y he leído el aviso de privacidad", "Usa al menos 12 caracteres",
      'href="/login"', 'href="/contacto"', 'href="/terminos"', 'href="/privacidad"',
      'href="/ayuda"', 'href="/"', 'aria-label="Formulario de registro"',
      "Solicita que habilitemos tu acceso", "¿Necesitas ayuda? Escríbenos",
    ]) expect(html).toContain(value);
    for (const value of [
      "/api/cliente-auth/registro", "validarPassword(password)", "password !== confirm",
      "!accepted", 'if (submitting) return;', 'disabled={submitting}',
      'role="alert"', "router.push(\"/verificar\")", "rememberLocalPreviewSession",
      "aceptaTerminos: accepted", "recordarme: true", "<MobileSiteMenu floating />",
    ]) expect(registro).toContain(value);
  });

  it("/recuperar conserva pasos, endpoints y protecciones con el nuevo ajuste", () => {
    for (const value of [
      "Pasos de la recuperación", "/api/cuenta/recuperar", "/api/cuenta/restablecer",
      "validarPassword(password)", "Enviar otro código", 'setStep("listo")',
      "Volver a iniciar sesión", "Crear una cuenta", "<MobileSiteMenu floating />",
    ]) expect(recuperar).toContain(value);
    expect(recuperar.match(/if \(submitting\) return;/g)).toHaveLength(2);
    for (const old of ["loginVisual", "<Footer", "infraestructura.jpg"]) expect(recuperar).not.toContain(old);
  });
});
