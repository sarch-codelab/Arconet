import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../lib/auth";
import { assertLocalDatabase } from "../ops/local-database.mjs";

// Mantener la contraseña corta fuera del seed y de las bases de producción.
assertLocalDatabase();
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  const passwordHash = hashPassword("1234");
  const now = new Date();
  const accounts = [
    ["admin", "Administrador local", "administrador"],
    ["ventas", "Ventas de prueba", "ventas"],
    ["tecnico", "Técnico de prueba", "tecnico"],
    ["bodega", "Bodega de prueba", "bodega"],
  ];
  await prisma.$transaction(async (tx) => {
    for (const [alias, nombre, rol] of accounts) {
      const correo = `${alias}@arconet.local`;
      const data = { nombre, correo, passwordHash, rol, sucursalId: "sps", activo: true, verificadoAt: now };
      await tx.usuario.upsert({ where: { id: `u-local-${alias}` }, create: { id: `u-local-${alias}`, ...data }, update: data });
      const worker = { nombre, correo, rol, sucursalId: "sps", estado: "activo", puesto: "Cuenta de pruebas locales" };
      await tx.trabajador.upsert({ where: { id: `w-local-${alias}` }, create: { id: `w-local-${alias}`, ...worker }, update: worker });
    }
    // También admite el correo demo conocido, exclusivamente en esta base.
    await tx.usuario.update({ where: { id: "u-demo" }, data: { passwordHash, nombre: "Administrador demo local" } });
    await tx.cliente.update({ where: { id: "c-1" }, data: { correo: "cliente@arconet.local", contacto: "Cliente de prueba" } });
    const clientAccount = { clienteId: "c-1", correo: "cliente@arconet.local", passwordHash, activo: true, estado: "aprobado", aprobadoPor: "admin@arconet.local", aprobadoAt: now, verificadoAt: now };
    await tx.clienteCuenta.upsert({ where: { id: "cuenta-local-cliente" }, create: { id: "cuenta-local-cliente", ...clientAccount }, update: clientAccount });

    const warehouses = [
      { id: "bodega-local-sps", nombre: "Bodega principal · pruebas", codigo: "LOCAL-SPS", sucursalId: "sps", esPrincipal: true },
      { id: "bodega-local-ceiba", nombre: "Bodega Ceiba · pruebas", codigo: "LOCAL-CEIBA", sucursalId: "la-ceiba", esPrincipal: false },
    ];
    for (const data of warehouses) await tx.bodega.upsert({ where: { id: data.id }, create: data, update: data });
    const products = await tx.producto.findMany({ orderBy: { id: "asc" } });
    for (const [index, product] of products.entries()) {
      const base = String(200000000000 + index);
      const sum = [...base].reduce((total, digit, i) => total + Number(digit) * (i % 2 ? 3 : 1), 0);
      const codigoBarras = `${base}${(10 - sum % 10) % 10}`;
      const cost = Math.round(Number(product.precio) * 0.65 * 100) / 100;
      await tx.producto.update({ where: { id: product.id }, data: { costo: cost, stockMinimo: product.unidad === "Metro" ? 1000 : 5, ubicacion: `Estante ${index + 1}`, codigoBarras } });
      const secondary = Math.floor(product.stock * 0.2);
      const amounts = [product.stock - secondary, secondary];
      for (const [i, warehouse] of warehouses.entries()) {
        const quantity = amounts[i];
        await tx.productoStock.upsert({ where: { productoId_bodegaId: { productoId: product.id, bodegaId: warehouse.id } }, create: { productoId: product.id, bodegaId: warehouse.id, cantidad: quantity }, update: { cantidad: quantity } });
        if (quantity > 0) await tx.movimientoKardex.upsert({
          where: { id: `mov-local-${product.id}-${i}` }, update: {},
          create: { id: `mov-local-${product.id}-${i}`, tipo: "entrada", productoId: product.id, bodegaId: warehouse.id, cantidad: quantity, saldoAnterior: 0, saldoDespues: quantity, costoUnitario: cost, referencia: "seed-local", motivo: "Existencias iniciales de prueba", actor: "admin@arconet.local" },
        });
      }
    }
    await tx.proveedor.upsert({ where: { id: "proveedor-local" }, update: {}, create: { id: "proveedor-local", nombre: "Proveedor de demostración", email: "proveedor@arconet.local", contacto: "Compras locales", notas: "Datos ficticios, no contactar proveedores reales." } });
    await tx.ordenCompra.upsert({ where: { id: "oc-local-demo" }, update: {}, create: { id: "oc-local-demo", numero: "OC-LOCAL-0001", proveedorId: "proveedor-local", estado: "borrador", subtotal: 5000, total: 5000, notas: "Compra de prueba: puede recibirse desde Inventario.", createdBy: "admin@arconet.local", items: { create: [{ productoId: "p-seed-01", nombre: "Splitter óptico 1x8 PLC", cantidad: 10, costoUnitario: 500 }] } } });
    const request = { titulo: "Preparar material de demostración", descripcion: "Orden interna de prueba para explorar responsables, comentarios, adjuntos y cambios de estado.", area: "bodega", prioridad: "normal", estado: "pendiente", solicitanteCorreo: "ventas@arconet.local", solicitanteNombre: "Ventas de prueba", solicitanteRol: "ventas", responsableCorreo: "bodega@arconet.local", fechaLimite: new Date(now.getTime() + 86400000) };
    await tx.solicitudInterna.upsert({ where: { id: "sol-local-demo" }, update: {}, create: { id: "sol-local-demo", ...request } });
    await tx.notificacion.upsert({ where: { id: "notificacion-local-demo" }, update: {}, create: { id: "notificacion-local-demo", recipient: "admin@arconet.local", title: "Entorno local preparado", message: "Puedes probar inventario, ventas, facturación y solicitudes con datos ficticios.", solicitudId: "sol-local-demo" } });
    const settings = {
      companyName: "Arconet · pruebas locales", email: "contacto@arconet.local", phone: "+504 0000-0000", whatsapp: "",
      "fiscal.nombre": "ARCONET · PRUEBAS SIN VALIDEZ FISCAL",
      "fiscal.direccion": "Entorno local de demostración",
      "local.seed.version": "1",
    };
    for (const [clave, valor] of Object.entries(settings)) await tx.configuracionSistema.upsert({ where: { clave }, create: { clave, valor }, update: { valor } });
    await tx.log.create({ data: { categoria: "sistema", mensaje: "Base local de pruebas inicializada. Sin datos ni conexiones de producción.", actor: "seed-local" } });
  }, { timeout: 30000 });
  console.log("Datos locales listos: administrador, 3 roles de prueba, cliente, existencias por bodega, kardex, compra y solicitud interna.");
}
main().catch((error) => { console.error("Seed local falló:", error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
