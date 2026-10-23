"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Camera,
  Check,
  Copy,
  Cpu,
  Database,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Globe,
  HardDrive,
  Info,
  Key,
  Layers,
  Lock,
  LogIn,
  Mail,
  MapPin,
  Monitor,
  Moon,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCw,
  Save,
  ScrollText,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
  Sun,
  Tags,
  Trash2,
  TrendingUp,
  Truck,
  User,
  Users,
  X,
} from "lucide-react";
import styles from "./admin-experience.module.css";
import { compressImage } from "./image-utils";
import { sileo } from "../toaster";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import { AdminContext, NAV, SECTION_NAV_CONFIG } from "./admin-nav";
import { SectionTabs, Topbar } from "./topbar";
const SolicitudesPanel = lazy(() => import("./solicitudes-panel"));
import { useAdminSmoothScroll } from "./use-smooth-scroll";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../lib/contact";
import {
  PERMISSION_ACTIONS,
  PERMISSION_MODULES,
  SUPER_ROLE,
  canAccessSection,
} from "../../lib/permisos";
import {
  BRANCHES,
  STATUSES,
  authenticate,
  branchLabel,
  clearSession,
  createWorker,
  deleteWorker,
  fetchWorkers,
  formatDate,
  initials,
  newWorkerId,
  statusLabel,
  updateWorker,
} from "./workers-store";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUSES,
  PRODUCT_UNITS,
  createProduct,
  deleteProduct,
  fetchProducts,
  formatPrice,
  formatStock,
  newProductId,
  productInitials,
  unitLabel,
  updateProduct,
} from "./products-store";
import {
  CATEGORY_STATUSES,
  categorySlug,
  createCategoria,
  deleteCategoria,
  fetchCategorias,
  updateCategoria,
} from "./categories-store";
import {
  ROLE_STATUSES,
  rolSlug,
  createRol,
  deleteRol,
  fetchRoles,
  updateRol,
} from "./roles-store";
import {
  createSucursal,
  deleteSucursal,
  fetchSucursales,
  newSucursalId,
  initialsSucursal,
  updateSucursal,
} from "./sucursales-store";
import {
  createOrder,
  deleteOrder,
  fetchOrders,
  newOrderId,
  updateOrder,
  ORDER_STATUSES,
  ORDER_TYPES,
  orderStatusLabel,
  orderTypeLabel,
  formatOrderDate,
} from "./orders-store";
import {
  createCliente,
  deleteCliente,
  fetchClientes,
  newClienteId,
  updateCliente,
  CLIENT_STATUSES,
  clientStatusLabel,
  initialsCliente,
} from "./clientes-store";


export const EMPTY_WORKER = {
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

const EMPTY_PRODUCT = {
  id: "",
  nombre: "",
  sku: "",
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

const EMPTY_CATEGORY = {
  id: "",
  nombre: "",
  slug: "",
  descripcion: "",
  foto: "",
  orden: "",
  estado: "activo",
};

export function AdminLogin() {
  return <LoginView />;
}

export function AdminPanel({ session, initialSection }) {
  const router = useRouter();

  const handleLogout = async () => {
    clearSession();
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.replace("/admin");
  };

  return (
    <AdminShell
      session={session}
      onLogout={handleLogout}
      initialSection={initialSection}
    />
  );
}

function Avatar({ src, name, className, shape }) {
  const circle = shape !== "square";
  const base = `${circle ? styles.avatar : styles.thumb} ${className || ""}`;
  if (src) {
    return (
      <span className={base}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" />
      </span>
    );
  }
  return <span className={base}>{productInitials(name)}</span>;
}

export function useToast() {
  const show = useCallback((message, type = "success") => {
    if (!message) return;
    sileo.show({ type, title: String(message) });
  }, []);
  return { show };
}

function notifyError(message) {
  if (message) sileo.error({ title: String(message) });
}

function AdminShell({ session, onLogout, initialSection }) {
  // La seccion inicial llega desde el servidor para que el HTML renderizado y
  // el primer render del cliente coincidan (sin desajuste de hidratacion).
  const [section, setSection] = useState(initialSection || "trabajadores");
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clientes, setClientes] = useState([]);

  const { scrollToTop } = useAdminSmoothScroll();
  // El rol define que secciones puede abrir el usuario (el servidor tambien
  // valida cada accion en las APIs).
  const canOpen = (id) => canAccessSection(session?.permisos, id);

  useEffect(() => {
    // El hash solo existe en el cliente: se sincroniza tras el montaje.
    const hash = window.location.hash.replace("#", "").trim();
    if (hash && hash !== section && canOpen(hash)) setSection(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorkers()
      .then((remote) => setWorkers(remote))
      .catch(() => {});
    fetchProducts()
      .then((remote) => setProducts(remote))
      .catch(() => {});
    fetchCategorias()
      .then((remote) => setCategorias(remote))
      .catch(() => {});
    fetchRoles()
      .then((remote) => setRoles(remote))
      .catch(() => {});
    fetchSucursales()
      .then((remote) => setSucursales(remote))
      .catch(() => {});
    fetchOrders()
      .then((remote) => setOrders(remote))
      .catch(() => {});
    fetchClientes()
      .then((remote) => setClientes(remote))
      .catch(() => {});

    const handlePopState = () => {
      const sp = new URLSearchParams(window.location.search);
      const s = sp.get("section");
      if (s && canOpen(s)) setSection(s);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const goTo = (id) => {
    if (!canOpen(id)) return;
    setSection(id);
    scrollToTop();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", id);
      window.history.pushState({}, "", url.toString());
    }
  };

  const goToWithTransition = (id) => {
    if (id === section) {
      return;
    }
    if (typeof window === "undefined") {
      goTo(id);
      return;
    }
    const label = NAV.find((item) => item.id === id)?.label || "";
    window.dispatchEvent(
      new CustomEvent("arconet:transition", {
        detail: {
          message: label,
          hold: 260,
          onCovered: () => goTo(id),
        },
      }),
    );
  };

  return (
    <AdminContext.Provider
      value={{
        section,
        goTo: goToWithTransition,
        onLogout,
        session,
      }}
    >
      <main className={styles.adminPage}>
        <div className={styles.shell}>
        <div className={styles.content}>
          {section === "trabajadores" ? (
            <WorkersSection
              workers={workers}
              setWorkers={setWorkers}
              roles={roles}
              session={session}
            />
          ) : section === "productos" ? (
            <ProductsSection
              products={products}
              setProducts={setProducts}
              categorias={categorias}
              workers={workers}
              session={session}
            />
          ) : section === "categorias" ? (
            <CategoriasSection
              categorias={categorias}
              setCategorias={setCategorias}
              products={products}
              setProducts={setProducts}
              workers={workers}
              session={session}
            />
          ) : section === "sucursales" ? (
            <SucursalesSection
              sucursales={sucursales}
              setSucursales={setSucursales}
              workers={workers}
              session={session}
            />
          ) : section === "clientes" ? (
            <ClientesSection
              clientes={clientes}
              setClientes={setClientes}
              workers={workers}
              session={session}
            />
          ) : section === "cotizaciones" ? (
            <CotizacionesSection
              orders={orders}
              setOrders={setOrders}
              clientes={clientes}
              products={products}
              workers={workers}
              session={session}
            />
          ) : section === "solicitudes" ? (
            <Suspense fallback={<div className={styles.body}>Cargando órdenes internas…</div>}>
              <SolicitudesPanel session={session} />
            </Suspense>
          ) : section === "resumen" ? (
            <ResumenSection
              workers={workers}
              products={products}
              sucursales={sucursales}
              orders={orders}
              session={session}
            />
          ) : section === "ajustes" ? (
            <AjustesSection session={session} workers={workers} />
          ) : section === "mi-perfil" ? (
            <MiPerfilSection session={session} workers={workers} />
          ) : section === "roles" ? (
            <RolesSection
              roles={roles}
              setRoles={setRoles}
              workers={workers}
              session={session}
            />
          ) : section === "monitoreo" ? (
            <MonitoreoSection session={session} workers={workers} />
          ) : section === "logs" ? (
            <LogsSection session={session} workers={workers} />
          ) : null}
        </div>
      </div>
    </main>
  </AdminContext.Provider>
  );
}

const EMPTY_ROLE = { nombre: "", slug: "", descripcion: "", permisos: [], estado: "activo" };

function RolesSection({ roles, setRoles, workers = [], session }) {
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
          tabs={SECTION_NAV_CONFIG.roles.tabs}
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

function WorkersSection({ workers, setWorkers, roles = [], session }) {
  const [activeTab, setActiveTab] = useState("all");
  const roleName = (slug) => roles.find((item) => item.slug === slug)?.nombre || slug;
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_WORKER);
  const [confirmWorker, setConfirmWorker] = useState(null);
  const { show } = useToast();
  const { goTo } = useContext(AdminContext);

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const handleTabChange = (tabId) => {
    if (tabId === "roles") {
      goTo("roles");
      return;
    }
    setActiveTab(tabId);
    if (tabId === "all") {
      setStatus("all");
      setBranch("all");
      setRole("all");
    } else if (tabId === "active") {
      setStatus("activo");
      setBranch("all");
      setRole("all");
    } else if (tabId === "sps") {
      setBranch("sps");
      setStatus("all");
      setRole("all");
    } else if (tabId === "ceiba") {
      setBranch("ceiba");
      setStatus("all");
      setRole("all");
    } else if (tabId === "gerencia") {
      setRole("gerente");
      setStatus("all");
      setBranch("all");
    }
  };

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
    const perBranch = BRANCHES.map((item) => ({
      ...item,
      count: workers.filter((worker) => worker.sucursal === item.id).length,
    }));
    return { total, activos, perBranch };
  }, [workers]);

  const hasFilters =
    query.trim() !== "" || branch !== "all" || role !== "all" || status !== "all";

  function clearFilters() {
    setQuery("");
    setBranch("all");
    setRole("all");
    setStatus("all");
    setActiveTab("all");
  }

  function openCreate() {
    const firstActiveRole = roles.find((r) => r.estado === "activo" && r.slug !== SUPER_ROLE);
    setDraft({
      ...EMPTY_WORKER,
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
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nuevo trabajador
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.trabajadores.tabs.filter(
            (tab) => tab.id !== "roles" || canAccessSection(session?.permisos, "roles"),
          )}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          label="Filtros de trabajadores"
        />

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

        <section className={styles.toolbar} aria-label="Filtros">
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
            {BRANCHES.map((item) => (
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
            {roles
              .filter((r) => r.estado === "activo")
              .map((item) => (
                <option key={item.id} value={item.slug || item.nombre}>{item.nombre}</option>
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
                    <td data-label="Sucursal">{branchLabel(worker.sucursal)}</td>
                    <td data-label="Rol"><span className={styles.role}>{roleName(worker.rol)}</span></td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${worker.estado}`]}`}>
                        {statusLabel(worker.estado)}
                      </span>
                    </td>
                    <td data-label="Ingreso">{formatDate(worker.ingreso)}</td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openEdit(worker)}
                          aria-label={`Editar ${worker.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmWorker(worker)}
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
                    placeholder="nombre@arconet.hn"
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
                    {BRANCHES.map((item) => (
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

function ProductsSection({ products, setProducts, categorias = [], workers = [], session }) {
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

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

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
      return [product.nombre, product.sku, product.marca]
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
    const payload = {
      ...draft,
      nombre: draft.nombre.trim(),
      sku: String(draft.sku || "").trim().toUpperCase(),
      marca: String(draft.marca || "").trim(),
      precio: Number(draft.precio) || 0,
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
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nuevo producto
          </button>
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
                <label className={styles.field}>
                  Marca
                  <input
                    type="text"
                    value={draft.marca}
                    onChange={(event) => changeField("marca", event.target.value)}
                    placeholder="Ej. Fiberhome"
                  />
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
                    min="0"
                    step="0.01"
                    value={draft.precio}
                    onChange={(event) => changeField("precio", event.target.value)}
                    placeholder="0.00"
                  />
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
                    value={draft.ubicacion}
                    onChange={(event) => changeField("ubicacion", event.target.value)}
                    placeholder="Ej. Pasillo 3 · Estante B"
                  />
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
              ¿Seguro que deseas eliminar <strong>{confirmProduct.nombre}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmProduct(null)}
          onConfirm={async () => {
            try {
              await deleteProduct(confirmProduct.id);
              setProducts((current) =>
                current.filter((product) => product.id !== confirmProduct.id),
              );
              show("Producto eliminado.");
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

function SucursalesSection({ sucursales, setSucursales, workers = [], session }) {
  const [query, setQuery] = useState("");
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
      if (!q) return true;
      return [sucursal.nombre, sucursal.codigo, sucursal.ciudad, sucursal.responsable]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [sucursales, query]);

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
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nueva sucursal
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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

        <section className={styles.toolbar} aria-label="Filtros">
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
          {query.trim() !== "" && (
            <button type="button" className={styles.clearBtn} onClick={() => setQuery("")}>
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
                          onClick={() => openEdit(sucursal)}
                          aria-label={`Editar ${sucursal.nombre}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmSucursal(sucursal)}
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
        <div
          className={styles.overlay}
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar sucursal" : "Nueva sucursal"}>
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
                    placeholder="sucursal@arconet.hn"
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
        </div>
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

function CategoriasSection({ categorias, setCategorias, products, setProducts, workers = [], session }) {
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
          tabs={SECTION_NAV_CONFIG.categorias.tabs}
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

function ClientesSection({ clientes, setClientes, workers = [], session }) {
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

function CotizacionesSection({ orders, setOrders, clientes, products, workers = [], session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    id: "",
    tipo: "cotizacion",
    clienteId: "",
    cliente: "",
    fecha: new Date().toISOString().split("T")[0],
    monto: "",
    estado: "pendiente",
    items: [],
    notas: "",
  });
  const [confirmOrder, setConfirmOrder] = useState(null);
  const { show } = useToast();

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "all") {
      setStatus("all");
      setType("all");
    } else if (tabId === "pending") {
      setStatus("pendiente");
      setType("all");
    } else if (tabId === "approved") {
      setStatus("aprobada");
      setType("all");
    } else if (tabId === "completed") {
      setStatus("completada");
      setType("all");
    } else if (tabId === "balance") {
      setStatus("all");
      setType("all");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && order.estado !== status) return false;
      if (type !== "all" && order.tipo !== type) return false;
      if (!q) return true;
      return [order.cliente, order.notas]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, query, status, type]);

  const stats = useMemo(() => {
    const total = orders.length;
    const pendientes = orders.filter((order) => order.estado === "pendiente").length;
    const aprobadas = orders.filter((order) => order.estado === "aprobada").length;
    const totalMonto = orders.reduce((sum, order) => sum + Number(order.monto || 0), 0);
    return { total, pendientes, aprobadas, totalMonto };
  }, [orders]);

  const hasFilters = query.trim() !== "" || status !== "all" || type !== "all";

  function clearFilters() {
    setQuery("");
    setStatus("all");
    setType("all");
    setActiveTab("all");
  }

  function openCreate() {
    setDraft({
      id: newOrderId(),
      tipo: "cotizacion",
      clienteId: "",
      cliente: "",
      fecha: new Date().toISOString().split("T")[0],
      monto: "",
      estado: "pendiente",
      items: [],
      notas: "",
    });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(order) {
    setDraft({ ...order });
    setEditingId(order.id);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
  }

  function changeField(field, value) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  async function submitOrder(event) {
    event.preventDefault();
    if (!draft.clienteId || !draft.cliente.trim()) {
      notifyError("El cliente es obligatorio.");
      return;
    }
    const payload = {
      ...draft,
      cliente: draft.cliente.trim(),
      monto: Number(draft.monto) || 0,
    };
    let saved;
    try {
      if (editingId) {
        saved = await updateOrder(editingId, payload);
        setOrders((current) =>
          current.map((order) => (order.id === editingId ? saved : order)),
        );
        show("Orden actualizada.");
      } else {
        saved = await createOrder(payload);
        setOrders((current) => [saved, ...current]);
        show("Orden creada.");
      }
    } catch (error) {
      notifyError(error.message || "No se pudo guardar la orden.");
      return;
    }
    closeModal();
  }

  return (
    <>
      <Topbar
        title="Cotizaciones"
        subtitle="Gestión de cotizaciones y órdenes de venta."
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nueva cotización
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.cotizaciones.tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          label="Filtros de cotizaciones"
        />

        <section className={styles.stats} aria-label="Resumen de cotizaciones">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><FileText size={18} /></span>
            <strong className={styles.statValue}>{stats.total}</strong>
            <span className={styles.statLabel}>Cotizaciones</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><AlertTriangle size={18} /></span>
            <strong className={styles.statValue}>{stats.pendientes}</strong>
            <span className={styles.statLabel}>Pendientes</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Check size={18} /></span>
            <strong className={styles.statValue}>{stats.aprobadas}</strong>
            <span className={styles.statLabel}>Aprobadas</span>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><TrendingUp size={18} /></span>
            <strong className={styles.statValue}>{formatPrice(stats.totalMonto)}</strong>
            <span className={styles.statLabel}>Valor total</span>
          </article>
        </section>

        <section className={styles.toolbar} aria-label="Filtros">
          <label className={styles.search}>
            <Search size={16} />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por cliente o notas"
              aria-label="Buscar cotizaciones"
            />
          </label>
          <select
            className={styles.select}
            value={type}
            onChange={(event) => setType(event.target.value)}
            aria-label="Filtrar por tipo"
          >
            <option value="all">Todos los tipos</option>
            {ORDER_TYPES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            {ORDER_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>{item.label}</option>
            ))}
          </select>
          {hasFilters && (
            <button type="button" className={styles.clearBtn} onClick={clearFilters}>
              <X size={14} /> Limpiar
            </button>
          )}
        </section>

        <section className={styles.tableCard} aria-label="Listado de cotizaciones">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Cotización</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Fecha</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  <th className={styles.actionsCol}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => (
                  <tr key={order.id}>
                    <td data-label="Cotización" className={styles.cellMain}><code>{order.id}</code></td>
                    <td data-label="Cliente">
                      <div className={styles.person}>
                        <span className={styles.avatar}>{initialsCliente(order.cliente)}</span>
                        <span className={styles.personMeta}>
                          <strong>{order.cliente}</strong>
                        </span>
                      </div>
                    </td>
                    <td data-label="Tipo"><span className={styles.role}>{orderTypeLabel(order.tipo)}</span></td>
                    <td data-label="Fecha">{formatOrderDate(order.fecha)}</td>
                    <td className={styles.priceCell} data-label="Monto">{formatPrice(order.monto)}</td>
                    <td data-label="Estado">
                      <span className={`${styles.pill} ${styles[`status_${order.estado}`]}`}>
                        {orderStatusLabel(order.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className={styles.rowActions}>
                        <button
                          type="button"
                          onClick={() => openEdit(order)}
                          aria-label={`Editar ${order.id}`}
                          title="Editar"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          onClick={() => setConfirmOrder(order)}
                          aria-label={`Eliminar ${order.id}`}
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
                <span className={styles.emptyIcon}><FileText size={22} /></span>
                <strong>Sin cotizaciones</strong>
                <p>
                  {hasFilters
                    ? "No hay resultados con esos filtros. Prueba ajustarlos."
                    : "Aún no has creado cotizaciones. Crea la primera."}
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
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editingId ? "Editar cotización" : "Nueva cotización"}>
            <header className={styles.modalHead}>
              <div>
                <p className={styles.eyebrow}>{editingId ? "Editar" : "Nueva"}</p>
                <h2>{editingId ? "Editar cotización" : "Crear cotización"}</h2>
              </div>
              <button type="button" className={styles.iconBtn} onClick={closeModal} aria-label="Cerrar">
                <X size={18} />
              </button>
            </header>

            <form className={styles.form} onSubmit={submitOrder}>
              <div className={styles.fieldGrid}>
                <label className={styles.field}>
                  Cliente
                  <select value={draft.clienteId} onChange={(event) => {
                    const cliente = clientes.find((c) => c.id === event.target.value);
                    changeField("clienteId", event.target.value);
                    changeField("cliente", cliente ? cliente.nombre : "");
                  }}>
                    <option value="">Seleccionar cliente</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Tipo
                  <select value={draft.tipo} onChange={(event) => changeField("tipo", event.target.value)}>
                    {ORDER_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Fecha
                  <input
                    type="date"
                    value={draft.fecha}
                    onChange={(event) => changeField("fecha", event.target.value)}
                  />
                </label>
                <label className={styles.field}>
                  Estado
                  <select value={draft.estado} onChange={(event) => changeField("estado", event.target.value)}>
                    {ORDER_STATUSES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  Monto (L)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.monto}
                    onChange={(event) => changeField("monto", event.target.value)}
                    placeholder="0.00"
                  />
                </label>
                <label className={`${styles.field} ${styles.spanFull}`}>
                  Notas
                  <textarea
                    value={draft.notas}
                    onChange={(event) => changeField("notas", event.target.value)}
                    placeholder="Detalles de la cotización..."
                    rows={3}
                  />
                </label>
              </div>


              <footer className={styles.modalActions}>
                <button type="button" className={styles.ghostBtn} onClick={closeModal}>
                  Cancelar
                </button>
                <button type="submit" className={styles.submit}>
                  {editingId ? "Guardar cambios" : "Crear cotización"}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {confirmOrder && (
        <ConfirmDialog
          title="Eliminar cotización"
          message={
            <>
              ¿Seguro que deseas eliminar la cotización <strong>{confirmOrder.id}</strong>? Esta
              acción no se puede deshacer.
            </>
          }
          onCancel={() => setConfirmOrder(null)}
          onConfirm={async () => {
            try {
              await deleteOrder(confirmOrder.id);
              setOrders((current) =>
                current.filter((order) => order.id !== confirmOrder.id),
              );
              show("Cotización eliminada.");
            } catch (error) {
              show(error.message || "No se pudo eliminar la cotización.", "error");
            }
            setConfirmOrder(null);
          }}
        />
      )}

    </>
  );
}

function ResumenSection({ workers, products, sucursales, orders, session }) {
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
    const ordersTotal = orders.length;
    const ordersPendientes = orders.filter((order) => order.estado === "pendiente").length;
    const ordersAprobadas = orders.filter((order) => order.estado === "aprobada").length;
    const ordersMonto = orders.reduce((sum, order) => sum + Number(order.monto || 0), 0);

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
      ordersAprobadas,
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

  return (
    <>
      <Topbar
        title="Resumen"
        subtitle="Vista general de la operación de Arconet."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <section className={styles.stats} aria-label="Estadísticas generales">
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Users size={18} /></span>
            <strong className={styles.statValue}>{stats.workersTotal}</strong>
            <span className={styles.statLabel}>Trabajadores</span>
            <small>{stats.workersActivos} activos</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><Package size={18} /></span>
            <strong className={styles.statValue}>{stats.productsTotal}</strong>
            <span className={styles.statLabel}>Productos</span>
            <small>{stats.productsActivos} activos</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><FileText size={18} /></span>
            <strong className={styles.statValue}>{stats.ordersTotal}</strong>
            <span className={styles.statLabel}>Cotizaciones</span>
            <small>{stats.ordersPendientes} pendientes</small>
          </article>
          <article className={styles.statCard}>
            <span className={styles.statIcon}><TrendingUp size={18} /></span>
            <strong className={styles.statValue}>{formatPrice(stats.ordersMonto)}</strong>
            <span className={styles.statLabel}>Ventas pendientes</span>
            <small>{stats.ordersAprobadas} aprobadas</small>
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
                <p className={styles.emptyText}>No hay productos con stock bajo.</p>
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
                <p className={styles.emptyText}>No hay ingresos recientes registrados.</p>
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
              {sucursales.map((sucursal) => {
                const sucursalWorkers = workers.filter((worker) => worker.sucursal === sucursal.id);
                return (
                  <article key={sucursal.id} className={styles.miniCard}>
                    <strong>{sucursal.nombre}</strong>
                    <div className={styles.miniStats}>
                      <span>{sucursalWorkers.length} trabajadores</span>
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

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function MonitoreoSection({ session, workers = [] }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");

  const load = useCallback(async (silent) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/monitor", { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setStatus(data);
      setError("");
    } catch (err) {
      setError(err?.message || "No se pudo obtener el estado del sistema.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const id = setInterval(() => load(true), 30000);
    return () => clearInterval(id);
  }, [load]);

  const severity = (value) => {
    if (value >= 90) return styles.meterDanger;
    if (value >= 75) return styles.meterWarn;
    return styles.meterOk;
  };

  const meter = (value, label) => (
    <div className={styles.meterRow}>
      <div className={styles.meterHead}>
        <span>{label}</span>
        <strong>{value}%</strong>
      </div>
      <div className={styles.meterTrack}>
        <span
          className={`${styles.meterFill} ${severity(value)}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );

  return (
    <>
      <Topbar
        title="Monitoreo"
        subtitle="Estado del servidor, recursos y copias de seguridad."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.monitoreo.tabs}
          activeTab={tab}
          onTabChange={setTab}
          label="Vistas de monitoreo"
        />

        <div className={styles.monitorBar}>
          <span className={styles.monitorHint}>
            {status?.generatedAt
              ? `Actualizado: ${formatTimestamp(status.generatedAt)}`
              : "Consultando estado…"}
          </span>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => load(false)}
            disabled={loading}
          >
            <RefreshCw size={15} /> {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>

        {error && (
          <section className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.alertItem}>
                <span className={styles.alertBadge}>Error</span>
                <span>{error}</span>
              </div>
            </div>
          </section>
        )}

        {!status && loading && !error ? (
          <section className={styles.card}>
            <div className={styles.cardBody}>
              <p className={styles.emptyText}>Cargando estado del sistema…</p>
            </div>
          </section>
        ) : null}

        {status && (tab === "all" || tab === "alerts") && status.alerts?.length > 0 && (
          <section className={styles.card} aria-label="Alertas del sistema">
            <header className={styles.cardHeader}>
              <h3><AlertTriangle size={18} /> Alertas activas</h3>
            </header>
            <div className={styles.cardBody}>
              <div className={styles.alertList}>
                {status.alerts.map((alert, index) => (
                  <div key={index} className={styles.alertItem}>
                    <span className={styles.alertBadge}>Aviso</span>
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {status && (tab === "all" || tab === "server") && (
          <>
            <section className={styles.stats} aria-label="Recursos del servidor">
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Cpu size={18} /></span>
                <strong className={styles.statValue}>{status.cpu.usagePercent}%</strong>
                <span className={styles.statLabel}>CPU</span>
                <small>{status.cpu.cores} núcleos</small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Activity size={18} /></span>
                <strong className={styles.statValue}>{status.memory.usagePercent}%</strong>
                <span className={styles.statLabel}>Memoria RAM</span>
                <small>{status.memory.usedGB} / {status.memory.totalGB} GB</small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><HardDrive size={18} /></span>
                <strong className={styles.statValue}>
                  {status.disk?.[0]?.usagePercent != null ? `${status.disk[0].usagePercent}%` : "—"}
                </strong>
                <span className={styles.statLabel}>Disco</span>
                <small>
                  {status.disk?.[0]
                    ? `${status.disk[0].usedGB} / ${status.disk[0].totalGB} GB`
                    : "No disponible"}
                </small>
              </article>
              <article className={styles.statCard}>
                <span className={styles.statIcon}><Server size={18} /></span>
                <strong className={styles.statValue}>{formatUptime(status.host.uptimeSeconds)}</strong>
                <span className={styles.statLabel}>Encendido</span>
                <small>{status.host.hostname}</small>
              </article>
            </section>

            <div className={styles.grid2}>
              <section className={styles.card} aria-label="Uso de recursos">
                <header className={styles.cardHeader}>
                  <h3><Activity size={18} /> Uso de recursos</h3>
                </header>
                <div className={styles.cardBody}>
                  {meter(status.cpu.usagePercent, "CPU")}
                  {meter(status.memory.usagePercent, "Memoria RAM")}
                  {(status.disk || []).map((disk) => (
                    <div key={disk.drive}>
                      {meter(disk.usagePercent, `Disco ${disk.drive}${disk.label ? ` (${disk.label})` : ""}`)}
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card} aria-label="Detalles del proceso">
                <header className={styles.cardHeader}>
                  <h3><Server size={18} /> Proceso</h3>
                </header>
                <div className={styles.cardBody}>
                  <div className={styles.list}>
                    <div className={styles.listItem}>
                      <strong>Entorno</strong>
                      <span>{status.process.env}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Node</strong>
                      <span>{status.process.nodeVersion}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>PID</strong>
                      <span>{status.process.pid}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Memoria del proceso</strong>
                      <span>{status.process.rssMB} MB</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Uptime del proceso</strong>
                      <span>{formatUptime(status.process.uptimeSeconds)}</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>Sistema</strong>
                      <span>{status.host.platform} {status.host.release} ({status.host.arch})</span>
                    </div>
                    <div className={styles.listItem}>
                      <strong>CPU</strong>
                      <span>{status.cpu.model || "—"}</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </>
        )}

        {status && (tab === "all" || tab === "backups") && (
          <section className={styles.card} aria-label="Copias de seguridad">
            <header className={styles.cardHeader}>
              <h3><Database size={18} /> Backups</h3>
            </header>
            <div className={styles.cardBody}>
              <p className={styles.monitorHint}>Directorio: {status.backups.dir}</p>
              {!status.backups.available ? (
                <p className={styles.emptyText}>
                  {status.backups.reason === "not-configured"
                    ? "No hay un directorio de backups configurado en este entorno."
                    : "No se pudo leer el directorio de backups."}
                </p>
              ) : status.backups.files.length === 0 ? (
                <p className={styles.emptyText}>No hay copias de seguridad en el directorio.</p>
              ) : (
                <div className={styles.list}>
                  {status.backups.files.map((file) => (
                    <div key={file.name} className={styles.listItem}>
                      <div>
                        <strong>{file.name}</strong>
                        <em>{formatTimestamp(file.modifiedAt)}</em>
                      </div>
                      <span className={styles.stockLow}>{file.sizeMB} MB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

const LOG_LEVELS = {
  info: { label: "Info", icon: Info },
  warn: { label: "Aviso", icon: AlertTriangle },
  error: { label: "Error", icon: AlertTriangle },
};

const LOG_CATEGORY_LABELS = {
  auth: "Autenticación",
  api: "API",
  db: "Base de datos",
  sistema: "Sistema",
  panel: "Panel",
};

function LogsSection({ session, workers = [] }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [nivel, setNivel] = useState("todos");

  const loadLogs = useCallback(
    async (categoria = "todas", filtroNivel = "todos") => {
      try {
        const params = new URLSearchParams();
        // La API espera "todas" para no filtrar por categoria.
        const categoriaApi = categoria === "all" ? "todas" : categoria;
        if (categoriaApi !== "todas") params.set("categoria", categoriaApi);
        if (filtroNivel !== "todos") params.set("nivel", filtroNivel);
        const query = params.toString();
        const res = await fetch(`/api/logs${query ? `?${query}` : ""}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("No se pudieron obtener los logs");
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
        setError("");
      } catch (err) {
        console.error("Error al cargar los logs:", err);
        setLogs([]);
        setError("No se pudieron cargar los registros del sistema.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    setRefreshing(true);
    loadLogs(tab, nivel);
    const timer = setInterval(() => loadLogs(tab, nivel), 30000);
    return () => clearInterval(timer);
  }, [loadLogs, tab, nivel]);

  return (
    <>
      <Topbar
        title="Logs del sistema"
        subtitle="Registro de actividad de autenticación, API, base de datos y panel."
        action={
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={() => {
              setRefreshing(true);
              loadLogs(tab, nivel);
            }}
            disabled={refreshing}
          >
            <RefreshCw size={15} className={refreshing ? styles.spinning : undefined} />
            {refreshing ? "Actualizando..." : "Actualizar"}
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG.logs.tabs}
          activeTab={tab}
          onTabChange={setTab}
          label="Filtros de registros"
        />

        <section className={styles.card} aria-label="Filtros de los registros">
          <header className={styles.cardHeader}>
            <h3>
              <ScrollText size={18} /> Filtros
            </h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.toolbar}>
              <label className={styles.fieldInline}>
                Nivel
                <select
                  value={nivel}
                  onChange={(event) => setNivel(event.target.value)}
                  className={styles.select}
                >
                  <option value="todos">Todos</option>
                  <option value="info">Info</option>
                  <option value="warn">Aviso</option>
                  <option value="error">Error</option>
                </select>
              </label>
              <span className={styles.logsCount}>
                {loading
                  ? "Cargando registros..."
                  : `${logs.length} registro${logs.length === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-label="Registros del sistema">
          <header className={styles.cardHeader}>
            <h3>
              <ScrollText size={18} /> Actividad registrada
            </h3>
          </header>
          <div className={styles.cardBody}>
            {loading ? (
              <p className={styles.emptyText}>Cargando registros...</p>
            ) : error ? (
              <p className={styles.emptyText}>{error}</p>
            ) : logs.length === 0 ? (
              <p className={styles.emptyText}>
                No hay registros para los filtros seleccionados.
              </p>
            ) : (
              <ul className={styles.logsList}>
                {logs.map((log) => {
                  const level = LOG_LEVELS[log.nivel] || LOG_LEVELS.info;
                  const LevelIcon = level.icon;
                  return (
                    <li key={log.id} className={styles.logItem}>
                      <div className={styles.logHeader}>
                        <span
                          className={`${styles.logLevel} ${styles[`logLevel_${log.nivel}`] || ""}`}
                        >
                          <LevelIcon size={12} />
                          {level.label}
                        </span>
                        <span className={styles.logCategory}>
                          {LOG_CATEGORY_LABELS[log.categoria] || log.categoria}
                        </span>
                        <span className={styles.logTime}>
                          {formatTimestamp(log.createdAt)}
                        </span>
                      </div>
                      <p className={styles.logMessage}>{log.mensaje}</p>
                      {(log.actor || log.ruta) && (
                        <small className={styles.logActor}>
                          {log.actor ? `Por: ${log.actor}` : ""}
                          {log.actor && log.ruta ? " · " : ""}
                          {log.ruta || ""}
                        </small>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function MiPerfilSection({ session, workers = [] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activity, setActivity] = useState([]);
  const [profileError, setProfileError] = useState("");
  const [twoFactorFlow, setTwoFactorFlow] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState("");
  const myWorker = useMemo(() => {
    if (profile?.trabajador) return profile.trabajador;
    if (!session?.correo) return null;
    return workers.find((w) => w.correo?.toLowerCase() === session.correo.toLowerCase()) || null;
  }, [profile, workers, session?.correo]);

  const refreshProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/perfil", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el perfil.");
      setProfile(data);
      setActivity(Array.isArray(data.activity) ? data.activity : []);
      setFormData({ nombre: data.nombre || "", correo: data.correo || "", telefono: data.trabajador?.telefono || "" });
      setProfileError("");
    } catch (error) {
      setProfileError(error.message);
    }
  }, []);
  useEffect(() => { refreshProfile(); }, [refreshProfile]);
  const refreshSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch("/api/perfil/sesiones", { cache: "no-store" });
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.error || "No se pudieron cargar las sesiones.");
      setSessions(Array.isArray(data) ? data : []);
      setSessionsError("");
    } catch (error) { setSessionsError(error.message); }
    finally { setSessionsLoading(false); }
  }, []);
  useEffect(() => { if (activeTab === "security") refreshSessions(); }, [activeTab, refreshSessions]);

  const [formData, setFormData] = useState({
    nombre: session?.nombre || "",
    correo: session?.correo || "",
    telefono: myWorker?.telefono || "",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [securityModals, setSecurityModals] = useState({ password: false });
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const { show } = useToast();

  const userStats = profile?.stats || { completedOrders: 0, daysOnPlatform: 0, loginsThisMonth: 0 };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("El archivo debe ser una imagen.", "error");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      show("La imagen original no debe superar 8 MB.", "error");
      return;
    }
    try {
      const compressed = await compressImage(file, { maxDimension: 384, quality: 0.72 });
      if (compressed.length > 280000) throw new Error("La imagen sigue siendo demasiado grande. Elige una imagen más pequeña.");
      setPhotoPreview(compressed);
    } catch (error) {
      show(error.message || "No se pudo procesar la imagen.", "error");
    }
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/perfil", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nombre: formData.nombre, telefono: formData.telefono, ...(photoPreview ? { foto: photoPreview } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar el perfil.");
      setEditMode(false);
      setPhotoPreview(null);
      await refreshProfile();
      show("Perfil actualizado correctamente.");
    } catch (error) {
      show(error.message || "No se pudo guardar el perfil.", "error");
    } finally { setSaving(false); }
  };

  const handleCancel = () => {
    setFormData({
      nombre: profile?.nombre || session?.nombre || "",
      correo: profile?.correo || session?.correo || "",
      telefono: myWorker?.telefono || "",
    });
    setPhotoPreview(null);
    setEditMode(false);
  };

  const openSecurityModal = (type) => setSecurityModals((prev) => ({ ...prev, [type]: true }));
  const closeSecurityModal = (type) => setSecurityModals((prev) => ({ ...prev, [type]: false }));

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    if (passwordForm.nueva !== passwordForm.confirmar) {
      show("Las contraseñas no coinciden.", "error");
      return;
    }
    if (passwordForm.nueva.length < 12) {
      show("La contraseña debe tener al menos 12 caracteres.", "error");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/password", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(passwordForm) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la contraseña.");
      setPasswordForm({ actual: "", nueva: "", confirmar: "" });
      closeSecurityModal("password");
      show("Contraseña actualizada correctamente.");
    } catch (error) {
      show(error.message || "No se pudo actualizar la contraseña.", "error");
    } finally { setSaving(false); }
  };

  const startTwoFactorSetup = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup" }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo iniciar la configuración.");
      setTwoFactorFlow({ mode: "setup", secret: data.secret, uri: data.uri, codigo: "", password: "" });
    } catch (error) { show(error.message, "error"); }
    finally { setSaving(false); }
  };

  const submitTwoFactor = async (event) => {
    event.preventDefault();
    if (!twoFactorFlow || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/perfil/2fa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: twoFactorFlow.mode === "setup" ? "enable" : "disable", codigo: twoFactorFlow.codigo, ...(twoFactorFlow.mode === "disable" ? { password: twoFactorFlow.password } : {}) }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo actualizar la autenticación.");
      setTwoFactorFlow(null);
      await refreshProfile();
      show(data.enabled ? "Autenticación en dos pasos activada." : "Autenticación en dos pasos desactivada.");
    } catch (error) { show(error.message, "error"); }
    finally { setSaving(false); }
  };

  const revokeSession = async (sessionId) => {
    try {
      const response = await fetch("/api/perfil/sesiones", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cerrar la sesión.");
      setSessions((current) => current.filter((item) => item.sessionId !== sessionId));
      show("Sesión cerrada.");
    } catch (error) { show(error.message, "error"); }
  };

  const revokeOtherSessions = async () => {
    try {
      const response = await fetch("/api/perfil/sesiones", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ allOther: true }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudieron cerrar las sesiones.");
      setSessions((current) => current.filter((item) => item.current));
      show(`${data.revoked || 0} sesiones cerradas.`);
    } catch (error) { show(error.message, "error"); }
  };

  return (
    <>
      <Topbar
        title="Mi perfil"
        subtitle="Información personal y configuración de mi cuenta."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <SectionTabs
          tabs={SECTION_NAV_CONFIG["mi-perfil"].tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          label="Secciones de mi perfil"
        />

        {activeTab === "all" && (
          <section className={styles.card} aria-label="Perfil de usuario">
            <header className={styles.cardHeader}>
              <h3><User size={18} /> Perfil</h3>
              {!editMode && (
                <button type="button" className={styles.ghostBtn} onClick={() => setEditMode(true)}>
                  <Pencil size={14} /> Editar
                </button>
              )}
            </header>

            <form className={styles.profileForm} onSubmit={handleSave}>
              <div className={styles.profileCard}>
                <div className={styles.profileAvatarLarge}>
                  {photoPreview ? (
                    <img src={photoPreview} alt={formData.nombre || "Usuario"} width={120} height={120} />
                  ) : myWorker?.foto ? (
                    <img src={myWorker.foto} alt={session?.nombre || "Usuario"} width={120} height={120} />
                  ) : (
                    <span className={styles.avatarFallback}>{initials(formData.nombre || session?.nombre)}</span>
                  )}
                  {editMode && (
                    <label className={styles.avatarUpload}>
                      <Camera size={18} />
                      <input type="file" accept="image/*" onChange={handlePhotoChange} />
                    </label>
                  )}
                </div>
                <div className={styles.profileInfo}>
                  {editMode ? (
                    <div className={styles.editGrid}>
                      <label className={styles.editField}>
                        <span>Nombre completo</span>
                        <input
                          type="text"
                          value={formData.nombre}
                          onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                          required
                        />
                      </label>
                      <label className={styles.editField}>
                        <span>Correo electrónico</span>
                        <input
                          type="email"
                          value={formData.correo}
                          readOnly
                        />
                      </label>
                      <label className={styles.editField}>
                        <span>Teléfono</span>
                        <input
                          type="tel"
                          value={formData.telefono}
                          onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
                          placeholder="+504 XXXX-XXXX"
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      <h4>{profile?.nombre || session?.nombre || "Usuario"}</h4>
                      <p className={styles.profileRole}>
                        <span className={styles.badge}>
                          {profile?.rolNombre || session?.rolNombre || session?.rol || "Usuario"}
                        </span>
                        {myWorker?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(myWorker.sucursal)}</span>
                        ) : session?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(session.sucursal)}</span>
                        ) : null}
                      </p>
                      <p className={styles.profileEmail}>{profile?.correo || session?.correo}</p>
                      {myWorker?.telefono && <p className={styles.profileMeta}><Phone size={14} /> {myWorker.telefono}</p>}
                      {profileError && <p className={styles.dangerText} role="alert">{profileError} <button type="button" className={styles.clearBtn} onClick={refreshProfile}>Reintentar</button></p>}
                    </>
                  )}
                </div>
              </div>

              {editMode && (
                <footer className={styles.modalActions}>
                  <button type="button" className={styles.ghostBtn} onClick={handleCancel}>
                    Cancelar
                  </button>
                  <button type="submit" className={styles.submit} disabled={saving}>
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </button>
                </footer>
              )}

              {!editMode && (
                <>
                  <div className={styles.statsGrid}>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <Activity size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.completedOrders}</span>
                        <span className={styles.profileStatLabel}>Órdenes completadas</span>
                      </div>
                    </div>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <Calendar size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.daysOnPlatform}</span>
                        <span className={styles.profileStatLabel}>Días en la plataforma</span>
                      </div>
                    </div>
                    <div className={styles.profileStatCard}>
                      <div className={styles.profileStatIcon}>
                        <LogIn size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.profileStatValue}>{userStats.loginsThisMonth}</span>
                        <span className={styles.profileStatLabel}>Sesiones este mes</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Rol</span>
                      <span className={styles.detailValue}>
                        {session?.rolNombre || "Usuario"}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Sucursal</span>
                      <span className={styles.detailValue}>
                        {myWorker?.sucursal ? branchLabel(myWorker.sucursal) : (session?.sucursal ? branchLabel(session.sucursal) : "Matriz")}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Estado</span>
                      <span className={styles.detailValue}>
                        {myWorker?.estado ? (
                          <span className={`${styles.pill} ${styles[`status_${myWorker.estado}`]}`}>
                            {statusLabel(myWorker.estado)}
                          </span>
                        ) : (
                          <> <span className={styles.statusDotActive} /> Activo </>
                        )}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Fecha de ingreso</span>
                      <span className={styles.detailValue}>
                        {myWorker?.ingreso ? formatDate(myWorker.ingreso) : "—"}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Último acceso</span>
                      <span className={styles.detailValue}>
                        {(() => { const lastLogin = activity.find((entry) => entry.category === "auth" && entry.message.startsWith("Inicio de sesión")); return lastLogin ? new Date(lastLogin.createdAt).toLocaleString("es-HN") : "—"; })()}
                      </span>
                    </div>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>ID de usuario</span>
                      <span className={styles.detailValue} style={{fontFamily:"monospace",fontSize:"12px"}}>{myWorker?.id || session?.id || "—"}</span>
                    </div>
                  </div>
                </>
              )}
            </form>
          </section>
        )}

        {activeTab === "activity" && (
          <section className={styles.card} aria-label="Mi actividad">
            <header className={styles.cardHeader}>
              <h3><Activity size={18} /> Actividad reciente</h3>
            </header>
            <div className={styles.activityList}>
              {profileError ? <p className={styles.activityNote}>{profileError}</p> : activity.length ? activity.map((entry) => <article className={styles.activityItem} key={entry.id}><div className={styles.activityIcon}><Activity size={16} /></div><div className={styles.activityContent}><p>{entry.message}</p><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })}</time>{entry.route && <small>{entry.route}</small>}</div><span className={styles.activityBadge}>{entry.category}</span></article>) : <p className={styles.activityNote}>No hay actividad registrada para esta cuenta.</p>}
            </div>
          </section>
        )}

        {activeTab === "security" && (
          <section className={styles.card} aria-label="Seguridad de mi cuenta">
            <header className={styles.cardHeader}>
              <h3><ShieldCheck size={18} /> Seguridad</h3>
            </header>
            <div className={styles.securityGrid}>
              <div className={styles.securityCard}>
                <h4><Lock size={16} /> Contraseña</h4>
                <p>Cambia tu contraseña para mantener tu cuenta segura.</p>
                <button type="button" className={styles.ghostBtn} onClick={() => openSecurityModal("password")}>
                  <RotateCw size={14} /> Cambiar contraseña
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><ShieldCheck size={16} /> Autenticación de dos factores (2FA)</h4>
                <p>{profile?.twoFactorEnabled ? "Tu cuenta solicita un código de autenticación además de la contraseña al iniciar sesión." : "Protege tu cuenta con un código temporal de una aplicación de autenticación."}</p>
                <button type="button" className={profile?.twoFactorEnabled ? styles.dangerBtn : styles.ghostBtn} disabled={saving} onClick={profile?.twoFactorEnabled ? () => setTwoFactorFlow({ mode: "disable", secret: "", uri: "", codigo: "", password: "" }) : startTwoFactorSetup}>
                  <ShieldCheck size={14} /> {profile?.twoFactorEnabled ? "Desactivar verificación en dos pasos" : "Configurar verificación en dos pasos"}
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><Users size={16} /> Sesiones activas</h4>
                <p>Revisa los accesos vigentes de tu cuenta y cierra los que no reconozcas.</p>
                {sessionsError ? <p className={styles.dangerText} role="alert">{sessionsError} <button type="button" className={styles.clearBtn} onClick={refreshSessions}>Reintentar</button></p> : sessionsLoading ? <p>Cargando sesiones…</p> : <div className={styles.sessionList}>{sessions.map((item) => <article className={styles.sessionItem} key={item.id}><div className={styles.sessionInfo}><strong>{item.current ? "Esta sesión" : item.userAgent || "Dispositivo sin información"}</strong><span>{new Date(item.createdAt).toLocaleString("es-HN", { dateStyle: "medium", timeStyle: "short" })} · {item.current ? "Activa ahora" : "Sesión activa"}</span></div>{item.current ? <span className={styles.badge}>Actual</span> : <button type="button" className={styles.ghostBtn} onClick={() => revokeSession(item.sessionId)}>Cerrar</button>}</article>)}{!sessions.length && <p>No hay sesiones activas registradas.</p>}</div>}
                {sessions.filter((item) => !item.current).length > 0 && <button type="button" className={styles.dangerBtn} onClick={revokeOtherSessions}>Cerrar las demás sesiones</button>}
              </div>
            </div>
          </section>
        )}

        {/* Modales de seguridad */}
        {securityModals.password && (
          <div className={styles.overlay} onClick={() => closeSecurityModal("password")} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Cambiar contraseña" onClick={(e) => e.stopPropagation()}>
              <h3><Lock size={20} /> Cambiar contraseña</h3>
              <form onSubmit={handlePasswordSave}>
                <div className={styles.modalField}>
                  <label>Contraseña actual</label>
                  <input type="password" value={passwordForm.actual} onChange={(e) => setPasswordForm((p) => ({ ...p, actual: e.target.value }))} required />
                </div>
                <div className={styles.modalField}>
                  <label>Nueva contraseña</label>
                  <input type="password" value={passwordForm.nueva} onChange={(e) => setPasswordForm((p) => ({ ...p, nueva: e.target.value }))} required minLength={12} />
                </div>
                <div className={styles.modalField}>
                  <label>Confirmar nueva contraseña</label>
                  <input type="password" value={passwordForm.confirmar} onChange={(e) => setPasswordForm((p) => ({ ...p, confirmar: e.target.value }))} required />
                </div>
                <footer className={styles.modalActions}>
                  <button type="button" className={styles.ghostBtn} onClick={() => closeSecurityModal("password")}>Cancelar</button>
                  <button type="submit" className={styles.submit} disabled={saving}>{saving ? "Guardando..." : "Actualizar"}</button>
                </footer>
              </form>
            </div>
          </div>
        )}

        {twoFactorFlow && (
          <div className={styles.overlay} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setTwoFactorFlow(null); }}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Verificación en dos pasos">
              <h3><ShieldCheck size={20} /> {twoFactorFlow.mode === "setup" ? "Configurar verificación en dos pasos" : "Desactivar verificación en dos pasos"}</h3>
              {twoFactorFlow.mode === "setup" ? <div className={styles.twofaSetup}><p>Agrega esta clave manualmente en tu aplicación de autenticación. La clave se guarda cifrada.</p><code className={styles.totpSecret}>{twoFactorFlow.secret}</code><a className={styles.clearBtn} href={twoFactorFlow.uri}>Abrir en una aplicación compatible</a><p className={styles.twofaNote}>Ingresa el código actual para confirmar la configuración.</p></div> : <div className={styles.modalField}><label>Contraseña actual</label><input type="password" autoComplete="current-password" value={twoFactorFlow.password} onChange={(event) => setTwoFactorFlow((current) => ({ ...current, password: event.target.value }))} required /></div>}
              <form onSubmit={submitTwoFactor}>
                <div className={styles.modalField}><label>Código de autenticación</label><input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={twoFactorFlow.codigo} onChange={(event) => setTwoFactorFlow((current) => ({ ...current, codigo: event.target.value.replace(/\D/g, "").slice(0, 6) }))} required /></div>
                <footer className={styles.modalActions}><button type="button" className={styles.ghostBtn} onClick={() => setTwoFactorFlow(null)}>Cancelar</button><button type="submit" className={styles.submit} disabled={saving}>{saving ? "Verificando…" : twoFactorFlow.mode === "setup" ? "Activar" : "Desactivar"}</button></footer>
              </form>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

function AjustesSection({ session, workers = [] }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    let active = true;
    fetch("/api/configuracion", { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo cargar la configuración.");
      if (active) setSettings(data);
    }).catch((loadError) => { if (active) setError(loadError.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!settings?.theme || typeof document === "undefined") return;
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    document.documentElement.dataset.theme = settings.theme === "system" ? (prefersDark ? "dark" : "light") : settings.theme;
  }, [settings?.theme]);

  async function handleSave(event) {
    event.preventDefault();
    if (!settings || saving) return;
    setSaving(true);
    try {
      const response = await fetch("/api/configuracion", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la configuración.");
      setSettings(data);
      show("Configuración guardada.");
    } catch (saveError) { show(saveError.message, "error"); }
    finally { setSaving(false); }
  }

  function changeField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <Topbar
        title="Ajustes"
        subtitle="Configuración general del sistema."
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <section className={styles.card} aria-label="Configuración general">
          <header className={styles.cardHeader}>
            <h3><Settings size={18} /> Configuración general</h3>
          </header>
          {loading ? <p className={styles.cardBody}>Cargando configuración…</p> : error ? <div className={styles.cardBody}><p className={styles.dangerText} role="alert">{error}</p><button type="button" className={styles.ghostBtn} onClick={() => window.location.reload()}>Reintentar</button></div> : <form className={styles.form} onSubmit={handleSave}>
            <div className={styles.fieldGrid}>
              <label className={styles.field}>
                Nombre de la empresa
                <input
                  type="text"
                  value={settings.companyName}
                  onChange={(event) => changeField("companyName", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                Email de contacto
                <input
                  type="email"
                  value={settings.email}
                  onChange={(event) => changeField("email", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                Teléfono
                <input
                  type="tel"
                  value={settings.phone}
                  onChange={(event) => changeField("phone", event.target.value)}
                />
              </label>
              <label className={styles.field}>
                Moneda
                <select value={settings.currency} onChange={(event) => changeField("currency", event.target.value)}>
                  <option value="L">Lempiras (L)</option>
                  <option value="USD">Dólares (USD)</option>
                </select>
              </label>
              <label className={styles.field}>
                Tema
                <select value={settings.theme} onChange={(event) => changeField("theme", event.target.value)}>
                  <option value="light">Claro</option>
                  <option value="dark">Oscuro</option>
                  <option value="system">Sistema</option>
                </select>
              </label>
            </div>

            <footer className={styles.modalActions}>
              <button type="submit" className={styles.submit} disabled={saving}>
                {saving ? "Guardando…" : "Guardar cambios"}
              </button>
            </footer>
          </form>}
        </section>

        <section className={styles.card} aria-label="Información del sistema">
          <header className={styles.cardHeader}>
            <h3><ShieldCheck size={18} /> Información del sistema</h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span>Versión</span>
              <strong>0.1.0</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Entorno</span>
              <strong>{process.env.NODE_ENV === "production" ? "Producción" : "Desarrollo"}</strong>
            </div>
          </div>
        </section>
      </div>

    </>
  );
}

function ConfirmDialog({ title, message, onCancel, onConfirm }) {
  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className={styles.confirm} role="dialog" aria-modal="true" aria-label={title}>
        <span className={styles.confirmIcon}><AlertTriangle size={22} /></span>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className={styles.confirmActions}>
          <button type="button" className={styles.ghostBtn} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={styles.dangerBtn} onClick={onConfirm}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginView() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    const user = await authenticate(email, password, verificationCode);
    if (user?.twoFactorRequired) {
      setTwoFactorRequired(true);
      setSubmitting(false);
      return;
    }
    if (!user) {
      notifyError("Correo o contraseña incorrectos.");
      setSubmitting(false);
      return;
    }
    const params =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : null;
    const next = params?.get("next");
    router.replace(next && next.startsWith("/panel-administrativo") ? next : "/panel-administrativo");
  }

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginVisual}>
          <Image
            src="/catalogo/infraestructura.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 100vw, 50vw"
            className={styles.loginVisualImg}
          />
          <div className={styles.loginVisualOverlay} />

          <a className={styles.logoTab} href="/" aria-label="Arconet, inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/arconet.png" alt="Arconet" width={2172} height={362} />
          </a>

          <div className={styles.loginVisualCopy}>
            <p className={styles.eyebrow}><i /> Panel interno · Arconet</p>
            <h1>
              Gestiona a tu equipo,
              <br />
              <em>desde un solo lugar.</em>
            </h1>
            <p className={styles.lead}>
              Administra trabajadores, productos, roles y sucursales de Arconet con un
              panel pensado para el personal autorizado.
            </p>
          </div>

          <div className={styles.loginVisualFooter}>
            <span>ACCESO RESTRINGIDO · PERSONAL AUTORIZADO</span>
            <a href="/">Volver al sitio <ArrowRight size={14} /></a>
          </div>
        </div>

        <section className={styles.loginPanel} aria-label="Formulario de acceso">
          <div className={styles.loginPanelBody}>
            <header>
              <p className={styles.sectionLabel}>Iniciar sesión</p>
              <h2>
                Acceso
                <br />
                <em>administrativo.</em>
              </h2>
              <p className={styles.loginIntro}>
                Ingresa con tus credenciales de personal para administrar el panel de
                Arconet.
              </p>
            </header>

            <form className={styles.form} onSubmit={submit}>
              <label className={styles.field}>
                Correo electrónico
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                    placeholder="usuario@arconet.hn"
                  value={email}
                  onChange={(event) => { setEmail(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); }}
                />
              </label>

              <label className={styles.field}>
                Contraseña
                <span className={styles.passwordWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    autoComplete="current-password"
                    required
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); setTwoFactorRequired(false); setVerificationCode(""); }}
                  />
                  <button
                    type="button"
                    className={styles.reveal}
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </span>
              </label>

              {twoFactorRequired && <label className={styles.field}>
                Código de autenticación
                <input type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" aria-describedby="two-factor-help" />
                <small id="two-factor-help">Ingresa el código actual de tu aplicación de autenticación.</small>
              </label>}

              <div className={styles.formRow}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                  />
                  <span>
                    <Check size={11} strokeWidth={3} />
                  </span>
                  Recordarme
                </label>
              </div>

              <button type="submit" className={styles.submit} disabled={submitting}>
                Entrar al panel <span><ArrowRight size={15} /></span>
              </button>
            </form>

            <p className={styles.loginFooter}>
              <a href="/"><ArrowLeft size={14} /> Volver al inicio</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
