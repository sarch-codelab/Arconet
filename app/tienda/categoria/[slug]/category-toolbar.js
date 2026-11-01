"use client";

import { LayoutGrid, List, Rows3 } from "lucide-react";
import styles from "./category-toolbar.module.css";

const VISTAS = [
  { id: "grande", label: "Vista grande", Icon: LayoutGrid },
  { id: "compacta", label: "Vista compacta", Icon: Rows3 },
  { id: "lista", label: "Vista lista", Icon: List },
];

/**
 * Barra de la cuadrícula de productos: cuántos se ven, cómo se ordenan y en
 * qué tamaño se muestran. En escritorio los filtros viven en el panel
 * izquierdo; aquí solo queda el orden como acceso rápido.
 */
export default function CategoryToolbar({ total, resultado, orden, onOrden, opcionesOrden, vista, onVista }) {
  return (
    <div className={styles.barra}>
      <div className={styles.conteo}>
        <strong>{resultado}</strong>
        <span>
          {resultado === total ? "productos" : `de ${total} productos`}
        </span>
      </div>

      <div className={styles.acciones}>
        <label className={styles.ordenCampo}>
          <span className={styles.ordenEtiqueta}>Ordenar</span>
          <select
            className={styles.ordenSelect}
            value={orden}
            onChange={(event) => onOrden(event.target.value)}
            aria-label="Ordenar productos"
          >
            {opcionesOrden.map((opcion) => (
              <option key={opcion.id} value={opcion.id}>{opcion.label}</option>
            ))}
          </select>
        </label>

        <div className={styles.vistas} role="group" aria-label="Cambiar tamaño de las tarjetas">
          {VISTAS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={`${styles.vistaBoton} ${vista === id ? styles.vistaActivo : ""}`}
              onClick={() => onVista(id)}
              aria-pressed={vista === id}
              aria-label={label}
              title={label}
            >
              <Icon size={17} aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export { VISTAS };
