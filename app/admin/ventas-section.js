"use client";

import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { BookOpen, Plus, Receipt } from "lucide-react";
import CotizacionesSection from "./cotizaciones-section";
import FacturacionPanel from "./facturacion-panel";
import PreciosPanel from "./precios-panel";
import SalesDialog from "./sales-dialog";
import BusinessNotice from "./business-notice";
import { fetchProducts } from "./products-store";
import { AdminContext, SECTION_NAV_CONFIG } from "./admin-nav";
import { Topbar } from "./topbar";
import { allowedSalesTabs, allowedSalesCreationModes } from "@/lib/admin-navigation";
import adminStyles from "./admin-experience.module.css";
import styles from "./ventas-section.module.css";

/** Ventas y cotizaciones comparten listado, nunca autorización ni doble emisión. */
export default function VentasSection({ orders = [], setOrders, clientes = [], setClientes, products = [], setProducts, workers = [], session, draftMemory }) {
  const adminContext = useContext(AdminContext);
  const applyVentasSearch = useCallback(term => {
    window.dispatchEvent(new CustomEvent("arconet:ventas-search", { detail: String(term || "") }));
  }, []);
  const permisos = useMemo(() => session?.permisos || [], [session?.permisos]);
  const tabs = useMemo(() => allowedSalesTabs(SECTION_NAV_CONFIG.ventas.tabs, permisos), [permisos]);
  const [activeTab, setActiveTab] = useState(() => tabs[0]?.id || "todas");
  const selectedTab = tabs.some(tab => tab.id === activeTab) ? activeTab : tabs[0]?.id || "todas";
  const canReadCommercial = permisos.includes("ordenes:read");
  const canCreateQuote = canReadCommercial && permisos.includes("ordenes:write");
  const canReadFiscal = permisos.includes("facturacion:read");
  const canCreateSale = allowedSalesCreationModes(permisos).includes("fiscal");
  const [fiscalView, setFiscalView] = useState(null);
  const [fiscalDocuments, setFiscalDocuments] = useState([]);
  const [lastSaved, setLastSaved] = useState(null);
  const [fiscalStatus, setFiscalStatus] = useState({ loading: false, error: "" });
  const quoteEditor = useRef(null);
  const fiscalEditor = useRef(null);
  const canCloseFiscal = () => fiscalEditor.current?.canClose() !== false;
  const refreshInventory = useCallback(async () => {
    if (!permisos.includes("productos:read") || !setProducts) return;
    setProducts(await fetchProducts());
  }, [permisos, setProducts]);
  const dialogTitle = fiscalView === "nueva" ? "Nueva venta" : fiscalView === "libro" ? "Libro de ventas" : "Detalle de venta";

  function createQuote() {
    if (!canCreateQuote) return;
    quoteEditor.current?.create("cotizacion");
  }
  function showFiscalDetail(documento) {
    fiscalEditor.current?.openDetail(documento);
    setFiscalView("detalle");
  }

  const actions = <>
    {(canCreateSale || canCreateQuote) && <div className={`${styles.actions} ${!(canCreateSale && canCreateQuote) ? styles.singleAction : ""}`} role="group" aria-label="Crear venta o cotización">
      {canCreateSale && <button type="button" className={adminStyles.primaryBtn} onClick={() => setFiscalView("nueva")}><Receipt size={16} /> Nueva venta</button>}
      {canCreateQuote && <button type="button" className={adminStyles.ghostBtn} onClick={createQuote}><Plus size={16} /> Nueva cotización</button>}
    </div>}
    {canReadFiscal && <div className={styles.fiscalTools} role="group" aria-label="Gestión fiscal">
      <button type="button" className={adminStyles.ghostBtn} onClick={() => setFiscalView("libro")}><BookOpen size={15} /> Libro de ventas</button>
    </div>}
  </>;
  const fiscalNotice = <>
    {lastSaved && <BusinessNotice kind={lastSaved.documento.estado === "anulado" ? "warning" : "success"} title={lastSaved.replayed ? "Documento ya guardado · recuperado sin duplicar" : "Venta guardada correctamente"} message={`${lastSaved.documento.correlativo ? `Factura ${lastSaved.documento.correlativo}.` : "Pendiente de CAI; sin numeración ni validez fiscal."} Total L ${Number(lastSaved.documento.total).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.${lastSaved.replayed ? " No se creó otra factura ni se descontó inventario de nuevo." : ""}${lastSaved.documento.estado === "anulado" ? " Este documento figura anulado." : ""}`}>
      <div className={styles.actions}>
        <button type="button" className={adminStyles.ghostBtn} onClick={() => showFiscalDetail(lastSaved.documento)}>Ver documento guardado</button>
        <button type="button" className={adminStyles.ghostBtn} onClick={() => setLastSaved(null)}>Cerrar aviso</button>
      </div>
    </BusinessNotice>}
    {canReadFiscal && (fiscalStatus.error ? <div className={styles.loadError} role="alert">
      <span>No se pudieron consultar las ventas fiscales: {fiscalStatus.error}</span>
      <button type="button" className={adminStyles.ghostBtn} onClick={() => fiscalEditor.current?.refresh()}>Reintentar</button>
    </div> : fiscalStatus.loading ? <p className={styles.loading} role="status">Consultando ventas fiscales…</p> : null)}
  </>;

  return <AdminContext.Provider value={{ ...adminContext, applyVentasSearch }}>
    <Topbar chromeOnly title="Ventas" session={session} workers={workers} />
    <CotizacionesSection
      orders={canReadCommercial ? orders : []} setOrders={setOrders} clientes={clientes} setClientes={setClientes} products={products} workers={workers} session={session}
      hideTopbar chromeOnly hideCreateActions editorRef={quoteEditor}
      tabs={tabs} activeTab={selectedTab} onTabChange={setActiveTab}
      headerActions={actions} hideList={selectedTab === "precios"} listNotice={fiscalNotice}
      fiscalDocuments={canReadFiscal ? fiscalDocuments : []}
      onFiscalDetail={showFiscalDetail}
      onFiscalAnnul={documento => fiscalEditor.current?.annul(documento)}
    />
    {selectedTab === "precios" && <PreciosPanel session={session} products={products} setProducts={setProducts} onPriceSaved={product => fiscalEditor.current?.refreshProduct(product)} hideNavigation />}
    {canReadFiscal && <SalesDialog
      open={Boolean(fiscalView)} title={dialogTitle}
      subtitle={fiscalView === "nueva" ? "Factura fiscal · ISV e inventario" : "Ventas"}
      onClose={() => setFiscalView(null)} canClose={canCloseFiscal}
    >
      <FacturacionPanel
        embedded editorRef={fiscalEditor} hideTopbar session={session} clientes={clientes} productos={products} workers={workers}
        activeTab={fiscalView === "libro" ? fiscalView : "documentos"}
        onTabChange={setFiscalView} saleEditorOpen={fiscalView === "nueva"} detailOnly={fiscalView === "detalle"}
        onSaleEditorClose={() => setFiscalView(null)} onInventoryChanged={refreshInventory}
        onClientCreated={client => setClientes?.(current => [client, ...current.filter(item => item.id !== client.id)])}
        onDocumentsChange={setFiscalDocuments} onStatusChange={setFiscalStatus}
        onDocumentSaved={setLastSaved} onInspectDocument={showFiscalDetail} draftMemory={draftMemory}
      />
    </SalesDialog>}
  </AdminContext.Provider>;
}
