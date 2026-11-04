import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../app/admin/workers-store", () => ({ authenticate: vi.fn() }));
vi.mock("../app/admin/admin-ui", () => ({ notifyError: vi.fn() }));
vi.mock("../lib/local-preview", () => ({ isLocalPreview: () => false }));

import LoginView from "../app/admin/login-view";

const card = readFileSync("app/admin/admin-experience.module.css", "utf8");
const qr = readFileSync("app/admin/qr-login.module.css", "utf8");
const component = readFileSync("app/admin/qr-login.js", "utf8");
const view = readFileSync("app/admin/login-view.js", "utf8");
const html = renderToStaticMarkup(createElement(LoginView));

const rule = (css, selector) => css.match(new RegExp(`(?:^|\\n)\\${selector}\\s*\\{([^}]*)\\}`))?.[1] || "";

describe("acceso con QR como icono en el borde derecho de la tarjeta", () => {
  it("muestra sólo el icono, sin etiqueta visible, y anuncia el panel", () => {
    expect(html).toContain('aria-label="Acceso rápido con QR"');
    expect(html).toContain('aria-controls="qr-login-panel"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toContain(">Acceso rápido con QR<");
    expect(html).not.toContain("Generar QR");
    expect(component).toContain("<QrCode");
    expect(component).not.toMatch(/<\/QrCode>\s*Acceso/);
  });

  it("vive dentro de la tarjeta y no debajo del formulario", () => {
    expect(view).toContain("<QrLogin />");
    // El panel ya no se apila dentro del cuerpo del formulario.
    const body = view.slice(view.indexOf("loginPanelBody"), view.indexOf("<QrLogin />"));
    expect(body).not.toContain("QrLogin");
    expect(qr).toMatch(/\.root\s*\{[^}]*display: contents/);
  });

  it("centra el icono en vertical en el borde derecho de la tarjeta", () => {
    const rail = rule(qr, ".rail");
    const toggle = rule(qr, ".toggle");
    expect(rail).toContain("align-items: center");
    expect(rail).toContain("justify-content: center");
    expect(rail).toContain("border-left: 1px solid var(--line)");
    expect(toggle).toContain("border-radius: 50%");
    expect(rule(card, ".loginCard")).toContain("align-items: stretch");
    expect(rule(qr, ".rail")).toMatch(/flex: 0 0 \d+px/);
  });

  it("extiende el panel hacia la derecha al pulsar el icono", () => {
    expect(qr).toMatch(/\.panel\s*\{[^}]*width: 0/);
    expect(qr).toMatch(/\.root\[data-qr-open="true"\]\s+\.panel\s*\{[^}]*width: 320px/);
    expect(qr).toMatch(/\.panelInner\s*\{[^}]*width: 320px/);
    expect(card).toMatch(/\.loginCard:has\(\[data-qr-open="true"\]\)\s*\{[^}]*width: min\(100%, 880px\)/);
    // El formulario conserva su ancho: el QR no recompone los campos.
    expect(rule(card, ".loginPanel")).toContain("width: min(100%, 500px)");
  });

  it("en el teléfono el panel se abre debajo del formulario", () => {
    const mobile = card.slice(card.indexOf("@media (max-width: 900px)"));
    expect(mobile).toMatch(/\.loginCard\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) 48px/);
    expect(qr).toMatch(/\.panel\s*\{[^}]*grid-column: 1 \/ -1[^}]*max-height: 0/);
    expect(qr).toMatch(/\.panelInner\s*\{[^}]*width: 100%/);
  });

  it("cierra con Escape y devuelve el foco al panel", () => {
    expect(component).toContain('event.key === "Escape"');
    expect(component).toContain("closeButton.current?.focus");
    expect(component).toContain("collapse.current?.()");
  });
});
