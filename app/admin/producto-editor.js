"use client";

import { PRICE_FIELDS, PRICE_LEVELS, parsePrices, validatePriceSet } from "@/lib/precios";
import { apiFetch as fetch } from "@/lib/api-fetch";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { Boxes, Camera, Coins, Eye, Tag, X } from "lucide-react";
import { Avatar, useToast, notifyError } from "./admin-ui";
import { compressImage } from "./image-utils";
import BarcodeScanner from "./barcode-scan";
import styles from "./admin-experience.module.css";
import editorStyles from "./producto-editor.module.css";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_UNITS,
  createProduct,
  newProductId,
  unitLabel,
  updateProduct,
} from "./products-store";

// El mismo borrador que usaba la pantalla flotante: la página completa de
// «Nuevo producto» y el diálogo de edición comparten esta forma.
const EMPTY_PRODUCT = {
  id: "",
  nombre: "",
  sku: "",
  codigoBarras: "",
  categoria: "Soluciones de Preconectorizado",
  marca: "",
  unidad: "Unidad",
  precio: "",
  precioDescuento: "",
  precioMayorista: "",
  costo: "",
  stock: "",
  stockMinimo: "",
  garantia: "",
  ubicacion: "",
  peso: "",
  estado: "activo",
  foto: "",
  fotos: [],
  descripcion: "",
};

/**
 * Editor completo de producto (alta y edición).
 *
 * Contiene todo lo que antes vivía en la pantalla flotante: foto principal,
 * galería, código de barras con escáner, marcas sugeridas, precios, costo,
 * stock, ubicación, garantía, peso, estado y descripción. Se usa tanto en
 * la página completa «Nuevo producto» como en el diálogo de edición.
 */
export default function ProductoEditor({
  session,
  initial,
  editing = false,
  onSaved,
  onCancel,
  products = [],
  categorias = [],
  formClassName,
}) {
  const [draft, setDraft] = useState(() => initial || {
    ...EMPTY_PRODUCT,
    id: newProductId(),
    categoria: PRODUCT_CATEGORIES[0],
    // Sin permiso para precios nace pendiente de revisión por defecto.
    estado: session?.permisos?.includes("precios:write") ? "activo" : "pendiente",
  });
  const [guardando, setGuardando] = useState(false);
  const { show } = useToast();

  const canWritePrices = session?.permisos?.includes("precios:write");
  const canReadWarehouses = session?.permisos?.includes("inventario:read");

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
    if (!canReadWarehouses) return;
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
  }, [canReadWarehouses]);

  const ubicacionOptions = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      const value = String(product.ubicacion || "").trim();
      if (value) set.add(value);
    });
    if (canReadWarehouses) bodegaOptions.forEach((value) => set.add(value));
    return [...set].sort((a, b) => a.localeCompare(b, "es"));
  }, [products, bodegaOptions, canReadWarehouses]);

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  // El stock mínimo se calcula solo mientras el usuario no lo toca: una
  // aproximación del 25% del stock añadido, que queda editable después.
  const stockMinimoTouched = useRef(false);

  function changeStock(value) {
    changeField("stock", value);
    if (!stockMinimoTouched.current) {
      const stockNum = Number(value) || 0;
      changeField("stockMinimo", String(Math.max(0, Math.round(stockNum * 0.25))));
    }
  }

  function changeStockMinimo(value) {
    stockMinimoTouched.current = true;
    changeField("stockMinimo", value);
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
    // Sin permiso para precios no se exige precio al guardar: el producto
    // queda pendiente de revisión y el gerente define el Valor 1.
    if (canWritePrices) {
      const precioNumero = Number(draft.precio);
      if (!Number.isFinite(precioNumero) || precioNumero < 1) {
        notifyError("El precio mínimo es L 1.00. Un producto no puede regalarse.");
        return;
      }
    }
    const precioNumero = Number(draft.precio);
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
      garantia: draft.garantia.trim(),
      ubicacion: String(draft.ubicacion || "").trim(),
      peso: draft.peso === "" || draft.peso == null ? null : Number(draft.peso) || 0,
    };
    if (canWritePrices) {
      const parsed = parsePrices(draft);
      const errors = [...parsed.errors, ...validatePriceSet(parsed.data)];
      if (errors.length) { notifyError(errors[0]); return; }
      Object.assign(payload, parsed.data, { preciosVersion: draft.preciosUpdatedAt ?? null });
    } else {
      PRICE_FIELDS.forEach(field => delete payload[field]);
    }
    let saved;
    try {
      setGuardando(true);
      if (editing) {
        saved = await updateProduct(draft.id, payload);
        show("Producto actualizado.");
      } else {
        saved = await createProduct(payload);
        show(
          canWritePrices
            ? "Producto agregado."
            : "Producto guardado en revisión: queda pendiente de precio.",
        );
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar el producto.");
      return;
    } finally {
      setGuardando(false);
    }
    onSaved?.(saved);
  }

  return (
    <form
      className={`${editorStyles.editor} ${formClassName ?? styles.form}`}
      onSubmit={submitProduct}
    >
      <section className={`${styles.formSection} ${editorStyles.section}`}>
        <h3 className={styles.formSectionHead}><Camera size={15} /> Fotos</h3>
        <div className={styles.photoRow}>
          <div className={`${styles.photoCol} ${editorStyles.photoGroup}`}>
            <Avatar src={draft.foto} name={draft.nombre} className={styles.photoPreview} shape="square" />
            <div className={`${styles.photoActions} ${editorStyles.uploadActions}`}>
              <input
                id="product-photo"
                type="file"
                accept="image/*"
                className={styles.fileInput}
                onChange={handlePhoto}
              />
              <label htmlFor="product-photo" className={`${styles.upload} ${editorStyles.uploadButton}`}>Subir imagen principal</label>
              {draft.foto && (
                <button type="button" className={`${styles.ghostBtn} ${editorStyles.uploadButton}`} onClick={() => changeField("foto", "")}>
                  Quitar imagen principal
                </button>
              )}
              <p>JPG o PNG. Imagen principal del producto.</p>
            </div>
          </div>
          <div className={`${styles.photoCol} ${editorStyles.photoGroup}`}>
            <strong className={editorStyles.galleryLabel}>Galería:</strong>
            <div className={`${styles.photoActions} ${editorStyles.uploadActions}`}>
              <input
                id="product-gallery"
                type="file"
                accept="image/*"
                multiple
                className={styles.fileInput}
                onChange={handleGalleryPhotos}
              />
              <label htmlFor="product-gallery" className={`${styles.upload} ${editorStyles.uploadButton}`}>Agregar imágenes a galería</label>
              <p>JPG o PNG. Múltiples imágenes para mostrar detalles del producto.</p>
            </div>
          </div>
        </div>

        {draft.fotos && draft.fotos.length > 0 && (
          <div className={`${styles.photoRow} ${editorStyles.galleryRow}`}>
            <div className={editorStyles.galleryPreview}>
              {draft.fotos.map((galleryImg, idx) => (
                <div key={idx} className={editorStyles.galleryItem}>
                  <Image
                    src={galleryImg}
                    alt={`Galería ${idx + 1}`}
                    width={80}
                    height={80}
                    unoptimized
                    className={editorStyles.galleryImage}
                  />
                  <button
                    type="button"
                    className={editorStyles.galleryRemove}
                    onClick={() => removeGalleryPhoto(idx)}
                    aria-label={`Eliminar imagen ${idx + 1}`}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className={`${styles.formSection} ${editorStyles.section}`}>
        <h3 className={styles.formSectionHead}><Tag size={15} /> Ficha del producto</h3>
        <div className={styles.fieldGrid}>
          <label className={`${styles.field} ${styles.spanFull}`}>
            <span className={editorStyles.fieldLabel}>
              Nombre del producto
              <span className={styles.fieldRequired}>Obligatorio</span>
            </span>
            <input
              type="text"
              value={draft.nombre}
              onChange={(event) => changeField("nombre", event.target.value)}
              placeholder="Ej. Splitter óptico 1x8 PLC"
              required
            />
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
          <label className={styles.field}>
            Código / SKU
            <input
              type="text"
              value={draft.sku}
              onChange={(event) => changeField("sku", event.target.value)}
              placeholder="Ej. SP-1X8"
            />
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
        </div>
      </section>

      <section className={`${styles.formSection} ${editorStyles.section}`}>
        <h3 className={styles.formSectionHead}><Coins size={15} /> Precios y costo</h3>
        {editing && !draft.precio && (
          <div className={`${styles.spanFull} ${editorStyles.reviewNotice}`} role="alert">
            Este producto está pendiente de revisión: falta el Valor 1 · Normal. Define los precios y guarda para publicarlo en la tienda.
          </div>
        )}
        <div className={styles.fieldGrid}>
          {canWritePrices && PRICE_LEVELS.map(level => <label className={styles.field} key={level.id}>
            <span className={editorStyles.fieldLabel}>
              {level.label} (L)
              {level.id === "normal" && <span className={styles.fieldRequired}>Obligatorio</span>}
            </span>
            <input type="number" min={level.id === "normal" ? "1" : "0.01"} max="9999999999.99" step="0.01" required={level.id === "normal"} value={draft[level.field]} onChange={event => changeField(level.field, event.target.value)} placeholder={level.id === "normal" ? "Precio original de venta" : "Opcional"} />
            <small className={styles.fieldHint}>{level.id === "normal" ? "Precio normal de venta, no costo de compra. Mínimo L 1.00." : "Vacío = sin configurar. No puede superar el precio normal."}</small>
          </label>)}
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
        </div>
      </section>

      <section className={`${styles.formSection} ${editorStyles.section}`}>
        <h3 className={styles.formSectionHead}><Boxes size={15} /> Inventario y ubicación</h3>
        <div className={styles.fieldGrid}>
          <label className={styles.field}>
            {`Stock (${unitLabel(draft.unidad, 2)})`}
            <input
              type="number"
              min="0"
              step="1"
              value={draft.stock}
              onChange={(event) => changeStock(event.target.value)}
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
              onChange={(event) => changeStockMinimo(event.target.value)}
              placeholder="0"
            />
            <small className={styles.fieldHint}>Se calcula al 25% del stock añadido y queda editable. Aviso de reposición cuando el stock baja de este valor.</small>
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
          {canWritePrices && (
            <label className={styles.field}>
              Garantía
              <input
                type="text"
                maxLength={60}
                value={draft.garantia}
                onChange={(event) => changeField("garantia", event.target.value)}
                placeholder="Ej. 12 meses"
              />
              <small className={styles.fieldHint}>Se muestra al cliente junto a la marca. Vacío = sin garantía declarada.</small>
            </label>
          )}
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
        </div>
      </section>

      <section className={`${styles.formSection} ${editorStyles.section}`}>
        <h3 className={styles.formSectionHead}><Eye size={15} /> Publicación</h3>
        {canWritePrices ? (
          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              Estado
              <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                {PRODUCT_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>{item.label}</option>
                ))}
              </select>
              <small className={styles.fieldHint}>
                Activo = aparece en la tienda · Pendiente = falta precio, no se publica · Borrador = no se muestra · Inactivo = retirado del catálogo.
              </small>
            </label>
          </div>
        ) : (
          <div className={editorStyles.warehouseStates} role="radiogroup" aria-label="Estado de publicación">
            <label className={editorStyles.warehouseOption}>
              <input
                className={editorStyles.warehouseBox}
                type="radio"
                name="estado-bodega"
                value="pendiente"
                checked={draft.estado === "pendiente"}
                onChange={() => changeField("estado", "pendiente")}
              />
              <span className={editorStyles.warehouseCopy}>
                <strong>Pendiente de revisión</strong>
                <small>Sin precio: no aparece en la tienda hasta que el gerente defina el Valor 1.</small>
              </span>
            </label>
            <label className={editorStyles.warehouseOption}>
              <input
                className={editorStyles.warehouseBox}
                type="radio"
                name="estado-bodega"
                value="borrador"
                checked={draft.estado === "borrador"}
                onChange={() => changeField("estado", "borrador")}
              />
              <span className={editorStyles.warehouseCopy}>
                <strong>Borrador</strong>
                <small>Guardado pero oculto del catálogo y de la tienda.</small>
              </span>
            </label>
          </div>
        )}
      </section>

      <footer className={`${styles.modalActions} ${editorStyles.actions}`}>
        <button type="button" className={styles.ghostBtn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={styles.submit} disabled={guardando}>
          {guardando ? "Guardando…" : editing ? "Guardar cambios" : "Agregar producto"}
        </button>
      </footer>
    </form>
  );
}
