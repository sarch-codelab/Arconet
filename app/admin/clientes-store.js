import { nanoid } from "nanoid";

export const CLIENT_STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "inactivo", label: "Inactivo" },
  { id: "prospecto", label: "Prospecto" },
];

const SEED = [
  {
    id: "c-1",
    nombre: "Empresa TelecomHN",
    rtn: "08011999000123",
    contacto: "Juan Pérez",
    correo: "juan@telecomhn.com",
    telefono: "+504 2500-1234",
    direccion: "Bouvard del Norte, Tegucigalpa",
    ciudad: "Tegucigalpa",
    estado: "activo",
    fechaRegistro: "2026-01-15",
  },
  {
    id: "c-2",
    nombre: "Constructora Morales",
    rtn: "08011999000456",
    contacto: "María García",
    correo: "maria@constructoramorales.com",
    telefono: "+504 2550-5678",
    direccion: "Col. El Pedregal, San Pedro Sula",
    ciudad: "San Pedro Sula",
    estado: "activo",
    fechaRegistro: "2026-03-20",
  },
  {
    id: "c-3",
    nombre: "Hotel Ceiba Beach",
    rtn: "08011999000789",
    contacto: "Roberto Martínez",
    correo: "roberto@ceibabeach.com",
    telefono: "+504 2440-9012",
    direccion: "Boulevard del Centro, La Ceiba",
    ciudad: "La Ceiba",
    estado: "activo",
    fechaRegistro: "2026-05-10",
  },
];

const KEY = "arconet-clientes";
const SEED_KEY = "arconet-clientes-seed";

function hasSeed() {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(SEED_KEY);
}

export function loadClientes() {
  if (typeof window === "undefined") return [...SEED];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Error cargando clientes", error);
  }
  if (hasSeed()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      window.localStorage.setItem(SEED_KEY, "v1");
    } catch (error) {
      console.warn("Error sembrando clientes", error);
    }
  }
  return [...SEED];
}

export function saveClientes(clientes) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(clientes));
  } catch (error) {
    console.warn("Error guardando clientes", error);
  }
}

export function newClienteId() {
  return `c-${nanoid(8)}`;
}

export function clientStatusLabel(statusId) {
  const status = CLIENT_STATUSES.find((item) => item.id === statusId);
  return status ? status.label : statusId;
}

export function initialsCliente(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
