import { prisma } from "../../../lib/prisma";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../../lib/contact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await prisma.configuracionSistema.findMany({
      where: { clave: { in: ["whatsapp", "email", "phone"] } },
      select: { clave: true, valor: true },
    });
    const values = Object.fromEntries(rows.map(({ clave, valor }) => [clave, valor]));
    return Response.json({
      whatsapp: (values.whatsapp || "").replace(/[^\d]/g, ""),
      email: values.email || CONTACT_EMAIL,
      phone: values.phone || CONTACT_PHONE,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/site-config", error?.message);
    return Response.json({ error: "No se pudo cargar el contacto." }, { status: 503 });
  }
}
