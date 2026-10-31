"use client";

import { createContext } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Boxes,
  Building2,
  Check,
  ClipboardList,
  Clock,
  Database,
  FileText,
  Key,
  LayoutDashboard,
  MapPin,
  Receipt,
  Server,
  Settings,
  ShoppingCart,
  ShieldCheck,
  ScrollText,
  Tags,
  TrendingUp,
  Truck,
  User,
  Users,
} from "lucide-react";

/**
 * Contexto compartido del panel administrativo, separado para que la
 * cabecera pueda acceder a navegación y sesión sin importar el monolito.
 */
export const AdminContext = createContext({
  section: "trabajadores",
  goTo: () => {},
  onLogout: () => {},
  session: null,
  // Búsqueda global de ventas: al pulsar Enter en el buscador de la cabecera,
  // si estamos en la seccion Ventas se delega aqui para filtrar la lista
  // actual (en vez de solo saltar a la primera coincidencia).
  applyVentasSearch: () => {},
});

/** Secciones del panel, en el orden en que aparecen en la barra lateral. */
export const NAV = [
  { id: "trabajadores", label: "Trabajadores", icon: Users },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "categorias", label: "Categorías", icon: Tags },
  { id: "sucursales", label: "Sucursales", icon: Building2 },
  { id: "clientes", label: "Clientes", icon: User },
  { id: "ventas", label: "Ventas", icon: ShoppingCart },
  { id: "inventario", label: "Inventario", icon: Boxes },
  { id: "solicitudes", label: "Órdenes internas", icon: ClipboardList },
  { id: "monitoreo", label: "Monitoreo", icon: Activity },
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "resumen", label: "Resumen", icon: LayoutDashboard },
  { id: "mi-perfil", label: "Mi perfil", icon: User },
  { id: "ajustes", label: "Ajustes", icon: Settings },
];

/**
 * Sub-navegacion (pills) de cada seccion.
 * `brandName` es el nombre corto de la seccion; cada tab define su icono,
 * su etiqueta visible y el texto largo usado en tooltips y avisos.
 */
export const SECTION_NAV_CONFIG = {
  // Clave generica de respaldo: si una seccion no tiene config propia, las
  // paginas usan `?.tabs` y no revientan al renderizar.
  __fallback: { brandName: "Panel", tabs: [] },
  trabajadores: {
    brandName: "Personal",
    tabs: [
      { id: "all", label: "Trabajadores", icon: Users, title: "Todos los trabajadores" },
    ],
  },
  roles: {
    brandName: "Roles",
    tabs: [
      { id: "all", label: "Roles", icon: ShieldCheck, title: "Todos los roles" },
    ],
  },
  // Productos ya no lleva una segunda fila de píldoras: arriba está la
  // sub-navegación de Inventario (Productos, Stock, Kardex…) y debajo viven los
  // filtros reales del listado. Antes se pintaban las dos filas, ambas
  // empezando por "Productos", así que parecía un botón duplicado. "En Stock"
  // y "Agotados" ahora son opciones del filtro de existencias, junto a
  // categoría y estado, en vez de pestañas que competían con la navegación.
  productos: {
    brandName: "Productos",
    tabs: [],
  },
  categorias: {
    brandName: "Categorías",
    tabs: [
      { id: "all", label: "Categorías", icon: Tags, title: "Todas las categorías" },
    ],
  },
  sucursales: {
    brandName: "Sucursales",
    tabs: [
      { id: "all", label: "Sucursales", icon: Building2, title: "Todas las sucursales" },
    ],
  },
  clientes: {
    brandName: "Clientes",
    tabs: [
      { id: "all", label: "Clientes", icon: User, title: "Directorio de clientes" },
    ],
  },
  ventas: {
    brandName: "Ventas",
    tabs: [
      // "Todas" va primero: es la pestana inicial al entrar a Ventas.
      { id: "todas", label: "Todas", icon: BarChart3, title: "Cotizaciones y ventas" },
      { id: "cotizaciones", label: "Cotizaciones", icon: FileText, title: "Solo cotizaciones" },
      { id: "ventas", label: "Ventas", icon: TrendingUp, title: "Facturas fiscales e históricos comerciales" },
      { id: "pendientes", label: "Pendientes", icon: Clock, title: "En revisión" },
      { id: "aprobadas", label: "Aprobadas", icon: Check, title: "Aprobadas" },
      { id: "completadas", label: "Completadas", icon: Check, title: "Completadas" },
      { id: "precios", label: "Precios", icon: TrendingUp, title: "Tres precios de venta: normal, descuento y mayorista" },
    ],
  },
  resumen: {
    brandName: "Resumen",
    tabs: [
      // Los filtros de área se construyen con el DTO autorizado del Resumen;
      // no ofrecer Ventas, Stock o Personal a todos los roles por defecto.
      { id: "all", label: "Resumen", icon: LayoutDashboard, title: "Visión de tus áreas" },
    ],
  },
  monitoreo: {
    brandName: "Monitoreo",
    tabs: [
      { id: "all", label: "Sistema", icon: Activity, title: "Estado del sistema" },
      { id: "server", label: "Servidor", icon: Server, title: "Recursos del servidor" },
      { id: "backups", label: "Backups", icon: Database, title: "Copias de seguridad" },
      { id: "alerts", label: "Alertas", icon: AlertTriangle, title: "Alertas activas" },
    ],
  },
  logs: {
    brandName: "Logs",
    tabs: [
      { id: "all", label: "Todos", icon: ScrollText, title: "Registro de actividad" },
      { id: "auth", label: "Autenticación", icon: User, title: "Accesos y sesiones" },
      { id: "panel", label: "Panel", icon: LayoutDashboard, title: "Acciones del panel" },
      { id: "api", label: "API", icon: Server, title: "Llamadas a la API" },
      { id: "db", label: "Base de datos", icon: Database, title: "Eventos de base de datos" },
      { id: "sistema", label: "Sistema", icon: Activity, title: "Eventos del sistema" },
    ],
  },
  "mi-perfil": {
    brandName: "Mi perfil",
    tabs: [
      { id: "all", label: "Perfil", icon: User, title: "Mi perfil de usuario" },
      { id: "activity", label: "Actividad", icon: Activity, title: "Mi actividad reciente" },
      { id: "security", label: "Seguridad", icon: ShieldCheck, title: "Seguridad de mi cuenta" },
      { id: "appearance", label: "Apariencia", icon: Settings, title: "Tema personal del panel" },
    ],
  },
  ajustes: {
    brandName: "Ajustes",
    tabs: [
      { id: "all", label: "Ajustes", icon: Settings, title: "Configuración general" },
      { id: "profile", label: "Perfil", icon: User, title: "Perfil de usuario" },
      { id: "security", label: "Seguridad", icon: ShieldCheck, title: "Permisos y accesos" },
      { id: "branches", label: "Sedes", icon: Building2, title: "Parámetros de sucursales" },
      { id: "notifs", label: "Alertas", icon: Bell, title: "Notificaciones" },
    ],
  },
};
