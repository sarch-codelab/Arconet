"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import filters from "./list-filters.module.css";
import { useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { DialogBackdrop } from "./admin-overlay";
import { Topbar, SectionMarker } from "./topbar";
import {
  createSucursal,
  deleteSucursal,
  newSucursalId,
  initialsSucursal,
  updateSucursal,
} from "./sucursales-store";

export default function SucursalesSection({ sucursales = [], setSucursales, workers = [], session }) {
  const canWrite = session?.permisos?.includes("sucursales:write");
  const canDelete = session?.permisos?.includes("sucursales:delete");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    id: "",
    nombre: "",
    codigo: "",
    ciudad: "",
    direccion: "",
    telefono: "",
    email: "",
    responsable: "",
    estado: "activo",
  });
  const [confirmSucursal, setConfirmSucursal] = useState(null);
  const { show } = useToast();

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sucursales.filter((sucursal) => {
      if (status !== "all" && sucursal.estado !== status) return false;
      if (!q) return true;
      return [sucursal.nombre, sucursal.codigo, sucursal.ciudad, sucursal.responsable]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [sucursales, query, status]);

  const stats = useMemo(() => {
    const total = sucursales.length;
    const activos = sucursales.filter((sucursal) => sucursal.estado === "activo").length;
    return { total, activos };
  }, [sucursales]);

  function openCreate() {
    setDraft({
      id: newSucursalId(),
      nombre: "",
      codigo: "",
      ciudad: "",
      direccion: "",
      telefono: "",
      email: "",
      responsable: "",
      estado: "activo",
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(sucursal) {
    setDraft({ ...sucursal });
    setEditingId(sucursal.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function submitSucursal(event) {
    event.preventDefault();
    if (!draft.nombre.trim() || !draft.codigo.trim()) {
      notifyError("El nombre y el código son obligatorios.");
      return;
    }
    const payload = { ...draft, nombre: draft.nombre.trim() };
    let saved;
    try {
      if (editingId) {
        saved = await updateSucursal(editingId, payload);
        setSucursales((current) =>
          current.map((sucursal) => (sucursal.id === editingId ? saved : sucursal)),
        );
        show("Sucursal actualizada.");
      } else {
        saved = await createSucursal(payload);
        setSucursales((current) => [saved, ...current]);
        show("Sucursal agregada.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar la sucursal.");
      return;
    }
    closeModal();
  }

  return (
    <>
      <Topbar
        title="Sucursales"
        subtitle="Ubicaciones de Arconet: dirección, contacto y responsables."
        action={
          <button type="button" className={styles.primaryBtn} disabled={!canWrite} onClick={openCreate}>
            <Plus size={16} /> Nueva sucursal
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionMarker label="Sucursales" icon={Building2} />
        <section className={styles.stats} aria-label="Resumen de sucursales">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Building2 size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Sucursales</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activos}</strong>
            <span className={styles.statLabel}>Activas</span>
          </article>
        </section>

        <section className={`${styles.toolbar} ${filters.bar}`} aria-label="Filtros de sucursales">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, código o ciudad"
              aria-label="Buscar sucursales"
            />
          </label>
          <select className={styles.select} aria-label="Filtrar sucursales por estado" value={status} onChange={event => setStatus(event.target.value)}>
            <option value="all">Todos los estados</option><option value="activo">Activas</option><option value="inactivo">Inactivas</option>
          </select>
          {(query.trim() !== "" || status !== "all") && (
            <button type="button" className={styles.clearBtn} onClick={() => { setQuery(""); setStatus("all"); }}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de sucursales">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sucursal</th>
                  <th>Código</th>
                  <th>Ciudad</th>
                  <th>Contacto</th>
                  <th>Responsable</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((sucursal) => (
                  <tr key={sucursal.id}>
                    <td data-label="Sucursal" className={styles.cellMain}>
                      <div className={styles.person}>
                        <span className={styles.avatar}>{initialsSucursal(sucursal.nombre)}</span>
                        <span className={styles.personMeta}>
                          <strong>{sucursal.nombre}</strong>
                          <em>{sucursal.direccion || "—"}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="Código"><code>{sucursal.codigo}</code></td>
                    <td data-label="Ciudad">{sucursal.ciudad}</td>
                    <td data-label="Contacto">
                      <div className={styles.contact}>
                        <a href={`mailto:${sucursal.email}`}>{sucursal.email}</a>
                        <span>{sucursal.telefono || "—"}</span>
                      </div>
                    </td>
                    <td data-label="Responsable">{sucursal.responsable || "—"}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${sucursal.estado}`]}`}>
                        {sucursal.estado === "activo" ? "Activa" : sucursal.estado}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          disabled={!canWrite} onClick={() => openEdit(sucursal)}
                          aria-label={`Editar ${sucursal.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          disabled={!canDelete} onClick={() => setConfirmSucursal(sucursal)}
                          aria-label={`Eliminar ${sucursal.nombre}`}
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
                <span className={styles.emptyIcon}><Building2 size={22} /></span>
                <strong>Sin sucursales</strong>
                <p>
                  {query.trim() !== ""
                    ? "No hay resultados con esa búsqueda. Prueba otro término."
                    : "Aún no has agregado sucursales. Crea la primera."}
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {modalOpen && (
        <DialogBackdrop onDismiss={closeModal}>
          <div className={styles.modal} data-drag-scroll="" data-lenis-prevent="" role="dialog" aria-modal="true" aria-label={editingId ? "Editar sucursal" : "Nueva sucursal"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nueva"}</p>
                <h2>{editingId ? "Editar sucursal" : "Agregar sucursal"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitSucursal}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Nombre de la sucursal
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Ej. Sucursal San Pedro Sula"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Código
                  <input
                    type="text"
                    value={draft.codigo}
                    onChange={(event) => changeField("codigo", event.target.value)}
                    placeholder="Ej. SPS-001"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Ciudad
                  <input
                    type="text"
                    value={draft.ciudad}
                    onChange={(event) => changeField("ciudad", event.target.value)}
                    placeholder="Ej. San Pedro Sula"
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    <option value="activo">Activa</option>
                    <option value="inactivo">Inactiva</option>
                    <option value="borrador">Borrador</option>
                  </select>
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Dirección
                  <input
                    type="text"
                    value={draft.direccion}
                    onChange={(event) => changeField("direccion", event.target.value)}
                    placeholder="Ej. Blvd. Morazán, Col. La Juana"
                  />
                </label>
                <label className={styles.field}>
                  Teléfono
                  <input
                    type="tel"
                    value={draft.telefono}
                    onChange={(event) => changeField("telefono", event.target.value)}
                    placeholder="+504 0000-0000"
                  />
                </label>
                <label className={styles.field}>
                  Email
                  <input
                    type="email"
                    value={draft.email}
                    onChange={(event) => changeField("email", event.target.value)}
                    placeholder="sucursal@arconethn.com"
                  />
                </label>
                <label className={styles.field}>
                  Responsable
                  <select
                    value={draft.responsable}
                    onChange={(event) => changeField("responsable", event.target.value)}
                  >
                    <option value="">Sin responsable</option>
                    {workers.map((worker) => (
                      <option key={worker.id} value={worker.nombre}>
                        {worker.nombre}{worker.puesto ? ` — ${worker.puesto}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Agregar sucursal"}
                </button>
              </footer>
            </form>
          </div>
        </DialogBackdrop>
      )}

      {confirmSucursal && (
        <ConfirmDialog
          title="Eliminar sucursal"
          message={
            <>
              ¿Seguro que deseas eliminar <strong>{confirmSucursal.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmSucursal(null)}
          onConfirm={async () => {
            try {
              await deleteSucursal(confirmSucursal.id);
              setSucursales((current) =>
                current.filter((sucursal) => sucursal.id !== confirmSucursal.id),
              );
              show("Sucursal eliminada.");
            } catch (error) {
              show(error.message || "No se pudo eliminar la sucursal.", "error");
            }
            setConfirmSucursal(null);
          }}
        />
      )}

    </>
  );
}
