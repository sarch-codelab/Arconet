"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Layers, Package, Pencil, Plus, RotateCw, Search, Trash2, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { Avatar, useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { DialogBackdrop } from "./admin-overlay";
import { Topbar } from "./topbar";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  deleteProduct,
  formatPrice,
  formatStock,
  updateProduct,
} from "./products-store";
import ProductoEditor from "./producto-editor";

export default function ProductsSection({ products = [], setProducts, categorias = [], workers = [], session, navigation }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [stockOnly, setStockOnly] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [confirmProduct, setConfirmProduct] = useState(null);
  const { show } = useToast();

  const categoryNames = useMemo(() => {
    const names = categorias.map((item) => item.nombre).filter(Boolean);
    return names.length ? names : PRODUCT_CATEGORIES;
  }, [categorias]);

  const canWrite = (session?.permisos || []).includes("productos:write");
  const canWritePrices = session?.permisos?.includes("precios:write");
  const canDelete = session?.permisos?.includes("productos:delete");
  const [busyProduct, setBusyProduct] = useState(null);

  // Accion rapida: activar/inactivar un producto desde la tabla.
  async function toggleProductState(product) {
    const nextEstado = product.estado === "activo" ? "inactivo" : "activo";
    setBusyProduct(product.id);
    try {
      const saved = await updateProduct(product.id, { estado: nextEstado });
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? saved : item)),
      );
      show(`${product.nombre} ahora esta ${nextEstado}.`);
    } catch (error) {
      notifyError(error.message || "No se pudo cambiar el estado del producto.");
    } finally {
      setBusyProduct(null);
    }
  }

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "all" && product.categoria !== category) return false;
      if (status !== "all" && product.estado !== status) return false;
      if (stockOnly === "out" && Number(product.stock) > 0) return false;
      if (stockOnly === "in" && Number(product.stock) === 0) return false;
      if (!q) return true;
      return [product.nombre, product.sku, product.marca, product.codigoBarras]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, query, category, status, stockOnly]);

  const stats = useMemo(() => {
    const total = products.length;
    const activos = products.filter((product) => product.estado === "activo").length;
    const agotados = products.filter((product) => Number(product.stock) === 0).length;
    const totalCategorias = categorias.length || new Set(products.map((product) => product.categoria)).size;
    return { total, activos, agotados, categorias: totalCategorias };
  }, [products, categorias]);

  const hasFilters =
    query.trim() !== "" || category !== "all" || status !== "all" || stockOnly !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
    setStatus("all");
    setStockOnly("all");
  }

  function openEdit(product) {
    setDraft({
      ...product,
      precioDescuento: product.precioDescuento ?? "",
      precioMayorista: product.precioMayorista ?? "",
      costo: product.costo == null ? "" : product.costo,
      peso: product.peso == null ? "" : product.peso,
      stockMinimo: product.stockMinimo == null ? "" : product.stockMinimo,
      garantia: product.garantia || "",
      ubicacion: product.ubicacion ?? "",
      codigoBarras: product.codigoBarras ?? "",
      descripcion: product.descripcion ?? "",
    });
    setEditingId(product.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  return (
    <>
      <Topbar
        title="Productos"
        subtitle="Catálogo de Arconet: categoría, precio, stock y disponibilidad."
        action={
          canWrite && (
            <button type="button" className={styles.primaryBtn} disabled={!canWrite} title={!canWritePrices ? "Crear productos sin precio: queda pendiente de revisión" : undefined} onClick={() => (window.location.href = "/admin/productos/nuevo")}>
              <Plus size={16} /> Nuevo producto
            </button>
          )
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        {navigation}

        <section className={styles.stats} aria-label="Resumen">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Package size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Productos</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activos}</strong>
            <span className={styles.statLabel}>Activos</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={styles.statValue}>{stats.agotados}</strong>
            <span className={styles.statLabel}>Agotados</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Layers size={18} /></span>
            <strong className={styles.statValue}>{stats.categorias}</strong>
            <span className={styles.statLabel}>Categorías</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, código o marca"
              aria-label="Buscar productos"
            />
          </label>
          <select
            className={styles.select}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filtrar por categoría"
          >
            <option value="all">Todas las categorías</option>
            {categoryNames.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {PRODUCT_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {/* Antes eran pestañas ("En Stock" / "Agotados") que se confundían
              con la navegación de Inventario; aquí filtran la tabla. */}
          <select
            className={styles.select}
            value={stockOnly}
            onChange={(event) => setStockOnly(event.target.value)}
            aria-label="Filtrar por existencias"
          >
            <option value="all">Todas las existencias</option>
            <option value="in">En stock</option>
            <option value="out">Agotados</option>
          </select>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de productos">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Marca</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td data-label="Producto" className={styles.cellMain}>
                      <div className={styles.person}>
                        <Avatar src={product.foto} name={product.nombre} shape="square" />
                        <span className={styles.personMeta}>
                          <strong>{product.nombre}</strong>
                          <em>{product.sku || "Sin código"}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="Categoría"><span className={styles.role}>{product.categoria}</span></td>
                    <td data-label="Marca">{product.marca || "—"}</td>
                    <td className={styles.priceCell} data-label="Precio">{formatPrice(product.precio)}</td>
                    <td data-label="Stock">
                      <span className={Number(product.stock) === 0 ? styles.stockOut : styles.stockOk}>
                        {Number(product.stock) === 0 ? "Agotado" : formatStock(product.stock, product.unidad)}
                      </span>
                    </td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${product.estado}`]}`}>
                        {(PRODUCT_STATUSES.find((item) => item.id === product.estado) || {}).label || product.estado}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => toggleProductState(product)}
                            disabled={busyProduct === product.id}
                            aria-label={
                              product.estado === "activo"
                                ? `Desactivar ${product.nombre}`
                                : `Activar ${product.nombre}`
                            }
                            title={product.estado === "activo" ? "Marcar inactivo" : "Marcar activo"}
                          >
                            <RotateCw size={15} className={busyProduct === product.id ? styles.spinning : undefined} />
                          </button>
                        )}
                        {canWrite && <button
                          type="button"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>}
                        {canDelete && <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmProduct(product)}
                          aria-label={`Eliminar ${product.nombre}`}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!filtered.length && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><Package size={22} /></span>
                <strong>Sin productos</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : "Aún no has agregado productos al catálogo. Crea el primero."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalOpen && (
        <DialogBackdrop onDismiss={closeModal}>
          <div className={styles.modal} data-drag-scroll="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label={editingId ? "Editar producto" : "Nuevo producto"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nuevo"}</p>
                <h2>{editingId ? "Editar producto" : "Agregar producto"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <ProductoEditor
              session={session}
              initial={draft}
              editing={Boolean(editingId)}
              products={products}
              categorias={categorias}
              onSaved={saved => {
                setProducts((current) => editingId
                  ? current.map((product) => (product.id === editingId ? saved : product))
                  : [saved, ...current]);
                closeModal();
              }}
              onCancel={closeModal}
            />
          </div>
        </DialogBackdrop>
      )}

      {confirmProduct && (
        <ConfirmDialog
          title="Eliminar producto"
          message={
            <>
              ¿Seguro que deseas eliminar <strong>{confirmProduct.nombre}</strong>? Dejará de
              aparecer en el catálogo y en el inventario. Si ya tiene movimientos o facturas, se
              archiva para no perder el historial.
            </>
          }
          onCancel={() => setConfirmProduct(null)}
          onConfirm={async () => {
            try {
              const result = await deleteProduct(confirmProduct.id);
              setProducts((current) =>
                current.filter((product) => product.id !== confirmProduct.id),
              );
              show(
                result?.archivado
                  ? "Producto eliminado. Se archivó su historial de inventario y facturas."
                  : "Producto eliminado.",
              );
            } catch (error) {
              show(error.message || "No se pudo eliminar el producto.", "error");
            }
            setConfirmProduct(null);
          }}
        />
      )}

    </>
  );
}
