import { nanoid } from "nanoid";

export const BRANCHES = [
  { id: "sps", label: "San Pedro Sula" },
  { id: "la-ceiba", label: "La Ceiba" },
  { id: "ceiba", label: "Ceiba" },
];

const SEED = [
  {
    id: "b-1",
    nombre: "Sucursal San Pedro Sula",
    codigo: "SPS-001",
    ciudad: "San Pedro Sula",
    direccion: "Blvd. Morazán, Col. La Juana",
    telefono: "504 2550-0000",
    email: "sps@arconet.hn",
    responsable: "Carlos Discua",
    estado: "activo",
  },
  {
    id: "b-2",
    nombre: "Sucursal La Ceiba",
    codigo: "LCE-001",
    ciudad: "La Ceiba",
    direccion: "Av. 14 de Julio, Centro",
    telefono: "504 2440-0000",
    email: "lceiba@arconet.hn",
    responsable: "José Maldonado",
    estado: "activo",
  },
  {
    id: "b-3",
    nombre: "Sucursal Ceiba",
    codigo: "CEI-001",
    ciudad: "La Ceiba",
    direccion: "Bulevar del Norte, Zona Comercial",
    telefono: "504 2441-0000",
    email: "ceiba@arconet.hn",
    responsable: "María López",
    estado: "borrador",
  },
];

const KEY = "arconet-sucursales";
const SEED_KEY = "arconet-sucursales-seed";

function hasSeed() {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(SEED_KEY);
}

export function loadSucursales() {
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
    console.warn("Error cargando sucursales", error);
  }
  if (hasSeed()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      window.localStorage.setItem(SEED_KEY, "v1");
    } catch (error) {
      console.warn("Error sembrando sucursales", error);
    }
  }
  return [...SEED];
}

export function saveSucursales(sucursales) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(sucursales));
  } catch (error) {
    console.warn("Error guardando sucursales", error);
  }
}

export function newSucursalId() {
  return `b-${nanoid(8)}`;
}

async function api(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Error ${response.status}`);
  }
  return response.json();
}

export async function fetchSucursales() {
  return api("/api/sucursales");
}

export async function createSucursal(sucursal) {
  return api("/api/sucursales", { method: "POST", body: JSON.stringify(sucursal) });
}

export async function updateSucursal(id, sucursal) {
  return api(`/api/sucursales/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(sucursal),
  });
}

export async function deleteSucursal(id) {
  return api(`/api/sucursales/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function initialsSucursal(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}
