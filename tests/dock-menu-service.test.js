import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { readDockMenu, saveDockMenu } from "../lib/dock-menu-service";
import { defaultDockMenu } from "../lib/dock-menu";
function db() {
  let raw = null;
  const configuracionSistema = {
    findUnique: vi.fn(async () => raw === null ? null : { valor: raw }),
    create: vi.fn(async ({ data }) => { if (raw !== null) throw Object.assign(new Error("duplicate"), { code: "P2002" }); raw = data.valor; }),
    updateMany: vi.fn(async ({ where, data }) => { if (raw !== where.valor) return { count: 0 }; raw = data.valor; return { count: 1 }; }),
  };
  return { configuracionSistema };
}
describe("guardado del menú", () => {
  it("conserva cambios, detecta ediciones simultáneas y permite restaurar", async () => {
    const database = db(); const a = await readDockMenu(database); const b = await readDockMenu(database);
    const menu = defaultDockMenu(); menu.items[0].label = "Portada";
    const saved = await saveDockMenu(menu, a.revision, database); expect((await readDockMenu(database)).menu.items[0].label).toBe("Portada");
    await expect(saveDockMenu(b.menu, b.revision, database)).rejects.toMatchObject({ status: 409 });
    const restored = await saveDockMenu(defaultDockMenu(), saved.revision, database); expect(restored.menu.items[0].label).toBe("Inicio");
  });
  it("rechaza una URL insegura sin persistir", async () => {
    const database = db(); const current = await readDockMenu(database); current.menu.items[0].href = "javascript:alert(1)";
    await expect(saveDockMenu(current.menu, current.revision, database)).rejects.toMatchObject({ status: 400 }); expect(database.configuracionSistema.create).not.toHaveBeenCalled();
  });
});
