"use client";
import { useEffect, useRef, useState } from "react";
import { purchaseRequest, purchaseMoney } from "./compras-ui";
import {
  paymentTerms,
  purchaseDate,
  warehouseStatus,
} from "@/lib/compras-form";
import { previewDocumentClick } from "@/lib/api-document";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import PurchaseEditor from "./purchase-editor";
import admin from "./admin-experience.module.css";
import styles from "./compras-panel.module.css";
function ReceivingEditor({ order, onClose, onSaved }) {
  const [warehouses, setWarehouses] = useState([]),
    [bodegaId, setBodega] = useState(""),
    [quantities, setQuantities] = useState({}),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const lock = useRef(false);
  const [requestId] = useState(
    () =>
      globalThis.crypto.randomUUID?.() ||
      Array.from(globalThis.crypto.getRandomValues(new Uint8Array(16)), (n) =>
        n.toString(16).padStart(2, "0"),
      ).join(""),
  );
  useBodyScrollLock(true);
  useEscapeKey(true, () => {
    if (!lock.current) onClose();
  });
  useEffect(() => {
    const controller = new AbortController();
    purchaseRequest("/api/bodegas", { signal: controller.signal })
      .then((data) => {
        setWarehouses(data.filter((row) => row.estado === "activo"));
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const pending = order.items.filter(
      (item) => item.cantidad > item.cantidadRecibida,
    ),
    items = pending
      .filter((item) => Number(quantities[item.id]) > 0)
      .map((item) => ({ itemId: item.id, cantidad: quantities[item.id] }));
  async function receive(event) {
    event.preventDefault();
    if (lock.current || !items.length || !bodegaId) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await purchaseRequest(
        `/api/ordenes-compra/${encodeURIComponent(order.id)}/recepcion`,
        {
          method: "POST",
          body: JSON.stringify({ bodegaId, items, notas: notes, requestId }),
        },
      );
      onSaved(result);
    } catch (error) {
      setError(error.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className={styles.backdrop}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Recibir mercadería"
      >
        <header className={styles.modalHeader}>
          <h2>Recibir {order.numero}</h2>
          <button
            type="button"
            className={admin.ghostBtn}
            disabled={busy}
            onClick={onClose}
          >
            Cerrar recepción
          </button>
        </header>
        <p>
          Registra sólo lo que llegó. No se puede recibir más de lo pendiente.
          El reintento de esta misma operación no duplica las existencias.
        </p>
        <form onSubmit={receive}>
          <fieldset className={styles.fields} disabled={busy || loading}>
            <label className={`${admin.field} ${styles.full}`}>
              Bodega de recepción
              <select
                required
                value={bodegaId}
                onChange={(e) => setBodega(e.target.value)}
              >
                <option value="">Selecciona bodega destino</option>
                {warehouses.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.full}>
              {pending.map((item) => (
                <div className={styles.receiptRow} key={item.id}>
                  <div>
                    <strong>{item.nombre}</strong>
                    <small>
                      Pedido: {item.cantidad} · Recibido:{" "}
                      {item.cantidadRecibida} · Pendiente:{" "}
                      {item.cantidad - item.cantidadRecibida}
                    </small>
                    {!item.productoId ? (
                      <small>Concepto no inventariable: no crea stock.</small>
                    ) : null}
                  </div>
                  <label className={admin.field}>
                    Recibir ahora
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max={item.cantidad - item.cantidadRecibida}
                      value={quantities[item.id] ?? ""}
                      onChange={(e) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
            <label className={`${admin.field} ${styles.full}`}>
              Notas de recepción
              <textarea
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </fieldset>
          {loading ? <p role="status">Cargando bodegas…</p> : null}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <footer className={styles.actions}>
            <button
              type="button"
              className={admin.ghostBtn}
              disabled={busy}
              onClick={onClose}
            >
              Cancelar recepción
            </button>
            <button
              type="submit"
              className={admin.primaryBtn}
              disabled={busy || loading || !bodegaId || !items.length}
            >
              {busy ? "Registrando recepción…" : "Registrar recepción"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
function PurchaseDetail({ order, receiving, onClose, canWrite, onUpdated }) {
  const [references, setReferences] = useState({
      facturaProveedor: order.facturaProveedor || "",
      envio: order.envio || "",
      notas: order.notas || "",
    }),
    [saving, setSaving] = useState(false),
    [saveError, setSaveError] = useState("");
  const savingRef = useRef(false);
  async function saveReferences(event) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError("");
    try {
      const result = await purchaseRequest(
        `/api/ordenes-compra/${encodeURIComponent(order.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...references, updatedAt: order.updatedAt }),
        },
      );
      onUpdated(result);
    } catch (error) {
      setSaveError(error.message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  useBodyScrollLock(true);
  useEscapeKey(true, () => {
    if (!savingRef.current) onClose();
  });
  return (
    <div className={styles.backdrop}>
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de abastecimiento"
      >
        <header className={styles.modalHeader}>
          <h2>{order.numero}</h2>
          <button
            type="button"
            className={admin.ghostBtn}
            disabled={saving}
            onClick={onClose}
          >
            Cerrar detalle
          </button>
        </header>
        <div className={styles.detail}>
          <p>
            <strong>Requerido a:</strong> {order.proveedor?.nombre}{" "}
            {order.requeridoA ? `· ${order.requeridoA}` : ""}
          </p>
          <p>Fecha: {purchaseDate(order.fecha)}</p>
          <p>
            Estado: {order.estado} · Almacén: {warehouseStatus(order)}
          </p>
          <p>Envío: {order.envio || "Sin envío registrado"}</p>
          {!receiving ? (
            <>
              <p>Términos: {paymentTerms(order)}</p>
              <p>
                Vencimiento:{" "}
                {purchaseDate(order.fechaVencimiento) || "No aplica"}
              </p>
              <p>
                Factura proveedor: {order.facturaProveedor || "No registrada"}
              </p>
              <p>Moneda: Nacional · HNL (L)</p>
              <p>
                Compra relacionada:{" "}
                {order.compraGenerada?.numero ||
                  order.cotizacionOrigen?.numero ||
                  "Sin conversión"}
              </p>
            </>
          ) : null}
        </div>
        <div className={admin.tableWrap}>
          <table className={admin.table}>
            <thead>
              <tr>
                <th>Producto / concepto</th>
                <th>Pedido</th>
                <th>Recibido</th>
                {!receiving ? (
                  <>
                    <th>Costo neto</th>
                    <th>ISV</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td data-label="Producto">{item.nombre}</td>
                  <td data-label="Pedido">{item.cantidad}</td>
                  <td data-label="Recibido">{item.cantidadRecibida}</td>
                  {!receiving ? (
                    <>
                      <td data-label="Costo neto">
                        {purchaseMoney(item.costoUnitario)}
                      </td>
                      <td data-label="ISV">
                        {Number(item.impuestoPorcentaje)}%
                      </td>
                    </>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!receiving ? (
          <>
            <p>
              Subtotal neto: {purchaseMoney(order.subtotal)} · ISV:{" "}
              {purchaseMoney(order.impuesto)}
            </p>
            <p className={styles.total}>Total: {purchaseMoney(order.total)}</p>
            <p className={styles.notice}>
              Los términos no equivalen a un pago registrado. El vencimiento de
              crédito se calcula desde la fecha de compra.
            </p>
            <p>{order.notas}</p>
            {order.recepciones?.length ? (
              <section aria-label="Historial de recepción">
                <h3>Recepciones registradas</h3>
                {order.recepciones.map((row) => (
                  <p key={row.id}>
                    {new Date(row.createdAt).toLocaleString("es-HN")} ·{" "}
                    {row.actor} ·{" "}
                    {row.detalle
                      .map((line) => `${line.nombre}: ${line.cantidad}`)
                      .join(" / ")}{" "}
                    {row.notas ? `· ${row.notas}` : ""}
                  </p>
                ))}
              </section>
            ) : null}
            {canWrite &&
            order.tipo === "compra" &&
            ["parcial", "recibida"].includes(order.estado) ? (
              <form
                onSubmit={saveReferences}
                aria-label="Referencias del proveedor"
              >
                <h3>Completar referencia de entrega</h3>
                <fieldset className={styles.fields} disabled={saving}>
                  {[
                    ["facturaProveedor", "Factura proveedor"],
                    ["envio", "Envío / guía"],
                    ["notas", "Notas"],
                  ].map(([key, label]) => (
                    <label key={key} className={admin.field}>
                      {label}
                      <input
                        value={references[key]}
                        maxLength={key === "notas" ? 1000 : 100}
                        onChange={(e) =>
                          setReferences((current) => ({
                            ...current,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </fieldset>
                <p className={styles.notice}>
                  Sólo referencias; no modifica proveedor, costos, cantidades ni
                  existencias.
                </p>
                {saveError ? (
                  <p className={styles.error} role="alert">
                    {saveError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  className={admin.primaryBtn}
                  disabled={saving}
                >
                  {saving
                    ? "Guardando referencia…"
                    : "Guardar referencia del proveedor"}
                </button>
              </form>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
export default function ComprasPanel({ view, session, onViewChange }) {
  const receiving = view === "recepciones",
    quote = view === "cotizaciones",
    tipo = quote ? "cotizacion" : "compra",
    permissions = session?.permisos || [];
  const canWrite = permissions.includes("compras:write"),
    canDelete = permissions.includes("compras:delete"),
    canReceive =
      permissions.includes("compras:receive") &&
      permissions.includes("inventario:write") &&
      permissions.includes("inventario:read");
  const [orders, setOrders] = useState([]),
    [loadedFor, setLoadedFor] = useState(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [query, setQuery] = useState(""),
    [editing, setEditing] = useState(null),
    [detail, setDetail] = useState(null),
    [receipt, setReceipt] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const requestKey = `${receiving}:${tipo}:${refresh}`;
  const loading = loadedFor !== requestKey;
  useEffect(() => {
    const controller = new AbortController();
    purchaseRequest(
      receiving
        ? "/api/inventario/recepciones"
        : `/api/ordenes-compra?tipo=${tipo}&take=200`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (controller.signal.aborted) return;
        if (!Array.isArray(data))
          throw new Error(
            "La respuesta de abastecimiento no es válida. Reintenta.",
          );
        setOrders(data);
        setError("");
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setOrders([]);
          setError(error.message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadedFor(requestKey);
      });
    return () => controller.abort();
  }, [receiving, tipo, requestKey]);
  async function action(order, operation) {
    if (lock.current) return;
    if (
      operation === "cancelar" &&
      !window.confirm(
        "¿Cancelar el saldo pendiente? Lo ya recibido y su kardex NO se revierten.",
      )
    )
      return;
    if (
      operation === "eliminar" &&
      !window.confirm("¿Eliminar este borrador sin recepción ni conversión?")
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const base = `/api/ordenes-compra/${encodeURIComponent(order.id)}`;
      if (operation === "convertir") {
        const result = await purchaseRequest(`${base}/convertir`, {
          method: "POST",
        });
        setNotice(
          `Compra ${result.numero} generada como borrador. Debe confirmarse antes de recibir.`,
        );
        setQuery("");
        onViewChange("compras");
      } else if (operation === "eliminar")
        await purchaseRequest(base, { method: "DELETE" });
      else
        await purchaseRequest(base, {
          method: "PATCH",
          body: JSON.stringify({
            estado: operation === "confirmar" ? "enviada" : "cancelada",
            updatedAt: order.updatedAt,
          }),
        });
      setRefresh((n) => n + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const filtered = (loading ? [] : orders).filter((order) =>
    `${order.numero} ${order.proveedor?.nombre} ${order.facturaProveedor || ""} ${order.requeridoA || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <section
      aria-label={
        receiving
          ? "Recepciones de compras"
          : quote
            ? "Cotizaciones de compra"
            : "Órdenes de compra"
      }
    >
      <div className={styles.toolbar}>
        <label className={admin.field}>
          Buscar abastecimiento
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Número, proveedor o factura externa"
          />
        </label>
        <div className={styles.actions}>
          <button
            type="button"
            className={admin.ghostBtn}
            disabled={loading || busy}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Actualizar abastecimiento
          </button>
          {canWrite && !receiving ? (
            <button
              type="button"
              className={admin.primaryBtn}
              onClick={() => setEditing({})}
            >
              Nueva {quote ? "cotización a proveedor" : "compra"}
            </button>
          ) : null}
        </div>
      </div>
      <p className={styles.notice}>
        {receiving
          ? "Sólo las compras confirmadas o con recepción aparecen aquí. La recepción aumenta existencias, no las cotizaciones."
          : "Últimos 200 documentos. «Requerido a» identifica al proveedor y su contacto; la factura del proveedor es su número externo, distinto del número interno."}
      </p>
      {notice ? <p role="status">{notice}</p> : null}
      {error ? (
        <p className={styles.error} role="alert">
          {error}{" "}
          <button
            type="button"
            className={admin.ghostBtn}
            onClick={() => setRefresh((n) => n + 1)}
          >
            Reintentar abastecimiento
          </button>
        </p>
      ) : null}
      {loading ? <p role="status">Cargando abastecimiento…</p> : null}
      <div className={admin.tableWrap}>
        <table className={admin.table}>
          <thead>
            <tr>
              <th>Número</th>
              <th>Fecha</th>
              <th>Requerido a</th>
              {!receiving ? (
                <>
                  <th>Términos</th>
                  <th>{quote ? "Compra número" : "Factura proveedor"}</th>
                </>
              ) : null}
              <th>Envío</th>
              {!receiving ? <th>Moneda</th> : null}
              <th>Almacén / estado</th>
              {!receiving ? <th>Total</th> : null}
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <td data-label="Número">{order.numero}</td>
                <td data-label="Fecha">{purchaseDate(order.fecha)}</td>
                <td data-label="Requerido a">
                  {order.proveedor?.nombre}
                  {order.requeridoA ? (
                    <>
                      <br />
                      <small>{order.requeridoA}</small>
                    </>
                  ) : null}
                </td>
                {!receiving ? (
                  <>
                    <td data-label="Términos">{paymentTerms(order)}</td>
                    <td
                      data-label={quote ? "Compra número" : "Factura proveedor"}
                    >
                      {quote
                        ? order.compraGenerada?.numero || "Sin convertir"
                        : order.facturaProveedor || "No registrada"}
                    </td>
                  </>
                ) : null}
                <td data-label="Envío">{order.envio || "Sin registrar"}</td>
                {!receiving ? <td data-label="Moneda">Nacional · L</td> : null}
                <td data-label="Almacén">
                  <span className={styles.status}>{order.estado}</span>
                  {!quote ? <small>{warehouseStatus(order)}</small> : null}
                </td>
                {!receiving ? (
                  <td data-label="Total">{purchaseMoney(order.total)}</td>
                ) : null}
                <td data-label="Acciones">
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={admin.ghostBtn}
                      onClick={() => setDetail(order)}
                    >
                      Ver abastecimiento
                    </button>
                    {!receiving ? (
                      <a
                        className={admin.ghostBtn}
                        href={`/api/ordenes-compra/${encodeURIComponent(order.id)}/documento`}
                        data-no-transition="true"
                        onClick={(event) =>
                          previewDocumentClick(event)?.catch((error) =>
                            setError(error.message),
                          )
                        }
                      >
                        Imprimir abastecimiento
                      </a>
                    ) : null}
                    {!receiving &&
                    canWrite &&
                    ["borrador", "enviada"].includes(order.estado) &&
                    !order.items.some((item) => item.cantidadRecibida > 0) ? (
                      <button
                        type="button"
                        className={admin.ghostBtn}
                        disabled={busy}
                        onClick={() => setEditing(order)}
                      >
                        Editar abastecimiento
                      </button>
                    ) : null}
                    {!receiving &&
                    canWrite &&
                    order.estado === "borrador" &&
                    !quote ? (
                      <button
                        type="button"
                        className={admin.primaryBtn}
                        disabled={busy}
                        onClick={() => action(order, "confirmar")}
                      >
                        Confirmar compra
                      </button>
                    ) : null}
                    {!receiving &&
                    canWrite &&
                    quote &&
                    ["borrador", "enviada"].includes(order.estado) ? (
                      <button
                        type="button"
                        className={admin.primaryBtn}
                        disabled={busy}
                        onClick={() => action(order, "convertir")}
                      >
                        Convertir a compra
                      </button>
                    ) : null}
                    {canReceive &&
                    !quote &&
                    ["enviada", "parcial"].includes(order.estado) ? (
                      <button
                        type="button"
                        className={admin.primaryBtn}
                        disabled={busy}
                        onClick={() => setReceipt(order)}
                      >
                        Recibir mercadería
                      </button>
                    ) : null}
                    {!receiving &&
                    canWrite &&
                    ["borrador", "enviada", "parcial"].includes(
                      order.estado,
                    ) ? (
                      <button
                        type="button"
                        className={admin.ghostBtn}
                        disabled={busy}
                        onClick={() => action(order, "cancelar")}
                      >
                        Cancelar pendiente
                      </button>
                    ) : null}
                    {!receiving &&
                    canDelete &&
                    order.estado === "borrador" &&
                    !order.cotizacionOrigen &&
                    !order.compraGenerada ? (
                      <button
                        type="button"
                        className={admin.dangerBtn}
                        disabled={busy}
                        onClick={() => action(order, "eliminar")}
                      >
                        Eliminar borrador
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !filtered.length ? (
          <p className={admin.empty}>Sin documentos para este filtro.</p>
        ) : null}
      </div>
      {editing ? (
        <PurchaseEditor
          key={editing.id || tipo}
          initial={editing}
          tipo={tipo}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setRefresh((n) => n + 1);
          }}
        />
      ) : null}
      {detail ? (
        <PurchaseDetail
          order={detail}
          receiving={receiving}
          canWrite={canWrite}
          onUpdated={(order) => {
            setDetail(order);
            setRefresh((n) => n + 1);
          }}
          onClose={() => setDetail(null)}
        />
      ) : null}
      {receipt ? (
        <ReceivingEditor
          order={receipt}
          onClose={() => setReceipt(null)}
          onSaved={() => {
            setReceipt(null);
            setNotice(
              "Recepción registrada. Existencias y kardex actualizados una sola vez.",
            );
            setRefresh((n) => n + 1);
          }}
        />
      ) : null}
    </section>
  );
}
