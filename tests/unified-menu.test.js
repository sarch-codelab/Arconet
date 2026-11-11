import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { defaultDockMenu, DOCK_MENU_KEY, HERO_MENU_KEY, UNIFIED_MENU_KEY, validateDockMenu, visibleDockMenu } from "../lib/dock-menu";
import { mergeDockMenus } from "../lib/merge-dock-menus";
import { readUnifiedMenu, saveUnifiedMenu } from "../lib/unified-menu-service";

function database(values = {}) {
  const rows = new Map(Object.entries(values));
  const configuracionSistema = {
    findUnique: async ({ where }) => rows.has(where.clave) ? { valor: rows.get(where.clave) } : null,
    create: async ({ data }) => { if (rows.has(data.clave)) throw Object.assign(new Error("duplicado"), { code: "P2002" }); rows.set(data.clave, data.valor); },
    updateMany: async ({ where, data }) => { if (rows.get(where.clave) !== where.valor) return { count: 0 }; rows.set(where.clave, data.valor); return { count: 1 }; },
  };
  return { configuracionSistema, rows };
}
const json = JSON.stringify;

describe("combinación de menús existentes", () => {
  it("evita duplicar las entradas idénticas y conserva los datos de ambos", () => {
    const first = defaultDockMenu(), second = structuredClone(first);
    first.items[1].groups[0].links[0].label = "Primer enlace";
    second.items[1].groups[0].links[0].label = "Segundo enlace";
    second.items[1].groups[0].links[1].enabled = false;
    second.items[1].groups.push({ id: "extra", title: "Nuevo grupo", enabled: true, links: [{ id: "nuevo", label: "Más", href: "/ayuda", enabled: true }] });
    second.items.push({ id: "nuevo-barra", label: "Contacto extra", href: "/contacto", enabled: true, groups: [] });
    const combined = mergeDockMenus(first, second);
    expect(() => validateDockMenu(combined)).not.toThrow();
    expect(combined.items.filter(item => item.label === "Inicio")).toHaveLength(1);
    const group = combined.items.find(item => item.id === "soluciones").groups[0];
    expect(group.links.map(l => l.label)).toEqual(expect.arrayContaining(["Primer enlace", "Segundo enlace"]));
    expect(group.links.filter(l => l.label === first.items[1].groups[0].links[1].label).map(l => l.enabled)).toEqual([true, false]);
    expect(combined.items[1].groups.some(g => g.title === "Nuevo grupo")).toBe(true);
    expect(combined.items.some(item => item.label === "Contacto extra")).toBe(true);
    expect(first.items[1].groups[0].links[0].label).toBe("Primer enlace");
  });
  it("mantiene distintas versiones de una entrada, incluso sus grupos y acceso destacado", () => {
    const first = defaultDockMenu(), second = structuredClone(first);
    second.items[1].label = "Servicios"; second.items[1].groups[0].links[0].href = "/contacto";
    second.primary = { label: "Promoción", description: "Otra descripción", href: "/ayuda", enabled: true, linked: false };
    const result = validateDockMenu(mergeDockMenus(first, second));
    expect(result.items.find(i => i.label === "Servicios").groups[0].links[0].href).toBe("/contacto");
    expect(result.items.find(i => i.label === "Promoción").href).toBe("/ayuda");
    expect(result.primary).toEqual(first.primary);
  });
  it("menús idénticos dan el original; uno solo no se mezcla con valores predeterminados", async () => {
    const one = defaultDockMenu(); expect(mergeDockMenus(one, one)).toEqual(one);
    one.items[0].label = "Portada única";
    const db = database({ [DOCK_MENU_KEY]: json(one) });
    expect((await readUnifiedMenu(db)).menu).toEqual(one);
  });
  it("combina hasta el doble de grupos y enlaces de las configuraciones antiguas", () => {
    const first = defaultDockMenu(), second = defaultDockMenu();
    const groups = Array.from({ length: 8 }, (_, g) => ({ id: `grupo-x-${g}`, title: `Grupo ${g}`, enabled: true,
      links: Array.from({ length: 20 }, (_, i) => ({ id: `enlace-x-${g}-${i}`, label: `Enlace ${i}`, href: "/", enabled: true })) }));
    first.items[1].groups = structuredClone(groups); second.items[1].groups = structuredClone(groups);
    second.items[1].groups[0].links.forEach(link => { link.href = "/contacto"; });
    second.items[1].groups.slice(1).forEach(group => { group.title += " alternativo"; });
    const combined = validateDockMenu(mergeDockMenus(first, second));
    expect(combined.items[1].groups).toHaveLength(15);
    expect(combined.items[1].groups[0].links).toHaveLength(40);
  });
  it("admite la suma de los límites anteriores y no duplica IDs", () => {
    const first = defaultDockMenu(), second = defaultDockMenu();
    first.items = Array.from({length:10}, (_, i) => ({ id: `it-${i}`, label: `Uno ${i}`, href: "/", enabled: true, groups: Array.from({length:8}, (_, j) => ({ id: `g-${i}-${j}`, title: `Grupo ${j}`, enabled: true, links: Array.from({length:20}, (_, k) => ({id: `l-${i}-${j}-${k}`, label: `Enlace ${k}`, href: "/", enabled: true})) })) }));
    second.items = structuredClone(first.items); second.items.forEach(item => { item.label += " dos"; });
    expect(validateDockMenu(mergeDockMenus(first, second)).items).toHaveLength(20);
  });
});

describe("persistencia y compatibilidad del menú compartido", () => {
  it("usa respaldos sin alterarlos y rechaza ediciones antiguas", async () => {
    const first = defaultDockMenu(), second = defaultDockMenu(); second.items[0].label = "Portada alternativa";
    const db = database({ [HERO_MENU_KEY]: json(first), [DOCK_MENU_KEY]: json(second) });
    const a = await readUnifiedMenu(db), b = await readUnifiedMenu(db);
    expect(a.combined).toBe(true); expect(a.menu.items.some(i => i.label === "Portada alternativa")).toBe(true);
    const saved = await saveUnifiedMenu(a.menu, a.revision, db);
    expect(db.rows.get(HERO_MENU_KEY)).toBe(json(first)); expect(db.rows.get(DOCK_MENU_KEY)).toBe(json(second));
    expect(db.rows.has(UNIFIED_MENU_KEY)).toBe(true);
    expect((await readUnifiedMenu(db)).menu).toEqual(saved.menu);
    await expect(saveUnifiedMenu(b.menu, b.revision, db)).rejects.toMatchObject({status:409});
    const next = await readUnifiedMenu(db); next.menu.items[0].label = "Nuevo";
    await saveUnifiedMenu(next.menu, next.revision, db);
    expect(visibleDockMenu((await readUnifiedMenu(db)).menu).items[0].label).toBe("Nuevo");
  });
  it("advierte si un respaldo es inválido y conserva el menú legible", async () => {
    const valid = defaultDockMenu(); valid.items[0].label = "Legible";
    const db = database({ [HERO_MENU_KEY]: "malformado", [DOCK_MENU_KEY]: json(valid) });
    const read = await readUnifiedMenu(db);
    expect(read.corrupt).toBe(true); expect(read.menu.items[0].label).toBe("Legible");
    expect(db.rows.get(HERO_MENU_KEY)).toBe("malformado");
  });
  it("detecta cambios en los originales antes del primer guardado", async () => {
    const db = database({ [HERO_MENU_KEY]: json(defaultDockMenu()) });
    const old = await readUnifiedMenu(db); db.rows.set(DOCK_MENU_KEY, json(defaultDockMenu()));
    await expect(saveUnifiedMenu(old.menu, old.revision, db)).rejects.toMatchObject({status:409});
  });
});
