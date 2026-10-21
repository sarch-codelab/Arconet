"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
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
  LogOut,
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
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react";
import styles from "./admin-experience.module.css";
import { compressImage } from "./image-utils";
import { sileo } from "../toaster";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import { AdminContext, NAV } from "./admin-nav";
import { Topbar } from "./topbar";
import { useAdminSmoothScroll } from "./use-smooth-scroll";
import {
  BRANCHES,
  ROLES,
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
  roleLabel,
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

const FleetSection = lazy(() => import("./flota"));

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
  categoria: "Fibra óptica",
  marca: "",
  unidad: "Unidad",
  precio: "",
  stock: "",
  estado: "activo",
  foto: "",
  descripcion: "",
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

const WIDE_LAYOUT_QUERY = "(min-width: 1200px)";

function AdminShell({ session, onLogout, initialSection }) {
  // La seccion inicial llega desde el servidor para que el HTML renderizado y
  // el primer render del cliente coincidan (sin desajuste de hidratacion).
  const [section, setSection] = useState(initialSection || "trabajadores");
  const [navOpen, setNavOpen] = useState(false);
  const [isWide, setIsWide] = useState(false);
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [clientes, setClientes] = useState([]);

  const { scrollToTop } = useAdminSmoothScroll();

  // En pantallas anchas el panel lateral es persistente; en movil y tablet
  // funciona como cajon deslizante por encima del contenido.
  useEffect(() => {
    const media = window.matchMedia(WIDE_LAYOUT_QUERY);
    const apply = () => {
      const wide = media.matches;
      setIsWide(wide);
      setNavOpen(wide);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  // Invariante: en el diseno de escritorio la barra lateral es siempre
  // visible, asi que no puede quedar cerrada sin forma de reabrirla.
  useEffect(() => {
    if (isWide) setNavOpen(true);
  }, [isWide]);

  useEffect(() => {
    // El hash solo existe en el cliente: se sincroniza tras el montaje.
    const hash = window.location.hash.replace("#", "").trim();
    if (hash && hash !== section) setSection(hash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchWorkers()
      .then((remote) => setWorkers(remote))
      .catch(() => {});
    fetchProducts()
      .then((remote) => setProducts(remote))
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
      if (s) setSection(s);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // El cajon lateral no debe dejar desplazar el fondo mientras esta abierto.
  useBodyScrollLock(!isWide && navOpen);

  useEscapeKey(navOpen && !isWide, () => setNavOpen(false));

  const closeNavOnNarrow = () => {
    if (!isWide) setNavOpen(false);
  };

  const goTo = (id) => {
    setSection(id);
    closeNavOnNarrow();
    scrollToTop();
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("section", id);
      window.history.pushState({}, "", url.toString());
    }
  };

  const goToWithTransition = (id) => {
    if (id === section) {
      closeNavOnNarrow();
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

  const toggleNav = useCallback(() => {
    setNavOpen((value) => !value);
  }, []);

  return (
    <AdminContext.Provider
      value={{
        section,
        goTo: goToWithTransition,
        onOpenNav: toggleNav,
        onLogout,
        navOpen,
        session,
      }}
    >
      <main className={styles.adminPage}>
        <div className={`${styles.shell} ${navOpen ? styles.shellNavOpen : styles.shellNavClosed}`}>
        {navOpen && !isWide && (
          <button
            type="button"
            className={styles.navScrim}
            onClick={() => setNavOpen(false)}
            aria-label="Cerrar menú"
          />
        )}

        <aside
          className={`${styles.sidebar} ${navOpen ? styles.navOpen : styles.navClosed}`}
          inert={!navOpen}
          aria-label="Menú del panel"
        >
          <div className={styles.sidebarHead}>
            <a className={styles.logoBadge} href="/" aria-label="Arconet, inicio">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/arconet.png" alt="Arconet" />
            </a>
            <button
              type="button"
              className={styles.sidebarCloseBtn}
              onClick={() => {
                if (!isWide) setNavOpen(false);
              }}
              aria-label="Cerrar menú lateral"
              tabIndex={isWide ? -1 : 0}
            >
              <X size={18} />
            </button>
          </div>

          <nav className={styles.nav} aria-label="Secciones del panel">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.navItem} ${active ? styles.navActive : ""}`}
                  onClick={() => goTo(item.id)}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon size={17} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className={styles.sidebarFoot}>
            <div className={styles.userCard}>
              <span className={styles.userAvatar}>{initials(session?.nombre)}</span>
              <span className={styles.userMeta}>
                <strong>{session?.nombre || "Usuario"}</strong>
                <em>{session?.rol ? roleLabel(session.rol) : "—"}</em>
              </span>
            </div>
            <button type="button" className={styles.logoutBtn} onClick={onLogout}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </div>
        </aside>

        <div className={styles.content}>
          {section === "trabajadores" ? (
            <WorkersSection
              workers={workers}
              setWorkers={setWorkers}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "productos" ? (
            <ProductsSection
              products={products}
              setProducts={setProducts}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "sucursales" ? (
            <SucursalesSection
              sucursales={sucursales}
              setSucursales={setSucursales}
              workers={workers}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "clientes" ? (
            <ClientesSection
              clientes={clientes}
              setClientes={setClientes}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "cotizaciones" ? (
            <CotizacionesSection
              orders={orders}
              setOrders={setOrders}
              clientes={clientes}
              products={products}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "resumen" ? (
            <ResumenSection
              workers={workers}
              products={products}
              sucursales={sucursales}
              orders={orders}
              onOpenNav={toggleNav}
              session={session}
            />
          ) : section === "ajustes" ? (
            <AjustesSection onOpenNav={toggleNav} session={session} />
          ) : section === "mi-perfil" ? (
            <MiPerfilSection onOpenNav={toggleNav} session={session} workers={workers} />
          ) : section === "monitoreo" ? (
            <MonitoreoSection onOpenNav={toggleNav} session={session} />
          ) : section === "logs" ? (
            <LogsSection onOpenNav={toggleNav} session={session} />
          ) : section === "flota" ? (
            <Suspense fallback={null}>
              <FleetSection
                onOpenNav={toggleNav}
                onNavigate={goTo}
              />
            </Suspense>
          ) : null}
        </div>
      </div>
    </main>
  </AdminContext.Provider>
  );
}


function WorkersSection({ workers, setWorkers, onOpenNav, session }) {
  const [activeTab, setActiveTab] = useState("all");
  const [query, setQuery] = useState("");
  const [branch, setBranch] = useState("all");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(EMPTY_WORKER);
  const [confirmWorker, setConfirmWorker] = useState(null);
  const { show } = useToast();

  useEscapeKey(modalOpen, () => closeModal());
  useBodyScrollLock(modalOpen);

  const handleTabChange = (tabId) => {
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
    } else if (tabId === "roles") {
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
    setDraft({ ...EMPTY_WORKER, id: newWorkerId() });
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
        onOpenNav={onOpenNav}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nuevo trabajador
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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
            {ROLES.map((item) => (
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
                    <td data-label="Rol"><span className={styles.role}>{roleLabel(worker.rol)}</span></td>
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
                    placeholder="nombre@arconet.com"
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
                    {ROLES.map((item) => (
                      <option key={item.id} value={item.id}>{item.label}</option>
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

function ProductsSection({ products, setProducts, onOpenNav, session }) {
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
      setCategory("Fibra óptica");
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
    const categorias = new Set(products.map((product) => product.categoria)).size;
    return { total, activos, agotados, categorias };
  }, [products]);

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
    setDraft({ ...EMPTY_PRODUCT, id: newProductId() });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(product) {
    setDraft({ ...product });
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
      stock: Math.max(0, Math.floor(Number(draft.stock) || 0)),
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
        onOpenNav={onOpenNav}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nuevo producto
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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
            {PRODUCT_CATEGORIES.map((item) => (
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
                  <label htmlFor="product-photo" className={styles.upload}>Subir imagen</label>
                  {draft.foto && (
                    <button type="button" className={styles.ghostBtn} onClick={() => changeField("foto", "")}>
                      Quitar imagen
                    </button>
                  )}
                  <p>JPG o PNG. Se guarda en el servidor.</p>
                </div>
              </div>

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
                    {PRODUCT_CATEGORIES.map((item) => (
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

function SucursalesSection({ sucursales, setSucursales, workers = [], onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
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
                    placeholder="sucursal@arconet.com"
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

function ClientesSection({ clientes, setClientes, onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
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

function CotizacionesSection({ orders, setOrders, clientes, products, onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        action={
          <button type="button" className={styles.primaryBtn} onClick={openCreate}>
            <Plus size={16} /> Nueva cotización
          </button>
        }
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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

function ResumenSection({ workers, products, sucursales, orders, onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
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

function MonitoreoSection({ onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
        activeTab={tab}
        onTabChange={setTab}
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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

function LogsSection({ onOpenNav, session }) {
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
        onOpenNav={onOpenNav}
        activeTab={tab}
        onTabChange={setTab}
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

function MiPerfilSection({ onOpenNav, session, workers = [] }) {
  const [activeTab, setActiveTab] = useState("all");
  const [editMode, setEditMode] = useState(false);

  const myWorker = useMemo(() => {
    if (!session?.correo) return null;
    return workers.find((w) => w.correo?.toLowerCase() === session.correo.toLowerCase()) || null;
  }, [workers, session?.correo]);

  const [formData, setFormData] = useState({
    nombre: session?.nombre || "",
    correo: session?.correo || "",
    telefono: myWorker?.telefono || "",
    direccion: myWorker?.direccion || "",
    idioma: "es-HN",
    zonaHoraria: "America/Tegucigalpa",
  });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [securityModals, setSecurityModals] = useState({
    password: false,
    twofa: false,
    sessions: false,
  });
  const [passwordForm, setPasswordForm] = useState({ actual: "", nueva: "", confirmar: "" });
  const { show } = useToast();

  // Estadísticas del usuario
  const userStats = useMemo(() => ({
    tasksCompleted: 147,
    daysActive: 45,
    loginsThisMonth: 23,
    rating: 4.8,
    productivity: 92,
  }), []);

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      show("El archivo debe ser una imagen.", "error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      show("La imagen no debe superar 2 MB.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 600));
    setEditMode(false);
    setPhotoPreview(null);
    show("Perfil actualizado correctamente.");
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({
      nombre: session?.nombre || "",
      correo: session?.correo || "",
      telefono: myWorker?.telefono || "",
      direccion: myWorker?.direccion || "",
      idioma: "es-HN",
      zonaHoraria: "America/Tegucigalpa",
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
    if (passwordForm.nueva.length < 8) {
      show("La contraseña debe tener al menos 8 caracteres.", "error");
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setPasswordForm({ actual: "", nueva: "", confirmar: "" });
    closeSecurityModal("password");
    show("Contraseña actualizada correctamente.");
    setSaving(false);
  };

  return (
    <>
      <Topbar
        title="Mi perfil"
        subtitle="Información personal y configuración de mi cuenta."
        onOpenNav={onOpenNav}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
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
                          onChange={(e) => setFormData((prev) => ({ ...prev, correo: e.target.value }))}
                          required
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
                      <label className={styles.editField}>
                        <span>Dirección</span>
                        <input
                          type="text"
                          value={formData.direccion}
                          onChange={(e) => setFormData((prev) => ({ ...prev, direccion: e.target.value }))}
                          placeholder="Ciudad, departamento"
                        />
                      </label>
                      <label className={styles.editField}>
                        <span>Idioma</span>
                        <select value={formData.idioma} onChange={(e) => setFormData((prev) => ({ ...prev, idioma: e.target.value }))}>
                          <option value="es-HN">Español (Honduras)</option>
                          <option value="es-ES">Español (España)</option>
                          <option value="en-US">English (US)</option>
                        </select>
                      </label>
                      <label className={styles.editField}>
                        <span>Zona horaria</span>
                        <select value={formData.zonaHoraria} onChange={(e) => setFormData((prev) => ({ ...prev, zonaHoraria: e.target.value }))}>
                          <option value="America/Tegucigalpa">CST (Honduras)</option>
                          <option value="America/Guatemala">CST (Guatemala)</option>
                          <option value="America/Managua">CST (Nicaragua)</option>
                          <option value="America/Costa_Rica">CST (Costa Rica)</option>
                          <option value="America/Panama">EST (Panamá)</option>
                        </select>
                      </label>
                    </div>
                  ) : (
                    <>
                      <h4>{session?.nombre || "Administrador"}</h4>
                      <p className={styles.profileRole}>
                        <span className={styles.badge}>
                          {session?.rol === "admin" ? "Administrador" : roleLabel(session?.rol || "admin")}
                        </span>
                        {myWorker?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(myWorker.sucursal)}</span>
                        ) : session?.sucursal ? (
                          <span className={styles.badge}>{branchLabel(session.sucursal)}</span>
                        ) : null}
                      </p>
                      <p className={styles.profileEmail}>{session?.correo || "admin@arconet.com"}</p>
                      {myWorker?.telefono && <p className={styles.profileMeta}><Phone size={14} /> {myWorker.telefono}</p>}
                      {myWorker?.direccion && <p className={styles.profileMeta}><MapPin size={14} /> {myWorker.direccion}</p>}
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
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>
                        <Activity size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.statValue}>{userStats.tasksCompleted}</span>
                        <span className={styles.statLabel}>Tareas completadas</span>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>
                        <Calendar size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.statValue}>{userStats.daysActive}</span>
                        <span className={styles.statLabel}>Días activo</span>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>
                        <LogIn size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.statValue}>{userStats.loginsThisMonth}</span>
                        <span className={styles.statLabel}>Sesiones este mes</span>
                      </div>
                    </div>
                    <div className={styles.statCard}>
                      <div className={styles.statIcon}>
                        <Star size={20} />
                      </div>
                      <div className={styles.statContent}>
                        <span className={styles.statValue}>{userStats.rating}</span>
                        <span className={styles.statLabel}>Calificación</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailCard}>
                      <span className={styles.detailLabel}>Rol</span>
                      <span className={styles.detailValue}>
                        {myWorker?.rol ? roleLabel(myWorker.rol) : (session?.rol === "admin" ? "Administrador del sistema" : "Usuario")}
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
                        {new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
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
              <div className={styles.activityFilters}>
                <button type="button" className={`${styles.activityFilter} ${styles.activityFilterActive}`}>Todas</button>
                <button type="button" className={styles.activityFilter}>Sesiones</button>
                <button type="button" className={styles.activityFilter}>Cambios</button>
                <button type="button" className={styles.activityFilter}>Sistema</button>
              </div>
            </header>
            <div className={styles.activityList}>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><Activity size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Inició sesión</strong> en el panel administrativo</p>
                  <time dateTime={new Date().toISOString()}>{new Date().toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Sesión</span>
              </article>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><User size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Actualizó su perfil</strong> (nombre y foto)</p>
                  <time dateTime={new Date(Date.now()-86400000).toISOString()}>{new Date(Date.now()-86400000).toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Perfil</span>
              </article>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><Settings size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Cambió preferencias</strong> de notificaciones</p>
                  <time dateTime={new Date(Date.now()-172800000).toISOString()}>{new Date(Date.now()-172800000).toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Configuración</span>
              </article>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><Truck size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Accedió a la Flota</strong> - Panel de monitoreo</p>
                  <time dateTime={new Date(Date.now()-259200000).toISOString()}>{new Date(Date.now()-259200000).toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Flota</span>
              </article>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><FileText size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Generó reporte</strong> de ventas mensual</p>
                  <time dateTime={new Date(Date.now()-345600000).toISOString()}>{new Date(Date.now()-345600000).toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Reporte</span>
              </article>
              <article className={styles.activityItem}>
                <div className={styles.activityIcon}><Building2 size={16} /></div>
                <div className={styles.activityContent}>
                  <p><strong>Modificó sucursal</strong> San Pedro Sula → La Ceiba</p>
                  <time dateTime={new Date(Date.now()-432000000).toISOString()}>{new Date(Date.now()-432000000).toLocaleString("es-ES")}</time>
                </div>
                <span className={styles.activityBadge}>Cambios</span>
              </article>
            </div>
            <p className={styles.activityNote}>Próximamente: historial completo sincronizado con <code>/api/logs?actor=yo</code>.</p>
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
                <p>Cambia tu contraseña para mantener tu cuenta segura. Última actualización: hace 45 días.</p>
                <button type="button" className={styles.ghostBtn} onClick={() => openSecurityModal("password")}>
                  <RotateCw size={14} /> Cambiar contraseña
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><ShieldCheck size={16} /> Autenticación de dos factores (2FA)</h4>
                <p>Añade una capa extra de seguridad usando una app de autenticación (Google Authenticator, Authy, etc.).</p>
                <button type="button" className={styles.ghostBtn} onClick={() => openSecurityModal("twofa")}>
                  <ShieldCheck size={14} /> {myWorker?.twofa ? "Gestionar 2FA" : "Activar 2FA"}
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><Users size={16} /> Sesiones activas</h4>
                <p>Revisa y cierra sesiones en otros dispositivos.</p>
                <button type="button" className={styles.ghostBtn} onClick={() => openSecurityModal("sessions")}>
                  <Users size={14} /> Ver sesiones (3 activas)
                </button>
              </div>
              <div className={styles.securityCard}>
                <h4><Trash2 size={16} style={{color:"var(--red)"}} /> Eliminar cuenta</h4>
                <p className={styles.dangerText}>Esta acción es irreversible. Se eliminarán todos tus datos permanentemente.</p>
                <button type="button" className={styles.dangerBtn} onClick={() => show("Función no disponible en demo.", "warn")}>
                  <Trash2 size={14} /> Eliminar mi cuenta
                </button>
              </div>
            </div>
          </section>
        )}

        {activeTab === "notifications" && (
          <section className={styles.card} aria-label="Preferencias de notificaciones">
            <header className={styles.cardHeader}>
              <h3><Bell size={18} /> Notificaciones</h3>
            </header>
            <div className={styles.prefGrid}>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Notificaciones por correo</span>
                  <span className={styles.prefDesc}>Recibe alertas importantes en tu bandeja de entrada</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Notificaciones en la app</span>
                  <span className={styles.prefDesc}>Alertas emergentes dentro del panel administrativo</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Recordatorios de tareas</span>
                  <span className={styles.prefDesc}>Avisos de vencimientos y seguimientos</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Reportes semanales</span>
                  <span className={styles.prefDesc}>Resumen de actividad cada lunes</span>
                </div>
                <input type="checkbox" />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Alertas de seguridad</span>
                  <span className={styles.prefDesc}>Intentos de acceso, cambios de contraseña, 2FA</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Actualizaciones del sistema</span>
                  <span className={styles.prefDesc}>Novedades, mantenimiento, nuevas funciones</span>
                </div>
                <input type="checkbox" />
              </label>
            </div>
          </section>
        )}

        {activeTab === "privacy" && (
          <section className={styles.card} aria-label="Privacidad">
            <header className={styles.cardHeader}>
              <h3><ShieldCheck size={18} /> Privacidad</h3>
            </header>
            <div className={styles.prefGrid}>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Perfil visible para otros</span>
                  <span className={styles.prefDesc}>Permite que otros usuarios vean tu información básica</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Mostrar actividad reciente</span>
                  <span className={styles.prefDesc}>Permite que otros vean tu actividad en el sistema</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Permitir análisis de uso</span>
                  <span className={styles.prefDesc}>Ayuda a mejorar el sistema con datos anónimos</span>
                </div>
                <input type="checkbox" defaultChecked />
              </label>
              <label className={styles.prefItem}>
                <div className={styles.prefInfo}>
                  <span className={styles.prefTitle}>Historial de ubicación</span>
                  <span className={styles.prefDesc}>Guarda tu ubicación para reportes de flota</span>
                </div>
                <input type="checkbox" />
              </label>
            </div>
          </section>
        )}

        {activeTab === "appearance" && (
          <section className={styles.card} aria-label="Apariencia">
            <header className={styles.cardHeader}>
              <h3><Settings size={18} /> Apariencia</h3>
            </header>
            <div className={styles.appearanceGrid}>
              <div className={styles.appearanceCard}>
                <h4><Sun size={16} /> Tema</h4>
                <p>Elige cómo se ve el panel.</p>
                <div className={styles.themeOptions}>
                  <label className={styles.themeOption}>
                    <input type="radio" name="theme" defaultChecked />
                    <span><Sun size={16} /> Claro</span>
                  </label>
                  <label className={styles.themeOption}>
                    <input type="radio" name="theme" />
                    <span><Moon size={16} /> Oscuro</span>
                  </label>
                  <label className={styles.themeOption}>
                    <input type="radio" name="theme" />
                    <span><Monitor size={16} /> Sistema</span>
                  </label>
                </div>
              </div>
              <div className={styles.appearanceCard}>
                <h4><Globe size={16} /> Idioma y región</h4>
                <p>Configura el formato de fechas, números y moneda.</p>
                <div className={styles.localeOptions}>
                  <label className={styles.localeOption}>
                    <input type="radio" name="locale" defaultChecked />
                    <span>Español (Honduras) - L, dd/mm/aaaa</span>
                  </label>
                  <label className={styles.localeOption}>
                    <input type="radio" name="locale" />
                    <span>Español (España) - €, dd/mm/aaaa</span>
                  </label>
                  <label className={styles.localeOption}>
                    <input type="radio" name="locale" />
                    <span>English (US) - $, mm/dd/yyyy</span>
                  </label>
                </div>
              </div>
              <div className={styles.appearanceCard}>
                <h4><Eye size={16} /> Densidad de información</h4>
                <p>Controla el espacio entre elementos.</p>
                <div className={styles.densityOptions}>
                  <label className={styles.densityOption}>
                    <input type="radio" name="density" defaultChecked />
                    <span>Cómodo</span>
                  </label>
                  <label className={styles.densityOption}>
                    <input type="radio" name="density" />
                    <span>Compacto</span>
                  </label>
                  <label className={styles.densityOption}>
                    <input type="radio" name="density" />
                    <span>Amplio</span>
                  </label>
                </div>
              </div>
            </div>
          </section>
        )}

        {activeTab === "api" && (
          <section className={styles.card} aria-label="Claves de API">
            <header className={styles.cardHeader}>
              <h3><Key size={18} /> Claves de API</h3>
            </header>
            <p className={styles.apiNote}>Genera claves para integraciones externas (webhooks, scripts, apps móviles).</p>
            <div className={styles.apiList}>
              <article className={styles.apiItem}>
                <div className={styles.apiInfo}>
                  <strong>App móvil Arconet</strong>
                  <span>Creada: 12/03/2026 · Último uso: hace 2 horas · Permisos: lectura/escritura</span>
                </div>
                <div className={styles.apiActions}>
                  <button className={styles.ghostBtn}><Copy size={14} /> Copiar</button>
                  <button className={styles.ghostBtn}><Edit size={14} /> Editar</button>
                  <button className={styles.dangerBtn}><Trash2 size={14} /> Revocar</button>
                </div>
              </article>
              <article className={styles.apiItem}>
                <div className={styles.apiInfo}>
                  <strong>Webhook ERP externo</strong>
                  <span>Creada: 05/01/2026 · Último uso: hace 3 días · Permisos: solo lectura</span>
                </div>
                <div className={styles.apiActions}>
                  <button className={styles.ghostBtn}><Copy size={14} /> Copiar</button>
                  <button className={styles.ghostBtn}><Edit size={14} /> Editar</button>
                  <button className={styles.dangerBtn}><Trash2 size={14} /> Revocar</button>
                </div>
              </article>
            </div>
            <button type="button" className={styles.primaryBtn} style={{marginTop:"16px"}}><Plus size={16} /> Nueva clave de API</button>
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
                  <input type="password" value={passwordForm.nueva} onChange={(e) => setPasswordForm((p) => ({ ...p, nueva: e.target.value }))} required minLength={8} />
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

        {securityModals.twofa && (
          <div className={styles.overlay} onClick={() => closeSecurityModal("twofa")} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Autenticación de dos factores" onClick={(e) => e.stopPropagation()}>
              <h3><ShieldCheck size={20} /> {myWorker?.twofa ? "Gestionar 2FA" : "Activar 2FA"}</h3>
              {myWorker?.twofa ? (
                <div className={styles.twofaActive}>
                  <p>2FA está <strong>activado</strong> con app de autenticación.</p>
                  <div className={styles.modalActions}>
                    <button className={styles.ghostBtn} onClick={() => show("Códigos de respaldo generados.", "info")}><FileText size={14} /> Ver códigos de respaldo</button>
                    <button className={styles.dangerBtn} onClick={() => { show("2FA desactivado.", "warn"); closeSecurityModal("twofa"); }}>Desactivar 2FA</button>
                  </div>
                </div>
              ) : (
                <div className={styles.twofaSetup}>
                  <p>Escanea este código QR con tu app de autenticación:</p>
                  <div className={styles.qrPlaceholder} aria-label="Código QR para 2FA">[QR CODE]</div>
                  <p className={styles.twofaNote}>Ingresa el código de 6 dígitos de tu app:</p>
                  <input type="text" maxLength={6} placeholder="000000" className={styles.twofaInput} />
                  <div className={styles.modalActions}>
                    <button className={styles.ghostBtn} onClick={() => closeSecurityModal("twofa")}>Cancelar</button>
                    <button className={styles.submit} onClick={() => { show("2FA activado correctamente."); closeSecurityModal("twofa"); }}>Activar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {securityModals.sessions && (
          <div className={styles.overlay} onClick={() => closeSecurityModal("sessions")} role="presentation">
            <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Sesiones activas" onClick={(e) => e.stopPropagation()}>
              <h3><Users size={20} /> Sesiones activas</h3>
              <div className={styles.sessionList}>
                <article className={styles.sessionItem}>
                  <div className={styles.sessionInfo}>
                    <strong>Esta sesión</strong>
                    <span>Chrome en Windows · San Pedro Sula, HN · Activa ahora</span>
                  </div>
                  <span className={styles.badge}>Actual</span>
                </article>
                <article className={styles.sessionItem}>
                  <div className={styles.sessionInfo}>
                    <strong>App móvil</strong>
                    <span>iOS · La Ceiba, HN · Hace 2 horas</span>
                  </div>
                  <button className={styles.ghostBtn} style={{padding:"6px 10px",fontSize:"12px"}}>Cerrar</button>
                </article>
                <article className={styles.sessionItem}>
                  <div className={styles.sessionInfo}>
                    <strong>Chrome en Mac</strong>
                    <span>Tegucigalpa, HN · Hace 1 día</span>
                  </div>
                  <button className={styles.ghostBtn} style={{padding:"6px 10px",fontSize:"12px"}}>Cerrar</button>
                </article>
              </div>
              <div className={styles.modalActions}>
                <button className={styles.ghostBtn} onClick={() => closeSecurityModal("sessions")}>Cerrar</button>
                <button className={styles.dangerBtn} onClick={() => { show("Todas las demás sesiones cerradas."); closeSecurityModal("sessions"); }}>Cerrar todas las demás</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function AjustesSection({ onOpenNav, session }) {
  const [settings, setSettings] = useState({
    companyName: "Arconet, S.A.",
    email: "info@arconet.com",
    phone: "+504 2500-0000",
    currency: "L",
    theme: "light",
  });
  const [saveStatus, setSaveStatus] = useState("");
  const { show } = useToast();

  function handleSave(event) {
    event.preventDefault();
    setSaveStatus("Guardando...");
    setTimeout(() => {
      show("Configuración guardada.");
      setSaveStatus("");
    }, 500);
  }

  function changeField(field, value) {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <>
      <Topbar
        title="Ajustes"
        subtitle="Configuración general del sistema."
        onOpenNav={onOpenNav}
        session={session}
        workers={workers}
      />

      <div className={styles.body}>
        <section className={styles.card} aria-label="Configuración general">
          <header className={styles.cardHeader}>
            <h3><Settings size={18} /> Configuración general</h3>
          </header>
          <form className={styles.form} onSubmit={handleSave}>
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
              <button type="submit" className={styles.submit} disabled={saveStatus}>
                {saveStatus || "Guardar cambios"}
              </button>
            </footer>
          </form>
        </section>

        <section className={styles.card} aria-label="Información del sistema">
          <header className={styles.cardHeader}>
            <h3><ShieldCheck size={18} /> Información del sistema</h3>
          </header>
          <div className={styles.cardBody}>
            <div className={styles.infoRow}>
              <span>Versión</span>
              <strong>1.0.0</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Última actualización</span>
              <strong>16 de octubre, 2026</strong>
            </div>
            <div className={styles.infoRow}>
              <span>Entorno</span>
              <strong>Desarrollo</strong>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-label="Zona de peligro">
          <header className={styles.cardHeader}>
            <h3 className={styles.danger}><AlertTriangle size={18} /> Zona de peligro</h3>
          </header>
          <div className={styles.cardBody}>
            <p>Estas acciones son irreversibles. Procede con cuidado.</p>
            <div className={styles.dangerActions}>
              <button type="button" className={styles.dangerBtn}>
                Limpiar todos los datos
              </button>
              <button type="button" className={styles.dangerBtn}>
                Restablecer configuración
              </button>
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
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    const user = await authenticate(email, password);
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
                  placeholder="usuario@arconet.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                    onChange={(event) => setPassword(event.target.value)}
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
