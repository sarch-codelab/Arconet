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
  Layers,
  LayoutDashboard,
  MapPin,
  Package,
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
});

/** Secciones del panel, en el orden en que aparecen en la barra lateral. */
export const NAV = [
  { id: "trabajadores", label: "Trabajadores", icon: Users },
  { id: "roles", label: "Roles", icon: ShieldCheck },
  { id: "productos", label: "Productos", icon: Package },
  { id: "categorias", label: "Categorías", icon: Tags },
  { id: "sucursales", label: "Sucursales", icon: Building2 },
  { id: "clientes", label: "Clientes", icon: User },
  { id: "cotizaciones", label: "Cotizaciones", icon: FileText },
  { id: "facturacion", label: "Facturación", icon: Receipt },
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
      { id: "active", label: "Activos", icon: Check, title: "Personal activo" },
      { id: "sps", label: "San Pedro", icon: Building2, title: "Sede San Pedro Sula" },
      { id: "roles", label: "Roles", icon: ShieldCheck, title: "Roles y permisos del sistema" },
      { id: "ceiba", label: "La Ceiba", icon: MapPin, title: "Sede La Ceiba" },
      { id: "gerencia", label: "Gerencia", icon: ShieldCheck, title: "Personal de gerencia" },
    ],
  },
  roles: {
    brandName: "Roles",
    tabs: [
      { id: "all", label: "Roles", icon: ShieldCheck, title: "Todos los roles" },
      { id: "active", label: "Activos", icon: Check, title: "Roles que se pueden asignar" },
      { id: "inactive", label: "Inactivos", icon: Clock, title: "Roles desactivados" },
    ],
  },
  productos: {
    brandName: "Productos",
    tabs: [
      { id: "all", label: "Productos", icon: Package, title: "Catálogo completo" },
      { id: "active", label: "En Stock", icon: Check, title: "Productos disponibles" },
      { id: "out", label: "Agotados", icon: AlertTriangle, title: "Productos agotados" },
      { id: "fiber", label: "Pasivos", icon: Layers, title: "Componentes pasivos" },
      { id: "prices", label: "Tarifas", icon: TrendingUp, title: "Precios y stock" },
    ],
  },
  categorias: {
    brandName: "Categorías",
    tabs: [
      { id: "all", label: "Categorías", icon: Tags, title: "Todas las categorías" },
      { id: "active", label: "Activas", icon: Check, title: "Categorías visibles en el catálogo" },
      { id: "used", label: "Con productos", icon: Package, title: "Categorías con productos asignados" },
      { id: "empty", label: "Vacías", icon: Layers, title: "Categorías sin productos" },
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
      { id: "cotizaciones", label: "Cotizaciones", icon: FileText, title: "Solo cotizaciones" },
      { id: "ventas", label: "Ventas", icon: TrendingUp, title: "Ventas comerciales (descuentan inventario)" },
      { id: "pendientes", label: "Pendientes", icon: Clock, title: "En revisión" },
      { id: "aprobadas", label: "Aprobadas", icon: Check, title: "Aprobadas" },
      { id: "completadas", label: "Completadas", icon: Check, title: "Completadas" },
      { id: "todas", label: "Todas", icon: BarChart3, title: "Cotizaciones y ventas" },
    ],
  },
  resumen: {
    brandName: "Resumen",
    tabs: [
      { id: "all", label: "Resumen", icon: LayoutDashboard, title: "Visión general" },
      { id: "sales", label: "Ventas", icon: TrendingUp, title: "Cotizaciones e ingresos" },
      { id: "stock", label: "Stock", icon: Package, title: "Inventario" },
      { id: "team", label: "Equipo", icon: Users, title: "Personal" },
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
