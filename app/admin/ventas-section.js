"use client";

import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Receipt, FileText } from "lucide-react";
import CotizacionesSection from "./cotizaciones-section";
import PreciosPanel from "./precios-panel";
import FacturacionPanel from "./facturacion-panel";
import { AdminContext, SECTION_NAV_CONFIG } from "./admin-nav";
import { Topbar } from "./topbar";
import { allowedSalesTabs, allowedSalesCreationModes } from "@/lib/admin-navigation";
import { useBodyScrollLock } from "./use-body-scroll-lock";
import adminStyles from "./admin-experience.module.css";
import styles from "./ventas-section.module.css";

function SaleKindDialog({ onChoose, onClose }) {
  const ref = useRef(null);
  useBodyScrollLock(true);
  useEffect(() => {
    const previous = document.activeElement;
    const dialog = ref.current;
    dialog.showModal();
    return () => { dialog.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={ref} className={styles.kindDialog} aria-labelledby="sale-kind-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <h2 id="sale-kind-title">Nueva venta</h2>
    <p>Elige el comprobante de esta venta. Se registra una sola operación; no crees otra venta para obtener su comprobante.</p>
    <div className={styles.choices}>
      <button type="button" onClick={() => onChoose("comercial")}><FileText size={22} /><strong>Comprobante comercial</strong><span>Venta sin desglose fiscal. No sustituye una factura autorizada.</span></button>
      <button type="button" onClick={() => onChoose("fiscal")}><Receipt size={22} /><strong>Factura fiscal</strong><span>Venta con ISV y controles de CAI/correlativo. Se consulta en Facturas.</span></button>
    </div>
    <button type="button" className={adminStyles.ghostBtn} onClick={onClose}>Cancelar nueva venta</button>
  </dialog>;
}

// Una sola entrada para crear: Nueva venta / Nueva cotización. «Facturas» es
// el registro y control fiscal, no un segundo flujo de alta de la misma venta.
export default function VentasSection({ orders, setOrders, clientes, setClientes, products, setProducts, workers, session }) {
  const tabs = useMemo(() => allowedSalesTabs(SECTION_NAV_CONFIG.ventas?.tabs || [], session?.permisos), [session?.permisos]);
  const modes = allowedSalesCreationModes(session?.permisos);
  const [requestedTab, setActiveTab] = useState(() => tabs[0]?.id || "todas");
  const activeTab = tabs.some(tab => tab.id === requestedTab) ? requestedTab : tabs[0]?.id;
  const commercialRef = useRef(null);
  const [choosing, setChoosing] = useState(false);
  const [fiscalEditorOpen, setFiscalEditorOpen] = useState(false);
  const [fiscalVisited, setFiscalVisited] = useState(false);
  const adminContext = useContext(AdminContext);
  const hasCommercial = tabs.some(tab => !["facturas", "precios"].includes(tab.id));
  const hasFiscal = tabs.some(tab => tab.id === "facturas");
  const commercialVisible = !["facturas", "precios"].includes(activeTab);
  const fiscalEditorVisible = fiscalEditorOpen && activeTab === "facturas" && hasFiscal;

  const applyVentasSearch = useCallback(term => {
    window.dispatchEvent(new CustomEvent("arconet:ventas-search", { detail: String(term || "") }));
  }, []);

  function changeTab(tab) {
    if (!tabs.some(item => item.id === tab)) return;
    if (tab === "facturas") setFiscalVisited(true);
    if (tab !== "facturas") setFiscalEditorOpen(false);
    setActiveTab(tab);
  }
  function createSale(mode) {
    if (!modes.includes(mode)) return;
    setChoosing(false);
    if (mode === "fiscal") {
      setFiscalVisited(true); setActiveTab("facturas"); setFiscalEditorOpen(true);
    } else {
      setFiscalEditorOpen(false); setActiveTab("ventas"); commercialRef.current?.create("venta");
    }
  }
  function newSale() {
    if (modes.length === 1) createSale(modes[0]);
    else if (modes.length > 1) setChoosing(true);
  }
  function newQuote() {
    if (!modes.includes("comercial")) return;
    setFiscalEditorOpen(false); setActiveTab("cotizaciones"); commercialRef.current?.create("cotizacion");
  }

  return <AdminContext.Provider value={{ ...adminContext, applyVentasSearch }}>
    <Topbar chromeOnly title="Ventas" session={session} workers={workers} />
    {!fiscalEditorVisible && modes.length > 0 ? <div className={styles.actions} role="group" aria-label="Crear documento de venta">
      <button type="button" className={`${adminStyles.primaryBtn} ${adminStyles.salesActionBtn}`} onClick={newSale}><Plus size={16} /> Nueva venta</button>
      {modes.includes("comercial") ? <button type="button" className={`${adminStyles.ghostBtn} ${adminStyles.salesActionBtn}`} onClick={newQuote}><FileText size={16} /> Nueva cotización</button> : null}
    </div> : null}
    {hasCommercial ? <div hidden={!commercialVisible}>
      <CotizacionesSection editorRef={commercialRef} hideCreateActions orders={orders} setOrders={setOrders} clientes={clientes} setClientes={setClientes} products={products} workers={workers} session={session} hideTopbar chromeOnly tabs={tabs} activeTab={commercialVisible ? activeTab : "todas"} onTabChange={changeTab} />
    </div> : null}
    {hasFiscal && (activeTab === "facturas" || fiscalVisited) ? <div hidden={activeTab !== "facturas"}>
      <FacturacionPanel session={session} productos={products} onClientCreated={client => setClientes?.(current => [client, ...current.filter(item => item.id !== client.id)])} hideTopbar chromeOnly tabs={tabs} activeTab="facturas" onTabChange={changeTab} saleEditorOpen={fiscalEditorVisible} onSaleEditorClose={() => setFiscalEditorOpen(false)} />
    </div> : null}
    {activeTab === "precios" ? <PreciosPanel products={products} setProducts={setProducts} session={session} tabs={tabs} activeTab={activeTab} onTabChange={changeTab} /> : null}
    {choosing ? <SaleKindDialog onChoose={createSale} onClose={() => setChoosing(false)} /> : null}
  </AdminContext.Provider>;
}
