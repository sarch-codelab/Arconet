"use client";

import { Component } from "react";
import styles from "./admin-experience.module.css";

/**
 * Limita de errores por seccion del panel administrativo.
 *
 * Sin esto, cualquier excepcion al renderizar una seccion (por ejemplo un
 * dato inesperado que llega de la API) choca contra el error.js global y
 * muestra "Algo salio mal" en TODA la pagina, bloqueando el trabajo incluso
 * en secciones que funcionan bien. Con este envoltorio solo falla la tarjeta
 * afectada y se puede reintentar sin perder el resto del panel.
 */
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Registrar en consola facilita diagnosticar incidentes desde la sesion viva.
    console.error("[arconet][panel] error en seccion:", error, info?.componentStack || "");
  }

  reset() {
    // La clave fuerza un remontaje del hijo al reintentar, para que vuelvan a
    // ejecutarse los efectos de carga de la seccion.
    this.setState({ error: null, attempt: (this.state.attempt || 0) + 1 });
  }

  render() {
    const { error } = this.state;
    if (!error) {
      return <div key={this.state.attempt || 0}>{this.props.children}</div>;
    }

    return (
      <div className={styles.body}>
        <section className={styles.card} aria-label="Error en la seccion">
          <div className={styles.cardBody}>
            <div className={styles.alertItem}>
              <span className={styles.alertBadge}>Error</span>
              <span>
                No se pudo mostrar «{this.props.label || "esta sección"}». El
                resto del panel sigue funcionando con normalidad.
              </span>
            </div>
            <p className={styles.monitorHint} style={{ marginTop: 12 }}>
              {String(error?.message || error)}
            </p>
            <button
              type="button"
              className={styles.ghostBtn}
              onClick={this.reset}
            >
              Reintentar
            </button>
          </div>
        </section>
      </div>
    );
  }
}
