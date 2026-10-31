// Un input date guarda un día de calendario, no el día UTC del instante.
export function localCalendarDate(value = new Date()) {
  return [value.getFullYear(), String(value.getMonth() + 1).padStart(2, "0"), String(value.getDate()).padStart(2, "0")].join("-");
}

// Mantener los días guardados sin el corrimiento UTC→hora local. Las fechas
// fiscales con hora sí son instantes y se muestran en la zona del usuario.
export function formatCalendarOrInstant(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const calendarOnly = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
  return date.toLocaleDateString("es-HN", {
    year: "numeric", month: "short", day: "numeric",
    ...(calendarOnly ? { timeZone: "UTC" } : {}),
  });
}
