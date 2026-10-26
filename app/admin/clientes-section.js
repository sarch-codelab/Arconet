"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Pencil, Plus, Search, Trash2, Users, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { Avatar, useToast, notifyError, ConfirmDialog } from "./admin-ui";
import { compressImage } from "./image-utils";
import {
  createCliente,
  deleteCliente,
  newClienteId,
  updateCliente,
  clientStatusLabel,
  CLIENT_STATUSES,
} from "./clientes-store";
import { formatDate } from "./workers-store";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar } from "./topbar";

export default function ClientesSection({ clientes, setClientes, workers = [], session }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    id: "",
    nombre: "",
    rtn: "",
    contacto: "",
    correo: "",
    telefono: "",
    direccion: "",
    ciudad: "",
    estado: "activo",
    foto: "",
    fechaRegistro: new Date().toISOString().split("T")[0],
  });
  const [confirmCliente, setConfirmCliente] = useState(null);
  const { show } = useToast();

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clientes.filter((cliente) => {
      if (status !== "all" && cliente.estado !== status) return false;
      if (!q) return true;
      return [cliente.nombre, cliente.correo, cliente.contacto, cliente.rtn]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [clientes, query, status]);

  const stats = useMemo(() => {
    const total = clientes.length;
    const activos = clientes.filter((cliente) => cliente.estado === "activo").length;
    const prospectos = clientes.filter((cliente) => cliente.estado === "prospecto").length;
    return { total, activos, prospectos };
  }, [clientes]);

  const hasFilters = query.trim() !== "" || status !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
  }

  function openCreate() {
    setDraft({
      id: newClienteId(),
      nombre: "",
      rtn: "",
      contacto: "",
      correo: "",
      telefono: "",
      direccion: "",
      ciudad: "",
      estado: "activo",
      foto: "",
      fechaRegistro: new Date().toISOString().split("T")[0],
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(cliente) {
    setDraft({ ...cliente });
    setEditingId(cliente.id);
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

  async function submitCliente(event) {
    event.preventDefault();
    if (!draft.nombre.trim() || !draft.correo.trim()) {
      notifyError("El nombre y el correo son obligatorios.");
      return;
    }
    const payload = { ...draft, nombre: draft.nombre.trim() };
    let saved;
    try {
      if (editingId) {
        saved = await updateCliente(editingId, payload);
        setClientes((current) =>
          current.map((cliente) => (cliente.id === editingId ? saved : cliente)),
        );
        show("Cliente actualizado.");
      } else {
        saved = await createCliente(payload);
        setClientes((current) => [saved, ...current]);
        show("Cliente agregado.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar el cliente.");
      return;
    }
    closeModal();
  }

  return (
    <>
      <Topbar
        title="Clientes"
        subtitle="Base de clientes de Arconet: contacto, RTN y estado."
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nuevo cliente
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <section className={styles.stats} aria-label="Resumen de clientes">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Users size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Clientes</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activos}</strong>
            <span className={styles.statLabel}>Activos</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={styles.statValue}>{stats.prospectos}</strong>
            <span className={styles.statLabel}>Prospectos</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, RTN o correo"
              aria-label="Buscar clientes"
            />
          </label>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {CLIENT_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de clientes">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>RTN</th>
                  <th>Contacto</th>
                  <th>Ciudad</th>
                  <th>Fecha registro</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cliente) => (
                  <tr key={cliente.id}>
                    <td data-label="Cliente" className={styles.cellMain}>
                      <div className={styles.person}>
                        <Avatar src={cliente.foto} name={cliente.nombre} />
                        <span className={styles.personMeta}>
                          <strong>{cliente.nombre}</strong>
                          <em>{cliente.contacto || "—"}</em>
                        </span>
                      </div>
                    </td>
                    <td data-label="RTN"><code>{cliente.rtn || "—"}</code></td>
                    <td data-label="Contacto">
                      <div className={styles.contact}>
                        <a href={`mailto:${cliente.correo}`}>{cliente.correo}</a>
                        <span>{cliente.telefono || "—"}</span>
                      </div>
                    </td>
                    <td data-label="Ciudad">{cliente.ciudad}</td>
                    <td data-label="Fecha registro">{formatDate(cliente.fechaRegistro)}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${cliente.estado}`]}`}>
                        {clientStatusLabel(cliente.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openEdit(cliente)}
                          aria-label={`Editar ${cliente.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmCliente(cliente)}
                          aria-label={`Eliminar ${cliente.nombre}`}
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
                <strong>Sin clientes</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : "Aún no has agregado clientes. Crea el primero."}
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
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar cliente" : "Nuevo cliente"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nuevo"}</p>
                <h2>{editingId ? "Editar cliente" : "Agregar cliente"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitCliente}>
              <div className={styles.photoRow}>
                <Avatar src={draft.foto} name={draft.nombre} className={styles.photoPreview} />
                <div className={styles.photoActions}>
                  <input
                    id="cliente-photo"
                    type="file"
                    accept="image/*"
                    className={styles.fileInput}
                    onChange={handlePhoto}
                  />
                  <label htmlFor="cliente-photo" className={styles.upload}>Subir foto</label>
                  {draft.foto && (
                    <button type="button" className={styles.ghostBtn} onClick={() => changeField("foto", "")}>
                      Quitar foto
                    </button>
                  )}
                  <p>JPG o PNG. Se guarda en el servidor.</p>
                </div>
              </div>

              <div className={styles.fieldGrid}>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Nombre de la empresa / cliente
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Ej. Empresa TelecomHN"
                    required
                  />
                </label>
                <label className={styles.field}>
                  RTN
                  <input
                    type="text"
                    value={draft.rtn}
                    onChange={(event) => changeField("rtn", event.target.value)}
                    placeholder="08011999000123"
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {CLIENT_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Contacto
                  <input
                    type="text"
                    value={draft.contacto}
                    onChange={(event) => changeField("contacto", event.target.value)}
                    placeholder="Nombre del contacto"
                  />
                </label>
                <label className={styles.field}>
                  Correo electrónico
                  <input
                    type="email"
                    value={draft.correo}
                    onChange={(event) => changeField("correo", event.target.value)}
                    placeholder="contacto@empresa.com"
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
                  Ciudad
                  <input
                    type="text"
                    value={draft.ciudad}
                    onChange={(event) => changeField("ciudad", event.target.value)}
                    placeholder="Ej. San Pedro Sula"
                  />
                </label>
                <label className={styles.field}>
                  Fecha de registro
                  <input
                    type="date"
                    value={draft.fechaRegistro}
                    onChange={(event) => changeField("fechaRegistro", event.target.value)}
                  />
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Dirección
                  <input
                    type="text"
                    value={draft.direccion}
                    onChange={(event) => changeField("direccion", event.target.value)}
                    placeholder="Dirección física"
                  />
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Agregar cliente"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmCliente && (
        <ConfirmDialog
          title="Eliminar cliente"
          message={
            <>
              ¿Seguro que deseas eliminar a <strong>{confirmCliente.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmCliente(null)}
          onConfirm={async () => {
            try {
              await deleteCliente(confirmCliente.id);
              setClientes((current) =>
                current.filter((cliente) => cliente.id !== confirmCliente.id),
              );
              show("Cliente eliminado.");
            } catch (error) {
              show(error.message || "No se pudo eliminar el cliente.", "error");
            }
            setConfirmCliente(null);
          }}
        />
      )}

    </>
  );
}
