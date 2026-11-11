import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

// No reutilizar la API administrativa: solo se publican los datos necesarios
// para identificar las sedes activas, nunca responsable ni datos internos.
export async function GET() {
  try {
    const sedes = await prisma.sucursal.findMany({
      where: { estado: "activo" },
      select: { id: true, nombre: true, ciudad: true },
      orderBy: [{ nombre: "asc" }, { id: "asc" }],
    });
    return Response.json({ sedes: sedes.map(({ id, nombre, ciudad }) => ({ id, nombre, ciudad })) }, { headers });
  } catch (error) {
    console.error("GET /api/sedes-publicas", error?.message);
    return Response.json({ error: "No se pudieron cargar las sedes." }, { status: 503, headers });
  }
}
