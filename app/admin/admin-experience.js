"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useRef, useState } from "react";
import styles from "./admin-experience.module.css";
import { AdminContext, NAV } from "./admin-nav";
import { AdminPreferences } from "./admin-preferences";
import { createFiscalDraftMemory } from "@/lib/invoice-feedback";
import { SectionErrorBoundary } from "./error-boundary";
import { useAdminSmoothScroll } from "./use-smooth-scroll";
import { canAccessSection } from '@/lib/permisos';
import { adminSectionUrl, defaultAdminSection, normalizeAdminSection, resolveAdminSection, resolveInventoryView } from '@/lib/admin-navigation';
import { clearSession, fetchWorkers } from "./workers-store";
import { fetchProducts } from "./products-store";
import { fetchCategorias } from "./categories-store";
import { fetchRoles } from "./roles-store";
import { fetchSucursales } from "./sucursales-store";
import { fetchOrders } from "./orders-store";
import { fetchClientes } from "./clientes-store";

const RolesSection = lazy(() => import("./roles-section"));
const WorkersSection = lazy(() => import("./workers-section"));
const SucursalesSection = lazy(() => import("./sucursales-section"));
const CategoriasSection = lazy(() => import("./categorias-section"));
const ClientesSection = lazy(() => import("./clientes-section"));
const VentasSection = lazy(() => import("./ventas-section"));
const ResumenSection = lazy(() => import("./resumen-section"));
const MonitoreoSection = lazy(() => import("./monitoreo-section"));
const LogsSection = lazy(() => import("./logs-section"));
const MiPerfilSection = lazy(() => import("./perfil-section"));
const AjustesSection = lazy(() => import("./ajustes-section"));
const SolicitudesPanel = lazy(() => import("./solicitudes-panel"));
const InventarioPanel = lazy(() => import("./inventario-section"));
const LoginView = lazy(() => import("./login-view"));



export function AdminLogin() {
  return (
    <Suspense fallback={null}>
      <LoginView />
    </Suspense>
  );
}

export function AdminPanel({ session, initialSection, onLoggedOut }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    clearSession();
    onLoggedOut?.();
    router.replace("/admin");
  };

  return (
    <AdminPreferences key={session?.correo} account={session?.correo}><AdminShell
      session={session}
      onLogout={handleLogout}
      initialSection={initialSection}
    /></AdminPreferences>
  );
}




function AdminShell({ session, onLogout, initialSection }) {
  // La seccion inicial llega desde el servidor para que el HTML renderizado y
  // el primer render del cliente coincidan (sin desajuste de hidratacion).
  const [section, setSection] = useState(() => defaultAdminSection(session?.permisos, initialSection));
  const [inventoryView, setInventoryView] = useState("");
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [orders, setOrders] = useState([]);
  const [fiscalDraftMemory] = useState(createFiscalDraftMemory);
  const [clientes, setClientes] = useState([]);

  const { scrollToTop } = useAdminSmoothScroll();
  // El rol define que secciones puede abrir el usuario (el servidor tambien
  // valida cada accion en las APIs).
  const canOpen = (id) => canAccessSection(session?.permisos, id);

  useEffect(() => {
    const syncLocation = () => {
      const next = resolveAdminSection(window.location.href, session?.permisos, initialSection);
      setSection(next);
      const canonical = adminSectionUrl(window.location.href, next);
      setInventoryView(resolveInventoryView(session?.permisos, new URL(canonical).searchParams.get("view")));
      if (canonical !== window.location.href) window.history.replaceState(window.history.state, "", canonical);
    };
    syncLocation();
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, [initialSection, session?.permisos]);

  // Los listados se piden cuando la sección que los usa se abre, no todos al
  // entrar.
  //
  // Antes, al montar el panel se lanzaban siete listados a la vez
  // (trabajadores, productos, categorías, roles, sucursales, órdenes y
  // clientes), fueran necesarios o no. Quien solo entraba a ver el Resumen
  // pagaba el costo de todos, y las respuestas se repetían: el mismo endpoint
  // se pedía dos veces por el doble montaje de React en desarrollo.
  //
  // Cada sección declara lo que necesita; lo que ya está cargado no se vuelve a
  // pedir.
  // Las marcas de peticiones no se pintan: un ref evita renders extra y
  // conserva la deduplicación entre los dos efectos de StrictMode.
  const cargadosRef = useRef({});

  useEffect(() => {
    // Sin bandera de "sigo activo": el efecto se ejecuta dos veces al montar
    // (el doble render que hace React en desarrollo) y el cleanup de la
    // primera ejecución llegaba antes de que respondiera la API, así que los
    // datos se descartaban y la sección quedaba vacía. Como la marca de
    // `cargadosRef` ya evita repetir la petición, no hace falta cancelarla.
    const RECURSOS = {
      trabajadores: { permiso: "trabajadores:read", fetcher: fetchWorkers, setter: setWorkers },
      productos: { permiso: "productos:read", fetcher: fetchProducts, setter: setProducts },
      categorias: { permiso: "categorias:read", fetcher: fetchCategorias, setter: setCategorias },
      roles: { permiso: "roles:read", fetcher: fetchRoles, setter: setRoles },
      sucursales: { permiso: "sucursales:read", fetcher: fetchSucursales, setter: setSucursales },
      ordenes: { permiso: "ordenes:read", fetcher: fetchOrders, setter: setOrders },
      clientes: { permiso: "clientes:read", fetcher: fetchClientes, setter: setClientes },
    };

    // Qué pide cada sección. El Resumen no pide ninguno: tiene su propio
    // endpoint con los indicadores ya agregados.
    const NECESITA = {
      trabajadores: ["trabajadores", "sucursales", "roles"],
      categorias: ["categorias", "productos", "trabajadores"],
      sucursales: ["sucursales", "trabajadores"],
      clientes: ["clientes", "trabajadores"],
      ventas: ["ordenes", "clientes", "productos", "trabajadores"],
      facturacion: ["ordenes", "clientes", "productos", "trabajadores"],
      inventario: ["productos", "categorias", "trabajadores"],
      ajustes: ["trabajadores"],
      "mi-perfil": ["trabajadores", "sucursales"],
      roles: ["roles", "trabajadores"],
      monitoreo: ["trabajadores"],
      logs: ["trabajadores"],
    };

    // Se elige todo lo pendiente de una vez para no re-ejecutar el efecto una
    // vez por recurso (cada `setCargados` lo volvería a disparar).
    const pendientes = (NECESITA[section] || []).filter((clave) => {
      const recurso = RECURSOS[clave];
      return recurso && !cargadosRef.current[clave] && session?.permisos?.includes(recurso.permiso);
    });
    if (!pendientes.length) return undefined;

    for (const clave of pendientes) cargadosRef.current[clave] = true;

    for (const clave of pendientes) {
      RECURSOS[clave].fetcher()
        .then((remoto) => RECURSOS[clave].setter(remoto))
        .catch(() => {
          // Si falla, se libera la marca para reintentar al volver a la sección.
          cargadosRef.current[clave] = false;
        });
    }
    return undefined;
  }, [section, session?.permisos]);


  const goTo = (id) => {
    const requested = id;
    id = normalizeAdminSection(id);
    if (!canOpen(id)) return;
    setSection(id);
    scrollToTop();
    if (typeof window !== "undefined") {
      const destination = adminSectionUrl(window.location.href, requested);
      setInventoryView(resolveInventoryView(session?.permisos, new URL(destination).searchParams.get("view")));
      window.history.pushState(window.history.state, "", destination);
    }
  };

  /** Navegar a una seccion con una vista del inventario (p. ej. "alertas" o
   *  "productos"). Igual que goTo, pero setea el parametro "view". */
  const goToView = (requested, view) => {
    const id = normalizeAdminSection(requested);
    if (!canOpen(id)) return;
    setSection(id);
    setInventoryView(resolveInventoryView(session?.permisos, view));
    scrollToTop();
    if (typeof window !== "undefined") {
      const destination = `/panel-administrativo?section=${id}&view=${encodeURIComponent(view || "")}`;
      window.history.pushState(window.history.state, "", destination);
    }
  };

  const goToWithTransition = (requested) => {
    const id = normalizeAdminSection(requested);
    if (!canOpen(id) || (id === section && !["productos", "compras"].includes(requested))) {
      return;
    }
    if (typeof window === "undefined") {
      goTo(requested);
      return;
    }
    const label = NAV.find((item) => item.id === id)?.label || "";
    window.dispatchEvent(
      new CustomEvent("arconet:transition", {
        detail: {
          message: label,
          hold: 260,
          onCovered: () => goTo(requested),
        },
      }),
    );
  };

  return (
    <AdminContext.Provider
      value={{
        section,
        goTo: goToWithTransition,
        goToView,
        onLogout,
        session,
      }}
    >
      <main className={styles.adminPage}>
        <div className={styles.shell}>
        <Suspense fallback={<div className={styles.body}>Cargando…</div>}>
        <SectionErrorBoundary label={NAV.find((item) => item.id === section)?.label || "Sección"}>
        <div className={styles.content}>
          {section === "trabajadores" ? (
            <WorkersSection
              workers={workers}
              setWorkers={setWorkers}
              sucursales={sucursales}
              roles={roles}
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
          ) : section === "ventas" ? (
            <Suspense fallback={<div className={styles.body}>Cargando ventas…</div>}>
              <VentasSection draftMemory={fiscalDraftMemory}
                orders={orders}
                setOrders={setOrders}
                clientes={clientes}
                setClientes={setClientes}
                products={products}
                setProducts={setProducts}
                workers={workers}
                session={session}
              />
            </Suspense>
          ) : section === "inventario" ? (
            <Suspense fallback={<div className={styles.body}>Cargando inventario…</div>}>
              <InventarioPanel session={session} products={products} setProducts={setProducts} categorias={categorias} workers={workers} view={inventoryView} onViewChange={view => {
                setInventoryView(view);
                const url = new URL(window.location.href); url.searchParams.set("view", view); window.history.pushState(window.history.state, "", url.href);
              }} />
            </Suspense>
          ) : section === "facturacion" ? (
            // Seccion antigua unificada en "Ventas": redirige para no romper
            // enlaces o historiales del navegador que apunten al id viejo.
            <Suspense fallback={<div className={styles.body}>Cargando ventas…</div>}>
              <VentasSection draftMemory={fiscalDraftMemory}
                orders={orders}
                setOrders={setOrders}
                clientes={clientes}
                setClientes={setClientes}
                products={products}
                setProducts={setProducts}
                workers={workers}
                session={session}
              />
            </Suspense>
          ) : section === "solicitudes" ? (
            <Suspense fallback={<div className={styles.body}>Cargando órdenes internas…</div>}>
              <SolicitudesPanel session={session} />
            </Suspense>
          ) : section === "resumen" ? (
            <ResumenSection session={session} />
          ) : section === "ajustes" ? (
            <AjustesSection session={session} workers={workers} />
          ) : section === "mi-perfil" ? (
            <MiPerfilSection session={session} workers={workers} sucursales={sucursales} />
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
        </SectionErrorBoundary>
        </Suspense>
      </div>
    </main>
  </AdminContext.Provider>
  );
}
