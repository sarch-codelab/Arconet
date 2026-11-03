import { readFileSync } from "node:fs";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const source = readFileSync("app/cliente/cliente-experience.js", "utf8");
const css = readFileSync("app/cliente/cliente-experience.module.css", "utf8");

describe("regresiones de diseño y perfil del portal", () => {
  it("pasa la actualización de sesión desde su dueño al dashboard y al perfil", () => {
    expect(source).toMatch(/<ClientDashboard[^>]*onSessionUpdate=\{setSession\}/);
    expect(source).toMatch(/function ClientDashboard\(\{[^}]*onSessionUpdate/);
    expect(source).toContain("<ProfilePage session={session} onSessionUpdate={onSessionUpdate} />");
  });

  it("todas las clases estáticas usadas por el portal existen en su módulo CSS", () => {
    const used = [...source.matchAll(/styles\.(\w+)/g)].map(match => match[1]);
    const defined = new Set([...css.matchAll(/\.([\w-]+)/g)].map(match => match[1]));
    expect([...new Set(used)].filter(name => !defined.has(name))).toEqual([]);
  });

  it("los botones de navegación conservan nombre accesible cuando solo muestran un icono", () => {
    expect(source).toContain("aria-label={label}");
    expect(css).toContain(".navItem.navActive:hover");
    expect(css).toContain(".bellPanel");
    expect(css).toContain("flex: 0 0 64px");
    expect(css).toContain("overflow-wrap: anywhere");
    expect(css).toContain(".orderActions { flex-wrap: wrap;");
    expect(css).toContain(".orderDetailHeader { flex-wrap: wrap; }");
  });

  it("ESLint detecta una variable inexistente en componentes del portal", async () => {
    const eslint = new ESLint();
    const [result] = await eslint.lintText("export default function Profile() { return missingSessionSetter; }", {
      filePath: "app/cliente/regression-probe.js",
    });
    expect(result.messages.some(message => message.ruleId === "no-undef")).toBe(true);
  });
});
