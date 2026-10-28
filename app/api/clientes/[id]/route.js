import { prisma } from '@/lib/prisma';
import { parseCliente } from '@/lib/clientes';
import { toCliente } from '@/lib/serialize';
import { requirePermission } from '@/lib/dal';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  const guard = await requirePermission("clientes:read");
  if (guard.response) return guard.response;
  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id } });
  if (!cliente) return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
  return Response.json(toCliente(cliente));
}

export async function PATCH(request, { params }) {
  const guard = await requirePermission("clientes:write");
  if (guard.response) return guard.response;
  const { id } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseCliente(body, { partial: true });
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  try {
    const cliente = await prisma.$transaction(async (tx) => {
      const updated = await tx.cliente.update({ where: { id }, data });
      if (Object.prototype.hasOwnProperty.call(data, "correo")) {
        if (data.correo) {
          await tx.clienteCuenta.updateMany({
            where: { clienteId: id },
            data: { correo: data.correo.toLowerCase(), activo: true },
          });
        } else {
          await tx.clienteCuenta.updateMany({ where: { clienteId: id }, data: { activo: false } });
        }
      }
      return updated;
    });
    return Response.json(toCliente(cliente));
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2002" || error?.code === "23505") {
      return Response.json({ error: "Ese correo ya está asociado a otra cuenta." }, { status: 409 });
    }
    console.error("PATCH /api/clientes/[id]", error);
    return Response.json({ error: "No se pudo actualizar el cliente." }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  const guard = await requirePermission("clientes:delete");
  if (guard.response) return guard.response;
  const { id } = await params;
  try {
    await prisma.cliente.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    if (error?.code === "P2025") {
      return Response.json({ error: "Cliente no encontrado." }, { status: 404 });
    }
    if (error?.code === "P2003") {
      return Response.json(
        { error: "No se puede eliminar: el cliente tiene órdenes asociadas." },
        { status: 409 },
      );
    }
    console.error("DELETE /api/clientes/[id]", error);
    return Response.json({ error: "No se pudo eliminar el cliente." }, { status: 500 });
  }
}
