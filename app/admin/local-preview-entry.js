"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearLocalPreviewSession, getLocalPreviewSession } from "@/lib/api-fetch";
import { defaultAdminSection } from "@/lib/admin-navigation";
import { AdminLogin, AdminPanel } from "./admin-experience";
import styles from "./admin-experience.module.css";

// Solo se monta contra la base aislada. El HTML inicial no contiene datos
// privados: se valida la sesión real antes de montar el panel y sus consultas.
export default function LocalPreviewEntry({ protectedPage = false, hasCookieSession = false, requestedSection = "" }) {
  const router = useRouter();
  const [state, setState] = useState({ loading: true, session: null, error: "" });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      if (!hasCookieSession && !getLocalPreviewSession("admin")) {
        setState({ loading: false, session: null, error: "" });
        if (protectedPage) router.replace("/admin");
        return;
      }
      try {
        const response = await apiFetch("/api/local-preview/session", { cache: "no-store", signal: controller.signal });
        if (response.status === 401) {
          clearLocalPreviewSession("admin");
          setState({ loading: false, session: null, error: "" });
          if (protectedPage) router.replace("/admin");
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "No se pudo comprobar la sesión local.");
        if (!controller.signal.aborted) setState({ loading: false, session: data, error: "" });
      } catch (error) {
        if (!controller.signal.aborted) setState({ loading: false, session: null, error: error.message || "No se pudo conectar al servidor local." });
      }
    }
    load();
    return () => controller.abort();
  }, [hasCookieSession, protectedPage, retry, router]);

  if (state.loading) return <main className={styles.loginPage}><p role="status">Verificando sesión local…</p></main>;
  if (state.error) return (
    <main className={styles.loginPage}>
      <div role="alert">
        <p>{state.error}</p>
        <button type="button" onClick={() => setRetry(value => value + 1)}>Reintentar</button>
      </div>
    </main>
  );
  if (!state.session) return <AdminLogin />;

  const permisos = state.session.permisos;
  const initialSection = defaultAdminSection(permisos, requestedSection);
  return <AdminPanel session={state.session} initialSection={initialSection} onLoggedOut={() => setState({ loading: false, session: null, error: "" })} />;
}
