import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/dal';
import { SLA_HORAS } from '@/lib/solicitudes-internas';
import { csvResponse, xlsxResponse } from '@/lib/export';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Reporte de tiempos de órdenes internas: por orden, tiempo de resolución y
 * cumplimiento del SLA; agregado por área. Exportable a CSV/XLSX.
 * ?formato=csv|xlsx
 */
export async function GET(request) {
  const guard = await requirePermission("reportes:read");
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato");

  try {
    const solicitudes = await prisma.solicitudInterna.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      select: {
        id: true, titulo: true, area: true, prioridad: true, estado: true,
        createdAt: true, cerradaAt: true, fechaLimite: true,
        responsableCorreo: true, solicitanteNombre: true,
      },
    });

    const filas = solicitudes.map((s) => {
      const inicio = new Date(s.createdAt).getTime();
      const fin = s.cerradaAt ? new Date(s.cerradaAt).getTime() : null;
      const horas = fin ? ((fin - inicio) / 3_600_000) : null;
      const slaHoras = SLA_HORAS[s.prioridad] ?? SLA_HORAS.normal;
      const cerrada = Boolean(fin);
      return {
        ...s,
        horasResolucion: horas === null ? null : Math.round(horas * 10) / 10,
        slaHoras,
        slaCumplido: cerrada ? horas <= slaHoras : null,
        abierta: !cerrada,
        vencida: !cerrada && new Date(s.fechaLimite ?? inicio + slaHoras * 3_600_000) < new Date(),
      };
    });

    // Agregado por área.
    const porArea = new Map();
    for (const fila of filas) {
      const area = porArea.get(fila.area) ?? { area: fila.area, total: 0, cerradas: 0, horasSuma: 0, slaCumplidos: 0, vencidas: 0 };
      area.total += 1;
      if (fila.abierta && fila.vencida) area.vencidas += 1;
      if (fila.horasResolucion !== null) {
        area.cerradas += 1;
        area.horasSuma += fila.horasResolucion;
        if (fila.slaCumplido) area.slaCumplidos += 1;
      }
      porArea.set(fila.area, area);
    }
    const resumenArea = [...porArea.values()].map((a) => ({
      area: a.area,
      total: a.total,
      cerradas: a.cerradas,
      vencidas: a.vencidas,
      horasPromedio: a.cerradas ? Math.round((a.horasSuma / a.cerradas) * 10) / 10 : null,
      cumplimientoSla: a.cerradas ? Math.round((a.slaCumplidos / a.cerradas) * 100) : null,
    }));

    if (formato === "csv" || formato === "xlsx") {
      const headers = ["Orden", "Asunto", "Área", "Prioridad", "Estado", "Creada", "Cerrada", "Horas", "SLA (h)", "SLA cumplido", "Responsable"];
      const rows = filas.map((f) => [
        f.id, f.titulo, f.area, f.prioridad, f.estado,
        new Date(f.createdAt), f.cerradaAt ? new Date(f.cerradaAt) : "",
        f.horasResolucion ?? "", f.slaHoras,
        f.slaCumplido === null ? "En curso" : f.slaCumplido ? "Sí" : "No",
        f.responsableCorreo || "",
      ]);
      const stamp = new Date().toISOString().slice(0, 10);
      if (formato === "csv") return csvResponse(`ordenes-internas-${stamp}.csv`, headers, rows);
      return xlsxResponse(`ordenes-internas-${stamp}.xls`, "Órdenes internas", headers, rows);
    }

    return Response.json({ total: filas.length, resumenArea, filas });
  } catch (error) {
    console.error("GET /api/solicitudes/reporte", error?.message);
    return Response.json({ error: "No se pudo generar el reporte." }, { status: 500 });
  }
}
