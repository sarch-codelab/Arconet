"use client";

import { useMemo } from "react";
import { Package, ReceiptText, ShoppingCart, Trash2 } from "lucide-react";
import { roundMoney } from "@/lib/ventas-form";
import styles from "./carrito-cliente.module.css";

function money(value) {
  return `L ${Number(value || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function quantity(value) {
  return Number(value || 0).toLocaleString("es-HN", { maximumFractionDigits: 3 });
}

// Misma base por línea que la previsualización fiscal y el servidor: cantidad
// por precio menos descuento. El ISV se resume al final para no recargar cada
// tarjeta del carrito.
function calcularLinea(linea) {
  const base = roundMoney(Math.max(0, (Number(linea.cantidad) || 0) * (Number(linea.precio) || 0) - (Number(linea.descuento) || 0)));
  const impuesto = roundMoney(base * (Number(linea.impuestoPorcentaje) || 0) / 100);
  return { base, impuesto };
}

/** Lista de productos y servicios que el cliente lleva en la venta actual. */
export default function CarritoCliente({ cliente, lineas = [], productos = [], totales, onQuitarLinea, disabled = false }) {
  const calculadas = useMemo(
    () => lineas.map((linea) => ({ ...linea, calculo: calcularLinea(linea) })),
    [lineas],
  );
  const productosPorId = useMemo(
    () => new Map(productos.map((producto) => [producto.id, producto])),
    [productos],
  );
  const subtotal = totales?.subtotal ?? calculadas.reduce((suma, { calculo }) => suma + calculo.base, 0);
  const descuento = totales?.descuento ?? calculadas.reduce((suma, linea) => suma + (Number(linea.descuento) || 0), 0);
  const impuesto = totales?.impuesto ?? calculadas.reduce((suma, { calculo }) => suma + calculo.impuesto, 0);
  const total = totales?.total ?? roundMoney(subtotal + impuesto);

  return (
    <aside className={styles.cartCard} aria-label="Carrito del cliente">
      <header className={styles.cartHead}>
        <div className={styles.cartTitle}>
          <span className={styles.cartTitleIcon} aria-hidden="true"><ShoppingCart size={19} /></span>
          <div>
            <p>Resumen de la venta</p>
            <h3>Carrito del cliente</h3>
          </div>
        </div>
        <span className={styles.cartCount}>{lineas.length} {lineas.length === 1 ? "línea" : "líneas"}</span>
      </header>

      <div className={styles.cartBody}>
        <div className={styles.customer}>
          <span>Cliente</span>
          <strong>{cliente?.nombre || "Sin cliente seleccionado"}</strong>
        </div>

        {calculadas.length ? (
          <ul className={styles.cartList} aria-label="Productos y servicios de la venta">
            {calculadas.map((linea) => {
              const producto = productosPorId.get(linea.productoId);
              const esProducto = linea.kind === "producto" || Boolean(linea.productoId);
              const descripcion = linea.descripcion || (esProducto ? "Producto sin descripción" : "Concepto / servicio");
              return (
                <li className={styles.cartItem} key={linea.key}>
                  <div className={styles.itemVisual} aria-hidden="true">
                    {producto?.foto ? (
                      // La ruta ya viene autorizada por el lookup de productos.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={producto.foto} alt="" width={52} height={52} />
                    ) : (
                      <span>{esProducto ? <Package size={23} /> : <ReceiptText size={23} />}</span>
                    )}
                  </div>

                  <div className={styles.itemContent}>
                    <div className={styles.itemTop}>
                      <div className={styles.itemName}>
                        <span>{esProducto ? "Producto" : "Servicio"}</span>
                        <strong>{descripcion}</strong>
                      </div>
                      {onQuitarLinea ? (
                        <button
                          type="button"
                          className={styles.removeButton}
                          onClick={() => onQuitarLinea(linea.key)}
                          disabled={disabled}
                          aria-label={`Quitar ${descripcion} del carrito`}
                          title="Quitar del carrito"
                        >
                          <Trash2 size={15} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    <div className={styles.itemMeta}>
                      <span>{quantity(linea.cantidad)} × {money(linea.precio)}</span>
                      <span>ISV {Number(linea.impuestoPorcentaje) || 0}%</span>
                    </div>
                    <div className={styles.itemBottom}>
                      <span>{Number(linea.descuento) ? `Descuento: − ${money(linea.descuento)}` : "Sin descuento"}</span>
                      <strong>{money(linea.calculo.base)}</strong>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.emptyCart}>
            <span aria-hidden="true"><ShoppingCart size={26} /></span>
            <strong>El carrito está vacío</strong>
            <p>Añade productos o conceptos / servicios desde el formulario para verlos aquí.</p>
          </div>
        )}

        <div className={styles.totals} aria-label="Totales del carrito">
          <div><span>Subtotal neto</span><strong>{money(subtotal)}</strong></div>
          <div><span>Descuento</span><strong>− {money(descuento)}</strong></div>
          <div><span>ISV</span><strong>{money(impuesto)}</strong></div>
          <div className={styles.grandTotal}>
            <span>Total</span>
            <output aria-label="Total del carrito" aria-live="polite">{money(total)}</output>
          </div>
        </div>

        <p className={styles.cartHint}>Las cantidades, tarifas y descuentos se editan en las líneas del formulario.</p>
      </div>
    </aside>
  );
}
