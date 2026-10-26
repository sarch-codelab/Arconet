// Se ejecuta una vez al arrancar el servidor (Next.js instrumentation hook).
// Valida la configuración crítica antes de atender la primera petición: en
// producción, un SESSION_SECRET de ejemplo impide el arranque en vez de dejar
// sesiones de admin forjables.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validarSecretoDeSesion } = await import("./lib/session");
    validarSecretoDeSesion();
  }
}
