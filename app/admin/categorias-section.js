"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Package, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { Avatar, useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { compressImage } from "./image-utils";
import { CATEGORY_STATUSES, categorySlug, createCategoria, deleteCategoria, updateCategoria } from "./categories-store";
import { formatPrice } from "./products-store";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG } from "./admin-nav";

const EMPTY_CATEGORY = {
  id: "",
  nombre: "",
  slug: "",
  descripcion: "",
  foto: "",
  orden: "",
  estado: "activo",
};

export default function CategoriasSection({ categorias = [], setCategorias, products = [], setProducts, workers = [], session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_CATEGORY);
  const [confirmCategory, setConfirmCategory] = useState(null);
  const { show } = useToast();

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const counts = useMemo(() => {
    const map = {};
    products.forEach((product) => {
      map[product.categoria] = (map[product.categoria] || 0) + 1;
    });
    return map;
  }, [products]);

  const stats = useMemo(() => {
    const activas = categorias.filter((item) => item.estado === "activo").length;
    const conProductos = categorias.filter((item) => (counts[item.nombre] || 0) > 0).length;
    return {
      total: categorias.length,
      activas,
      conProductos,
      vacias: categorias.length - conProductos,
    };
  }, [categorias, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return categorias.filter((item) => {
      const count = counts[item.nombre] || 0;
      if (activeTab === "active" && item.estado !== "activo") return false;
      if (activeTab === "used" && count === 0) return false;
      if (activeTab === "empty" && count > 0) return false;
      if (!q) return true;
      return `${item.nombre} ${item.slug} ${item.descripcion || ""}`
        .toLocaleLowerCase("es")
        .includes(q);
    });
  }, [categorias, counts, activeTab, query]);

  function openCreate() {
    setDraft({ ...EMPTY_CATEGORY });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(category) {
    setDraft({ ...category, orden: String(category.orden ?? "") });
    setEditingId(category.id);
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

  function requestDelete(category) {
    const count = counts[category.nombre] || 0;
    if (count > 0) {
      show(
        `No se puede eliminar "${category.nombre}": tiene ${count} producto${count === 1 ? "" : "s"}. Reasígnalos primero.`,
        "error",
      );
      return;
    }
    setConfirmCategory(category);
  }

  async function submitCategory(event) {
    event.preventDefault();
    const nombre = draft.nombre.trim();
    if (!nombre) {
      notifyError("El nombre de la categoría es obligatorio.");
      return;
    }

    const payload = {
      nombre,
      slug: editingId ? draft.slug : categorySlug(nombre),
      descripcion: String(draft.descripcion || "").trim(),
      foto: draft.foto || "",
      estado: draft.estado,
      orden: draft.orden === "" ? undefined : Math.max(0, Math.floor(Number(draft.orden) || 0)),
    };

    try {
      if (editingId) {
        const before = categorias.find((item) => item.id === editingId);
        const saved = await updateCategoria(editingId, payload);
        setCategorias((current) =>
          current
            .map((item) => (item.id === editingId ? saved : item))
            .sort((a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es")),
        );
        if (before && before.nombre !== saved.nombre) {
          setProducts((current) =>
            current.map((product) =>
              product.categoria === before.nombre
                ? { ...product, categoria: saved.nombre }
                : product,
            ),
          );
        }
        show("Categoría actualizada.");
      } else {
        const saved = await createCategoria(payload);
        setCategorias((current) =>
          [...current, saved].sort(
            (a, b) => a.orden - b.orden || a.nombre.localeCompare(b.nombre, "es"),
          ),
        );
        show("Categoría creada.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar la categoría.");
      return;
    }

    closeModal();
  }

  const slugPreview = editingId ? draft.slug : categorySlug(draft.nombre);

  return (
    <>
      <Topbar
        title="Categorías"
        subtitle="Administra las categorías del catálogo: nombre, foto, orden y visibilidad."
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nueva categoría
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.categorias?.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          label="Filtros de categorías"
        />

        <section className={styles.stats} aria-label="Resumen de categorías">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Tags size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Categorías</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activas}</strong>
            <span className={styles.statLabel}>Activas</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Package size={18} /></span>
            <strong className={styles.statValue}>{stats.conProductos}</strong>
            <span className={styles.statLabel}>Con productos</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={styles.statValue}>{stats.vacias}</strong>
            <span className={styles.statLabel}>Vacías</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros de categorías">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, enlace o descripción"
              aria-label="Buscar categorías"
            />
          </label>
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery("")}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de categorías">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Productos</th>
                  <th>Orden</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((category) => (
                  <tr key={category.id}>
                    <td data-label="Categoría" className={styles.cellMain}>
                      <div className={styles.person}>
                        <Avatar src={category.foto} name={category.nombre} shape="square" />
                        <span className={styles.personMeta}>
                          <strong>{category.nombre}</strong>
                          <em>{category.slug}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="Descripción">{category.descripcion || "-"}</td>
                    <td data-label="Productos">{counts[category.nombre] || 0}</td>
                    <td data-label="Orden">{category.orden}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${category.estado}`]}`}>
                        {(CATEGORY_STATUSES.find((item) => item.id === category.estado) || {}).label || category.estado}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openEdit(category)}
                          aria-label={`Editar ${category.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => requestDelete(category)}
                          aria-label={`Eliminar ${category.nombre}`}
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
                <span className={styles.emptyIcon}><Tags size={22} /></span>
                <strong>Sin categorías</strong>
                <p>
                  {query
                    ? "No hay categorías que coincidan con la búsqueda."
                    : "Crea la primera categoría para organizar el catálogo."}
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
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar categoría" : "Nueva categoría"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nueva"}</p>
                <h2>{editingId ? "Editar categoría" : "Agregar categoría"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitCategory}>
              <div className={styles.photoRow}>
                <Avatar src={draft.foto} name={draft.nombre} className={styles.photoPreview} shape="square" />
                <div className={styles.photoActions}>
                  <input
                    id="category-photo"
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handlePhoto}
                  />
                  <label htmlFor="category-photo" className={styles.upload}>Subir imagen</label>
                  {draft.foto && (
                    <button type="button" className={styles.ghostBtn} onClick={() => changeField("foto", "")}>
                      Quitar imagen
                    </button>
                  )}
                  <p>JPG o PNG. Se usa en las tarjetas del catálogo.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Nombre de la categoría
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Ej. Microcables y Microproductos"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Enlace público
                  <input
                    type="text"
                    value={slugPreview}
                    readOnly
                    placeholder="se-genera-con-el-nombre"
                  />
                  <small className={styles.fieldHint}>
                    {editingId
                      ? "El enlace no cambia al renombrar la categoría."
                      : `Se verá en /catalogo/categoria/${slugPreview || "..."}`}
                  </small>
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Descripción
                  <textarea
                    value={draft.descripcion}
                    onChange={(event) => changeField("descripcion", event.target.value)}
                    placeholder="Describe qué productos agrupa esta categoría."
                    rows={3}
                  />
                </label>
                <label className={styles.field}>
                  Orden
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.orden}
                    onChange={(event) => changeField("orden", event.target.value)}
                    placeholder="Automático"
                  />
                  <small className={styles.fieldHint}>Menor número aparece primero.</small>
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {CATEGORY_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Agregar categoría"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmCategory && (
        <ConfirmDialog
          title="Eliminar categoría"
          message={
            <>
              ¿Seguro que deseas eliminar <strong>{confirmCategory.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmCategory(null)}
          onConfirm={async () => {
            try {
              await deleteCategoria(confirmCategory.id);
              setCategorias((current) =>
                current.filter((item) => item.id !== confirmCategory.id),
              );
              show("Categoría eliminada.");
            } catch (error) {
              show(error.message || "No se pudo eliminar la categoría.", "error");
            }
            setConfirmCategory(null);
          }}
        />
      )}
    </>
  );
}
