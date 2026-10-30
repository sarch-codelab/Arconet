"use client";

import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import CotizacionesSection from "./cotizaciones-section";
import PreciosPanel from "./precios-panel";
import FacturacionPanel from "./facturacion-panel";
import { AdminContext, SECTION_NAV_CONFIG } from "./admin-nav";
import { Topbar } from "./topbar";
import { allowedSalesTabs } from "@/lib/admin-navigation";

/**
 * Seccion unificada de Ventas.
 *
 * Antes existian dos entradas separadas en la barra lateral ("Cotizaciones" y
 * "Facturacion"), lo que confundia porque ambas listaban documentos parecidos.
 * Ahora hay UNA sola seccion con pills internas:
 *  - Cotizaciones / Ventas / Pendientes / Aprobadas / Completadas / Todas:
 *    flujo comercial (CotizacionesSection).
 *  - Precios: tarifas normal, descuento y mayorista; autorización propia.
 *  - Facturas: facturacion fiscal con CAI (FacturacionPanel).
 *
 * La cabecera global (logo, pildora de secciones, buscador, notificaciones y
 * circulo de perfil) se monta aqui una sola vez con `chromeOnly`, de modo que
 * no se duplique al cambiar de pestana y siga viendose identica que en las
 * demas paginas del panel. Cada pestana aporta su propio titulo/acciones en
 * el cuerpo mediante SectionTabs + sub-barra propia.
 */
export default function VentasSection({ orders, setOrders, clientes, setClientes, products, setProducts, workers, session }) {
  // La pestana inicial es "Todas": al entrar a Ventas se ve el flujo completo
  // (cotizaciones + ventas) en lugar de un subconjunto.
  const tabs = useMemo(() => allowedSalesTabs(SECTION_NAV_CONFIG.ventas?.tabs || [], session?.permisos), [session?.permisos]);
  const [requestedTab, setActiveTab] = useState(() => tabs[0]?.id || "todas");
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : tabs[0]?.id;
  // Extender, no reemplazar: Topbar necesita section/goTo/session del shell.
  const adminContext = useContext(AdminContext);

  // El buscador global de la cabecera, al pulsar Enter aqui, filtra la lista
  // actual en vez de solo saltar de seccion (ver topbar.js).
  const applyVentasSearch = useCallback((term) => {
    window.dispatchEvent(new CustomEvent("arconet:ventas-search", { detail: String(term || "") }));
  }, []);

  useEffect(() => () => {
    // Si sale del panel con el foco/valor del buscador puesto, nada que limpiar:
    // los listeners de las listas se desmontan solos.
  }, []);

  return (
    <AdminContext.Provider value={{ ...adminContext, applyVentasSearch }}>
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
          onClientCreated={client => setClientes?.(current => [client, ...current.filter(item => item.id !== client.id)])}
          hideTopbar
          chromeOnly
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      ) : activeTab === "precios" ? (
        <PreciosPanel products={products} setProducts={setProducts} session={session} tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      )}
    </AdminContext.Provider>
  );
}
