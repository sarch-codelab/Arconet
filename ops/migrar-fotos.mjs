import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { guardarImagen, MEDIA_DIR } from "../lib/almacen-fotos.js";

// Pasa a archivos las fotos que quedaron guardadas como base64 en la base.
//
// Antes de este cambio, cada foto vivía en su columna como data URL: hasta
// 200 KB de texto por imagen, dentro de la tabla y de cada respaldo. El código
// nuevo ya guarda archivos; esto limpia lo que había.
//
// Es idempotente: si una foto ya es una ruta (/media/..., /catalogo/... o una
// URL) no se toca, así que se puede ejecutar las veces que haga falta.
//
//   node ops/migrar-fotos.mjs           # migra
//   node ops/migrar-fotos.mjs --dry-run # solo cuenta
//
// Conviene un respaldo antes: pg_dump, o `node ops/backup-db.mjs`.

const dryRun = process.argv.includes("--dry-run");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const esBase64 = (valor) => typeof valor === "string" && valor.startsWith("data:image/");
const kb = (texto) => Math.round(String(texto).length / 1024);

let migradas = 0;
let fallidas = 0;
let liberado = 0;

async function convertir(valor, carpeta, base) {
  if (!esBase64(valor)) return valor;
  if (dryRun) {
    migradas += 1;
    liberado += kb(valor);
    return valor;
  }
  try {
    const ruta = await guardarImagen({ carpeta, dataUrl: valor, base });
    migradas += 1;
    liberado += kb(valor);
    return ruta;
  } catch (error) {
    fallidas += 1;
    console.error(`  ✗ ${carpeta}/${base}: ${error.message}`);
    return valor;
  }
}

async function main() {
  console.log(`Almacén de fotos: ${MEDIA_DIR}${dryRun ? "  (simulación)" : ""}\n`);

  // --- Productos: foto principal y galería ---
  const productos = await prisma.producto.findMany({ select: { id: true, sku: true, foto: true, fotos: true } });
  const conFoto = productos.filter((p) => esBase64(p.foto) || (p.fotos || []).some(esBase64));
  console.log(`Productos con imagen en base64: ${conFoto.length} de ${productos.length}`);
  for (const producto of conFoto) {
    const foto = await convertir(producto.foto, "productos", producto.sku || producto.id);
    const fotos = [];
    for (const [indice, imagen] of (producto.fotos || []).entries()) {
      fotos.push(await convertir(imagen, "productos", `${producto.sku || producto.id}-${indice + 1}`));
    }
    const cambia = foto !== producto.foto || fotos.some((f, i) => f !== producto.fotos[i]);
    if (cambia && !dryRun) {
      await prisma.producto.update({ where: { id: producto.id }, data: { foto: foto ?? null, fotos } });
    }
  }

  // --- Clientes ---
  const clientes = await prisma.cliente.findMany({ select: { id: true, nombre: true, foto: true } });
  const clientesConFoto = clientes.filter((c) => esBase64(c.foto));
  console.log(`Clientes con imagen en base64: ${clientesConFoto.length} de ${clientes.length}`);
  for (const cliente of clientesConFoto) {
    const foto = await convertir(cliente.foto, "clientes", cliente.id);
    if (foto !== cliente.foto && !dryRun) {
      await prisma.cliente.update({ where: { id: cliente.id }, data: { foto } });
    }
  }

  // --- Trabajadores ---
  const trabajadores = await prisma.trabajador.findMany({ select: { id: true, correo: true, foto: true } });
  const trabajadoresConFoto = trabajadores.filter((t) => esBase64(t.foto));
  console.log(`Trabajadores con imagen en base64: ${trabajadoresConFoto.length} de ${trabajadores.length}`);
  for (const trabajador of trabajadoresConFoto) {
    const foto = await convertir(trabajador.foto, "trabajadores", trabajador.id);
    if (foto !== trabajador.foto && !dryRun) {
      await prisma.trabajador.update({ where: { id: trabajador.id }, data: { foto } });
    }
  }

  // --- Usuarios (avatar del panel) ---
  const usuarios = await prisma.usuario.findMany({ select: { id: true, correo: true, foto: true } });
  const usuariosConFoto = usuarios.filter((u) => esBase64(u.foto));
  console.log(`Usuarios con imagen en base64: ${usuariosConFoto.length} de ${usuarios.length}`);
  for (const usuario of usuariosConFoto) {
    const foto = await convertir(usuario.foto, "usuarios", usuario.correo);
    if (foto !== usuario.foto && !dryRun) {
      await prisma.usuario.update({ where: { id: usuario.id }, data: { foto } });
    }
  }

  // --- Categorías ---
  const categorias = await prisma.categoria.findMany({ select: { id: true, slug: true, foto: true } });
  const categoriasConFoto = categorias.filter((c) => esBase64(c.foto));
  console.log(`Categorías con imagen en base64: ${categoriasConFoto.length} de ${categorias.length}`);
  for (const categoria of categoriasConFoto) {
    const foto = await convertir(categoria.foto, "categorias", categoria.slug || categoria.id);
    if (foto !== categoria.foto && !dryRun) {
      await prisma.categoria.update({ where: { id: categoria.id }, data: { foto } });
    }
  }

  console.log(`\n${dryRun ? "Se migrarían" : "Migradas"}: ${migradas} imágenes · ${liberado} KB fuera de la base`);
  if (fallidas) console.log(`Fallidas: ${fallidas} (quedaron como estaban)`);
  if (dryRun) console.log("Nada se escribió. Ejecuta sin --dry-run para migrar.");
}

main()
  .catch((error) => {
    console.error("La migración falló:", error?.message || error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
