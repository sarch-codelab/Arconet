import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
import AiOrb from "../app/ai-orb";
const render = pathname => { route.pathname = pathname; return renderToStaticMarkup(createElement(AiOrb)); };
const wrapper = readFileSync("app/ai-orb.js", "utf8");
const shader = readFileSync("components/ui/gradient-orb.tsx", "utf8");
const css = readFileSync("app/ai-orb.module.css", "utf8");

describe("orbe visual de IA", () => {
  it("es reutilizable y decorativo en la sección y píldora IA", () => {
    const html = render("/admin");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('data-orb-renderer="css"');
    expect(html).not.toContain("<button");
    expect(readFileSync("app/admin/admin-nav.js", "utf8")).toContain('{ id: "ia", label: "IA", icon: AiOrb }');
  });
  it("carga WebGL aparte y ofrece respaldo sin GPU y ante pérdida de contexto", () => {
    expect(wrapper).toContain('import("@/components/ui/gradient-orb")');
    expect(wrapper).toContain("ssr: false");
    expect(wrapper).toContain("requestIdleCallback");
    expect(wrapper).toContain("gl?.getExtension(\"WEBGL_lose_context\")?.loseContext()");
    expect(wrapper).toContain("getDerivedStateFromError");
    expect(wrapper).toContain("onContextLost={() => setLost(true)}");
  });
  it("no monta orbe ni panel flotante en páginas públicas", () => {
    expect(css).not.toContain("position: fixed");
    expect(css).toContain("pointer-events: none");
    expect(readFileSync("app/layout.js", "utf8")).not.toContain("AiOrb");
    expect(wrapper).not.toContain("ChatLauncher");
  });
  it("limita resolución/fps, pausa en segundo plano y conserva movimiento reducido", () => {
    expect(shader).toContain('frameloop="demand"');
    expect(shader).toContain("dpr={[1, 1.5]}");
    expect(shader).toContain('powerPreference: "low-power"');
    expect(shader).toContain("reduced ? 80 : 33");
    expect(shader).toContain("if (document.hidden) return");
    expect(shader).toContain('document.removeEventListener("visibilitychange", visibility)');
    expect(shader).toContain("geometry.dispose()");
    expect(css).toContain("animation-duration: 40s");
    expect(css).not.toContain("animation: none");
  });
  it("conserva el shader del componente con mezcla de alfa correcta y sin imágenes externas", () => {
    expect(shader).toContain("snoise3");
    expect(shader).toContain("rgb2yiq");
    expect(shader).toContain("premultipliedAlpha");
    expect(shader).toContain("1.0 - smoothstep(r0, r0 * 1.05, len)");
    expect(shader).not.toContain("unsplash");
  });
});
