import { cookies } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { createSession, getSession } from "@/lib/session";
import { sessionCookieOptions } from "@/lib/session-cookie";
import { isLocalPreviewAuthEnabled } from "@/lib/local-preview-auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { decryptTotpSecret, verifyTotp } from "@/lib/totp";
import { writeLog } from "@/lib/logs";
import { decideQr, issueQr, readQr, redeemQr, qrOriginAllowed, qrError, QR_BROWSER_COOKIE, QR_TTL_SECONDS } from "@/lib/qr-login";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (body, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
export async function POST(request) {
  if (!qrOriginAllowed(request)) return reply({ error: "Origen no permitido." }, 403);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Se requiere JSON." }, 415);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "JSON inválido." }, 400); }
  const action = body?.action;
  if (!["create", "poll", "inspect", "approve", "reject", "cancel"].includes(action)) return reply({ error: "Acción inválida." }, 400);
  const rate = checkRateLimit(`qr:${action}:${getClientIp(request)}`, action === "poll" ? { max: 80, windowMs: 60000 } : action === "create" ? { max: 10, windowMs: 900000 } : { max: 20, windowMs: 300000 });
  if (rate.limited) return reply({ error: "Demasiados intentos. Espera antes de volver a intentar." }, 429);
  try {
    const jar = await cookies();
    if (action === "create") {
      const record = await issueQr(prisma, request.headers.get("user-agent") || "");
      const url = new URL("/admin/acceso-qr", request.headers.get("origin"));
      url.hash = `${record.id}.${record.token}`;
      const image = await QRCode.toDataURL(url.href, { width: 336, margin: 4, errorCorrectionLevel: "M", color: { dark: "#0b1730", light: "#ffffff" } });
      jar.set(QR_BROWSER_COOKIE, record.browserSecret, sessionCookieOptions(QR_TTL_SECONDS));
      return reply({ id: record.id, codigo: record.codigo, image, expiresAt: record.expiresAt });
    }
    if (action === "cancel") {
      const record = await readQr(prisma, body.id, jar.get(QR_BROWSER_COOKIE)?.value, true);
      await prisma.accesoQr.updateMany({ where: { id: record.id, estado: { in: ["pending", "approved"] } }, data: { estado: "rejected" } });
      jar.set(QR_BROWSER_COOKIE, "", sessionCookieOptions(0));
      return reply({ status: "rejected" });
    }
    if (action === "poll") {
      const result = await redeemQr(prisma, body.id, jar.get(QR_BROWSER_COOKIE)?.value);
      if (result.status !== "approved") return reply({ status: result.status });
      const u = result.user;
      const token = await createSession({ id: u.id, nombre: u.nombre, correo: u.correo, rol: u.rol, sucursal: u.sucursalId || "" }, { userAgent: request.headers.get("user-agent") });
      jar.set(QR_BROWSER_COOKIE, "", sessionCookieOptions(0));
      await writeLog("auth", "Inicio de sesión mediante QR aprobado desde otro dispositivo", { actor: u.correo, ruta: "/api/auth/qr" });
      return reply({ status: "approved", ...(isLocalPreviewAuthEnabled() ? { localPreviewToken: token } : {}) });
    }
    const session = await getSession();
    if (!session?.sessionId) throw qrError("Abre tu sesión administrativa en este teléfono y vuelve a escanear el QR.", 401);
    const record = await readQr(prisma, body.id, body.token);
    if (record.estado !== "pending") throw qrError();
    const user = await prisma.usuario.findUnique({ where: { id: session.sub } });
    if (!user?.activo) throw qrError("La cuenta ya no está activa.", 401);
    if (action === "inspect") return reply({ codigo: record.codigo, dispositivo: record.dispositivo, expiresAt: record.expiresAt, nombre: user.nombre, twoFactorRequired: user.twoFactorEnabled });
    if (action === "approve" && user.twoFactorEnabled && (!user.twoFactorSecret || !verifyTotp(decryptTotpSecret(user.twoFactorSecret), typeof body.codigo === "string" ? body.codigo : ""))) {
      return reply({ error: "Ingresa un código válido de tu aplicación de autenticación.", twoFactorRequired: true }, 400);
    }
    await decideQr(prisma, record, session, action === "approve", action === "approve" && user.twoFactorEnabled);
    return reply({ status: action === "approve" ? "approved" : "rejected" });
  } catch (error) {
    if (error.status) return reply({ error: error.message }, error.status);
    console.error("Acceso QR no disponible", error?.code || "internal");
    return reply({ error: "No se pudo completar el acceso QR. Intenta de nuevo o usa tu contraseña." }, 503);
  }
}
