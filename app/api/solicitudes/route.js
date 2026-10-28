import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { canSeeAllSolicitudes, fechaLimiteSLA, newSolicitudId, PRIORIDADES_SOLICITUD, createSolicitudNotifications, registrarEventoSolicitud } from '@/lib/solicitudes-internas';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("solicitudes:read");
  if (guard.response) return guard.response;
  const email = guard.session.correo.toLowerCase();
  try {
    const areas = await prisma.areaSolicitud.findMany({
      where: { roles: { has: guard.session.rol } },
      select: { slug: true },
    });
    const where = canSeeAllSolicitudes(guard.session)
      ? {}
      : { OR: [{ solicitanteCorreo: { equals: email, mode: "insensitive" } }, { responsableCorreo: { equals: email, mode: "insensitive" } }, ...(areas.length ? [{ area: { in: areas.map((area) => area.slug) } }] : [])] };
    const requests = await prisma.solicitudInterna.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 250,
      include: {
        comentarios: { orderBy: { createdAt: "asc" } },
        adjuntos: { select: { id: true, nombre: true, tipo: true, tamano: true, autorCorreo: true, createdAt: true } },
      },
    });
    return Response.json(requests);
  } catch (error) {
    console.error("GET /api/solicitudes", error?.message);
    return Response.json({ error: "No se pudieron cargar las órdenes internas." }, { status: 503 });
  }
}

export async function POST(request) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const titulo = typeof body?.titulo === "string" ? body.titulo.trim().slice(0, 140) : "";
  const descripcion = typeof body?.descripcion === "string" ? body.descripcion.trim().slice(0, 4000) : "";
  const area = typeof body?.area === "string" ? body.area : "";
  const prioridad = typeof body?.prioridad === "string" ? body.prioridad : "normal";
  if (!titulo || !descripcion || !area || !PRIORIDADES_SOLICITUD.includes(prioridad)) {
    return Response.json({ error: "Completa el asunto, el detalle, el área responsable y la prioridad." }, { status: 400 });
  }
  const solicitudId = newSolicitudId();
  const session = guard.session;
  try {
    const areaConfig = await prisma.areaSolicitud.findUnique({ where: { slug: area } });
    if (!areaConfig?.activa) return Response.json({ error: "El área seleccionada ya no está disponible." }, { status: 400 });
    const solicitud = await prisma.$transaction(async (tx) => {
      const creada = await tx.solicitudInterna.create({
        data: {
          id: solicitudId,
          titulo,
          descripcion,
          area,
          prioridad,
          fechaLimite: fechaLimiteSLA(prioridad),
          solicitanteCorreo: session.correo,
          solicitanteNombre: session.nombre || session.correo,
          solicitanteRol: session.rol,
        },
        include: { comentarios: true },
      });
      await registrarEventoSolicitud(tx, {
        solicitudId,
        tipo: "creada",
        a: "pendiente",
        mensaje: `Prioridad ${prioridad} · SLA ${fechaLimiteSLA(prioridad).toLocaleString("es-HN")}`,
        actorCorreo: session.correo,
        actorNombre: session.nombre || session.correo,
      });
      return creada;
    });
    await createSolicitudNotifications(prisma, {
      solicitudId,
      areaSlugValue: area,
      actorEmail: session.correo,
      title: `Nueva orden para ${areaConfig.nombre}`,
      message: `${session.nombre || session.correo}: ${titulo}`,
    });
    await writeLog("panel", `Nueva orden interna: ${solicitudId}`, { actor: session.correo, ruta: "/api/solicitudes", detalle: { area, prioridad } });
    return Response.json(solicitud, { status: 201 });
  } catch (error) {
    console.error("POST /api/solicitudes", error?.message);
    return Response.json({ error: "No se pudo crear la orden interna." }, { status: 503 });
  }
}
