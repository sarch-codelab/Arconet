import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("marca del panel en tema oscuro", () => {
  it("aplica blanco al logo de la cabecera únicamente bajo html[data-theme=dark]", () => {
    const css = readFileSync(new URL("../app/admin/admin-experience.module.css", import.meta.url), "utf8");
    expect(css).toMatch(/:global\(html\[data-theme="dark"\]\)\s+\.topbarBrandImg\s*\{[^}]*filter:\s*brightness\(0\)\s+invert\(1\)/);
    const topbar = readFileSync(new URL("../app/admin/topbar.js", import.meta.url), "utf8");
    expect(topbar).toContain('src="/arconet.png"');
    expect(topbar).toContain("className={styles.topbarBrandImg}");
  });
});
