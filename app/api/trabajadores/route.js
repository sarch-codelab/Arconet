import { prisma } from "../../../lib/prisma";
import { newWorkerId, parseTrabajador } from "../../../lib/trabajadores";
import { toTrabajador } from "../../../lib/serialize";
import { parseAcceso, syncUsuario } from "../../../lib/usuarios";
import { requireSession, requireRole } from "../../../lib/dal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const guard = await requireRole(["administrador", "gerente"]);
  if (guard.response) return guard.response;
  const { searchParams } = new URL(request.url);
  const sucursal = searchParams.get("sucursal");
  const rol = searchParams.get("rol");
  const estado = searchParams.get("estado");

  const where = {};
  if (sucursal) where.sucursalId = sucursal;
  if (rol) where.rol = rol;
  if (estado) where.estado = estado;

  const take = Math.min(Math.max(Number(new URL(request.url).searchParams.get("take")) || 100, 1), 500);
  const skip = Math.max(Number(new URL(request.url).searchParams.get("skip")) || 0, 0);

  try {
    const trabajadores = await prisma.trabajador.findMany({
      where,
      orderBy: { nombre: "asc" },
      take,
      skip,
      select: {
        id: true, nombre: true, puesto: true, correo: true, telefono: true,
        sucursalId: true, rol: true, estado: true, ingreso: true, foto: true,
      },
    });
    const correos = trabajadores.map((trabajador) => trabajador.correo);
    const cuentas = await prisma.usuario.findMany({
      where: { correo: { in: correos } },
      select: { correo: true, activo: true },
    });
    const cuentasPorCorreo = new Map(cuentas.map((cuenta) => [cuenta.correo, cuenta]));
    return Response.json(
      trabajadores.map((trabajador) => toTrabajador(trabajador, cuentasPorCorreo.get(trabajador.correo))),
    );
  } catch (error) {
    console.error("GET /api/trabajadores", error?.message);
    return Response.json({ error: "No se pudieron obtener los trabajadores." }, { status: 500 });
  }
}

export async function POST(request) {
  const guard = await requireRole(["administrador"]);
  if (guard.response) return guard.response;
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { data, errors } = parseTrabajador(body);
  if (errors.length) return Response.json({ error: errors[0], errors }, { status: 400 });

  const acceso = parseAcceso(body);
  if (acceso.errors.length) return Response.json({ error: acceso.errors[0], errors: acceso.errors }, { status: 400 });

  if (acceso.accesoPanel) {
    const correo = data.correo;
    const cuentaExistente = await prisma.usuario.findUnique({ where: { correo } });
    if (!cuentaExistente && !acceso.password.trim()) {
      return Response.json(
        { error: "Para dar acceso al panel necesitás una contraseña." },
        { status: 400 },
      );
    }
  }

  try {
    const trabajador = await prisma.trabajador.create({
      data: { id: newWorkerId(), ...data },
    });
    let cuenta;
    try {
      cuenta = await syncUsuario(prisma, trabajador, acceso);
    } catch (error) {
      await prisma.trabajador.delete({ where: { id: trabajador.id } });
      if (error?.code === "PASSWORD_REQUIRED") {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
    return Response.json(toTrabajador(trabajador, cuenta), { status: 201 });
  } catch (error) {
    if (error?.code === "P2002") {
      return Response.json({ error: "Ya existe un trabajador con ese correo." }, { status: 409 });
    }
    console.error("POST /api/trabajadores", error);
    return Response.json({ error: "No se pudo crear el trabajador." }, { status: 500 });
  }
}
