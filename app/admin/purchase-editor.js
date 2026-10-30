"use client";
import { useRef, useState } from "react";
import ReferenciaSelector from "./referencia-selector";
import { ProviderForm } from "./proveedores-panel";
import { purchaseRequest, purchaseMoney } from "./compras-ui";
import {
  purchaseTotals,
  validPurchaseLine,
  purchaseDate,
  businessPurchaseDate,
} from "@/lib/compras-form";
import { MAX_DOCUMENT_AMOUNT } from "@/lib/ventas-form";
import { useBodyScrollLock, useEscapeKey } from "./use-body-scroll-lock";
import admin from "./admin-experience.module.css";
import styles from "./compras-panel.module.css";
const today = businessPurchaseDate;
export default function PurchaseEditor({ initial, tipo, onSaved, onClose }) {
  const [draft, setDraft] = useState(() => ({
    proveedorId: "",
    requeridoA: "",
    terminos: "contado",
    diasCredito: 30,
    facturaProveedor: "",
    envio: "",
    moneda: "HNL",
    notas: "",
    ...initial,
    tipo,
    fecha: purchaseDate(initial?.fecha) || today(),
    fechaEsperada: purchaseDate(initial?.fechaEsperada),
    items: (initial?.items || []).map((line, index) => ({
      ...line,
      key: `saved-${index}`,
      kind: line.productoId ? "producto" : "concepto",
    })),
  }));
  const [provider, setProvider] = useState(initial?.proveedor || null),
    [creating, setCreating] = useState(false),
    [providerBusy, setProviderBusy] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    sequence = useRef(0);
  const blocked = busy || providerBusy;
  useBodyScrollLock(true);
  useEscapeKey(true, () => {
    if (!blocked && !creating) onClose();
  });
  const totals = purchaseTotals(draft.items),
    valid =
      draft.proveedorId &&
      draft.items.length > 0 &&
      draft.items.length <= 100 &&
      draft.items.every(validPurchaseLine) &&
      totals.total <= MAX_DOCUMENT_AMOUNT &&
      (draft.terminos !== "credito" || Number(draft.diasCredito) > 0);
  const field = (name, value) =>
    setDraft((current) => ({ ...current, [name]: value }));
  function add(kind) {
    if (draft.items.length >= 100) return;
    const key = `new-${sequence.current++}`;
    setDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          key,
          kind,
          productoId: "",
          nombre: "",
          cantidad: "1",
          costoUnitario: "",
          impuestoPorcentaje: "15",
        },
      ],
    }));
  }
  function lineField(key, changes) {
    setDraft((current) => ({
      ...current,
      items: current.items.map((line) =>
        line.key === key ? { ...line, ...changes } : line,
      ),
    }));
  }
  async function save(event) {
    event.preventDefault();
    if (lock.current || !valid || creating || blocked) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...draft,
        estado: initial?.id ? initial.estado : "borrador",
        diasCredito: draft.terminos === "credito" ? draft.diasCredito : 0,
        items: draft.items.map(
          ({
            productoId,
            nombre,
            cantidad,
            costoUnitario,
            impuestoPorcentaje,
          }) => ({
            productoId,
            nombre,
            cantidad,
            costoUnitario,
            impuestoPorcentaje,
          }),
        ),
        ...(initial?.id ? { updatedAt: initial.updatedAt } : {}),
      };
      const result = await purchaseRequest(
        initial?.id
          ? `/api/ordenes-compra/${encodeURIComponent(initial.id)}`
          : "/api/ordenes-compra",
        {
          method: initial?.id ? "PATCH" : "POST",
          body: JSON.stringify(payload),
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
        aria-label={
          tipo === "cotizacion"
            ? "Cotización a proveedor"
            : "Compra a proveedor"
        }
      >
        <header className={styles.modalHeader}>
          <h2>
            {initial?.id ? "Editar" : "Nueva"}{" "}
            {tipo === "cotizacion"
              ? "cotización a proveedor"
              : "compra a proveedor"}
          </h2>
          <button
            type="button"
            className={admin.ghostBtn}
            disabled={blocked}
            onClick={onClose}
            aria-label="Cerrar compra"
          >
            Cerrar
          </button>
        </header>
        <p className={styles.notice}>
          Proveedor y costo de compra: no son cliente ni precio de venta.
          Guardar o confirmar no aumenta el stock ni registra pagos.
        </p>
        <form onSubmit={save}>
          <fieldset className={styles.fields} disabled={blocked}>
            <div className={styles.full}>
              <ReferenciaSelector
                kind="proveedores"
                label="Proveedor"
                value={draft.proveedorId}
                fallback={provider}
                disabled={blocked || creating}
                onChange={(item) => {
                  setProvider(item);
                  setDraft((current) => ({
                    ...current,
                    proveedorId: item?.id || "",
                    requeridoA: item?.contacto || "",
                  }));
                }}
              />
              {!creating ? (
                <button
                  type="button"
                  className={admin.ghostBtn}
                  disabled={blocked}
                  onClick={() => setCreating(true)}
                >
                  Crear proveedor sin salir
                </button>
              ) : (
                <ProviderForm
                  onBusy={setProviderBusy}
                  onCancel={() => setCreating(false)}
                  onSaved={(item) => {
                    setProvider(item);
                    setDraft((current) => ({
                      ...current,
                      proveedorId: item.id,
                      requeridoA: item.contacto || "",
                    }));
                    setCreating(false);
                  }}
                />
              )}
            </div>
            <label className={admin.field}>
              Atención / requerido a
              <input
                value={draft.requeridoA || ""}
                maxLength={150}
                disabled={creating}
                onChange={(e) => field("requeridoA", e.target.value)}
                placeholder="Contacto del proveedor (opcional)"
              />
            </label>
            <label className={admin.field}>
              Fecha de compra o cotización
              <input
                type="date"
                required
                value={draft.fecha}
                disabled={creating}
                onChange={(e) => field("fecha", e.target.value)}
              />
            </label>
            <label className={admin.field}>
              Términos
              <select
                value={draft.terminos}
                disabled={creating}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    terminos: e.target.value,
                    diasCredito:
                      e.target.value === "credito" &&
                      !(Number(current.diasCredito) > 0)
                        ? 30
                        : current.diasCredito,
                  }))
                }
              >
                <option value="contado">Contado / efectivo</option>
                <option value="credito">Crédito</option>
              </select>
            </label>
            {draft.terminos === "credito" ? (
              <label className={admin.field}>
                Días de crédito
                <input
                  type="number"
                  required
                  min="1"
                  max="3650"
                  step="1"
                  disabled={creating}
                  value={draft.diasCredito}
                  onChange={(e) => field("diasCredito", e.target.value)}
                />
              </label>
            ) : null}
            {tipo === "compra" ? (
              <label className={admin.field}>
                Factura del proveedor
                <input
                  value={draft.facturaProveedor || ""}
                  maxLength={100}
                  disabled={creating}
                  onChange={(e) => field("facturaProveedor", e.target.value)}
                  placeholder="Número externo, no el ID de la compra"
                />
              </label>
            ) : null}
            <label className={admin.field}>
              Envío / guía / transportista
              <input
                value={draft.envio || ""}
                maxLength={200}
                disabled={creating}
                onChange={(e) => field("envio", e.target.value)}
              />
            </label>
            <label className={admin.field}>
              Fecha esperada
              <input
                type="date"
                value={draft.fechaEsperada}
                disabled={creating}
                onChange={(e) => field("fechaEsperada", e.target.value)}
              />
            </label>
            <label className={admin.field}>
              Moneda
              <input readOnly value="Nacional · HNL (L)" />
            </label>
            <div className={styles.full}>
              <h3>Detalle · {draft.items.length} / 100</h3>
              <div className={styles.lines}>
                {draft.items.map((line, index) => (
                  <section
                    key={line.key}
                    className={styles.line}
                    aria-label={`Línea de compra ${index + 1}`}
                  >
                    <div className={styles.lineHead}>
                      <strong>
                        {line.kind === "producto"
                          ? "Producto"
                          : "Concepto no inventariable"}{" "}
                        {index + 1}
                      </strong>
                      <button
                        type="button"
                        className={admin.ghostBtn}
                        disabled={creating}
                        onClick={() =>
                          field(
                            "items",
                            draft.items.filter((row) => row.key !== line.key),
                          )
                        }
                      >
                        Quitar línea {index + 1}
                      </button>
                    </div>
                    {line.kind === "producto" ? (
                      <ReferenciaSelector
                        kind="compras-productos"
                        label={`Producto de compra ${index + 1}`}
                        value={line.productoId}
                        fallback={{ id: line.productoId, nombre: line.nombre }}
                        disabled={creating || blocked}
                        onChange={(item) =>
                          lineField(line.key, {
                            productoId: item?.id || "",
                            nombre: item?.nombre || "",
                            costoUnitario:
                              item?.costo == null ? "" : String(item.costo),
                          })
                        }
                      />
                    ) : (
                      <label className={admin.field}>
                        Concepto de compra
                        <input
                          value={line.nombre}
                          required
                          maxLength={200}
                          disabled={creating}
                          onChange={(e) =>
                            lineField(line.key, { nombre: e.target.value })
                          }
                        />
                      </label>
                    )}
                    <div className={styles.lineFields}>
                      <label className={admin.field}>
                        Cantidad entera
                        <input
                          type="number"
                          required
                          step="1"
                          min="1"
                          max="999999999"
                          disabled={creating}
                          value={line.cantidad}
                          onChange={(e) =>
                            lineField(line.key, { cantidad: e.target.value })
                          }
                        />
                      </label>
                      <label className={admin.field}>
                        Costo unitario neto (L)
                        <input
                          type="number"
                          required
                          step="0.01"
                          min="0"
                          max="9999999999.99"
                          disabled={creating}
                          value={line.costoUnitario}
                          onChange={(e) =>
                            lineField(line.key, {
                              costoUnitario: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label className={admin.field}>
                        ISV de compra
                        <select
                          value={String(line.impuestoPorcentaje)}
                          disabled={creating}
                          onChange={(e) =>
                            lineField(line.key, {
                              impuestoPorcentaje: e.target.value,
                            })
                          }
                        >
                          <option value="0">0% · sin ISV</option>
                          <option value="15">15%</option>
                          <option value="18">18%</option>
                        </select>
                      </label>
                    </div>
                    <p>
                      Importe neto:{" "}
                      {purchaseMoney(
                        Number(line.cantidad) * Number(line.costoUnitario),
                      )}
                    </p>
                  </section>
                ))}
              </div>
            </div>
            <div className={`${styles.actions} ${styles.full}`}>
              <button
                type="button"
                className={admin.ghostBtn}
                disabled={creating || draft.items.length >= 100}
                onClick={() => add("producto")}
              >
                Añadir producto a compra
              </button>
              <button
                type="button"
                className={admin.ghostBtn}
                disabled={creating || draft.items.length >= 100}
                onClick={() => add("concepto")}
              >
                Añadir concepto no inventariable
              </button>
            </div>
            <label className={`${admin.field} ${styles.full}`}>
              Notas / condiciones
              <textarea
                value={draft.notas || ""}
                maxLength={1000}
                disabled={creating}
                onChange={(e) => field("notas", e.target.value)}
              />
            </label>
          </fieldset>
          <p>
            Subtotal neto: {purchaseMoney(totals.subtotal)} · ISV:{" "}
            {purchaseMoney(totals.impuesto)}
          </p>
          <div className={styles.total}>
            <span>
              Total de {tipo === "cotizacion" ? "cotización" : "compra"}
            </span>
            <output aria-label="Total de abastecimiento" aria-live="polite">
              {purchaseMoney(totals.total)}
            </output>
          </div>
          {totals.total > MAX_DOCUMENT_AMOUNT ? (
            <p className={styles.error}>
              El total supera el importe permitido.
            </p>
          ) : null}
          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
          <footer className={styles.actions}>
            <button
              type="button"
              className={admin.ghostBtn}
              disabled={blocked}
              onClick={onClose}
            >
              Cancelar documento
            </button>
            <button
              type="submit"
              className={admin.primaryBtn}
              disabled={blocked || creating || !valid}
            >
              {busy
                ? "Guardando documento…"
                : initial?.id
                  ? "Guardar compra modificada"
                  : "Guardar borrador de abastecimiento"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
