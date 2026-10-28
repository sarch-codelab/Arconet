import { prisma } from '@/lib/prisma';
import { requireSession } from '@/lib/dal';
import { verifyPassword } from '@/lib/auth';
import { writeLog } from '@/lib/logs';
import { decryptTotpSecret, encryptTotpSecret, generateTotpSecret, verifyTotp } from '@/lib/totp';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: "Solicitud inválida." }, { status: 400 }); }
  const action = body?.action;
  try {
    const account = await prisma.usuario.findUnique({ where: { id: guard.session.sub } });
    if (!account || !account.activo) return Response.json({ error: "La cuenta no está activa." }, { status: 404 });
    if (action === "setup") {
      if (account.twoFactorEnabled) return Response.json({ error: "La verificación en dos pasos ya está activa." }, { status: 409 });
      const secret = generateTotpSecret();
      await prisma.usuario.update({ where: { id: account.id }, data: { twoFactorSecret: encryptTotpSecret(secret) } });
      const label = encodeURIComponent(`Arconet:${account.correo}`);
      const uri = `otpauth://totp/${label}?secret=${secret}&issuer=Arconet&algorithm=SHA1&digits=6&period=30`;
      return Response.json({ secret, uri });
    }
    if (action === "enable") {
      if (!account.twoFactorSecret || account.twoFactorEnabled) return Response.json({ error: "Inicia una configuración nueva de autenticación en dos pasos." }, { status: 409 });
      if (!verifyTotp(decryptTotpSecret(account.twoFactorSecret), body?.codigo)) return Response.json({ error: "El código no es válido o ya venció." }, { status: 400 });
      await prisma.usuario.update({ where: { id: account.id }, data: { twoFactorEnabled: true } });
      await writeLog("auth", "Activó autenticación en dos pasos", { actor: account.correo, ruta: "/api/perfil/2fa" });
      return Response.json({ ok: true, enabled: true });
    }
    if (action === "disable") {
      if (!account.twoFactorEnabled || !account.twoFactorSecret) return Response.json({ error: "La verificación en dos pasos no está activa." }, { status: 409 });
      if (!verifyPassword(typeof body?.password === "string" ? body.password : "", account.passwordHash)) return Response.json({ error: "La contraseña no es correcta." }, { status: 401 });
      if (!verifyTotp(decryptTotpSecret(account.twoFactorSecret), body?.codigo)) return Response.json({ error: "El código no es válido o ya venció." }, { status: 400 });
      await prisma.usuario.update({ where: { id: account.id }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
      await writeLog("auth", "Desactivó autenticación en dos pasos", { actor: account.correo, ruta: "/api/perfil/2fa" });
      return Response.json({ ok: true, enabled: false });
    }
    return Response.json({ error: "La acción indicada no es válida." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/perfil/2fa", error?.message);
    return Response.json({ error: "No se pudo actualizar la autenticación en dos pasos." }, { status: 503 });
  }
}
