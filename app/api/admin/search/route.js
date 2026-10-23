import { prisma } from "../../../../lib/prisma";
import { requireSession, getPermisos } from "../../../../lib/dal";
import { canSeeAllSolicitudes } from "../../../../lib/solicitudes-internas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
  if (query.length < 2) return Response.json([]);
  try {
    const permissions = await getPermisos(guard.session);
    const contains = (field) => ({ [field]: { contains: query, mode: "insensitive" } });
    const results = [];
    const jobs = [];
    if (permissions.includes("productos:read")) jobs.push(prisma.producto.findMany({ where: { OR: [contains("nombre"), contains("sku"), contains("marca"), contains("categoria")] }, take: 5, select: { id: true, nombre: true, sku: true, categoria: true } }).then((items) => {
      results.push(...items.map((item) => ({ id: item.id, title: item.nombre, detail: `${item.sku} · ${item.categoria}`, section: "productos", sectionLabel: "Productos" })));
    }));
    if (permissions.includes("clientes:read")) jobs.push(prisma.cliente.findMany({ where: { OR: [contains("nombre"), contains("correo"), contains("contacto"), contains("rtn")] }, take: 5, select: { id: true, nombre: true, correo: true, rtn: true } }).then((items) => {
      results.push(...items.map((item) => ({ id: item.id, title: item.nombre, detail: item.correo || item.rtn || "Cliente", section: "clientes", sectionLabel: "Clientes" })));
    }));
    if (permissions.includes("trabajadores:read")) jobs.push(prisma.trabajador.findMany({ where: { OR: [contains("nombre"), contains("correo"), contains("puesto")] }, take: 5, select: { id: true, nombre: true, correo: true, puesto: true } }).then((items) => {
      results.push(...items.map((item) => ({ id: item.id, title: item.nombre, detail: item.puesto || item.correo, section: "trabajadores", sectionLabel: "Personal" })));
    }));
    if (permissions.includes("ordenes:read")) jobs.push(prisma.orden.findMany({ where: { OR: [contains("id"), contains("notas")] }, take: 5, select: { id: true, cliente: { select: { nombre: true } }, estado: true } }).then((items) => {
      results.push(...items.map((item) => ({ id: item.id, title: item.cliente.nombre, detail: `${item.id} · ${item.estado.replaceAll("_", " ")}`, section: "cotizaciones", sectionLabel: "Cotizaciones" })));
    }));
    if (permissions.includes("solicitudes:read")) {
      const session = guard.session;
      const areas = await prisma.areaSolicitud.findMany({ where: { roles: { has: session.rol } }, select: { slug: true, nombre: true } });
      const where = canSeeAllSolicitudes(session) ? { OR: [contains("id"), contains("titulo"), contains("descripcion")] } : {
        AND: [
          { OR: [{ solicitanteCorreo: { equals: session.correo, mode: "insensitive" } }, { responsableCorreo: { equals: session.correo, mode: "insensitive" } }, ...(areas.length ? [{ area: { in: areas.map((area) => area.slug) } }] : [])] },
          { OR: [contains("id"), contains("titulo"), contains("descripcion")] },
        ],
      };
      jobs.push(prisma.solicitudInterna.findMany({ where, take: 5, select: { id: true, titulo: true, area: true, estado: true } }).then((items) => {
        results.push(...items.map((item) => ({ id: item.id, title: item.titulo, detail: `${areas.find((area) => area.slug === item.area)?.nombre || item.area} · ${item.estado.replaceAll("_", " ")}`, section: "solicitudes", sectionLabel: "Órdenes internas" })));
      }));
    }
    await Promise.all(jobs);
    return Response.json(results.slice(0, 15));
  } catch (error) {
    console.error("GET /api/admin/search", error?.message);
    return Response.json({ error: "No se pudo completar la búsqueda." }, { status: 503 });
  }
}
