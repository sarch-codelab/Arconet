"use client";

import { useId, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import styles from "./category-filters.module.css";

const ORDEN_OPCIONES = [
  { id: "relevancia", label: "Relevancia" },
  { id: "precio-asc", label: "Precio: menor a mayor" },
  { id: "precio-desc", label: "Precio: mayor a menor" },
  { id: "nombre", label: "Nombre (A–Z)" },
];

function MonedaInput({ id, label, value, onChange, min, max, placeholder }) {
  return (
    <label className={styles.monedaCampo} htmlFor={id}>
      <span className={styles.monedaEtiqueta}>{label}</span>
      <span className={styles.monedaCaja}>
        <span className={styles.monedaSimbolo} aria-hidden="true">L</span>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step="100"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={styles.monedaInput}
        />
      </span>
    </label>
  );
}

export default function CategoryFilters({
  busqueda,
  onBusqueda,
  precio,
  onPrecio,
  rangoPrecios,
  marcas,
  marcasActivas,
  onToggleMarca,
  disponibilidad,
  onDisponibilidad,
  orden,
  onOrden,
  resultado,
  total,
  onLimpiar,
}) {
  const baseId = useId();
  const [abierto, setAbierto] = useState({});

  const alternar = (seccion) =>
    setAbierto((actual) => ({ ...actual, [seccion]: !actual[seccion] }));

  const hayFiltro =
    Boolean(busqueda) ||
    precio.min ||
    precio.max ||
    marcasActivas.length > 0 ||
    disponibilidad !== "todas" ||
    orden !== "relevancia";

  // El rango real de la línea sirve de pista: el usuario sabe entre qué
  // valores se mueve antes de escribir nada.
  const pistaRango =
    rangoPrecios && rangoPrecios.max > 0
      ? `De L ${rangoPrecios.min.toLocaleString("es-HN")} a L ${rangoPrecios.max.toLocaleString("es-HN")}`
      : "Escribe tu rango aproximado";

  return (
    <aside className={styles.panel} aria-label="Filtros de productos">
      <div className={styles.panelTop}>
        <p className={styles.titulo}>
          Filtros
          {hayFiltro ? <span className={styles.puntoActivo} aria-hidden="true" /> : null}
        </p>
        <button type="button" className={styles.limpiar} onClick={onLimpiar} disabled={!hayFiltro}>
          Limpiar
        </button>
      </div>

      <p className={styles.resultado} role="status" aria-live="polite">
        {resultado} de {total} producto{total === 1 ? "" : "s"}
      </p>

      <div className={styles.buscador}>
        <Search size={16} aria-hidden="true" className={styles.buscadorIcono} />
        <input
          id={`${baseId}-q`}
          type="search"
          value={busqueda}
          onChange={(event) => onBusqueda(event.target.value)}
          placeholder="Buscar por nombre o SKU"
          aria-label="Buscar productos en esta línea"
          className={styles.buscadorInput}
        />
        {busqueda ? (
          <button
            type="button"
            className={styles.buscadorLimpiar}
            onClick={() => onBusqueda("")}
            aria-label="Borrar búsqueda"
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <section className={styles.seccion} aria-labelledby={`${baseId}-precio`}>
        <button
          type="button"
          className={styles.seccionTitulo}
          onClick={() => alternar("precio")}
          aria-expanded={abierto.precio !== false}
          aria-controls={`${baseId}-precio`}
        >
          <span id={`${baseId}-precio`}>Rango de precio</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={abierto.precio === false ? styles.chevronCerrado : styles.chevron}
          />
        </button>
        {abierto.precio !== false ? (
          <div className={styles.seccionCuerpo}>
            <div className={styles.monedaFila}>
              <MonedaInput
                id={`${baseId}-min`}
                label="Desde"
                value={precio.min}
                onChange={(valor) => onPrecio({ ...precio, min: valor })}
                min={0}
                max={precio.max || undefined}
                placeholder="0"
              />
              <span className={styles.guion} aria-hidden="true">—</span>
              <MonedaInput
                id={`${baseId}-max`}
                label="Hasta"
                value={precio.max}
                onChange={(valor) => onPrecio({ ...precio, max: valor })}
                min={precio.min || 0}
                placeholder="Sin límite"
              />
            </div>
            <p className={styles.pista}>{pistaRango}</p>
          </div>
        ) : null}
      </section>

      {marcas.length > 1 ? (
        <section className={styles.seccion} aria-labelledby={`${baseId}-marcas`}>
          <button
            type="button"
            className={styles.seccionTitulo}
            onClick={() => alternar("marcas")}
            aria-expanded={abierto.marcas !== false}
            aria-controls={`${baseId}-marcas`}
          >
            <span id={`${baseId}-marcas`}>Marca</span>
            <ChevronDown
              size={16}
              aria-hidden="true"
              className={abierto.marcas === false ? styles.chevronCerrado : styles.chevron}
            />
          </button>
          {abierto.marcas !== false ? (
            <ul className={styles.listaCasillas}>
              {marcas.map((marca) => (
                <li key={marca.nombre}>
                  <label className={styles.casilla}>
                    <input
                      type="checkbox"
                      checked={marcasActivas.includes(marca.nombre)}
                      onChange={() => onToggleMarca(marca.nombre)}
                    />
                    <span>{marca.nombre}</span>
                    <small aria-hidden="true">{marca.cantidad}</small>
                  </label>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      <section className={styles.seccion} aria-labelledby={`${baseId}-disp`}>
        <button
          type="button"
          className={styles.seccionTitulo}
          onClick={() => alternar("disp")}
          aria-expanded={abierto.disp !== false}
          aria-controls={`${baseId}-disp`}
        >
          <span id={`${baseId}-disp`}>Disponibilidad</span>
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={abierto.disp === false ? styles.chevronCerrado : styles.chevron}
          />
        </button>
        {abierto.disp !== false ? (
          <div className={styles.grupoBotones} role="group" aria-label="Filtrar por disponibilidad">
            {[
              { id: "todas", label: "Todas" },
              { id: "disponible", label: "En existencia" },
              { id: "agotado", label: "Agotadas" },
            ].map((opcion) => (
              <button
                key={opcion.id}
                type="button"
                className={`${styles.chip} ${disponibilidad === opcion.id ? styles.chipActivo : ""}`}
                onClick={() => onDisponibilidad(opcion.id)}
                aria-pressed={disponibilidad === opcion.id}
              >
                {opcion.label}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className={styles.seccion} aria-labelledby={`${baseId}-orden`}>
        <p id={`${baseId}-orden`} className={styles.seccionEtiqueta}>Ordenar por</p>
        <div className={styles.orden} role="group" aria-label="Ordenar productos">
          {ORDEN_OPCIONES.map((opcion) => (
            <button
              key={opcion.id}
              type="button"
              className={`${styles.ordenOpcion} ${orden === opcion.id ? styles.ordenActivo : ""}`}
              onClick={() => onOrden(opcion.id)}
              aria-pressed={orden === opcion.id}
            >
              {opcion.label}
            </button>
          ))}
        </div>
      </section>
    </aside>
  );
}

export { ORDEN_OPCIONES };
