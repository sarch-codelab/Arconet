import { createHash } from "node:crypto";
import { prisma } from "./prisma";
import { defaultDockMenu, DOCK_MENU_KEY, validateDockMenu, upgradeLegacyMenu } from "./dock-menu";

export const menuRevision = (raw) => createHash("sha256").update(raw ?? "__sin_configuracion__").digest("hex");

export async function readDockMenu(db = prisma, key = DOCK_MENU_KEY) {
  const row = await db.configuracionSistema.findUnique({ where: { clave: key }, select: { valor: true } });
  const raw = row?.valor ?? null;
  let menu = defaultDockMenu();
  let corrupt = false;
  if (raw !== null) {
    try { menu = upgradeLegacyMenu(validateDockMenu(JSON.parse(raw))); } catch { corrupt = true; }
  }
  return { menu, revision: menuRevision(raw), corrupt, raw };
}

export async function saveDockMenu(menu, revision, db = prisma, key = DOCK_MENU_KEY) {
  let checked;
  try { checked = { ...validateDockMenu(menu), version: 2 }; } catch (error) { error.status = 400; throw error; }
  const current = await readDockMenu(db, key);
  if (revision !== current.revision) throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 });
  const valor = JSON.stringify(checked);
  if (valor.length > 80000) throw Object.assign(new Error("El menú es demasiado grande."), { status: 400 });
  if (current.raw === null) {
    try { await db.configuracionSistema.create({ data: { clave: key, valor } }); }
    catch (error) { if (error.code === "P2002") throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 }); throw error; }
  } else {
    const result = await db.configuracionSistema.updateMany({ where: { clave: key, valor: current.raw }, data: { valor } });
    if (result.count !== 1) throw Object.assign(new Error("El menú cambió en otra sesión. Recarga antes de guardar."), { status: 409 });
  }
  return { menu: checked, revision: menuRevision(valor), corrupt: false };
}
