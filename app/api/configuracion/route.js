import { prisma } from "../../../lib/prisma";
import { requirePermission } from "../../../lib/dal";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../../lib/contact";
import { writeLog } from "../../../lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS = { companyName: "Arconet", email: CONTACT_EMAIL, phone: CONTACT_PHONE, currency: "L", theme: "system" };
const ALLOWED = new Set(Object.keys(DEFAULTS));

export async function GET() {
  const guard = await requirePermission("ajustes:read");
  if (guard.response) return guard.response;
  try {
    const stored = await prisma.configuracionSistema.findMany({ where: { clave: { in: [...ALLOWED] } }, select: { clave: true, valor: true } });
    return Response.json({ ...DEFAULTS, ...Object.fromEntries(stored.map((item) => [item.clave, item.valor])) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/configuracion", error?.message);
    return Response.json({ error: "No se pudo cargar la configuración." }, { status: 503 });
  }
}

export async function PATCH(request) {
  const guard = await requirePermission("ajustes:write");
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const data = {};
  for (const key of ALLOWED) {
    if (!Object.hasOwn(body || {}, key)) continue;
    if (typeof body[key] !== "string") return Response.json({ error: `El valor de ${key} no es válido.` }, { status: 400 });
    data[key] = body[key].trim();
  }
  if (!Object.keys(data).length) return Response.json({ error: "No hay cambios para guardar." }, { status: 400 });
  if (data.companyName != null && (data.companyName.length < 2 || data.companyName.length > 100)) return Response.json({ error: "El nombre debe tener entre 2 y 100 caracteres." }, { status: 400 });
  if (data.email != null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return Response.json({ error: "Escribe un correo de contacto válido." }, { status: 400 });
  if (data.phone != null && data.phone.length > 40) return Response.json({ error: "El teléfono no puede superar 40 caracteres." }, { status: 400 });
  if (data.currency != null && !["L", "USD"].includes(data.currency)) return Response.json({ error: "La moneda indicada no está admitida." }, { status: 400 });
  if (data.theme != null && !["light", "dark", "system"].includes(data.theme)) return Response.json({ error: "El tema indicado no está admitido." }, { status: 400 });
  try {
    await prisma.$transaction(Object.entries(data).map(([clave, valor]) => prisma.configuracionSistema.upsert({ where: { clave }, create: { clave, valor }, update: { valor } })));
    await writeLog("panel", "Actualizó la configuración del sistema", { actor: guard.session.correo, ruta: "/api/configuracion", detalle: { campos: Object.keys(data) } });
    const stored = await prisma.configuracionSistema.findMany({ where: { clave: { in: [...ALLOWED] } }, select: { clave: true, valor: true } });
    return Response.json({ ...DEFAULTS, ...Object.fromEntries(stored.map((item) => [item.clave, item.valor])) });
  } catch (error) {
    console.error("PATCH /api/configuracion", error?.message);
    return Response.json({ error: "No se pudo guardar la configuración." }, { status: 503 });
  }
}
