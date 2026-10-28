import { prisma } from '@/lib/prisma';
import { obtenerConfigFiscal } from '@/lib/facturacion';
import { requirePermission } from '@/lib/dal';
import { writeLog } from '@/lib/logs';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requirePermission("facturacion:read");
  if (guard.response) return guard.response;
  try {
    return Response.json(await obtenerConfigFiscal());
  } catch (error) {
    console.error("GET /api/facturacion/config", error?.message);
    return Response.json({ error: "No se pudo leer la configuración fiscal." }, { status: 500 });
  }
}

/**
 * Guarda los rangos autorizados por la SENAT: CAI, serie y correlativo
 * inicial. Una vez guardado, los documentos se emiten con numeración oficial.
 * Body: { cai, serie, correlativo, nit?, nombre?, direccion? }
 */
export async function PUT(request) {
  const guard = await requirePermission("facturacion:write");
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const texto = (value, max) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const cai = texto(body?.cai, 40);
  const serie = texto(body?.serie, 20);
  const correlativo = Number(body?.correlativo);
  const nit = texto(body?.nit, 30);
  const nombre = texto(body?.nombre, 160);
  const direccion = texto(body?.direccion, 240);

  if ((cai && !serie) || (serie && !cai)) {
    return Response.json({ error: "CAI y serie deben configurarse juntos." }, { status: 400 });
  }
  if (cai && serie) {
    if (!Number.isInteger(correlativo) || correlativo < 1) {
      return Response.json({ error: "El correlativo inicial debe ser un entero mayor a 0." }, { status: 400 });
    }
  }

  const valores = [
    { clave: "fiscal.cai", valor: cai },
    { clave: "fiscal.serie", valor: serie },
    { clave: "fiscal.correlativo", valor: cai && serie ? String(correlativo) : "" },
    { clave: "fiscal.nit", valor: nit },
    { clave: "fiscal.nombre", valor: nombre },
    { clave: "fiscal.direccion", valor: direccion },
  ];

  try {
    for (const { clave, valor } of valores) {
      await prisma.configuracionSistema.upsert({
        where: { clave },
        update: { valor },
        create: { clave, valor },
      });
    }
    await writeLog("panel", "Configuración fiscal actualizada", {
      nivel: "warn",
      actor: guard.session.correo,
      ruta: "/api/facturacion/config",
      detalle: { cai, serie, correlativo: cai && serie ? correlativo : null },
    });
    return Response.json(await obtenerConfigFiscal());
  } catch (error) {
    console.error("PUT /api/facturacion/config", error);
    return Response.json({ error: "No se pudo guardar la configuración fiscal." }, { status: 500 });
  }
}
