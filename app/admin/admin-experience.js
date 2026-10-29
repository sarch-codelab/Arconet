"use client";

import { apiFetch as fetch } from "@/lib/api-fetch";

import { useRouter } from "next/navigation";
import { Suspense, lazy, useEffect, useState } from "react";
import styles from "./admin-experience.module.css";
import { AdminContext, NAV } from "./admin-nav";
import { SectionErrorBoundary } from "./error-boundary";
import { useAdminSmoothScroll } from "./use-smooth-scroll";
import { canAccessSection } from '@/lib/permisos';
import { adminSectionUrl, defaultAdminSection, normalizeAdminSection, resolveAdminSection } from '@/lib/admin-navigation';
import { clearSession, fetchWorkers } from "./workers-store";
import { fetchProducts } from "./products-store";
import { fetchCategorias } from "./categories-store";
import { fetchRoles } from "./roles-store";
import { fetchSucursales } from "./sucursales-store";
import { fetchOrders } from "./orders-store";
import { fetchClientes } from "./clientes-store";

const RolesSection = lazy(() => import("./roles-section"));
const WorkersSection = lazy(() => import("./workers-section"));
const ProductsSection = lazy(() => import("./products-section"));
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
const InventarioPanel = lazy(() => import("./inventario-panel"));
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
    <AdminShell
      session={session}
      onLogout={handleLogout}
      initialSection={initialSection}
    />
  );
}




function AdminShell({ session, onLogout, initialSection }) {
  // La seccion inicial llega desde el servidor para que el HTML renderizado y
  // el primer render del cliente coincidan (sin desajuste de hidratacion).
  const [section, setSection] = useState(() => defaultAdminSection(session?.permisos, initialSection));
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
    const syncLocation = () => {
      const next = resolveAdminSection(window.location.href, session?.permisos, initialSection);
      setSection(next);
      const canonical = adminSectionUrl(window.location.href, next);
      if (canonical !== window.location.href) window.history.replaceState(window.history.state, "", canonical);
    };
    syncLocation();
    window.addEventListener("popstate", syncLocation);
    return () => window.removeEventListener("popstate", syncLocation);
  }, [initialSection, session?.permisos]);

  useEffect(() => {
    let active = true;
    const load = (permission, fetcher, setter) => {
      if (!session?.permisos?.includes(permission)) return;
      fetcher().then((remote) => { if (active) setter(remote); }).catch(() => {});
    };
    load("trabajadores:read", fetchWorkers, setWorkers);
    load("productos:read", fetchProducts, setProducts);
    load("categorias:read", fetchCategorias, setCategorias);
    load("roles:read", fetchRoles, setRoles);
    load("sucursales:read", fetchSucursales, setSucursales);
    load("ordenes:read", fetchOrders, setOrders);
    load("clientes:read", fetchClientes, setClientes);
    return () => { active = false; };
  }, [session?.permisos]);

  const goTo = (id) => {
    id = normalizeAdminSection(id);
    if (!canOpen(id)) return;
    setSection(id);
    scrollToTop();
    if (typeof window !== "undefined") {
      window.history.pushState(window.history.state, "", adminSectionUrl(window.location.href, id));
    }
  };

  const goToWithTransition = (id) => {
    id = normalizeAdminSection(id);
    if (!canOpen(id) || id === section) {
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
          ) : section === "ventas" ? (
            <Suspense fallback={<div className={styles.body}>Cargando ventas…</div>}>
              <VentasSection
                orders={orders}
                setOrders={setOrders}
                clientes={clientes}
                setClientes={setClientes}
                products={products}
                workers={workers}
                session={session}
              />
            </Suspense>
          ) : section === "inventario" ? (
            <Suspense fallback={<div className={styles.body}>Cargando inventario…</div>}>
              <InventarioPanel session={session} productos={products} />
            </Suspense>
          ) : section === "facturacion" ? (
            // Seccion antigua unificada en "Ventas": redirige para no romper
            // enlaces o historiales del navegador que apunten al id viejo.
            <Suspense fallback={<div className={styles.body}>Cargando ventas…</div>}>
              <VentasSection
                orders={orders}
                setOrders={setOrders}
                clientes={clientes}
                setClientes={setClientes}
                products={products}
                workers={workers}
                session={session}
              />
            </Suspense>
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
