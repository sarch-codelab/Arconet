export const PREVIEW_SESSION_HEADER = "X-Arconet-Preview-Session";

// La cuenta corta es solo un alias de la demostración, nunca una puerta
// trasera: el login sigue verificando el hash y creando una sesión en la DB.
export function isLocalPreview() {
  return process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_LOCAL_PREVIEW === "1";
}

export function normalizeAdminLogin(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
  return isLocalPreview() && email === "admin" ? "admin@arconet.local" : email;
}
