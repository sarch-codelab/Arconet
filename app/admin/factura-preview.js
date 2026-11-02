"use client";

import { roundMoney } from "@/lib/ventas-form";
import { fiscalNumber } from "@/lib/fiscal-settings";
import styles from "./factura-preview.module.css";

function money(value) {
  return `L ${Number(value || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function hoyHonduras() {
  return new Intl.DateTimeFormat("es-HN", {
    timeZone: "America/Tegucigalpa",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date());
}

// Cálculo por línea idéntico al del servidor (redondeo de base e ISV por
// línea, no solo del gran total): así la previsualización nunca discrepa.
function calcularLinea(linea) {
  const base = roundMoney(Math.max(0, (Number(linea.cantidad) || 0) * (Number(linea.precio) || 0) - (Number(linea.descuento) || 0)));
  const impuesto = roundMoney(base * (Number(linea.impuestoPorcentaje) || 0) / 100);
  return { base, impuesto, total: roundMoney(base + impuesto) };
}

/**
 * Previsualización de la factura en vivo.
 *
 * Se refresca al changedar cualquier dato del borrador (cliente, líneas,
 * impuestos, configuración): mientras escribes o el panel ejecuta algo, la
 * factura de la derecha muestra el documento tal como se emitiría, sin
 * enviar nada al servidor.
 */
export default function FacturaPreview({ cliente, lineas = [], productos = [], totales, config, canEmit = true }) {
  const emisor = {
    nombre: config?.nombre || config?.companyName || "Arconet",
    rtn: config?.nit || "",
    direccion: config?.direccion || "",
    email: config?.email || "",
    phone: config?.phone || "",
    cai: config?.cai || "",
    serie: config?.serie || "",
    correlativo: config?.correlativo || "",
    rangoInicio: config?.rangoInicio || "",
    rangoFin: config?.rangoFin || "",
    fechaLimite: config?.fechaLimite || "",
  };
  const tieneRango = Boolean(emisor.cai && emisor.serie && emisor.correlativo);
  const numero = tieneRango ? fiscalNumber(emisor.serie, emisor.correlativo) : "Pendiente de CAI";

  const calculadas = lineas.map((linea) => ({ ...linea, calculo: calcularLinea(linea) }));
  const gruposISV = new Map();
  for (const { impuestoPorcentaje, calculo } of calculadas) {
    const tasa = Number(impuestoPorcentaje) || 0;
    if (tasa > 0) gruposISV.set(tasa, (gruposISV.get(tasa) || 0) + calculo.impuesto);
  }
  const subtotal = totales?.subtotal ?? calculadas.reduce((suma, { calculo }) => suma + calculo.base, 0);
  const descuento = totales?.descuento ?? calculadas.reduce((suma, { descuento }) => suma + (Number(descuento) || 0), 0);
  const impuesto = totales?.impuesto ?? calculadas.reduce((suma, { calculo }) => suma + calculo.impuesto, 0);
  const total = totales?.total ?? roundMoney(subtotal + impuesto);

  return (
    <aside className={styles.previewCard} aria-label="Previsualización de la factura en vivo">
      <header className={styles.previewHead}>
        <div className={styles.previewTitleBlock}>
          <span className={styles.liveBadge} aria-hidden="true">
            <span className={styles.liveDot} /> Previsualización en vivo
          </span>
          <h3>Factura fiscal · documento previo</h3>
        </div>
        <span className={styles.previewDate}>{hoyHonduras()}</span>
      </header>

      <div className={styles.document}>
        <header className={styles.docHeader}>
          <div className={styles.emisor}>
            <p className={styles.razon}>{emisor.nombre}</p>
            <div className={styles.line}>{emisor.direccion || "Dirección no registrada"}</div>
            {emisor.phone ? <div className={styles.line}>Tel.: {emisor.phone}</div> : null}
            {emisor.email ? <div className={styles.line}>{emisor.email}</div> : null}
            <div className={styles.line}>RTN: {emisor.rtn || "Sin registrar"}</div>
          </div>
          <div className={styles.docInfo}>
            <h4>FACTURA</h4>
            <div className={styles.line}>Número / referencia</div>
            <div className={styles.docNumber}>{numero}</div>
            <div className={styles.line}>Fecha de emisión: {hoyHonduras()}</div>
          </div>
        </header>

        {!tieneRango && canEmit ? (
          <p className={styles.pendingNotice}>
            Sin validez fiscal · pendiente de CAI o numeración autorizada. Los datos de
            autorización se registran al emitir el documento.
          </p>
        ) : null}

        <div className={styles.meta}>
          <section className={styles.panel}>
            <h5>Presentado a · Datos del cliente</h5>
            {cliente ? (
              <>
                <div className={styles.clientBlock}>
                  {cliente.foto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cliente.foto} alt="" width={36} height={36} className={styles.clientAvatar} />
                  ) : (
                    <span className={styles.clientAvatar} aria-hidden="true">{(cliente.nombre || "?").charAt(0).toUpperCase()}</span>
                  )}
                  <p><strong>{cliente.nombre || "No registrado"}</strong></p>
                </div>
                <p>RTN: {cliente.rtn || "No registrado"}</p>
                {cliente.telefono ? <p>Tel.: {cliente.telefono}</p> : null}
                {cliente.correo ? <p>Correo: {cliente.correo}</p> : null}
                <p>{cliente.direccion || "Dirección no registrada"}{cliente.ciudad ? ` · ${cliente.ciudad}` : ""}</p>
              </>
            ) : (
              <p className={styles.placeholder}>Sin cliente seleccionado todavía.</p>
            )}
          </section>
          <section className={styles.panel}>
            <h5>Referencia</h5>
            <p>Estado: {tieneRango ? "Listo para emitir" : "Pendiente de CAI"}</p>
            <p>Moneda: L · Nacional</p>
            <p>Tipo: Factura fiscal</p>
          </section>
        </div>

        <table className={styles.items}>
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cant.</th>
              <th>Precio</th>
              <th>Desc.</th>
              <th>ISV</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {calculadas.length ? calculadas.map((linea) => {
              const producto = productos.find((item) => item.id === linea.productoId);
              return (
                <tr key={linea.key}>
                <td data-label="Descripción">
                  {producto?.foto ? (
                    <div className={styles.lineWithFoto}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={producto.foto} alt="" width={28} height={28} className={styles.lineFoto} />
                      <span>{linea.descripcion || "—"}</span>
                    </div>
                  ) : (
                    <span>{linea.descripcion || "—"}</span>
                  )}
                </td>
                <td data-label="Cant." className={styles.num}>{Number(linea.cantidad) || 0}</td>
                <td data-label="Precio" className={styles.num}>{money(linea.precio)}</td>
                <td data-label="Desc." className={styles.num}>{Number(linea.descuento) ? money(linea.descuento) : "—"}</td>
                <td data-label="ISV" className={styles.num}>{Number(linea.impuestoPorcentaje) || 0}%</td>
                <td data-label="Subtotal" className={styles.num}>{money(linea.calculo.base)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={6} className={styles.placeholder}>
                  Aún no hay líneas. Añade productos o conceptos y la factura se completa aquí.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <table className={styles.totals} aria-label="Totales de la factura">
          <tbody>
            <tr><th scope="row">Importe antes de descuentos</th><td className={styles.num}>{money(subtotal + descuento)}</td></tr>
            <tr><th scope="row">Descuento</th><td className={styles.num}>− {money(descuento)}</td></tr>
            <tr><th scope="row">Subtotal neto</th><td className={styles.num}>{money(subtotal)}</td></tr>
            {[...gruposISV].map(([tasa, monto]) => (
              <tr key={tasa}><th scope="row">ISV {tasa}%</th><td className={styles.num}>{money(monto)}</td></tr>
            ))}
            <tr className={styles.grand}><th scope="row">TOTAL</th><td className={styles.num}>{money(total)}</td></tr>
          </tbody>
        </table>

        <section className={styles.authorization}>
          <h5>Autorización fiscal</h5>
          <p>CAI: {emisor.cai || "Pendiente de asignación"}</p>
          <p>Serie: {emisor.serie || "No registrada"}</p>
          <p>Rango autorizado: {emisor.rangoInicio && emisor.rangoFin ? `${emisor.rangoInicio} al ${emisor.rangoFin}` : "No registrado"}</p>
          <p>Fecha límite de emisión: {emisor.fechaLimite || "No registrada"}</p>
        </section>

        <p className={styles.footer}>
          Este es un documento previo generado en el navegador mientras completas la
          venta. No tiene validez fiscal hasta que se emita y se guarde en el sistema.
        </p>
      </div>
    </aside>
  );
}
