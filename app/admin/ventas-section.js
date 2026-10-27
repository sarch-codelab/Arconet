"use client";

import { useState } from "react";
import CotizacionesSection from "./cotizaciones-section";
import FacturacionPanel from "./facturacion-panel";
import { SECTION_NAV_CONFIG } from "./admin-nav";
import { Topbar } from "./topbar";

/**
 * Seccion unificada de Ventas.
 *
 * Antes existian dos entradas separadas en la barra lateral ("Cotizaciones" y
 * "Facturacion"), lo que confundia porque ambas listaban documentos parecidos.
 * Ahora hay UNA sola seccion con pills internas:
 *  - Cotizaciones / Ventas / Pendientes / Aprobadas / Completadas / Todas:
 *    flujo comercial (CotizacionesSection).
 *  - Facturas: facturacion fiscal con CAI (FacturacionPanel).
 *
 * La cabecera global (logo, pildora de secciones, buscador, notificaciones y
 * circulo de perfil) se monta aqui una sola vez con `chromeOnly`, de modo que
 * no se duplique al cambiar de pestana y siga viendose identica que en las
 * demas paginas del panel. Cada pestana aporta su propio titulo/acciones en
 * el cuerpo mediante SectionTabs + sub-barra propia.
 */
export default function VentasSection({ orders, setOrders, clientes, setClientes, products, workers, session }) {
  const [activeTab, setActiveTab] = useState("cotizaciones");

  return (
    <>
      <Topbar
        chromeOnly
        title="Ventas"
        session={session}
        workers={workers}
      />

      {activeTab === "facturas" ? (
        <FacturacionPanel
          session={session}
          productos={products}
          hideTopbar
          chromeOnly
          tabs={SECTION_NAV_CONFIG.ventas?.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : (
        <CotizacionesSection
          orders={orders}
          setOrders={setOrders}
          clientes={clientes}
          setClientes={setClientes}
          products={products}
          workers={workers}
          session={session}
          hideTopbar
          chromeOnly
          tabs={SECTION_NAV_CONFIG.ventas?.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </>
  );
}
