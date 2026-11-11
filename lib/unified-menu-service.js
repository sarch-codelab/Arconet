import { prisma } from "./prisma";
import { DOCK_MENU_KEY, HERO_MENU_KEY, UNIFIED_MENU_KEY, validateDockMenu, visibleDockMenu } from "./dock-menu";
import { menuRevision, readDockMenu } from "./dock-menu-service";
import { mergeDockMenus } from "./merge-dock-menus";

// Los registros antiguos se conservan intactos como respaldo. Hasta el primer
// guardado se combina al vuelo; una clave nueva es la única fuente posterior.
export async function readUnifiedMenu(db = prisma, includeLegacy = false) {
  const unified = await readDockMenu(db, UNIFIED_MENU_KEY);
  // Una vez guardado, el tráfico público solo necesita leer la clave activa.
  if (unified.raw !== null && !includeLegacy) return { ...unified, combined: false, legacyPrimary: [] };
  const [first, second] = await Promise.all([readDockMenu(db, HERO_MENU_KEY), readDockMenu(db, DOCK_MENU_KEY)]);
  const legacy = [first, second].filter(entry => entry.raw !== null && !entry.corrupt);
  const corrupt = unified.raw !== null ? unified.corrupt : [first, second].some(entry => entry.corrupt);
  const legacyPrimary = first.raw !== null && second.raw !== null && !first.corrupt && !second.corrupt
    ? [visibleDockMenu(first.menu).primary, visibleDockMenu(second.menu).primary] : [];
  const combined = unified.raw === null && legacy.length > 1;
  const menu = unified.raw !== null ? unified.menu : legacy.length === 2 ? mergeDockMenus(legacy[0].menu, legacy[1].menu) : legacy[0]?.menu || unified.menu;
  const revision = unified.raw !== null ? menuRevision(unified.raw) : menuRevision(JSON.stringify([first.raw, second.raw]));
  return { menu, revision, corrupt, combined, legacyPrimary, raw: unified.raw };
}

export async function saveUnifiedMenu(menu, revision, db = prisma) {
  let checked;
  try { checked = { ...validateDockMenu(menu), version: 2 }; } catch (error) { error.status = 400; throw error; }
  const current = await readUnifiedMenu(db, true);
  if (revision !== current.revision) throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 });
  const valor = JSON.stringify(checked);
  if (valor.length > 200000) throw Object.assign(new Error("El menú es demasiado grande."), { status: 400 });
  if (current.raw === null) {
    try { await db.configuracionSistema.create({ data: { clave: UNIFIED_MENU_KEY, valor } }); }
    catch (error) { if (error.code === "P2002") throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 }); throw error; }
  } else {
    const result = await db.configuracionSistema.updateMany({ where: { clave: UNIFIED_MENU_KEY, valor: current.raw }, data: { valor } });
    if (result.count !== 1) throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 });
  }
  return { menu: checked, revision: menuRevision(valor), corrupt: false, combined: false, legacyPrimary: current.legacyPrimary };
}
