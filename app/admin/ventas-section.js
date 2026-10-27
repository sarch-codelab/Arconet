"use client";

import { useState } from "react";
import CotizacionesSection from "./cotizaciones-section";
import FacturacionPanel from "./facturacion-panel";
import { SECTION_NAV_CONFIG } from "./admin-nav";

/**
 * Seccion unificada de Ventas.
 *
 * Antes existian dos entradas separadas en la barra lateral ("Cotizaciones" y
 * "Facturacion"), lo que confundia porque ambas listaban documentos parecidos.
 * Ahora hay UNA sola seccion con pills internas:
 *  - Cotizaciones / Ventas / Pendientes / Aprobadas / Completadas / Todas:
 *    flujo comercial (CotizacionesSection).
 *  - Facturas: facturacion fiscal con CAI (FacturacionPanel).
 */
export default function VentasSection({ orders, setOrders, clientes, setClientes, products, workers, session }) {
  const [activeTab, setActiveTab] = useState("cotizaciones");

  if (activeTab === "facturas") {
    return (
      <FacturacionPanel
        session={session}
        productos={products}
        hideTopbar
        tabs={SECTION_NAV_CONFIG.ventas?.tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    );
  }

  return (
    <CotizacionesSection
      orders={orders}
      setOrders={setOrders}
      clientes={clientes}
      setClientes={setClientes}
      products={products}
      workers={workers}
      session={session}
      hideTopbar
      tabs={SECTION_NAV_CONFIG.ventas?.tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    />
  );
}
