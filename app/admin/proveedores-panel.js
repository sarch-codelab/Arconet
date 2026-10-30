"use client";
import { useEffect, useRef, useState } from "react";
import { purchaseRequest } from "./compras-ui";
import admin from "./admin-experience.module.css";
import styles from "./compras-panel.module.css";
const empty = {
  nombre: "",
  rtn: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  estado: "activo",
};
export function ProviderForm({ initial, onSaved, onCancel, onBusy }) {
  const [draft, setDraft] = useState(() => ({ ...empty, ...initial })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    root = useRef(null);
  async function save() {
    if (lock.current) return;
    const invalid = root.current?.querySelector(":invalid");
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    if (draft.nombre.trim().length < 2) {
      setError("Escribe un nombre de al menos 2 caracteres.");
      return;
    }
    lock.current = true;
    setBusy(true);
    onBusy?.(true);
    setError("");
    try {
      const result = await purchaseRequest(
        initial?.id
          ? `/api/proveedores/${encodeURIComponent(initial.id)}`
          : "/api/proveedores",
        { method: initial?.id ? "PATCH" : "POST", body: JSON.stringify(draft) },
      );
      onSaved(result);
    } catch (error) {
      setError(error.message);
    } finally {
      lock.current = false;
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <section
      className={styles.providerForm}
      role="region"
      aria-label="Datos del proveedor"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target.tagName === "INPUT") {
          event.preventDefault();
          save();
        }
      }}
    >
      <fieldset disabled={busy} className={styles.fields}>
        {[
          ["nombre", "Nombre o razón social", "text"],
          ["rtn", "Identificación / RTN (opcional)", "text"],
          ["contacto", "Contacto (opcional)", "text"],
          ["telefono", "Teléfono (opcional)", "tel"],
          ["email", "Correo (opcional)", "email"],
          ["direccion", "Dirección (opcional)", "text"],
        ].map(([name, label, type]) => (
          <label key={name} className={admin.field}>
            {label}
            <input
              type={type}
              value={draft[name] || ""}
              required={name === "nombre"}
              maxLength={name === "direccion" ? 300 : 150}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [name]: event.target.value,
                }))
              }
            />
          </label>
        ))}
        {initial?.id ? (
          <label className={admin.field}>
            Estado
            <select
              value={draft.estado}
              onChange={(e) =>
                setDraft((current) => ({ ...current, estado: e.target.value }))
              }
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </label>
        ) : null}
      </fieldset>
      {error ? <p role="alert">{error}</p> : null}
      <div className={styles.actions}>
        <button
          type="button"
          className={admin.ghostBtn}
          disabled={busy}
          onClick={onCancel}
        >
          Cancelar proveedor
        </button>
        <button
          type="button"
          className={admin.primaryBtn}
          disabled={busy}
          onClick={save}
        >
          {busy ? "Guardando proveedor…" : "Guardar proveedor"}
        </button>
      </div>
    </section>
  );
}
export default function ProvidersPanel({ session }) {
  const [providers, setProviders] = useState([]),
    [error, setError] = useState(""),
    [loadedFor, setLoadedFor] = useState(null),
    [editing, setEditing] = useState(null),
    [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
  const canWrite = session?.permisos?.includes("compras:write"),
    canDelete = session?.permisos?.includes("compras:delete");
  const loading = loadedFor !== refresh;
  useEffect(() => {
    const controller = new AbortController();
    purchaseRequest("/api/proveedores", { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data))
          throw new Error(
            "La respuesta de proveedores no es válida. Reintenta.",
          );
        setProviders(data);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedFor(refresh);
      });
    return () => controller.abort();
  }, [refresh]);
  async function remove(provider) {
    if (
      !window.confirm(
        `¿Eliminar o desactivar a ${provider.nombre}? Si tiene documentos se conserva su historial.`,
      )
    )
      return;
    setBusy(true);
    try {
      await purchaseRequest(
        `/api/proveedores/${encodeURIComponent(provider.id)}`,
        { method: "DELETE" },
      );
      setRefresh((n) => n + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Directorio de proveedores">
      <div className={styles.toolbar}>
        <label className={admin.field}>
          Buscar proveedor
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nombre o RTN"
          />
        </label>
        {canWrite ? (
          <button
            className={admin.primaryBtn}
            type="button"
            disabled={busy}
            onClick={() => setEditing({})}
          >
            Nuevo proveedor
          </button>
        ) : null}
      </div>
      {editing ? (
        <ProviderForm
          key={editing.id || "new"}
          initial={editing}
          onBusy={setBusy}
          onCancel={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRefresh((n) => n + 1);
          }}
        />
      ) : null}
      {error ? (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            className={admin.ghostBtn}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Reintentar proveedores
          </button>
        </p>
      ) : null}
      {loading ? <p role="status">Cargando proveedores…</p> : null}
      <div className={admin.tableWrap}>
        <table className={admin.table}>
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Identificación</th>
              <th>Contacto</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {providers
              .filter((p) =>
                `${p.nombre} ${p.rtn || ""}`
                  .toLowerCase()
                  .includes(query.toLowerCase()),
              )
              .map((p) => (
                <tr key={p.id}>
                  <td data-label="Proveedor">{p.nombre}</td>
                  <td data-label="Identificación">
                    {p.rtn || "Sin identificación registrada"}
                  </td>
                  <td data-label="Contacto">
                    {p.contacto || p.telefono || p.email || "—"}
                  </td>
                  <td data-label="Estado">{p.estado}</td>
                  <td data-label="Acciones">
                    <div className={styles.actions}>
                      {canWrite ? (
                        <button
                          type="button"
                          className={admin.ghostBtn}
                          disabled={busy}
                          onClick={() => setEditing(p)}
                        >
                          Editar proveedor
                        </button>
                      ) : null}
                      {canDelete ? (
                        <button
                          type="button"
                          className={admin.dangerBtn}
                          disabled={busy}
                          onClick={() => remove(p)}
                        >
                          Eliminar proveedor
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!loading && !providers.length ? (
        <p>No hay proveedores registrados.</p>
      ) : null}
    </section>
  );
}
