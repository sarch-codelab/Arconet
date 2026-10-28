"use client";

import { useMemo, useState } from "react";
import { Check, Layers, Pencil, Plus, Search, ShieldCheck, Trash2, Users, X } from "lucide-react";
import styles from "./admin-experience.module.css";
import { useToast, notifyError, ConfirmDialog } from "./admin-ui";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  SUPER_ROLE,
} from '@/lib/permisos";
import { ROLE_STATUSES, rolSlug, createRol, deleteRol, updateRol } from "./roles-store";
import { useEscapeKey, useBodyScrollLock } from "./use-body-scroll-lock";
import { Topbar, SectionTabs } from "./topbar";
import { SECTION_NAV_CONFIG, NAV } from "./admin-nav";

const EMPTY_ROLE = { nombre: "", slug: "", descripcion: "", permisos: [], estado: "activo" };


export default function RolesSection({ roles = [], setRoles, workers = [], session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_ROLE);
  const [saving, setSaving] = useState(false);
  const [confirmRole, setConfirmRole] = useState(null);
  const { show } = useToast();

  // Lo que el usuario actual puede hacer aqui depende de su propio rol. Solo
  // puede otorgar permisos que el mismo tiene (el servidor aplica la misma regla).
  const myPermisos = session?.permisos || [];
  const canWrite = myPermisos.includes("roles:write");
  const canDelete = myPermisos.includes("roles:delete");
  const isSuperUser = session?.rol === SUPER_ROLE;

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const stats = useMemo(() => ({
    total: roles.length,
    activos: roles.filter((r) => r.estado === "activo").length,
    asignados: roles.reduce((sum, r) => sum + (r.trabajadores || 0), 0),
  }), [roles]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("es");
    return roles.filter((role) => {
      if (activeTab === "active" && role.estado !== "activo") return false;
      if (activeTab === "inactive" && role.estado !== "inactivo") return false;
      if (!q) return true;
      return `${role.nombre} ${role.slug} ${role.descripcion || ""}`
        .toLocaleLowerCase("es")
        .includes(q);
    });
  }, [roles, activeTab, query]);

  const isSuperRole = (role) => role?.slug === SUPER_ROLE;
  const visibleSections = (role) =>
    PERMISSION_MODULES.filter((module) => isSuperRole(role) || role.permisos?.includes(`${module.id}:read`));

  function openCreate() {
    setDraft(EMPTY_ROLE);
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(role) {
    setDraft({ ...role, permisos: [...(role.permisos || [])] });
    setEditingId(role.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  // Ver es la base de cada seccion: crear, editar o eliminar la activan, y
  // quitar Ver quita tambien el resto de privilegios de esa seccion.
  function togglePermission(module, action) {
    const perm = `${module.id}:${action}`;
    setDraft((prev) => {
      const current = new Set(prev.permisos);
      if (current.has(perm)) {
        current.delete(perm);
        if (action === "read") module.actions.forEach((a) => current.delete(`${module.id}:${a}`));
      } else {
        current.add(perm);
        if (action !== "read") current.add(`${module.id}:read`);
      }
      return { ...prev, permisos: [...current] };
    });
  }

  function setAllPermissions(enabled) {
    setDraft((prev) => {
      // Los permisos que el usuario no puede otorgar se conservan tal cual.
      const kept = prev.permisos.filter((perm) => !myPermisos.includes(perm));
      return { ...prev, permisos: enabled ? [...new Set([...kept, ...myPermisos])] : kept };
    });
  }

  function requestDelete(role) {
    const assigned = (role.trabajadores || 0) + (role.usuarios || 0);
    if (assigned > 0) {
      show(
        `No se puede eliminar "${role.nombre}": tiene ${role.trabajadores || 0} trabajador(es) asignados. Reasígnalos primero.`,
        "error",
      );
      return;
    }
    setConfirmRole(role);
  }

  async function submitRole(event) {
    event.preventDefault();
    const nombre = draft.nombre.trim();
    if (!nombre) {
      notifyError("El nombre del rol es obligatorio.");
      return;
    }
    const payload = {
      nombre,
      descripcion: draft.descripcion.trim(),
      permisos: draft.permisos,
      estado: draft.estado,
    };

    setSaving(true);
    try {
      if (editingId) {
        const saved = await updateRol(editingId, payload);
        setRoles((current) => current.map((item) => (item.id === editingId ? saved : item)));
        show("Rol actualizado.");
      } else {
        const saved = await createRol({ ...payload, slug: rolSlug(nombre) });
        setRoles((current) => [...current, saved].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
        show("Rol creado.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar el rol.");
      return;
    } finally {
      setSaving(false);
    }
    closeModal();
  }

  const editingSuper = isSuperRole(draft);
  const slugPreview = editingId ? draft.slug : rolSlug(draft.nombre);
  const draftSections = visibleSections(draft);

  return (
    <>
      <Topbar
        title="Roles y permisos"
        subtitle="Crea roles, define qué secciones del panel ve cada uno y qué puede hacer en ellas."
        action={
          canWrite ? (
            <button type="button" className={styles.primaryBtn} onClick={openCreate}>
              <Plus size={16} /> Nuevo rol
            </button>
          ) : null
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.roles?.tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          label="Filtros de roles"
        />

        <section className={styles.stats} aria-label="Resumen de roles">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><ShieldCheck size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Roles</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.activos}</strong>
            <span className={styles.statLabel}>Activos</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Users size={18} /></span>
            <strong className={styles.statValue}>{stats.asignados}</strong>
            <span className={styles.statLabel}>Trabajadores asignados</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Layers size={18} /></span>
            <strong className={styles.statValue}>{PERMISSION_MODULES.length}</strong>
            <span className={styles.statLabel}>Secciones controladas</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Buscar roles">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre o descripción"
              aria-label="Buscar roles"
            />
          </label>
          {query && (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery("")}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de roles">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rol</th>
                  <th>Secciones visibles</th>
                  <th>Privilegios</th>
                  <th>Personal</th>
                  <th>Estado</th>
                  {(canWrite || canDelete) && <th className={styles.actionsCol}>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((role) => {
                  const sections = visibleSections(role);
                  const privileges = isSuperRole(role)
                    ? null
                    : (role.permisos || []).filter((perm) => !perm.endsWith(":read")).length;
                  return (
                    <tr key={role.id}>
                      <td data-label="Rol" className={styles.cellMain}>
                        <div className={styles.person}>
                          <span className={`${styles.avatar} ${styles.roleBadgeIcon}`}>
                            <ShieldCheck size={14} />
                          </span>
                          <span className={styles.personMeta}>
                            <strong>{role.nombre}</strong>
                            <em>{role.descripcion || role.slug}</em>
                          </span>
                        </div>
                      </td>
                      <td data-label="Secciones">
                        {isSuperRole(role) ? (
                          <span className={styles.roleChip}>Todas · acceso total</span>
                        ) : sections.length ? (
                          <span className={styles.roleChips}>
                            {sections.map((module) => (
                              <span key={module.id} className={styles.roleChip}>{module.label}</span>
                            ))}
                          </span>
                        ) : (
                          <span className={styles.roleMuted}>Solo Mi perfil</span>
                        )}
                      </td>
                      <td data-label="Privilegios">
                        {privileges === null
                          ? "Todos"
                          : privileges
                            ? `${privileges} privilegio${privileges === 1 ? "" : "s"} de edición`
                            : "Solo lectura"}
                      </td>
                      <td data-label="Personal">
                        <span className={styles.personMeta}>
                          <strong>{role.trabajadores || 0} trabajador{role.trabajadores === 1 ? "" : "es"}</strong>
                          <em>{role.usuarios || 0} con acceso al panel</em>
                        </span>
                      </td>
                      <td data-label="Estado">
                        <span className={`${styles.pill} ${styles[`status_${role.estado}`]}`}>
                          {(ROLE_STATUSES.find((item) => item.id === role.estado) || {}).label || role.estado}
                        </span>
                      </td>
                      {(canWrite || canDelete) && (
                        <td data-label="Acciones">
                          <div className={styles.rowActions}>
                            {canWrite && (!isSuperRole(role) || isSuperUser) && (
                              <button
                                type="button"
                                onClick={() => openEdit(role)}
                                aria-label={`Editar ${role.nombre}`}
                                title="Editar permisos"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {canDelete && !isSuperRole(role) && (
                              <button
                                type="button"
                                className={styles.danger}
                                onClick={() => requestDelete(role)}
                                aria-label={`Eliminar ${role.nombre}`}
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {!filtered.length && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon}><ShieldCheck size={22} /></span>
                <strong>Sin roles</strong>
                <p>
                  {query
                    ? "No hay roles que coincidan con la búsqueda."
                    : "Crea el primer rol para definir permisos del sistema."}
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
          <div
            className={`${styles.modal} ${styles.modalWide}`}
            role="dialog"
            aria-modal="true"
            aria-label={editingId ? "Editar rol" : "Nuevo rol"}
          >
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nuevo"}</p>
                <h2>{editingId ? `Rol ${draft.nombre}` : "Agregar rol"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitRole}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Nombre del rol
                  <input
                    type="text"
                    value={draft.nombre}
                    onChange={(event) => changeField("nombre", event.target.value)}
                    placeholder="Ej. Supervisor de proyectos"
                    required
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select
                    value={draft.estado}
                    onChange={(event) => changeField("estado", event.target.value)}
                    disabled={editingSuper}
                  >
                    {ROLE_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                  <small className={styles.fieldHint}>
                    {editingSuper
                      ? "El rol Administrador siempre está activo."
                      : "Un rol inactivo no se puede asignar y sus usuarios solo ven Mi perfil."}
                  </small>
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Descripción
                  <textarea
                    value={draft.descripcion}
                    onChange={(event) => changeField("descripcion", event.target.value)}
                    placeholder="Describe qué hace este rol y a quién va dirigido."
                    rows={2}
                  />
                  <small className={styles.fieldHint}>
                    Identificador: <code>{slugPreview || "se-genera-con-el-nombre"}</code>
                    {editingId ? " (no cambia al renombrar el rol)" : ""}
                  </small>
                </label>
              </div>

              <section className={styles.permMatrixCard} aria-label="Secciones y privilegios">
                <header className={styles.permMatrixHead}>
                  <div>
                    <strong>Secciones y privilegios</strong>
                    <p>
                      <em>Ver</em> muestra la sección en el menú del panel. Los demás privilegios permiten
                      crear, editar o eliminar dentro de ella. <em>Mi perfil</em> siempre está disponible.
                    </p>
                  </div>
                  {!editingSuper && (
                    <div className={styles.permMatrixBulk}>
                      <button type="button" className={styles.ghostBtn} onClick={() => setAllPermissions(true)}>
                        Marcar todo
                      </button>
                      <button type="button" className={styles.ghostBtn} onClick={() => setAllPermissions(false)}>
                        Quitar todo
                      </button>
                    </div>
                  )}
                </header>

                {editingSuper ? (
                  <p className={styles.permMatrixNote}>
                    <ShieldCheck size={16} /> El rol Administrador tiene acceso total a todas las secciones
                    y privilegios; no se puede limitar para evitar quedar sin acceso al panel.
                  </p>
                ) : (
                  <div className={styles.permMatrixWrap}>
                    <table className={styles.permMatrix}>
                      <thead>
                        <tr>
                          <th scope="col">Sección</th>
                          {PERMISSION_ACTIONS.map((action) => (
                            <th key={action.id} scope="col">{action.label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PERMISSION_MODULES.map((module) => {
                          const Icon = NAV.find((item) => item.id === module.section)?.icon || Layers;
                          return (
                            <tr key={module.id}>
                              <th scope="row">
                                <Icon size={15} aria-hidden="true" /> {module.label}
                              </th>
                              {PERMISSION_ACTIONS.map((action) => {
                                if (!module.actions.includes(action.id)) {
                                  return <td key={action.id} className={styles.permNa}>—</td>;
                                }
                                const perm = `${module.id}:${action.id}`;
                                const checked = draft.permisos.includes(perm);
                                return (
                                  <td key={action.id}>
                                    <label className={styles.checkbox}>
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        disabled={!checked && !myPermisos.includes(perm)}
                                        onChange={() => togglePermission(module, action.id)}
                                        aria-label={`${action.label}: ${module.label}`}
                                      />
                                      <span><Check size={12} /></span>
                                    </label>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!editingSuper && (
                  <p className={styles.permMatrixSummary}>
                    {draftSections.length
                      ? `Verá ${draftSections.length} sección${draftSections.length === 1 ? "" : "es"} además de Mi perfil: ${draftSections.map((m) => m.label).join(", ")}.`
                      : "Sin secciones marcadas: solo verá Mi perfil."}
                  </p>
                )}
              </section>

              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit} disabled={saving}>
                  {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar rol"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmRole && (
        <ConfirmDialog
          title="Eliminar rol"
          message={
            <>
              ¿Seguro que deseas eliminar <strong>{confirmRole.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmRole(null)}
          onConfirm={async () => {
            try {
              await deleteRol(confirmRole.id);
              setRoles((current) => current.filter((item) => item.id !== confirmRole.id));
              show("Rol eliminado.");
            } catch (error) {
              show(error.message || "No se pudo eliminar el rol.", "error");
            }
            setConfirmRole(null);
          }}
        />
      )}
    </>
  );
}
