"use client";

import { useMemo, useState } from "react";
import { Building2, Check, Pencil, Plus, RotateCw, Search, Trash2, Users, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { Avatar, useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { compressImage } from "./image-utils";
import {
  BRANCHES,
  STATUSES,
  branchLabel,
  createWorker,
  deleteWorker,
  formatDate,
  newWorkerId,
  statusLabel,
  updateWorker,
} from "./workers-store";
import { SUPER_ROLE } from '@/lib/permisos';
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar, SectionMarker } from "./topbar";
import filters from "./list-filters.module.css";

const EMPTY_WORKER = {
  id: "",
  nombre: "",
  puesto: "",
  correo: "",
  telefono: "",
  sucursal: "sps",
  rol: "tecnico",
  estado: "activo",
  ingreso: "",
  foto: "",
  accesoPanel: false,
  accesoActivo: false,
  password: "",
};

export default function WorkersSection({ workers = [], setWorkers, roles = [], sucursales = [], session }) {
  const branches = useMemo(() => sucursales.length ? sucursales.map(item => ({ id: item.id, label: item.nombre })) : BRANCHES, [sucursales]);
  const roleName = (slug) => roles.find((item) => item.slug === slug)?.nombre || slug;
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_WORKER);
  const [confirmWorker, setConfirmWorker] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const { show } = useToast();

  const canWrite = (session?.permisos || []).includes("trabajadores:write");
  const canDelete = session?.permisos?.includes("trabajadores:delete");

  // Accion rapida: alternar activo/inactivo sin abrir el modal.
  async function toggleWorkerState(worker) {
    const nextEstado = worker.estado === "activo" ? "inactivo" : "activo";
    setBusyId(worker.id);
    try {
      const saved = await updateWorker(worker.id, { ...worker, estado: nextEstado });
      setWorkers((current) =>
        current.map((item) => (item.id === worker.id ? saved : item)),
      );
      show(`${worker.nombre} ahora esta ${statusLabel(saved?.estado || nextEstado)}.`);
    } catch (error) {
      notifyError(error.message || "No se pudo cambiar el estado del trabajador.");
    } finally {
      setBusyId(null);
    }
  }

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return workers.filter((worker) => {
      if (branch !== "all" && worker.sucursal !== branch) return false;
      if (role !== "all" && worker.rol !== role) return false;
      if (status !== "all" && worker.estado !== status) return false;
      if (!q) return true;
      return [worker.nombre, worker.puesto, worker.correo, worker.telefono]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [workers, query, branch, role, status]);

  const stats = useMemo(() => {
    const total = workers.length;
    const activos = workers.filter((worker) => worker.estado === "activo").length;
    const perBranch = branches.map((item) => ({
      ...item,
      count: workers.filter((worker) => worker.sucursal === item.id).length,
    }));
    return { total, activos, perBranch };
  }, [workers, branches]);

  const hasFilters =
    query.trim() !== "" || branch !== "all" || role !== "all" || status !== "all";

  function clearFilters() {
    setQuery("");
    setBranch("all");
    setRole("all");
    setStatus("all");
  }

  function openCreate() {
    const firstActiveRole = roles.find((r) => r.estado === "activo" && r.slug !== SUPER_ROLE);
    setDraft({
      ...EMPTY_WORKER,
      sucursal: branches[0]?.id || "",
      id: newWorkerId(),
      rol: firstActiveRole ? (firstActiveRole.slug || firstActiveRole.nombre) : "tecnico",
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(worker) {
    setDraft({ ...worker });
    setEditingId(worker.id);
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

  async function submitWorker(event) {
    event.preventDefault();
    if (!draft.nombre.trim() || !draft.correo.trim()) {
      notifyError("El nombre y el correo son obligatorios.");
      return;
    }
    const payload = { ...draft, nombre: draft.nombre.trim() };
    let saved;
    try {
      if (editingId) {
        saved = await updateWorker(editingId, payload);
        setWorkers((current) =>
          current.map((worker) => (worker.id === editingId ? saved : worker)),
        );
        show("Trabajador actualizado.");
      } else {
        saved = await createWorker(payload);
        setWorkers((current) => [saved, ...current]);
        show("Trabajador agregado.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar el trabajador.");
      return;
    }
    closeModal();
  }

  async function confirmDelete() {
    if (!confirmWorker) return;
    try {
      await deleteWorker(confirmWorker.id);
      setWorkers((current) => current.filter((worker) => worker.id !== confirmWorker.id));
      show("Trabajador eliminado.");
    } catch (error) {
      show(error.message || "No se pudo eliminar el trabajador.", "error");
    }
    setConfirmWorker(null);
  }

  return (
    <>
      <Topbar
        title="Trabajadores"
        subtitle="Personal de Arconet por sucursal, rol y estado."
        action={
          <button type="button" className={styles.primaryBtn} disabled={!canWrite} onClick={openCreate}>
            <Plus size={16} /> Nuevo trabajador
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionMarker label="Trabajadores" icon={Users} />

        <section className={styles.stats} aria-label="Resumen de trabajadores">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Users size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Trabajadores</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activos}</strong>
            <span className={styles.statLabel}>Activos</span>
          </article>
          {stats.perBranch.map((item) => (
            <article key={item.id} className={styles.statCard}>
              <span className={styles.statIcon}><Building2 size={18} /></span>
              <strong className={styles.statValue}>{item.count}</strong>
              <span className={styles.statLabel}>{item.label}</span>
            </article>
          ))}
        </section>

        <section className={`${styles.toolbar} ${filters.bar}`} aria-label="Filtros de trabajadores">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, puesto o correo"
              aria-label="Buscar trabajadores"
            />
          </label>
          <select
            className={styles.select}
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            aria-label="Filtrar por sucursal"
          >
            <option value="all">Todas las sucursales</option>
            {branches.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={role}
            onChange={(event) => setRole(event.target.value)}
            aria-label="Filtrar por rol"
          >
            <option value="all">Todos los roles</option>
            {[...new Set([...roles.map(item => item.slug || item.nombre), ...workers.map(item => item.rol)])].filter(Boolean).map(slug => (
              <option key={slug} value={slug}>{roleName(slug)}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de trabajadores">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th>Contacto</th>
                  <th>Sucursal</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Ingreso</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((worker) => (
                  <tr key={worker.id}>
                    <td data-label="Trabajador" className={styles.cellMain}>
                      <div className={styles.person}>
                        <Avatar src={worker.foto} name={worker.nombre} />
                        <span className={styles.personMeta}>
                          <strong>{worker.nombre}</strong>
                          <em>{worker.puesto || "—"}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="Contacto">
                      <div className={styles.contact}>
                        <a href={`mailto:${worker.correo}`}>{worker.correo}</a>
                        <span>{worker.telefono || "—"}</span>
                      </div>
                    </td>
                    <td data-label="Sucursal">{branchLabel(worker.sucursal, branches)}</td>
                    <td data-label="Rol"><span className={styles.role}>{roleName(worker.rol)}</span></td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${worker.estado}`]}`}>
                        {statusLabel(worker.estado)}
                      </span>
                    </td>
                    <td data-label="Ingreso">{formatDate(worker.ingreso)}</td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        {canWrite && (
                          <button
                            type="button"
                            onClick={() => toggleWorkerState(worker)}
                            disabled={busyId === worker.id}
                            aria-label={
                              worker.estado === "activo"
                                ? `Desactivar a ${worker.nombre}`
                                : `Activar a ${worker.nombre}`
                            }
                            title={worker.estado === "activo" ? "Marcar inactivo" : "Marcar activo"}
                          >
                            <RotateCw size={15} className={busyId === worker.id ? styles.spinning : undefined} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canWrite} onClick={() => openEdit(worker)}
                          aria-label={`Editar ${worker.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          disabled={!canDelete} onClick={() => setConfirmWorker(worker)}
                          aria-label={`Eliminar ${worker.nombre}`}
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
                <span className={styles.emptyIcon}><Users size={22} /></span>
                <strong>Sin trabajadores</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : "Aún no has agregado personal. Crea el primer trabajador."}
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
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar trabajador" : "Nuevo trabajador"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nuevo"}</p>
                <h2>{editingId ? "Editar trabajador" : "Agregar trabajador"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitWorker}>
              <div className={styles.photoRow}>
                <Avatar src={draft.foto} name={draft.nombre} className={styles.photoPreview} />
                <div className={styles.photoActions}>
                  <input
                    id="worker-photo"
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handlePhoto}
                  />
                  <label htmlFor="worker-photo" className={styles.upload}>Subir foto</label>
                  {draft.foto && (
                    <button type="button" className={styles.ghostBtn} onClick={() => changeField("foto", "")}>
                      Quitar foto
                    </button>
                  )}
                  <p>JPG o PNG. Se guarda en el servidor.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Nombre completo
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Nombre y apellido"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Puesto
                  <input
                    type="text"
                    value={draft.puesto}
                    onChange={(event) => changeField("puesto", event.target.value)}
                    placeholder="Ej. Técnico de fibra óptica"
                  />
                </label>
                <label className={styles.field}>
                  Correo electrónico
                  <input
                    type="email"
                    value={draft.correo}
                    onChange={(event) => changeField("correo", event.target.value)}
                    placeholder="nombre@arconethn.com"
                    required
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
                  Sucursal
                  <select value={draft.sucursal} onChange={(event) => changeField("sucursal", event.target.value)}>
                    {branches.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Rol
                  <select value={draft.rol} onChange={(event) => changeField("rol", event.target.value)}>
                    {roles
                      .filter((r) => r.estado === "activo" || r.slug === draft.rol)
                      .filter((r) => r.slug !== SUPER_ROLE || session?.rol === SUPER_ROLE || draft.rol === SUPER_ROLE)
                      .map((item) => (
                        <option key={item.id} value={item.slug || item.nombre}>{item.nombre}</option>
                      ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Fecha de ingreso
                  <input
                    type="date"
                    value={draft.ingreso}
                    onChange={(event) => changeField("ingreso", event.target.value)}
                  />
                </label>
              </div>

              <div className={styles.accessBox}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={Boolean(draft.accesoPanel)}
                    onChange={(event) => changeField("accesoPanel", event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Permitir acceso al panel (crear cuenta de login)
                </label>
                <p className={styles.fieldHint}>
                  Se crea una cuenta con este correo. La contraseña no se puede ver después.
                  {editingId && draft.accesoPanel ? " Dejala en blanco para conservar la actual." : ""}
                </p>
                {draft.accesoPanel && (
                  <label className={styles.field}>
                    Contraseña
                    <input
                      type="password"
                      value={draft.password || ""}
                      onChange={(event) => changeField("password", event.target.value)}
                      placeholder={editingId ? "Dejar en blanco para no cambiarla" : "Mínimo 6 caracteres"}
                      autoComplete="new-password"
                    />
                  </label>
                )}
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Agregar trabajador"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmWorker && (
        <ConfirmDialog
          title="Eliminar trabajador"
          message={
            <>
              ¿Seguro que deseas eliminar a <strong>{confirmWorker.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmWorker(null)}
          onConfirm={async () => {
            try {
              await deleteWorker(confirmWorker.id);
              setWorkers((current) =>
                current.filter((worker) => worker.id !== confirmWorker.id),
              );
              show("Trabajador eliminado.");
            } catch (error) {
              show(error.message || "No se pudo eliminar el trabajador.", "error");
            }
            setConfirmWorker(null);
          }}
        />
      )}

    </>
  );
}
