import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export const QR_TTL_SECONDS = 120;
export const QR_BROWSER_COOKIE = "arconet_qr_browser";
export const qrHash = value => createHash("sha256").update(value).digest("hex");
const secretValid = value => typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
export function qrError(message = "El QR caducó o ya no está disponible.", status = 410) {
  return Object.assign(new Error(message), { status });
}
export function matchesQrSecret(value, hash) {
  if (!secretValid(value) || typeof hash !== "string" || !/^[a-f0-9]{64}$/.test(hash)) return false;
  return timingSafeEqual(Buffer.from(qrHash(value), "hex"), Buffer.from(hash, "hex"));
}
export function qrOriginAllowed(request) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;
  try {
    const expected = new URL(process.env.APP_ORIGIN || request.url).origin;
    return origin === expected || (process.env.NODE_ENV !== "production" && origin === new URL(request.url).origin);
  } catch { return false; }
}
export function describeQrDevice(agent = "") {
  const os = /Windows/i.test(agent) ? "Windows" : /Android/i.test(agent) ? "Android" : /iPhone|iPad/i.test(agent) ? "iPhone / iPad" : /Mac/i.test(agent) ? "Mac" : /Linux/i.test(agent) ? "Linux" : "otro dispositivo";
  const browser = /Edg\//.test(agent) ? "Edge" : /Firefox\//.test(agent) ? "Firefox" : /Chrome\//.test(agent) ? "Chrome / Brave" : /Safari\//.test(agent) ? "Safari" : "Navegador";
  return `${browser} · ${os}`;
}
export async function issueQr(db, agent) {
  const token = randomBytes(32).toString("base64url");
  const browserSecret = randomBytes(32).toString("base64url");
  const record = {
    id: randomUUID(), tokenHash: qrHash(token), browserHash: qrHash(browserSecret),
    codigo: String(randomInt(100000, 1000000)), dispositivo: describeQrDevice(agent),
    expiresAt: new Date(Date.now() + QR_TTL_SECONDS * 1000),
  };
  await db.accesoQr.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
  await db.accesoQr.create({ data: record });
  return { ...record, token, browserSecret };
}
export async function readQr(db, id, secret, browser = false) {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw qrError();
  const record = await db.accesoQr.findUnique({ where: { id } });
  if (!record || record.expiresAt <= new Date() || !matchesQrSecret(secret, browser ? record.browserHash : record.tokenHash)) throw qrError();
  return record;
}
export async function decideQr(db, record, session, approve, twoFactorVerified = false) {
  if (!session?.sessionId || !session?.sub || session.tipo === "cliente") throw qrError("Necesitas una sesión administrativa activa en el teléfono.", 401);
  const updated = await db.accesoQr.updateMany({
    where: { id: record.id, tokenHash: record.tokenHash, estado: "pending", expiresAt: { gt: new Date() } },
    data: { estado: approve ? "approved" : "rejected", usuarioId: session.sub, sourceSessionId: session.sessionId, twoFactorVerified },
  });
  if (updated.count !== 1) throw qrError();
}
// El intercambio solo lo puede ejecutar el navegador que creó el QR. El CAS
// transaccional permite una única emisión incluso con peticiones simultáneas.
export async function redeemQr(db, id, browserSecret) {
  return db.$transaction(async tx => {
    const record = await readQr(tx, id, browserSecret, true);
    if (record.estado === "pending" || record.estado === "rejected") return { status: record.estado };
    if (record.estado !== "approved") throw qrError();
    const source = await tx.sesionUsuario.findFirst({ where: {
      sessionId: record.sourceSessionId, usuarioId: record.usuarioId,
      revokedAt: null, expiresAt: { gt: new Date() }, usuario: { activo: true },
    }, select: { id: true } });
    const user = await tx.usuario.findUnique({ where: { id: record.usuarioId } });
    if (!source || !user?.activo || (user.twoFactorEnabled && !record.twoFactorVerified)) throw qrError("La sesión del teléfono ya no es válida. Genera otro QR.", 401);
    const changed = await tx.accesoQr.updateMany({ where: { id, estado: "approved", expiresAt: { gt: new Date() } }, data: { estado: "consumed" } });
    if (changed.count !== 1) throw qrError();
    return { status: "approved", user };
  });
}
