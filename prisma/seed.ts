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
  ["p-seed-01", "Splitter óptico 1x8 PLC", "SP-1X8", "Fibra óptica", "Fiberhome", "Pieza", 850, 42, "activo", "/catalogo/sol-fibra.jpg"],
  ["p-seed-02", "Patch cord SC/APC 3 m", "PC-SC-3", "Fibra óptica", "Arconet", "Unidad", 120, 300, "activo", "/catalogo/prod-adss.jpg"],
  ["p-seed-03", "Pigtail SC/APC 1.5 m", "PG-SC-15", "Fibra óptica", "Arconet", "Unidad", 65, 500, "borrador", ""],
  ["p-seed-04", "Cable ADSS 12 hilos", "ADSS-12", "Fibra óptica", "Fiberhome", "Metro", 38, 5000, "activo", "/catalogo/prod-adss.jpg"],
  ["p-seed-05", "Modulador ágil CATV", "MOD-AG-500", "CATV y satélite", "PBI", "Unidad", 4200, 8, "activo", "/catalogo/infraestructura.jpg"],
  ["p-seed-06", "Amplificador de línea 1 GHz", "AMP-1G", "CATV y satélite", "Lindsay", "Unidad", 3150, 12, "activo", ""],
  ["p-seed-07", "Receptor satelital DVB-S2", "RX-DVBS2", "CATV y satélite", "PBI", "Unidad", 1890, 0, "activo", ""],
  ["p-seed-08", "Cable coaxial RG-11", "RG-11", "CATV y satélite", "Belden", "Rollo", 2450, 0, "inactivo", ""],
  ["p-seed-09", "Gabinete rack de pared 9U", "RK-W9", "Infraestructura", "Arconet", "Unidad", 2450, 14, "activo", "/catalogo/prod-gabinete.png"],
  ["p-seed-10", "Gabinete rack de piso 42U", "RK-F42", "Infraestructura", "Arconet", "Unidad", 8900, 5, "activo", "/catalogo/prod-gabinete.jpg"],
  ["p-seed-11", "Organizador horizontal 1U", "ORG-1U", "Infraestructura", "Arconet", "Unidad", 320, 60, "activo", ""],
  ["p-seed-12", "OTDR portátil 1310/1550 nm", "OTDR-1316", "Medición y señal", "Sumitomo", "Unidad", 28500, 3, "activo", "/catalogo/prod-otdr.jpg"],
  ["p-seed-13", "Medidor de potencia óptico PON", "PM-PON", "Medición y señal", "Joinwit", "Unidad", 4300, 9, "activo", "/catalogo/prod-powermeter.jpg"],
  ["p-seed-14", "Fusionadora de fibra óptica", "FUS-82C", "Medición y señal", "Sumitomo", "Unidad", 42000, 2, "activo", "/catalogo/prod-fusionadora.jpg"],
  ["p-seed-15", "Kit de herramientas para fibra", "KIT-FTTH", "Accesorios", "Arconet", "Caja", 1850, 20, "activo", "/catalogo/prod-herramientas.jpg"],
  ["p-seed-16", "Conector de campo SC/APC", "CON-SC-APC", "Accesorios", "Fiberhome", "Unidad", 95, 0, "borrador", ""],
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

async function main() {
  for (const s of SUCURSALES) {
    await prisma.sucursal.upsert({ where: { id: s.id }, update: s, create: s });
  }

  for (const [id, nombre, puesto, correo, telefono, sucursalId, rol, estado, ingreso] of TRABAJADORES) {
    const data = { nombre, puesto, correo, telefono, sucursalId, rol, estado, ingreso: new Date(ingreso) };
    await prisma.trabajador.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, rtn, contacto, correo, telefono, direccion, ciudad, estado, fechaRegistro] of CLIENTES) {
    const data = { nombre, rtn, contacto, correo, telefono, direccion, ciudad, estado, fechaRegistro: new Date(fechaRegistro) };
    await prisma.cliente.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  for (const [id, nombre, sku, categoria, marca, unidad, precio, stock, estado, foto] of PRODUCTOS) {
    const data = { nombre, sku, categoria, marca, unidad, precio, stock, estado, foto };
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

  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be set (min 12 chars).");
  }
  const usuarios = [
    ["u-admin", "Sof��a Aguilar", "sofia.aguilar@arconet.com", hashPassword(seedPassword), "administrador", "sps"],
    ["u-demo", "Sof��a Aguilar", "admin@arconet.com", hashPassword(seedPassword), "administrador", "sps"],
  ];
  for (const [id, nombre, correo, passwordHash, rol, sucursalId] of usuarios) {
    const data = { nombre, correo, passwordHash, rol, sucursalId, activo: true };
    await prisma.usuario.upsert({ where: { id }, update: data, create: { id, ...data } });
  }

  console.log("Seed completo:", {
    sucursales: await prisma.sucursal.count(),
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
