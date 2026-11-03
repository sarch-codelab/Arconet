import { existsSync, readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../app/admin/workers-store", () => ({ authenticate: vi.fn() }));
vi.mock("../app/admin/admin-ui", () => ({ notifyError: vi.fn() }));
vi.mock("../lib/local-preview", () => ({ isLocalPreview: () => false }));

import LoginView from "../app/admin/login-view";

const source = readFileSync("app/admin/login-view.js", "utf8");
const css = readFileSync("app/admin/admin-experience.module.css", "utf8");
const html = renderToStaticMarkup(createElement(LoginView));

describe("acceso administrativo centrado en una sola columna", () => {
  it("retira por completo el panel visual y conserva únicamente el formulario", () => {
    expect(html).toContain("Formulario de acceso");
    expect(html).not.toContain("Gestiona a tu equipo");
    expect(html).not.toContain("infraestructura.jpg");
    expect(html).not.toContain("loginVisual");
    expect(html).not.toContain("logoTab");
    expect(css).not.toContain(".loginVisual");
    expect(css).not.toContain(".logoTab");
  });

  it("sustituye la etiqueta por el logo centrado y adaptable al tema", () => {
    const brandRule = css.match(/\.loginBrand\s*\{([^}]*)\}/)?.[1] || "";
    const imageRule = css.match(/(?:^|\n)\.loginBrand img\s*\{([^}]*)\}/)?.[1] || "";
    const darkRule = css.match(/:global\(html\[data-theme="dark"\]\) \.loginBrand img\s*\{([^}]*)\}/)?.[1] || "";

    expect(html).not.toContain("Iniciar sesión");
    expect(html).toContain('src="/arconet.png"');
    expect(html).toContain('alt="Arconet"');
    expect(source).toContain("className={styles.loginBrand}");
    expect(brandRule).toContain("justify-content: center");
    expect(brandRule).toContain("width: 100%");
    expect(imageRule).toContain("max-width: 100%");
    expect(imageRule).toContain("height: auto");
    expect(darkRule).toContain("filter: brightness(0) invert(1)");
  });

  it("mantiene los campos y acciones del lado derecho", () => {
    for (const text of [
      "Acceso", "administrativo.", "Correo electrónico", "Contraseña",
      "Recordarme", "¿Olvidaste tu contraseña?", "Entrar al panel", "Volver al inicio",
    ]) expect(html).toContain(text);
    expect(html).toContain('type="email"');
    expect(html).toContain('type="password"');
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('aria-label="Mostrar contraseña"');
    expect(html).toContain('href="/recuperar"');
  });

  it("centra la tarjeta con espacio en los cuatro lados y más margen horizontal", () => {
    const pageRule = [...css.matchAll(/\.loginPage\s*\{([^}]*)\}/g)]
      .map(match => match[1])
      .find(rule => rule.includes("display: flex"));
    const cardRule = css.match(/\.loginCard\s*\{([^}]*)\}/)?.[1] || "";

    expect(pageRule).toContain("justify-content: center");
    expect(pageRule).toContain("padding: clamp(24px, 6vh, 64px) clamp(32px, 10vw, 160px)");
    expect(cardRule).toContain("flex: 0 0 auto");
    expect(cardRule).toContain("width: min(100%, 560px)");
    expect(cardRule).toContain("margin: auto 0");
    expect(cardRule).not.toContain("grid-template-columns");
    expect(css).not.toMatch(/\.loginPage\s*\{\s*padding:\s*0/);
  });

  it("mantiene el título y los controles dentro de la columna del acceso", () => {
    const headingRule = css.match(/\.loginPanelBody h2\s*\{([^}]*)\}/)?.[1] || "";
    const loginFormRule = css.match(/\.loginPanelBody \.form\s*\{([^}]*)\}/)?.[1] || "";
    const sharedFormRule = css.match(/(?:^|\n)\.form\s*\{([^}]*)\}/)?.[1] || "";

    expect(headingRule).toContain("font-size: clamp(34px, 4vw, 48px)");
    expect(loginFormRule).toContain("padding-inline: 0");
    expect(sharedFormRule).toContain("padding: 20px 26px 24px");
    expect(css).toContain("font-size: clamp(30px, 9vw, 34px)");
  });

  it("muestra el fondo sin velos y aplica glassmorphism sólo a la tarjeta", () => {
    const pageRule = [...css.matchAll(/\.loginPage\s*\{([^}]*)\}/g)]
      .map(match => match[1])
      .find(rule => rule.includes("display: flex"));
    const cardRule = css.match(/\.loginCard\s*\{([^}]*)\}/)?.[1] || "";
    const panelRule = css.match(/\.loginPanel\s*\{([^}]*)\}/)?.[1] || "";
    const image = "public/admin-login-fondo.webp";

    expect(existsSync(image)).toBe(true);
    expect(statSync(image).size).toBeLessThan(256 * 1024);
    expect(pageRule).toContain('background-image: url("/admin-login-fondo.webp")');
    expect(pageRule).toContain("background-position: center");
    expect(pageRule).toContain("background-size: cover");
    expect(pageRule).not.toContain("linear-gradient");
    expect(css).not.toMatch(/\.loginPage::(?:before|after)/);
    expect(cardRule).toContain("background: rgba(250, 249, 246, 0.7)");
    expect(cardRule).toContain("box-shadow: none");
    expect(cardRule).toContain("backdrop-filter: blur(24px) saturate(120%)");
    expect(cardRule).toContain("-webkit-backdrop-filter: blur(24px) saturate(120%)");
    expect(panelRule).toContain("background: transparent");
  });

  it("usa la imagen azul oscura únicamente cuando el tema oscuro está activo", () => {
    const darkPageRule = css.match(/:global\(html\[data-theme="dark"\]\) \.loginPage\s*\{([^}]*)\}/)?.[1] || "";
    const image = "public/admin-login-fondo-oscuro.webp";

    expect(existsSync(image)).toBe(true);
    expect(statSync(image).size).toBeLessThan(256 * 1024);
    expect(darkPageRule).toContain('background-image: url("/admin-login-fondo-oscuro.webp")');
    expect(darkPageRule).not.toContain("linear-gradient");
    expect(darkPageRule).not.toContain('url("/admin-login-fondo.webp")');
  });
  it("reserva el agua horizontal para el panel oscuro y restaura el formulario", () => {
    const rule = css.match(/:global\(html\[data-theme="dark"\]\) \.adminPage\s*\{([^}]*)\}/)?.[1] || "";
    expect(rule).toContain('background-image: url("/admin-panel-agua-oscuro.webp")');
    expect(rule).toContain("background-size: cover");
    expect(css).toMatch(/:global\(html\[data-theme="dark"\]\) \.adminPage \.shell\s*\{[^}]*background: transparent/);
    expect(statSync("public/admin-panel-agua-oscuro.webp").size).toBeLessThan(128 * 1024);
    expect(css).not.toContain("admin-login-agua-oscuro.webp");
    expect(css).not.toContain(".adminLoginPage");
    expect(readFileSync("app/admin/login-view.js", "utf8")).toContain("<main className={styles.loginPage}>");
  });

});
