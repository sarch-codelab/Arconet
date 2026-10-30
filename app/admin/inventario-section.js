"use client";
import { Suspense, lazy } from "react";
import {
  Boxes,
  Package,
  ShoppingCart,
  FileText,
  Truck,
  Users,
  ScrollText,
  ArrowLeftRight,
  Warehouse,
  AlertTriangle,
} from "lucide-react";
import {
  allowedInventoryViews,
  resolveInventoryView,
} from "@/lib/admin-navigation";
import { SectionTabs, Topbar } from "./topbar";
import styles from "./admin-experience.module.css";
const StockPanel = lazy(() => import("./inventario-panel"));
const ProductsSection = lazy(() => import("./products-section"));
const ComprasPanel = lazy(() => import("./compras-panel"));
const ProvidersPanel = lazy(() => import("./proveedores-panel"));
const LABELS = {
  productos: ["Productos", Package],
  stock: ["Stock", Boxes],
  compras: ["Compras", ShoppingCart],
  cotizaciones: ["Cotizaciones a proveedores", FileText],
  recepciones: ["Recepciones", Truck],
  proveedores: ["Proveedores", Users],
  kardex: ["Kardex", ScrollText],
  movimientos: ["Movimientos", ArrowLeftRight],
  bodegas: ["Bodegas", Warehouse],
  alertas: ["Alertas", AlertTriangle],
};
export default function InventarioSection({
  session,
  products = [],
  setProducts,
  categorias = [],
  workers = [],
  view,
  onViewChange,
}) {
  const allowed = allowedInventoryViews(session?.permisos),
    tab = resolveInventoryView(session?.permisos, view);
  const navigation = (
    <SectionTabs
      tabs={allowed.map((id) => ({
        id,
        label: LABELS[id][0],
        icon: LABELS[id][1],
      }))}
      activeTab={tab}
      onTabChange={onViewChange}
      label="Secciones de inventario"
    />
  );
  let content;
  if (tab === "productos")
    content = (
      <ProductsSection
        products={products}
        setProducts={setProducts}
        categorias={categorias}
        workers={workers}
        session={session}
        navigation={navigation}
      />
    );
  else if (
    ["stock", "kardex", "movimientos", "bodegas", "alertas"].includes(tab)
  )
    content = (
      <StockPanel
        session={session}
        productos={products}
        activeTab={tab}
        onTabChange={onViewChange}
        navigation={navigation}
      />
    );
  else
    content = (
      <>
        <Topbar
          title={`Inventario · ${LABELS[tab]?.[0] || "Acceso"}`}
          subtitle="Abastecimiento a proveedores. Una cotización o compra no crea stock; la recepción sí."
          session={session}
        />
        <div className={styles.body}>
          {navigation}
          {tab === "proveedores" ? (
            <ProvidersPanel session={session} />
          ) : tab ? (
            <ComprasPanel
              view={tab}
              session={session}
              onViewChange={onViewChange}
            />
          ) : (
            <p>Solicita permiso de lectura para acceder al inventario.</p>
          )}
        </div>
      </>
    );
  return (
    <Suspense
      fallback={<div className={styles.body}>Cargando inventario…</div>}
    >
      {content}
    </Suspense>
  );
}
