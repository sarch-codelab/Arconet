/**
 * Utilidades compartidas del listado de logs del panel (Fase 2).
 * Separadas de admin-experience.js para mantener el archivo principal
 * mas pequeno y poder testear la formateo de forma aislada.
 */

/**
 * Formatea una marca de tiempo para mostrarla en la tabla de logs.
 * @param {string|number|Date|null|undefined} value
 * @returns {string} Fecha/hora legible en es-HN o "—" si no hay valor.
 */
export function formatTimestamp(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("es-HN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}
