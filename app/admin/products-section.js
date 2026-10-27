"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Layers, Package, Pencil, Plus, RotateCw, Search, Trash2, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { Avatar, useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { compressImage } from "./image-utils";
import BarcodeScanner from "./barcode-scan";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_UNITS,
  createProduct,
  deleteProduct,
  formatPrice,
  formatStock,
  newProductId,
  updateProduct,
} from "./products-store";

const EMPTY_PRODUCT = {
  id: "",
  nombre: "",
  sku: "",
  codigoBarras: "",
  categoria: "Soluciones de Preconectorizado",
  marca: "",
  unidad: "Unidad",
  precio: "",
  costo: "",
  stock: "",
  stockMinimo: "",
  ubicacion: "",
  peso: "",
  estado: "activo",
  foto: "",
  fotos: [],
  descripcion: "",
};

export default function ProductsSection({ products, setProducts, categorias = [], workers = [], session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [stockOnly, setStockOnly] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_PRODUCT);
  const [confirmProduct, setConfirmProduct] = useState(null);
  const { show } = useToast();

  const categoryNames = useMemo(() => {
    const names = categorias.map((item) => item.nombre).filter(Boolean);
    return names.length ? names : PRODUCT_CATEGORIES;
  }, [categorias]);

  const activeCategoryNames = useMemo(() => {
    const names = categorias
      .filter((item) => item.estado === "activo")
      .map((item) => item.nombre)
      .filter(Boolean);
    return names.length ? names : categoryNames;
  }, [categorias, categoryNames]);

  const modalCategoryNames = useMemo(() => {
    if (draft.categoria && !activeCategoryNames.includes(draft.categoria)) {
      return [draft.categoria, ...activeCategoryNames];
    }
    return activeCategoryNames;
  }, [activeCategoryNames, draft.categoria]);

  const canWriteProducts = (session?.permisos || []).includes("productos:write");
  const [busyProduct, setBusyProduct] = useState(null);

  // Accion rapida: activar/inactivar un producto desde la tabla.
  async function toggleProductState(product) {
    const nextEstado = product.estado === "activo" ? "inactivo" : "activo";
    setBusyProduct(product.id);
    try {
      const saved = await updateProduct(product.id, { ...product, estado: nextEstado });
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

  // Sugerencias para escribir rápido: las marcas y ubicaciones ya usadas se
  // ofrecen mientras se teclea, y también los nombres de bodega registrados.
  const marcaOptions = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      const value = String(product.marca || "").trim();
      if (value) set.add(value);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [products]);

  const [bodegaOptions, setBodegaOptions] = useState([]);
  useEffect(() => {
    let active = true;
    fetch("/api/bodegas", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        if (!active) return;
        setBodegaOptions(
          (Array.isArray(data) ? data : [])
            .map((item) => String(item?.nombre || "").trim())
            .filter(Boolean),
        );
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const ubicacionOptions = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      const value = String(product.ubicacion || "").trim();
      if (value) set.add(value);
    });
    bodegaOptions.forEach((value) => set.add(value));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [products, bodegaOptions]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "all") {
      setStatus("all");
      setCategory("all");
      setStockOnly("all");
    } else if (tabId === "active") {
      setStatus("activo");
      setCategory("all");
      setStockOnly("in");
    } else if (tabId === "out") {
      setStatus("all");
      setCategory("all");
      setStockOnly("out");
    } else if (tabId === "fiber") {
      setStatus("all");
      setCategory("Componentes pasivos");
      setStockOnly("all");
    } else if (tabId === "prices") {
      setStatus("all");
      setCategory("all");
      setStockOnly("all");
    }
  };

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
    setActiveTab("all");
  }

  function openCreate() {
    setDraft({
      ...EMPTY_PRODUCT,
      id: newProductId(),
      categoria: activeCategoryNames[0] || PRODUCT_CATEGORIES[0],
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(product) {
    setDraft({
      ...product,
      costo: product.costo == null ? "" : product.costo,
      peso: product.peso == null ? "" : product.peso,
      stockMinimo: product.stockMinimo == null ? "" : product.stockMinimo,
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

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function handlePhoto(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      notifyError("El archivo debe ser una imagen.");
      return;
    }
    try {
      const compressed = await compressImage(file);
      changeField("foto", compressed);
    } catch (error) {
      notifyError(error.message || "No se pudo procesar la imagen.");
    }
    event.target.value = "";
  }

  async function handleGalleryPhotos(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const validFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validFiles.length !== files.length) {
      notifyError("Todos los archivos deben ser imágenes.");
    }
    try {
      const compressed = await Promise.all(validFiles.map(compressImage));
      changeField("fotos", [...(draft.fotos || []), ...compressed]);
    } catch (error) {
      notifyError(error.message || "No se pudieron procesar las imágenes.");
    }
    event.target.value = "";
  }

  function removeGalleryPhoto(index) {
    changeField("fotos", draft.fotos.filter((_, i) => i !== index));
  }

  async function submitProduct(event) {
    event.preventDefault();
    if (!draft.nombre.trim()) {
      notifyError("El nombre del producto es obligatorio.");
      return;
    }
    const precioNumero = Number(draft.precio);
    if (!Number.isFinite(precioNumero) || precioNumero < 1) {
      notifyError("El precio mínimo es L 1.00. Un producto no puede regalarse.");
      return;
    }
    const payload = {
      ...draft,
      nombre: draft.nombre.trim(),
      sku: String(draft.sku || "").trim().toUpperCase(),
      codigoBarras: String(draft.codigoBarras || "").trim(),
      marca: String(draft.marca || "").trim(),
      precio: precioNumero,
      costo: draft.costo === "" || draft.costo == null ? null : Number(draft.costo) || 0,
      stock: Math.max(0, Math.floor(Number(draft.stock) || 0)),
      stockMinimo: Math.max(0, Math.floor(Number(draft.stockMinimo) || 0)),
      ubicacion: String(draft.ubicacion || "").trim(),
      peso: draft.peso === "" || draft.peso == null ? null : Number(draft.peso) || 0,
    };
    let saved;
    try {
      if (editingId) {
        saved = await updateProduct(editingId, payload);
        setProducts((current) =>
          current.map((product) => (product.id === editingId ? saved : product)),
        );
        show("Producto actualizado.");
      } else {
        saved = await createProduct(payload);
        setProducts((current) => [saved, ...current]);
        show("Producto agregado.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar el producto.");
      return;
    }
    closeModal();
  }

  return (
    <>
      <Topbar
        title="Productos"
        subtitle="Catálogo de Arconet: categoría, precio, stock y disponibilidad."
        action={
          canWriteProducts && (
            <button type="button" className={styles.primaryBtn} onClick={openCreate}>
              <Plus size={16} /> Nuevo producto
            </button>
          )
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.productos.tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          label="Filtros de productos"
        />

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
                        {canWriteProducts && (
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
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          aria-label={`Editar ${product.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmProduct(product)}
                          aria-label={`Eliminar ${product.nombre}`}
                          title="Eliminar"
                        >
                          <Trash2 size={15} />
                        </button>
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
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar producto" : "Nuevo producto"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nuevo"}</p>
                <h2>{editingId ? "Editar producto" : "Agregar producto"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitProduct}>
              <div className={styles.photoRow}>
                <Avatar src={draft.foto} name={draft.nombre} className={styles.photoPreview} shape="square" />
                <div className={styles.photoActions}>
                  <input
                    id="product-photo"
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handlePhoto}
                  />
                  <label htmlFor="product-photo" className={styles.upload}>Subir imagen principal</label>
                  {draft.foto && (
                    <button type="button" className={styles.ghostBtn} onClick={() => changeField("foto", "")}>
                      Quitar imagen principal
                    </button>
                  )}
                  <p>JPG o PNG. Imagen principal del producto.</p>
                </div>
              </div>

              <div className={styles.photoRow}>
                <strong style={{fontSize:"13px",color:"var(--text-muted)",marginRight:"12px"}}>Galería:</strong>
                <div className={styles.photoActions} style={{flex:1,flexWrap:"wrap"}}>
                  <input
                    id="product-gallery"
                    type="file"
                    accept="image/*"
                    multiple
                    className={styles.fileInput}
                    onChange={handleGalleryPhotos}
                  />
                  <label htmlFor="product-gallery" className={styles.upload}>Agregar imágenes a galería</label>
                  <p>JPG o PNG. Múltiples imágenes para mostrar detalles del producto.</p>
                </div>
              </div>

              {draft.fotos && draft.fotos.length > 0 && (
                <div className={styles.photoRow} style={{alignItems:"flex-start"}}>
                  <div className={styles.galleryPreview} style={{display:"flex",flexWrap:"wrap",gap:"8px",alignItems:"center"}}>
                    {draft.fotos.map((galleryImg, idx) => (
                      <div key={idx} style={{position:"relative",display:"inline-flex"}}>
                        <img
                          src={galleryImg}
                          alt={`Galería ${idx + 1}`}
                          style={{width:"80px",height:"80px",objectFit:"cover",borderRadius:"8px",border:"2px solid var(--border)"}}
                        />
                        <button
                          type="button"
                          onClick={() => removeGalleryPhoto(idx)}
                          style={{
                            position:"absolute",top:"-6px",right:"-6px",width:"22px",height:"22px",
                            borderRadius:"50%",background:"var(--red)",color:"white",border:"none",
                            cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:"12px",lineHeight:1,boxShadow:"var(--shadow-sm)"
                          }}
                          aria-label={`Eliminar imagen ${idx + 1}`}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Nombre del producto
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Ej. Splitter óptico 1x8 PLC"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Código / SKU
                  <input
                    type="text"
                    value={draft.sku}
                    onChange={(event) => changeField("sku", event.target.value)}
                    placeholder="Ej. SP-1X8"
                  />
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Código de barras (del fabricante)
                  <div className={styles.barcodeRow}>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={draft.codigoBarras}
                      onChange={(event) => changeField("codigoBarras", event.target.value)}
                      placeholder="Ej. 7501234567890"
                    />
                    <BarcodeScanner
                      onDetect={(code) => changeField("codigoBarras", String(code).trim())}
                    />
                  </div>
                  <small className={styles.fieldHint}>
                    Opcional: solo si la caja trae código EAN/UPC impreso. Puedes escanearlo con la cámara.
                  </small>
                </label>
                <label className={styles.field}>
                  Marca
                  <input
                    type="text"
                    list="producto-marcas"
                    autoComplete="off"
                    value={draft.marca}
                    onChange={(event) => changeField("marca", event.target.value)}
                    placeholder="Ej. Fiberhome"
                  />
                  <datalist id="producto-marcas">
                    {marcaOptions.map((value) => <option key={value} value={value} />)}
                  </datalist>
                  <small className={styles.fieldHint}>Escribe y elige una marca ya registrada.</small>
                </label>
                <label className={styles.field}>
                  Categoría
                  <select value={draft.categoria} onChange={(event) => changeField("categoria", event.target.value)}>
                    {modalCategoryNames.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Unidad
                  <select value={draft.unidad} onChange={(event) => changeField("unidad", event.target.value)}>
                    {PRODUCT_UNITS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                  <small className={styles.fieldHint}>Solo etiqueta el stock; no convierte cantidades.</small>
                </label>
                <label className={styles.field}>
                  Precio (L)
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    value={draft.precio}
                    onChange={(event) => changeField("precio", event.target.value)}
                    placeholder="1.00"
                  />
                  <small className={styles.fieldHint}>Mínimo L 1.00: el sistema no permite productos a L 0.</small>
                </label>
                <label className={styles.field}>
                  Costo (L)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.costo}
                    onChange={(event) => changeField("costo", event.target.value)}
                    placeholder="0.00"
                  />
                  <small className={styles.fieldHint}>Uso interno. Nunca se muestra en el catálogo.</small>
                </label>
                <label className={styles.field}>
                  {`Stock (${unitLabel(draft.unidad, 2)})`}
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.stock}
                    onChange={(event) => changeField("stock", event.target.value)}
                    placeholder="0"
                  />
                </label>
                <label className={styles.field}>
                  Stock mínimo
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.stockMinimo}
                    onChange={(event) => changeField("stockMinimo", event.target.value)}
                    placeholder="0"
                  />
                  <small className={styles.fieldHint}>Aviso de reposición cuando el stock baja de este valor.</small>
                </label>
                <label className={styles.field}>
                  Ubicación en bodega
                  <input
                    type="text"
                    list="producto-ubicaciones"
                    autoComplete="off"
                    value={draft.ubicacion}
                    onChange={(event) => changeField("ubicacion", event.target.value)}
                    placeholder="Ej. Pasillo 3 · Estante B"
                  />
                  <datalist id="producto-ubicaciones">
                    {ubicacionOptions.map((value) => <option key={value} value={value} />)}
                  </datalist>
                  <small className={styles.fieldHint}>Autocompleta con ubicaciones y bodegas ya registradas.</small>
                </label>
                <label className={styles.field}>
                  Peso (kg)
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={draft.peso}
                    onChange={(event) => changeField("peso", event.target.value)}
                    placeholder="0.000"
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {PRODUCT_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Descripción
                  <textarea
                    value={draft.descripcion}
                    onChange={(event) => changeField("descripcion", event.target.value)}
                    placeholder="Detalles técnicos, presentación o notas de venta."
                    rows={3}
                  />
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Agregar producto"}
                </button>
              </footer>
            </form>
          </div>
        </div>
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
