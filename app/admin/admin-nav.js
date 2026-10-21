"use client";

import { createContext } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Check,
  Clock,
  Database,
  FileText,
  Key,
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
  Server,
  Settings,
  ShieldCheck,
  ScrollText,
  TrendingUp,
  Truck,
  User,
  Users,
} from "lucide-react";

/**
 * Contexto compartido del panel administrativo.
 * Vive en su propio modulo para que la cabecera (`topbar.js`) y la seccion
 * de flota puedan consumirlo sin importar el monolito `admin-experience.js`
 * (que a su vez carga `flota.js` de forma perezosa).
 */
export const AdminContext = createContext({
  section: "trabajadores",
  goTo: () => {},
  onOpenNav: () => {},
  onLogout: () => {},
  navOpen: false,
  session: null,
});

/** Secciones del panel, en el orden en que aparecen en la barra lateral. */
export const NAV = [
  { id: "trabajadores", label: "Trabajadores", icon: Users },
  { id: "productos", label: "Productos", icon: Package },
  { id: "sucursales", label: "Sucursales", icon: Building2 },
  { id: "clientes", label: "Clientes", icon: User },
  { id: "cotizaciones", label: "Cotizaciones", icon: FileText },
  { id: "flota", label: "Flota", icon: Truck },
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
  trabajadores: {
    brandName: "Personal",
    tabs: [
      { id: "all", label: "Trabajadores", icon: Users, title: "Todos los trabajadores" },
      { id: "active", label: "Activos", icon: Check, title: "Personal activo" },
      { id: "sps", label: "San Pedro", icon: Building2, title: "Sede San Pedro Sula" },
      { id: "ceiba", label: "La Ceiba", icon: MapPin, title: "Sede La Ceiba" },
      { id: "roles", label: "Gerencia", icon: ShieldCheck, title: "Roles administrativos" },
    ],
  },
  productos: {
    brandName: "Productos",
    tabs: [
      { id: "all", label: "Productos", icon: Package, title: "Catálogo completo" },
      { id: "active", label: "En Stock", icon: Check, title: "Productos disponibles" },
      { id: "out", label: "Agotados", icon: AlertTriangle, title: "Productos agotados" },
      { id: "fiber", label: "Fibra", icon: Layers, title: "Fibra óptica" },
      { id: "prices", label: "Tarifas", icon: TrendingUp, title: "Precios y stock" },
    ],
  },
  sucursales: {
    brandName: "Sucursales",
    tabs: [
      { id: "all", label: "Sucursales", icon: Building2, title: "Todas las sucursales" },
      { id: "sps", label: "SPS Norte", icon: MapPin, title: "Sede San Pedro Sula" },
      { id: "ceiba", label: "Ceiba Atl.", icon: MapPin, title: "Sede La Ceiba" },
      { id: "warehouses", label: "Almacenes", icon: Package, title: "Bodegas principales" },
      { id: "routes", label: "Rutas", icon: Truck, title: "Rutas de entrega" },
    ],
  },
  clientes: {
    brandName: "Clientes",
    tabs: [
      { id: "all", label: "Clientes", icon: User, title: "Directorio de clientes" },
      { id: "active", label: "Activos", icon: Check, title: "Cuentas activas" },
      { id: "companies", label: "Empresas", icon: Building2, title: "Clientes corporativos" },
      { id: "orders", label: "Cotizados", icon: FileText, title: "Con cotizaciones recientes" },
      { id: "growth", label: "Actividad", icon: TrendingUp, title: "Actividad comercial" },
    ],
  },
  cotizaciones: {
    brandName: "Cotizaciones",
    tabs: [
      { id: "all", label: "Cotizaciones", icon: FileText, title: "Todas las cotizaciones" },
      { id: "pending", label: "Pendientes", icon: Clock, title: "En revisión" },
      { id: "approved", label: "Aprobadas", icon: Check, title: "Aprobadas" },
      { id: "completed", label: "Ventas", icon: TrendingUp, title: "Ventas cerradas" },
      { id: "balance", label: "Balance", icon: BarChart3, title: "Balance de ventas" },
    ],
  },
  flota: {
    brandName: "Flota",
    tabs: [
      { id: "dashboard", label: "Panel", icon: Layers, title: "Panel de flota" },
      { id: "vehicles", label: "Vehículos", icon: Truck, title: "Lista de camiones" },
      { id: "map", label: "Rastreo GPS", icon: MapPin, title: "Mapa satelital" },
      { id: "orders", label: "Manifiestos", icon: FileText, title: "Órdenes de despacho" },
      { id: "analytics", label: "Analítica", icon: TrendingUp, title: "Telemetría y combustible" },
    ],
  },
  resumen: {
    brandName: "Resumen",
    tabs: [
      { id: "all", label: "Resumen", icon: LayoutDashboard, title: "Visión general" },
      { id: "sales", label: "Ventas", icon: TrendingUp, title: "Cotizaciones e ingresos" },
      { id: "stock", label: "Stock", icon: Package, title: "Inventario" },
      { id: "team", label: "Equipo", icon: Users, title: "Personal" },
      { id: "fleet", label: "Flota", icon: Truck, title: "Flota y camiones" },
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
      { id: "notifications", label: "Notificaciones", icon: Bell, title: "Preferencias de notificaciones" },
      { id: "privacy", label: "Privacidad", icon: ShieldCheck, title: "Configuración de privacidad" },
      { id: "appearance", label: "Apariencia", icon: Settings, title: "Tema, idioma y densidad" },
      { id: "api", label: "Claves API", icon: Key, title: "Claves de acceso para integraciones" },
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
