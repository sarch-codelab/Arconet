import { nanoid } from "nanoid";

export const ORDER_STATUSES = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_proceso", label: "En proceso" },
  { id: "aprobada", label: "Aprobada" },
  { id: "rechazada", label: "Rechazada" },
  { id: "completada", label: "Completada" },
  { id: "cancelada", label: "Cancelada" },
];

export const ORDER_TYPES = [
  { id: "cotizacion", label: "Cotización" },
  { id: "venta", label: "Venta" },
];

const SEED = [
  {
    id: "o-1",
    tipo: "cotizacion",
    cliente: "Empresa TelecomHN",
    clienteId: "c-1",
    fecha: "2026-10-14",
    monto: 45000,
    estado: "pendiente",
    items: [
      { productoId: "p-1", nombre: "Cable óptico 12 hilos", cantidad: 500, precio: 50 },
      { productoId: "p-2", nombre: "Splitter 1x8", cantidad: 20, precio: 1250 },
    ],
    notas: "Proyecto de instalación zona norte",
  },
  {
    id: "o-2",
    tipo: "venta",
    cliente: "Constructora Morales",
    clienteId: "c-2",
    fecha: "2026-10-12",
    monto: 12500,
    estado: "completada",
    items: [
      { productoId: "p-3", nombre: "Caja terminal FTTH", cantidad: 50, precio: 250 },
    ],
    notas: "Entrega en sucursal SPS",
  },
  {
    id: "o-3",
    tipo: "cotizacion",
    cliente: "Hotel Ceiba Beach",
    clienteId: "c-3",
    fecha: "2026-10-10",
    monto: 87500,
    estado: "aprobada",
    items: [
      { productoId: "p-1", nombre: "Cable óptico 12 hilos", cantidad: 1000, precio: 50 },
      { productoId: "p-4", nombre: "Conector SC/APC", cantidad: 200, precio: 35 },
    ],
    notas: "Infraestructura completa hotel",
  },
];

const KEY = "arconet-orders";
const SEED_KEY = "arconet-orders-seed";

function hasSeed() {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(SEED_KEY);
}

export function loadOrders() {
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
    console.warn("Error cargando órdenes", error);
  }
  if (hasSeed()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(SEED));
      window.localStorage.setItem(SEED_KEY, "v1");
    } catch (error) {
      console.warn("Error sembrando órdenes", error);
    }
  }
  return [...SEED];
}

export function saveOrders(orders) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(orders));
  } catch (error) {
    console.warn("Error guardando órdenes", error);
  }
}

export function newOrderId() {
  return `o-${nanoid(8)}`;
}

export function orderStatusLabel(statusId) {
  const status = ORDER_STATUSES.find((item) => item.id === statusId);
  return status ? status.label : statusId;
}

export function orderTypeLabel(typeId) {
  const type = ORDER_TYPES.find((item) => item.id === typeId);
  return type ? type.label : typeId;
}

export function formatOrderDate(dateString) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  return date.toLocaleDateString("es-HN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
