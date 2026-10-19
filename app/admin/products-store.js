export const PRODUCT_CATEGORIES = [
  "Fibra óptica",
  "CATV y satélite",
  "Infraestructura",
  "Medición y señal",
  "Accesorios",
];

export const PRODUCT_UNITS = ["Unidad", "Pieza", "Par", "Metro", "Rollo", "Caja"];

const UNIT_PLURALS = {
  Unidad: "Unidades",
  Pieza: "Piezas",
  Par: "Pares",
  Metro: "Metros",
  Rollo: "Rollos",
  Caja: "Cajas",
};

export const PRODUCT_STATUSES = [
  { id: "activo", label: "Activo" },
  { id: "borrador", label: "Borrador" },
  { id: "inactivo", label: "Inactivo" },
];

const PRODUCTS_KEY = "arconet-products";
const SEED_KEY = "arconet-products-seed";
const SEED_VERSION = "1";

const SEED = [
  {
    id: "p-seed-01",
    nombre: "Splitter óptico 1x8 PLC",
    sku: "SP-1X8",
    categoria: "Fibra óptica",
    marca: "Fiberhome",
    unidad: "Pieza",
    precio: 850,
    stock: 42,
    estado: "activo",
    foto: "/catalogo/sol-fibra.jpg",
  },
  {
    id: "p-seed-02",
    nombre: "Patch cord SC/APC 3 m",
    sku: "PC-SC-3",
    categoria: "Fibra óptica",
    marca: "Arconet",
    unidad: "Unidad",
    precio: 120,
    stock: 300,
    estado: "activo",
    foto: "/catalogo/prod-adss.jpg",
  },
  {
    id: "p-seed-03",
    nombre: "Pigtail SC/APC 1.5 m",
    sku: "PG-SC-15",
    categoria: "Fibra óptica",
    marca: "Arconet",
    unidad: "Unidad",
    precio: 65,
    stock: 500,
    estado: "borrador",
    foto: "",
  },
  {
    id: "p-seed-04",
    nombre: "Cable ADSS 12 hilos",
    sku: "ADSS-12",
    categoria: "Fibra óptica",
    marca: "Fiberhome",
    unidad: "Metro",
    precio: 38,
    stock: 5000,
    estado: "activo",
    foto: "/catalogo/prod-adss.jpg",
  },
  {
    id: "p-seed-05",
    nombre: "Modulador ágil CATV",
    sku: "MOD-AG-500",
    categoria: "CATV y satélite",
    marca: "PBI",
    unidad: "Unidad",
    precio: 4200,
    stock: 8,
    estado: "activo",
    foto: "/catalogo/infraestructura.jpg",
  },
  {
    id: "p-seed-06",
    nombre: "Amplificador de línea 1 GHz",
    sku: "AMP-1G",
    categoria: "CATV y satélite",
    marca: "Lindsay",
    unidad: "Unidad",
    precio: 3150,
    stock: 12,
    estado: "activo",
    foto: "",
  },
  {
    id: "p-seed-07",
    nombre: "Receptor satelital DVB-S2",
    sku: "RX-DVBS2",
    categoria: "CATV y satélite",
    marca: "PBI",
    unidad: "Unidad",
    precio: 1890,
    stock: 0,
    estado: "activo",
    foto: "",
  },
  {
    id: "p-seed-08",
    nombre: "Cable coaxial RG-11",
    sku: "RG-11",
    categoria: "CATV y satélite",
    marca: "Belden",
    unidad: "Rollo",
    precio: 2450,
    stock: 0,
    estado: "inactivo",
    foto: "",
  },
  {
    id: "p-seed-09",
    nombre: "Gabinete rack de pared 9U",
    sku: "RK-W9",
    categoria: "Infraestructura",
    marca: "Arconet",
    unidad: "Unidad",
    precio: 2450,
    stock: 14,
    estado: "activo",
    foto: "/catalogo/prod-gabinete.png",
  },
  {
    id: "p-seed-10",
    nombre: "Gabinete rack de piso 42U",
    sku: "RK-F42",
    categoria: "Infraestructura",
    marca: "Arconet",
    unidad: "Unidad",
    precio: 8900,
    stock: 5,
    estado: "activo",
    foto: "/catalogo/prod-gabinete.jpg",
  },
  {
    id: "p-seed-11",
    nombre: "Organizador horizontal 1U",
    sku: "ORG-1U",
    categoria: "Infraestructura",
    marca: "Arconet",
    unidad: "Unidad",
    precio: 320,
    stock: 60,
    estado: "activo",
    foto: "",
  },
  {
    id: "p-seed-12",
    nombre: "OTDR portátil 1310/1550 nm",
    sku: "OTDR-1316",
    categoria: "Medición y señal",
    marca: "Sumitomo",
    unidad: "Unidad",
    precio: 28500,
    stock: 3,
    estado: "activo",
    foto: "/catalogo/prod-otdr.jpg",
  },
  {
    id: "p-seed-13",
    nombre: "Medidor de potencia óptico PON",
    sku: "PM-PON",
    categoria: "Medición y señal",
    marca: "Joinwit",
    unidad: "Unidad",
    precio: 4300,
    stock: 9,
    estado: "activo",
    foto: "/catalogo/prod-powermeter.jpg",
  },
  {
    id: "p-seed-14",
    nombre: "Fusionadora de fibra óptica",
    sku: "FUS-82C",
    categoria: "Medición y señal",
    marca: "Sumitomo",
    unidad: "Unidad",
    precio: 42000,
    stock: 2,
    estado: "activo",
    foto: "/catalogo/prod-fusionadora.jpg",
  },
  {
    id: "p-seed-15",
    nombre: "Kit de herramientas para fibra",
    sku: "KIT-FTTH",
    categoria: "Accesorios",
    marca: "Arconet",
    unidad: "Caja",
    precio: 1850,
    stock: 20,
    estado: "activo",
    foto: "/catalogo/prod-herramientas.jpg",
  },
  {
    id: "p-seed-16",
    nombre: "Conector de campo SC/APC",
    sku: "CON-SC-APC",
    categoria: "Accesorios",
    marca: "Fiberhome",
    unidad: "Unidad",
    precio: 95,
    stock: 0,
    estado: "borrador",
    foto: "",
  },
];

function canUseStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function newProductId() {
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

export async function fetchProducts() {
  return api("/api/productos");
}

export async function createProduct(product) {
  return api("/api/productos", {
    method: "POST",
    body: JSON.stringify(product),
  });
}

export async function updateProduct(id, product) {
  return api(`/api/productos/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id) {
  return api(`/api/productos/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function loadProducts() {
  if (!canUseStorage()) return SEED.map((product) => ({ ...product }));
  try {
    const version = window.localStorage.getItem(SEED_KEY);
    const raw = window.localStorage.getItem(PRODUCTS_KEY);
    if (!raw || version !== SEED_VERSION) {
      window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(SEED));
      window.localStorage.setItem(SEED_KEY, SEED_VERSION);
      return SEED.map((product) => ({ ...product }));
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("formato inválido");
    return parsed;
  } catch {
    return SEED.map((product) => ({ ...product }));
  }
}

export function saveProducts(products) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  } catch {}
}

export function formatPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `L ${amount.toLocaleString("es-HN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function unitLabel(unit, quantity = 0) {
  const singular = String(unit || "Unidad").trim() || "Unidad";
  const plural = UNIT_PLURALS[singular] || `${singular}s`;
  return (Number(quantity) === 1 ? singular : plural).toLowerCase();
}

export function formatStock(quantity, unit) {
  const amount = Number(quantity) || 0;
  return `${amount} ${unitLabel(unit, amount)}`;
}

export function productInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "··";
  const first = parts[0][0] || "";
  const second = parts.length > 1 ? parts[1][0] || "" : "";
  return (first + second).toUpperCase();
}
