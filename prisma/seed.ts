import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { randomBytes, scryptSync } from "node:crypto";
import "dotenv/config";

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const SUCURSALES = [
  {
    id: "sps",
    nombre: "Sucursal San Pedro Sula",
    codigo: "SPS-001",
    ciudad: "San Pedro Sula",
    direccion: "Blvd. Morazán, Col. La Juana",
    telefono: "504 2550-0000",
    email: "sps@arconet.com",
    responsable: "Carlos Discua",
    estado: "activo",
  },
  {
    id: "la-ceiba",
    nombre: "Sucursal La Ceiba",
    codigo: "LCE-001",
    ciudad: "La Ceiba",
    direccion: "Av. 14 de Julio, Centro",
    telefono: "504 2440-0000",
    email: "lceiba@arconet.com",
    responsable: "José Maldonado",
    estado: "activo",
  },
  {
    id: "ceiba",
    nombre: "Sucursal Ceiba",
    codigo: "CEI-001",
    ciudad: "La Ceiba",
    direccion: "Bulevar del Norte, Zona Comercial",
    telefono: "504 2441-0000",
    email: "ceiba@arconet.com",
    responsable: "María López",
    estado: "borrador",
  },
];

const TRABAJADORES = [
  ["w-seed-01", "Karla Mendoza", "Gerente de Sucursal", "karla.mendoza@arconet.com", "+504 9987-1200", "sps", "gerente", "activo", "2019-03-04"],
  ["w-seed-02", "Oscar Reyes", "Técnico de Fibra Óptica", "oscar.reyes@arconet.com", "+504 9455-3312", "sps", "tecnico", "activo", "2021-07-19"],
  ["w-seed-03", "Daniela Cruz", "Ejecutiva de Ventas", "daniela.cruz@arconet.com", "+504 8811-7742", "la-ceiba", "ventas", "activo", "2022-01-10"],
  ["w-seed-04", "Marvin Lobo", "Encargado de Bodega", "marvin.lobo@arconet.com", "+504 9912-8845", "la-ceiba", "bodega", "vacaciones", "2020-11-02"],
  ["w-seed-05", "Sofía Aguilar", "Administradora General", "sofia.aguilar@arconet.com", "+504 9900-1122", "sps", "administrador", "activo", "2017-05-22"],
  ["w-seed-06", "Jorge Zelaya", "Técnico CATV", "jorge.zelaya@arconet.com", "+504 9333-2210", "la-ceiba", "tecnico", "activo", "2023-02-14"],
  ["w-seed-07", "Génesis Flores", "Asistente Administrativa", "genesis.flores@arconet.com", "+504 9777-6655", "sps", "administrador", "inactivo", "2021-09-30"],
  ["w-seed-08", "Edwin Paredes", "Ejecutivo de Ventas", "edwin.paredes@arconet.com", "+504 8622-9090", "sps", "ventas", "activo", "2024-04-08"],
];

const CLIENTES = [
  ["c-1", "Empresa TelecomHN", "08011999000123", "Juan Pérez", "juan@telecomhn.com", "+504 2500-1234", "Bouvard del Norte, Tegucigalpa", "Tegucigalpa", "activo", "2026-01-15"],
  ["c-2", "Constructora Morales", "08011999000456", "María García", "maria@constructoramorales.com", "+504 2550-5678", "Col. El Pedregal, San Pedro Sula", "San Pedro Sula", "activo", "2026-03-20"],
  ["c-3", "Hotel Ceiba Beach", "08011999000789", "Roberto Martínez", "roberto@ceibabeach.com", "+504 2440-9012", "Boulevard del Centro, La Ceiba", "La Ceiba", "activo", "2026-05-10"],
];

const PRODUCTOS = [
  ["p-seed-01", "Splitter óptico 1x8 PLC", "SP-1X8", "Componentes pasivos", "Fiberhome", "Pieza", 850, 42, "activo", "/catalogo/sol-fibra.jpg", ["/catalogo/prod-adss.jpg", "/catalogo/hero-fiber.jpg"]],
  ["p-seed-02", "Patch cord SC/APC 3 m", "PC-SC-3", "Componentes pasivos", "Arconet", "Unidad", 120, 300, "activo", "/catalogo/prod-adss.jpg", ["/catalogo/sol-fibra.jpg"]],
  ["p-seed-03", "Pigtail SC/APC 1.5 m", "PG-SC-15", "Componentes pasivos", "Arconet", "Unidad", 65, 500, "borrador", "", []],
  ["p-seed-04", "Cable ADSS 12 hilos", "ADSS-12", "Componentes pasivos", "Fiberhome", "Metro", 38, 5000, "activo", "/catalogo/prod-adss.jpg", ["/catalogo/hero-fiber.jpg", "/catalogo/sol-fibra.jpg"]],
  ["p-seed-05", "Modulador ágil CATV", "MOD-AG-500", "Soluciones activas y Accesorios FTTH", "PBI", "Unidad", 4200, 8, "activo", "/catalogo/infraestructura.jpg", []],
  ["p-seed-06", "Amplificador de línea 1 GHz", "AMP-1G", "Soluciones activas y Accesorios FTTH", "Lindsay", "Unidad", 3150, 12, "activo", "", []],
  ["p-seed-07", "Receptor satelital DVB-S2", "RX-DVBS2", "Soluciones activas y Accesorios FTTH", "PBI", "Unidad", 1890, 0, "activo", "", []],
  ["p-seed-08", "Cable coaxial RG-11", "RG-11", "Soluciones activas y Accesorios FTTH", "Belden", "Rollo", 2450, 0, "inactivo", "", []],
  ["p-seed-09", "Gabinete rack de pared 9U", "RK-W9", "Gabinetes y Racks", "Arconet", "Unidad", 2450, 14, "activo", "/catalogo/prod-gabinete.png", ["/catalogo/prod-gabinete.jpg"]],
  ["p-seed-10", "Gabinete rack de piso 42U", "RK-F42", "Gabinetes y Racks", "Arconet", "Unidad", 8900, 5, "activo", "/catalogo/prod-gabinete.jpg", ["/catalogo/prod-gabinete.png"]],
  ["p-seed-11", "Organizador horizontal 1U", "ORG-1U", "Gabinetes y Racks", "Arconet", "Unidad", 320, 60, "activo", "", []],
  ["p-seed-12", "OTDR portátil 1310/1550 nm", "OTDR-1316", "Instrumentos de medición óptica", "Sumitomo", "Unidad", 28500, 3, "activo", "/catalogo/prod-otdr.jpg", ["/catalogo/prod-powermeter.jpg", "/catalogo/prod-fusionadora.jpg"]],
  ["p-seed-13", "Medidor de potencia óptico PON", "PM-PON", "Instrumentos de medición óptica", "Joinwit", "Unidad", 4300, 9, "activo", "/catalogo/prod-powermeter.jpg", ["/catalogo/prod-otdr.jpg"]],
  ["p-seed-14", "Fusionadora de fibra óptica", "FUS-82C", "Instrumentos de medición óptica", "Sumitomo", "Unidad", 42000, 2, "activo", "/catalogo/prod-fusionadora.jpg", ["/catalogo/prod-otdr.jpg", "/catalogo/prod-powermeter.jpg"]],
  ["p-seed-15", "Kit de herramientas para fibra", "KIT-FTTH", "Herramientas y kits", "Arconet", "Caja", 1850, 20, "activo", "/catalogo/prod-herramientas.jpg", []],
  ["p-seed-16", "Conector de campo SC/APC", "CON-SC-APC", "Herramientas y kits", "Fiberhome", "Unidad", 95, 0, "borrador", "", []],
];

const ORDENES = [
  ["o-1", "cotizacion", "c-1", "2026-10-14", 45000, "pendiente", "Proyecto de instalación zona norte", [
    ["p-seed-04", "Cable óptico 12 hilos", 500, 50],
    ["p-seed-01", "Splitter 1x8", 20, 1250],
  ]],
  ["o-2", "venta", "c-2", "2026-10-12", 12500, "completada", "Entrega en sucursal SPS", [
    [null, "Caja terminal FTTH", 50, 250],
  ]],
  ["o-3", "cotizacion", "c-3", "2026-10-10", 87500, "aprobada", "Infraestructura completa hotel", [
    ["p-seed-04", "Cable óptico 12 hilos", 1000, 50],
    ["p-seed-16", "Conector SC/APC", 200, 35],
  ]],
];

const ROLES = [
  ["rol-admin", "Administrador", "administrador", "Acceso total al sistema: gestión de usuarios, configuración, reportes y todas las secciones.", ["trabajadores:read","trabajadores:write","trabajadores:delete","roles:read","roles:write","roles:delete","productos:read","productos:write","productos:delete","categorias:read","categorias:write","categorias:delete","sucursales:read","sucursales:write","sucursales:delete","clientes:read","clientes:write","clientes:delete","ordenes:read","ordenes:write","ordenes:delete","inventario:read","inventario:write","inventario:delete","compras:read","compras:write","compras:delete","facturacion:read","facturacion:write","facturacion:delete","solicitudes:read","solicitudes:write","monitoreo:read","logs:read","logs:delete","reportes:read","ajustes:read","ajustes:write"], "activo"],
  ["rol-gerente", "Gerente", "gerente", "Gestión operativa: trabajadores, productos, sucursales, clientes, órdenes y reportes. Sin acceso a ajustes de sistema ni logs.", ["trabajadores:read","trabajadores:write","productos:read","productos:write","productos:delete","categorias:read","categorias:write","categorias:delete","sucursales:read","sucursales:write","clientes:read","clientes:write","clientes:delete","ordenes:read","ordenes:write","ordenes:delete","inventario:read","inventario:write","facturacion:read","facturacion:write","solicitudes:read","reportes:read","mi-perfil:read","mi-perfil:write"], "activo"],
  ["rol-tecnico", "Técnico", "tecnico", "Acceso técnico: catálogo de productos, órdenes asignadas, perfil propio. Sin gestión de personal ni configuración.", ["productos:read","ordenes:read","ordenes:write","mi-perfil:read","mi-perfil:write"], "activo"],
  ["rol-ventas", "Ventas", "ventas", "Gestión comercial: clientes, órdenes, catálogo de productos, reportes de ventas. Sin acceso a personal ni inventario.", ["productos:read","clientes:read","clientes:write","ordenes:read","ordenes:write","reportes:read","mi-perfil:read","mi-perfil:write"], "activo"],
  ["rol-bodega", "Bodega", "bodega", "Control de inventario: productos, stock, órdenes de preparación. Sin acceso a clientes ni configuración.", ["productos:read","productos:write","inventario:read","inventario:write","inventario:delete","compras:read","compras:write","solicitudes:read","ordenes:read","mi-perfil:read","mi-perfil:write"], "activo"],
];

const CATEGORIAS = [
  ["cat-preconectorizado", "Soluciones de Preconectorizado", "soluciones-de-preconectorizado", "Cables, pigtails y patch cords terminados en fábrica para instalar más rápido y con menos pérdidas.", "/catalogo/sol-fibra.jpg", 1],
  ["cat-herrajes", "Herrajes", "herrajes", "Soportes, abrazaderas y tensores para fijar cable y equipos con seguridad en poste, fachada o pared.", "/catalogo/infraestructura.jpg", 2],
  ["cat-gabinetes", "Gabinetes y Racks", "gabinetes-y-racks", "El lugar donde vive tu equipo: ordenado, ventilado y listo para crecer contigo.", "/catalogo/prod-gabinete.jpg", 3],
  ["cat-cajas", "Cajas de Distribución y Emplazamiento", "cajas-de-distribucion-y-emplazamiento", "Cajas de empalme, terminales y NAPs para organizar la distribución y proteger los empalmes en campo.", "/catalogo/sol-fibra.jpg", 4],
  ["cat-activas", "Soluciones activas y Accesorios FTTH", "soluciones-activas-y-accesorios-ftth", "Equipos activos y accesorios para redes FTTH, CATV y enlaces ópticos, desde la cabecera hasta el cliente.", "/catalogo/infraestructura.jpg", 5],
  ["cat-herramientas", "Herramientas y kits", "herramientas-y-kits", "Kits y herramientas de campo para pelar, limpiar, cortar y terminar fibra sin improvisar.", "/catalogo/prod-herramientas.jpg", 6],
  ["cat-escaleras", "Escaleras", "escaleras", "Escaleras y accesorios de altura para llegar a postes, bandejas y gabinetes con seguridad.", "/catalogo/ingeniero-casco-redes.png", 7],
  ["cat-odf", "Optical Distribution Frame - ODF", "optical-distribution-frame-odf", "Bandejas y marcos ODF para ordenar, proteger y administrar terminaciones de fibra en sala técnica.", "/catalogo/prod-gabinete.png", 8],
  ["cat-medicion", "Instrumentos de medición óptica", "instrumentos-de-medicion-optica", "Instrumentos para instalar, ajustar y diagnosticar fibra sin depender de la improvisación.", "/catalogo/prod-otdr.jpg", 9],
  ["cat-pasivos", "Componentes pasivos", "componentes-pasivos", "Splitters, conectores, adaptadores y cable para armar la red óptica sin componentes activos.", "/catalogo/hero-fiber.jpg", 10],
  ["cat-microcables", "Microcables y Microproductos", "microcables-y-microproductos", "Microcables, microductos y accesorios compactos para instalaciones FTTH de alta densidad.", "/catalogo/prod-adss.jpg", 11],
];

const MIN_PASSWORD_LENGTH = 12;

// Se valida ANTES de abrir nada contra la base: si falta la contraseña, el
// seed aborta sin dejar la base a medio sembrar (sin usuario de admin).
function validarEntorno() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password || password.trim() === "") {
    throw new Error(
      [
        "Falta la variable SEED_ADMIN_PASSWORD (contraseña inicial del usuario admin).",
        `- Definí SEED_ADMIN_PASSWORD en tu archivo .env con al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
        "- Si no tenés .env, partí del ejemplo: cp .env.example .env",
        "- No se escribió nada en la base de datos.",
      ].join("\n"),
    );
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(
      [
        `SEED_ADMIN_PASSWORD es demasiado corta (${password.length} caracteres, mínimo ${MIN_PASSWORD_LENGTH}).`,
        "- Usá una contraseña de al menos 12 caracteres en tu archivo .env (ver .env.example).",
        "- No se escribió nada en la base de datos.",
      ].join("\n"),
    );
  }
  return password;
}

async function main() {
  const seedPassword = validarEntorno();

  for (const s of SUCURSALES) {
    await prisma.sucursal.upsert({ where: { id: s.id }, update: s, create: s });
  }

  for (const [id, nombre, slug, descripcion, foto, orden] of CATEGORIAS) {
    const data = { nombre, slug, descripcion, foto, orden, estado: "activo" };
    await prisma.categoria.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, slug, descripcion, permisos, estado] of ROLES) {
    const data = { nombre, slug, descripcion, permisos, estado };
    await prisma.rol.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, puesto, correo, telefono, sucursalId, rol, estado, ingreso] of TRABAJADORES) {
    const data = { nombre, puesto, correo, telefono, sucursalId, rol, estado, ingreso: new Date(ingreso) };
    await prisma.trabajador.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, rtn, contacto, correo, telefono, direccion, ciudad, estado, fechaRegistro] of CLIENTES) {
    const data = { nombre, rtn, contacto, correo, telefono, direccion, ciudad, estado, fechaRegistro: new Date(fechaRegistro) };
    await prisma.cliente.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, sku, categoria, marca, unidad, precio, stock, estado, foto, fotos] of PRODUCTOS) {
    const data = { nombre, sku, categoria, marca, unidad, precio, stock, estado, foto, fotos };
    await prisma.producto.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, tipo, clienteId, fecha, monto, estado, notas, items] of ORDENES) {
    const data = { tipo, clienteId, fecha: new Date(fecha), monto, estado, notas };
    await prisma.orden.upsert({
      where: { id },
      update: data,
      create: { id, ...data },
    });
    await prisma.ordenItem.deleteMany({ where: { ordenId: id } });
    for (const [productoId, nombre, cantidad, precio] of items) {
      await prisma.ordenItem.create({
        data: { ordenId: id, productoId, nombre, cantidad, precio },
      });
    }
  }

  const usuarios = [
    ["u-admin", "Sofía Aguilar", "sofia.aguilar@arconet.com", hashPassword(seedPassword), "administrador", "sps"],
    ["u-demo", "Sofía Aguilar", "admin@arconet.com", hashPassword(seedPassword), "administrador", "sps"],
  ];
  for (const [id, nombre, correo, passwordHash, rol, sucursalId] of usuarios) {
    const data = { nombre, correo, passwordHash, rol, sucursalId, activo: true };
    await prisma.usuario.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  console.log("Seed completo:", {
    sucursales: await prisma.sucursal.count(),
    categorias: await prisma.categoria.count(),
    roles: await prisma.rol.count(),
    trabajadores: await prisma.trabajador.count(),
    clientes: await prisma.cliente.count(),
    productos: await prisma.producto.count(),
    ordenes: await prisma.orden.count(),
    usuarios: await prisma.usuario.count(),
  });
}

main()
  .catch((error) => {
    console.error("Seed falló:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
