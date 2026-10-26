// Portal de clientes: acceso seguro a los datos del propio cliente.
// Ninguna ruta del portal usa permisos de admin; todo se filtra por el
// clienteId de la sesión de cliente y se valida que la cuenta siga activa.

import { prisma } from "./prisma";
import { getClientSession } from "./client-session";

export const CLIENT_TRANSICIONES = {
  pendiente: ["cancelada"],
  en_proceso: ["cancelada"],
  aprobada: ["cancelada"],
};

export async function requireClientSession() {
  const session = await getClientSession();
  if (!session) {
    return { session: null, response: Response.json({ error: "No autenticado." }, { status: 401 }) };
  }
  try {
    const account = await prisma.clienteCuenta.findUnique({
      where: { clienteId: session.clienteId },
      select: { activo: true, cliente: { select: { estado: true } } },
    });
    if (!account?.activo || account.cliente.estado === "inactivo") {
      return { session: null, response: Response.json({ error: "La cuenta está desactivada." }, { status: 401 }) };
    }
  } catch (error) {
    console.error("requireClientSession", error?.message);
    return { session: null, response: Response.json({ error: "No se pudo verificar la cuenta." }, { status: 503 }) };
  }
  return { session, response: null };
}

/**
 * Devuelve la orden solo si pertenece al cliente de la sesión.
 */
export async function findClientOrder(clienteId, id) {
  if (typeof id !== "string" || !id) return null;
  const orden = await prisma.orden.findFirst({
    where: { id, clienteId },
    include: {
      cliente: true,
      items: true,
      pagos: { orderBy: { fecha: "asc" } },
      eventos: { orderBy: { fecha: "desc" }, take: 30 },
    },
  });
  return orden;
}

/**
 * Total acumulado pagado (pagos confirmados) de una orden.
 */
export function totalPagado(pagos = []) {
  return pagos
    .filter((pago) => pago.estado === "confirmado")
    .reduce((sum, pago) => sum + Number(pago.monto), 0);
}
