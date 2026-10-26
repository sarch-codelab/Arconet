"use client";

import { useEffect } from "react";

/**
 * Última línea de defensa: si el propio layout raíz falla, React solo puede
 * montar este componente. Debe ser autocontenido (sin CSS Modules ni fonts).
 */
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("[arconet] error global:", error);
  }, [error]);

  return (
    <html lang="es-HN">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "24px" }}>
        <h1>No pudimos cargar Arconet</h1>
        <p>Refresca la página o inténtalo de nuevo en unos minutos.</p>
        <button type="button" onClick={() => reset()}>
          Reintentar
        </button>
      </body>
    </html>
  );
}
