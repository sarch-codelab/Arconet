// Política de contraseñas para cuentas de trabajadores y clientes.
// Reglas: 12–128 caracteres, sin ser trivial (secuencias, palabra clave de la
// marca, un solo carácter repetido) y con variedad razonable.

const COMUNES = new Set([
  "password", "contrasena", "contraseña", "123456", "12345678", "qwerty",
  "arconet", "admin", "admin123", "telecom", "fibra", "honduras", "cliente",
]);

function variedad(password) {
  let clases = 0;
  if (/[a-z]/.test(password)) clases += 1;
  if (/[A-Z]/.test(password)) clases += 1;
  if (/[0-9]/.test(password)) clases += 1;
  if (/[^a-zA-Z0-9]/.test(password)) clases += 1;
  return clases;
}

function esSecuencia(password) {
  const lower = password.toLowerCase();
  let ascendente = true;
  let descendente = true;
  for (let i = 1; i < lower.length; i += 1) {
    const delta = lower.charCodeAt(i) - lower.charCodeAt(i - 1);
    if (delta !== 1) ascendente = false;
    if (delta !== -1) descendente = false;
  }
  return ascendente || descendente;
}

/** Devuelve { ok, error } — error apto para mostrarse al usuario. */
export function validarPassword(password, { contexto = "" } = {}) {
  if (typeof password !== "string" || password.length < 12) {
    return { ok: false, error: "La contraseña debe tener al menos 12 caracteres." };
  }
  if (password.length > 128) {
    return { ok: false, error: "La contraseña no puede exceder 128 caracteres." };
  }
  if (COMUNES.has(password.toLowerCase()) || COMUNES.has(contexto.toLowerCase())) {
    return { ok: false, error: "La contraseña es demasiado común. Elige otra." };
  }
  if (esSecuencia(password)) {
    return { ok: false, error: "La contraseña no puede ser una secuencia (abc, 123…)." };
  }
  if (/^(.)\1+$/.test(password)) {
    return { ok: false, error: "La contraseña no puede ser un solo carácter repetido." };
  }
  if (variedad(password) < 2) {
    return { ok: false, error: "Combina mayúsculas, números o símbolos." };
  }
  return { ok: true };
}

/** 0–4: fuerza simple para la barra de registro/login. */
export function fuerzaPassword(password) {
  if (typeof password !== "string" || !password) return 0;
  let score = 0;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (variedad(password) >= 3) score += 1;
  if (variedad(password) >= 4 && password.length >= 14) score += 1;
  return Math.min(4, score);
}
