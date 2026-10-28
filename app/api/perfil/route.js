import { prisma } from '@/lib/prisma";
import { requireSession } from '@/lib/dal";
import { createSession } from '@/lib/session";
import { writeLog } from '@/lib/logs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const email = guard.session.correo;
  try {
    const [account, worker, role, activity] = await Promise.all([
      prisma.usuario.findUnique({ where: { correo: email }, select: { id: true, nombre: true, correo: true, rol: true, sucursalId: true, telefono: true, foto: true, createdAt: true, twoFactorEnabled: true } }),
      prisma.trabajador.findUnique({ where: { correo: email }, include: { sucursal: { select: { nombre: true } } } }),
      prisma.rol.findUnique({ where: { slug: guard.session.rol }, select: { nombre: true } }),
      prisma.log.findMany({ where: { actor: { equals: email, mode: "insensitive" } }, orderBy: { createdAt: "desc" }, take: 30 }),
    ]);
    if (!account) return Response.json({ error: "No se encontró la cuenta." }, { status: 404 });
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [completed, loginsThisMonth] = await Promise.all([
      prisma.solicitudInterna.count({ where: { responsableCorreo: { equals: email, mode: "insensitive" }, estado: "completada" } }),
      prisma.log.count({ where: { actor: { equals: email, mode: "insensitive" }, categoria: "auth", mensaje: { startsWith: "Inicio de sesión" }, createdAt: { gte: monthStart } } }),
    ]);
    const elapsed = Date.now() - new Date(account.createdAt).getTime();
    return Response.json({
      id: account.id,
      nombre: account.nombre,
      correo: account.correo,
      rol: account.rol,
      rolNombre: role?.nombre || account.rol,
      twoFactorEnabled: account.twoFactorEnabled,
      sucursal: worker?.sucursal?.nombre || account.sucursalId || "",
      foto: account.foto || worker?.foto || "",
      trabajador: worker ? { id: worker.id, telefono: worker.telefono || "", foto: worker.foto || account.foto || "", puesto: worker.puesto || "", estado: worker.estado, ingreso: worker.ingreso, sucursalId: worker.sucursalId } : { telefono: account.telefono || "", foto: account.foto || "" },
      stats: { completedOrders: completed, daysOnPlatform: Math.max(0, Math.floor(elapsed / 86400000)), loginsThisMonth },
      activity: activity.map((log) => ({ id: log.id, message: log.mensaje, category: log.categoria, createdAt: log.createdAt, route: log.ruta })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/perfil", error?.message);
    return Response.json({ error: "No se pudo cargar el perfil." }, { status: 503 });
  }
}

export async function PATCH(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
  const telefono = typeof body?.telefono === "string" ? body.telefono.trim().slice(0, 40) : "";
  const foto = body?.foto;
  if (nombre.length < 2) return Response.json({ error: "El nombre debe tener al menos 2 caracteres." }, { status: 400 });
  if (typeof body?.telefono === "string" && body.telefono.trim().length > 40) return Response.json({ error: "El teléfono no puede superar 40 caracteres." }, { status: 400 });
  if (foto != null && foto !== "" && (typeof foto !== "string" || !/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(foto) || foto.length > 280000)) {
    return Response.json({ error: "La foto debe ser PNG, JPG, WEBP o GIF y no superar 200 KB." }, { status: 400 });
  }
  try {
    const account = await prisma.$transaction(async (tx) => {
      const updated = await tx.usuario.update({ where: { correo: guard.session.correo }, data: { nombre, telefono: telefono || null, ...(Object.hasOwn(body, "foto") ? { foto: foto || null } : {}) } });
      const worker = await tx.trabajador.findUnique({ where: { correo: guard.session.correo }, select: { id: true } });
      if (worker) await tx.trabajador.update({ where: { id: worker.id }, data: { nombre, telefono: telefono || null, ...(Object.hasOwn(body, "foto") ? { foto: foto || null } : {}) } });
      return updated;
    });
    await createSession({ ...guard.session, id: account.id, nombre: account.nombre }, { preserveCurrent: true });
    await writeLog("panel", "Actualizó su perfil", { actor: account.correo, ruta: "/api/perfil" });
    return Response.json({ ok: true, nombre: account.nombre });
  } catch (error) {
    console.error("PATCH /api/perfil", error?.message);
    return Response.json({ error: "No se pudo guardar el perfil." }, { status: 503 });
  }
}
