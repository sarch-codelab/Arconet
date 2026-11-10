import { describe, expect, it, vi } from "vitest";
vi.mock("../lib/prisma", () => ({ prisma: {} }));
import { defaultDockMenu, DOCK_MENU_KEY, HERO_MENU_KEY } from "../lib/dock-menu";
import { readDockMenu, saveDockMenu } from "../lib/dock-menu-service";

function database(initial) {
  const rows = new Map(Object.entries(initial));
  return { configuracionSistema: {
    findUnique: async ({ where }) => rows.has(where.clave) ? { valor: rows.get(where.clave) } : null,
    create: async ({ data }) => { rows.set(data.clave, data.valor); },
    updateMany: async ({ where, data }) => { if (rows.get(where.clave) !== where.valor) return { count: 0 }; rows.set(where.clave, data.valor); return { count: 1 }; },
  } };
}
function legacy() {
  const menu = defaultDockMenu(); delete menu.version;
  for (const group of menu.items[1].groups) for (const link of group.links) link.href = link.href.replace('/tienda/categoria/', '/tienda/');
  return menu;
}
const links = menu => menu.items.find(i => i.id === 'soluciones').groups.flatMap(group => group.links);

describe("destinos de categorías de los dos menús", () => {
  it("los enlaces predeterminados van a los listados de productos", () => {
    const menu = defaultDockMenu(); const categoryLinks = links(menu).filter(link => link.href.startsWith('/tienda/'));
    expect(categoryLinks).toHaveLength(11);
    expect(categoryLinks.every(link => link.href.startsWith('/tienda/categoria/'))).toBe(true);
  });
  it.each([HERO_MENU_KEY, DOCK_MENU_KEY])("corrige enlaces antiguos en %s conservando los cambios del administrador", async key => {
    const menu = legacy(); const group = menu.items[1].groups[0];
    group.links[0].label = "Mi etiqueta"; group.links[0].enabled = false;
    group.links[1].href = '/contacto';
    group.links.push({ id: 'n-personalizado', label: 'Mi ficha', href: '/tienda/componentes-pasivos', enabled: true });
    group.links.reverse(); menu.items.reverse();
    const raw = JSON.stringify(menu); const db = database({ [key]: raw }); const result = await readDockMenu(db, key);
    const corrected = links(result.menu);
    expect(corrected.find(x => x.id === 'sub-1-0-0')).toMatchObject({ label: 'Mi etiqueta', enabled: false, href: '/tienda/categoria/soluciones-de-preconectorizado' });
    expect(corrected.find(x => x.id === 'sub-1-0-1').href).toBe('/contacto');
    expect(corrected.find(x => x.id === 'n-personalizado').href).toBe('/tienda/componentes-pasivos');
    expect(result.raw).toBe(raw);
    expect(result.menu.items[0].label).toBe('Contacto');
    const saved = await saveDockMenu(result.menu, result.revision, db, key);
    expect(saved.menu.version).toBe(2);
    const again = await readDockMenu(db, key); expect(again.menu).toEqual(saved.menu);
    await expect(saveDockMenu(menu, result.revision, db, key)).rejects.toMatchObject({ status: 409 });
  });
  it("respeta si el administrador elige expresamente la ficha antigua después de la actualización", async () => {
    const menu = defaultDockMenu(); menu.items[1].groups[0].links[0].href = '/tienda/soluciones-de-preconectorizado';
    const db = database({ [HERO_MENU_KEY]: JSON.stringify(menu) });
    expect(links((await readDockMenu(db, HERO_MENU_KEY)).menu)[0].href).toBe('/tienda/soluciones-de-preconectorizado');
  });
});
