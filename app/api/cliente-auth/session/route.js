import { prisma } from "../../../../lib/prisma";
import { deleteClientSession, getClientSession } from "../../../../lib/client-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getClientSession();
  if (!session) return Response.json({ error: "No autenticado." }, { status: 401 });

  try {
    const account = await prisma.clienteCuenta.findUnique({
      where: { clienteId: session.clienteId },
      select: {
        activo: true,
        cliente: {
          select: {
            id: true,
            nombre: true,
            contacto: true,
            correo: true,
            telefono: true,
            rtn: true,
            ciudad: true,
            direccion: true,
            estado: true,
          },
        },
      },
    });
    if (!account?.activo || account.cliente.estado === "inactivo") {
      await deleteClientSession();
      return Response.json({ error: "La cuenta está desactivada." }, { status: 401 });
    }
    return Response.json({
      id: account.cliente.id,
      clienteId: account.cliente.id,
      nombre: account.cliente.contacto || account.cliente.nombre,
      empresa: account.cliente.nombre,
      correo: account.cliente.correo,
      telefono: account.cliente.telefono || "",
      rtn: account.cliente.rtn || "",
      ciudad: account.cliente.ciudad || "",
      direccion: account.cliente.direccion || "",
    });
  } catch (error) {
    console.error("GET /api/cliente-auth/session", error?.message);
    return Response.json({ error: "No se pudo verificar la cuenta." }, { status: 503 });
  }
}
