import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { canAccessSolicitud } from '@/lib/solicitudes-internas';
import { registrarEventoSolicitud } from '@/lib/solicitudes-internas';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ARCHIVO = 2 * 1024 * 1024; // 2 MB por archivo (base64 ≈ 2.7 MB)
const TIPOS_PERMITIDOS = new Set([
  "image/png", "image/jpeg", "image/webp", "image/gif",
  "application/pdf", "text/plain", "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel", "application/zip",
]);

async function cargarSolicitud(prismaRef, id, session) {
  const current = await prismaRef.solicitudInterna.findUnique({ where: { id } });
  if (!current) return { error: Response.json({ error: "No se encontró la orden." }, { status: 404 }) };
  const area = await prismaRef.areaSolicitud.findUnique({ where: { slug: current.area } });
  if (!canAccessSolicitud(session, current, area)) {
    return { error: Response.json({ error: "No tienes acceso a esta orden." }, { status: 403 }) };
  }
  return { current };
}

export async function GET(request, { params }) {
  const guard = await requirePermission("solicitudes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const adjuntoId = searchParams.get("archivoId");
  try {
    if (adjuntoId) {
      const { current, error } = await cargarSolicitud(prisma, id, guard.session);
      if (error) return error;
      const adjunto = await prisma.solicitudAdjunto.findUnique({ where: { id: adjuntoId } });
      if (!adjunto || adjunto.solicitudId !== current.id) {
        return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
      }
      return new Response(adjunto.contenido, {
        headers: {
          "Content-Type": adjunto.tipo || "application/octet-stream",
          "Content-Disposition": `inline; filename="${adjunto.nombre.replace(/"/g, "")}"`,
          "Cache-Control": "no-store",
        },
      });
    }
    const adjuntos = await prisma.solicitudAdjunto.findMany({
      where: { solicitudId: id },
      select: { id: true, nombre: true, tipo: true, tamano: true, autorCorreo: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return Response.json(adjuntos);
  } catch (error) {
    console.error("GET /api/solicitudes/[id]/adjuntos", error?.message);
    return Response.json({ error: "No se pudieron obtener los archivos." }, { status: 500 });
  }
}

/**
 * Sube un archivo (base64) a la orden interna.
 * Body: { nombre, tipo, contenido(base64) }
 */
export async function POST(request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const nombre = typeof body?.nombre === "string" ? body.nombre.trim().slice(0, 160) : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo.trim().slice(0, 120) : "";
  const contenido = typeof body?.contenido === "string" ? body.contenido : "";
  if (!nombre || !contenido) return Response.json({ error: "El archivo necesita nombre y contenido." }, { status: 400 });
  if (!TIPOS_PERMITIDOS.has(tipo)) {
    return Response.json({ error: `Tipo de archivo no permitido: ${tipo || "(sin tipo)"}.` }, { status: 400 });
  }
  // base64: 4 caracteres ≈ 3 bytes; validamos el tamaño real aproximado.
  const tamano = Math.floor((contenido.length * 3) / 4);
  if (tamano > MAX_ARCHIVO) {
    return Response.json({ error: "El archivo supera el máximo de 2 MB." }, { status: 413 });
  }

  try {
    const { current, error } = await cargarSolicitud(prisma, id, guard.session);
    if (error) return error;
    const adjunto = await prisma.$transaction(async (tx) => {
      const saved = await tx.solicitudAdjunto.create({
        data: {
          solicitudId: current.id,
          nombre,
          tipo,
          tamano,
          contenido,
          autorCorreo: guard.session.correo,
        },
        select: { id: true, nombre: true, tipo: true, tamano: true, autorCorreo: true, createdAt: true },
      });
      await registrarEventoSolicitud(tx, {
        solicitudId: current.id,
        tipo: "adjunto",
        mensaje: `Adjuntó ${nombre}`,
        actorCorreo: guard.session.correo,
        actorNombre: guard.session.nombre || guard.session.correo,
      });
      return saved;
    });
    await writeLog("panel", `Adjunto en orden interna ${id}: ${nombre}`, {
      actor: guard.session.correo,
      ruta: `/api/solicitudes/${id}/adjuntos`,
      detalle: { adjuntoId: adjunto.id, tamano },
    });
    return Response.json(adjunto, { status: 201 });
  } catch (err) {
    console.error("POST /api/solicitudes/[id]/adjuntos", err?.message);
    return Response.json({ error: "No se pudo guardar el archivo." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const guard = await requirePermission("solicitudes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const adjuntoId = searchParams.get("archivoId");
  if (!adjuntoId) return Response.json({ error: "Indica el archivo a eliminar." }, { status: 400 });
  try {
    const { current, error } = await cargarSolicitud(prisma, id, guard.session);
    if (error) return error;
    const adjunto = await prisma.solicitudAdjunto.findUnique({ where: { id: adjuntoId } });
    if (!adjunto || adjunto.solicitudId !== current.id) {
      return Response.json({ error: "Archivo no encontrado." }, { status: 404 });
    }
    await prisma.solicitudAdjunto.delete({ where: { id: adjuntoId } });
    await writeLog("panel", `Adjunto eliminado de orden interna ${id}: ${adjunto.nombre}`, {
      nivel: "warn",
      actor: guard.session.correo,
      ruta: `/api/solicitudes/${id}/adjuntos`,
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/solicitudes/[id]/adjuntos", err?.message);
    return Response.json({ error: "No se pudo eliminar el archivo." }, { status: 500 });
  }
}
