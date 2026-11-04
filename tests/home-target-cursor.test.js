import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const read = path => readFileSync(path, "utf8");
const cursor = read("components/ui/target-cursor/target-cursor.js");
const css = read("components/ui/target-cursor/target-cursor.css");
const wrapper = read("app/site-target-cursor.js");
describe("TargetCursor global con mouse", () => {
  it("se monta una sola vez en el layout para páginas públicas, privadas y login", () => {
    const home = read("app/home-experience.js");
    expect(home).not.toContain("HomeTargetCursor");
    expect(home).not.toContain("cursorScopeRef");
    const layout = read("app/layout.js");
    expect(layout.match(/<SiteTargetCursor \/>/g)).toHaveLength(1);
    expect(wrapper).not.toContain("container={");
    expect(wrapper).toContain('key={pathname}');
    expect(wrapper).toContain('ssr: false');
    expect(wrapper).toContain('(hover: hover) and (pointer: fine)');
    expect(wrapper).toContain('if (!enabled) return null');
  });
  it("preserva edición y teclado y no intercepta clics", () => {
    expect(cursor).toContain('input, textarea, select, [contenteditable]');
    expect(cursor).toContain('dialog[open], iframe');
    expect(cursor).toContain("node?.closest?.(nativeSelector)");
    expect(cursor).toContain("event.key === 'Tab'");
    expect(cursor).toContain("event.key === 'Escape'");
    expect(cursor).toContain('aria-hidden="true"');
    expect(css).toContain('pointer-events: none');
    expect(css).toContain('overflow: clip');
    expect(cursor).toContain('style.remove()');
    expect(cursor).toContain("window.removeEventListener('keydown', onKeyDown)");
  });
  it("reduce sin apagar el efecto y pausa en segundo plano", () => {
    expect(cursor).toContain("motion.addEventListener('change', onMotion)");
    expect(cursor).toContain('reduce ? 0.12 : 1');
    expect(cursor).toContain('reduce ? 0.02 : 0.08');
    expect(cursor).toContain('if (document.hidden)');
    expect(cursor).toContain('now - last < 32');
    expect(cursor).toContain("document.removeEventListener('visibilitychange', onVisibility)");
    expect(cursor).toContain('if (shape !== lastShape)');
    expect(cursor).toContain('translate3d');
  });
});
