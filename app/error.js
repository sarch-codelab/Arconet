"use client";

import { useEffect } from "react";

/**
 * Manejador de errores de cualquier ruta (client-side). Muestra un mensaje
 * simple en español y permite reintentar sin recargar todo el sitio.
 */
export default function ErrorBoundary({ error, reset }) {
  useEffect(() => {
    // Registrar en consola ayuda a deployar incidentes desde la sesión viva.
    console.error("[arconet] error en la vista:", error);
  }, [error]);

  return (
    <main
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>Algo salió mal</h1>
      <p style={{ maxWidth: "32rem", margin: 0, opacity: 0.8 }}>
        No pudimos cargar esta parte del sitio. Puede ser un problema temporal
        de conexión o del servidor.
      </p>
      <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            background: "#1544b5",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
        <a
          href="/"
          style={{
            padding: "10px 18px",
            borderRadius: "8px",
            border: "1px solid #1544b5",
            color: "#1544b5",
            textDecoration: "none",
          }}
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
