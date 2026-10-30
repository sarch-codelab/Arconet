"use client";

import { useMemo } from "react";
import { AlertTriangle, BarChart3, FileText, Layers, Package, TrendingUp, Users } from "lucide-react";
import styles from "./admin-experience.module.css";
import { formatDate } from "./workers-store";
import { formatPrice, formatStock } from "./products-store";
import { Topbar } from "./topbar";
import InventorySummary from "./inventory-summary";
import { summarizeCommercialOrders } from "@/lib/admin-summary";

export default function ResumenSection({ workers = [], products = [], sucursales = [], orders = [], session }) {
  const canReadWorkers = session?.permisos?.includes("trabajadores:read");
  const canReadProducts = session?.permisos?.includes("productos:read");
  const canReadOrders = session?.permisos?.includes("ordenes:read");
  const canReadBranches = session?.permisos?.includes("sucursales:read");
  const stats = useMemo(() => {
    const workersTotal = workers.length;
    const workersActivos = workers.filter((worker) => worker.estado === "activo").length;
    const productsTotal = products.length;
    const productsActivos = products.filter((product) => product.estado === "activo").length;
    const productsAgotados = products.filter((product) => Number(product.stock) === 0).length;
    const sucursalesTotal = sucursales.length;
    const sucursalesActivas = sucursales.filter((sucursal) => sucursal.estado === "activo").length;
    const totalStock = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
    const totalValue = products.reduce((sum, product) => sum + (Number(product.precio || 0) * Number(product.stock || 0)), 0);
    const commercial = summarizeCommercialOrders(orders);
    const ordersTotal = commercial.quotes;
    const ordersPendientes = commercial.pendingQuotes;
    const ordersVentas = commercial.sales;
    const ordersMonto = commercial.salesAmount;

    return {
      workersTotal,
      workersActivos,
      productsTotal,
      productsActivos,
      productsAgotados,
      sucursalesTotal,
      sucursalesActivas,
      totalStock,
      totalValue,
      ordersTotal,
      ordersPendientes,
      ordersVentas,
      ordersMonto,
    };
  }, [workers, products, sucursales, orders]);

  const recentWorkers = useMemo(() => {
    return workers
      .filter((worker) => worker.ingreso)
      .sort((a, b) => new Date(b.ingreso) - new Date(a.ingreso))
      .slice(0, 5);
  }, [workers]);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => Number(product.stock) <= 5 && Number(product.stock) > 0)
      .sort((a, b) => Number(a.stock) - Number(b.stock))
      .slice(0, 5);
  }, [products]);

  if (session?.permisos?.includes("inventario:read") && !session?.permisos?.includes("reportes:read")) return <><Topbar title="Resumen de Bodega" subtitle="Existencias, alertas, recepciones y movimientos de las áreas autorizadas." session={session} /><div className={styles.body}><InventorySummary /></div></>;

  return (
    <>
      <Topbar
        title="Resumen"
        subtitle="Vista general de la operación de Arconet."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        {session?.permisos?.includes("inventario:read") ? <InventorySummary /> : null}
        <section className={styles.stats} aria-label="Estadísticas generales">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Users size={18} /></span>
            <strong className={styles.statValue}>{canReadWorkers ? stats.workersTotal : "—"}</strong>
            <span className={styles.statLabel}>Trabajadores</span>
            <small>{canReadWorkers ? `${stats.workersActivos} activos` : "Sin permiso de consulta"}</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Package size={18} /></span>
            <strong className={styles.statValue}>{canReadProducts ? stats.productsTotal : "—"}</strong>
            <span className={styles.statLabel}>Productos</span>
            <small>{canReadProducts ? `${stats.productsActivos} activos` : "Sin permiso de consulta"}</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><FileText size={18} /></span>
            <strong className={styles.statValue}>{canReadOrders ? stats.ordersTotal : "—"}</strong>
            <span className={styles.statLabel}>Cotizaciones</span>
            <small>{canReadOrders ? `${stats.ordersPendientes} pendientes` : "Sin permiso de consulta"}</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><TrendingUp size={18} /></span>
            <strong className={styles.statValue}>{canReadOrders ? formatPrice(stats.ordersMonto) : "—"}</strong>
            <span className={styles.statLabel}>Ventas comerciales</span>
            <small>{canReadOrders ? `${stats.ordersVentas} ventas no canceladas` : "Sin permiso de consulta"}</small>
          </article>
        </section>

        <div className={styles.grid2}>
          <section className={styles.card} aria-label="Alertas de inventario">
            <header className={styles.cardHeader}>
              <h3><AlertTriangle size={18} /> Alertas de inventario</h3>
            </header>
            <div className={styles.cardBody}>
              {stats.productsAgotados > 0 && (
                <div className={styles.alertItem}>
                  <span className={styles.alertBadge}>Agotados</span>
                  <span>{stats.productsAgotados} productos sin stock</span>
                </div>
              )}
              {lowStockProducts.length > 0 ? (
                <div className={styles.list}>
                  {lowStockProducts.map((product) => (
                    <div key={product.id} className={styles.listItem}>
                      <strong>{product.nombre}</strong>
                      <span className={styles.stockLow}>{formatStock(product.stock, product.unidad)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>{canReadProducts ? "No hay productos con stock bajo." : "No tienes permiso para consultar productos."}</p>
              )}
            </div>
          </section>

          <section className={styles.card} aria-label="Ingresos recientes">
            <header className={styles.cardHeader}>
              <h3><BarChart3 size={18} /> Ingresos recientes</h3>
            </header>
            <div className={styles.cardBody}>
              {recentWorkers.length > 0 ? (
                <div className={styles.list}>
                  {recentWorkers.map((worker) => (
                    <div key={worker.id} className={styles.listItem}>
                      <div>
                        <strong>{worker.nombre}</strong>
                        <em>{worker.puesto || "—"}</em>
                      </div>
                      <span>{formatDate(worker.ingreso)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>{canReadWorkers ? "No hay ingresos recientes registrados." : "No tienes permiso para consultar trabajadores."}</p>
              )}
            </div>
          </section>
        </div>

        <section className={styles.card} aria-label="Distribución por sucursal">
          <header className={styles.cardHeader}>
            <h3><Layers size={18} /> Distribución por sucursal</h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.grid3}>
              {!canReadBranches && <p className={styles.emptyText}>No tienes permiso para consultar sucursales.</p>}
              {sucursales.map((sucursal) => {
                const sucursalWorkers = workers.filter((worker) => worker.sucursal === sucursal.id);
                return (
                  <article key={sucursal.id} className={styles.miniCard}>
                    <strong>{sucursal.nombre}</strong>
                    <div className={styles.miniStats}>
                      <span>{canReadWorkers ? sucursalWorkers.length : "—"} trabajadores</span>
                      <span className={sucursal.estado === "activo" ? styles.statusOk : styles.statusInactive}>
                        {sucursal.estado === "activo" ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
