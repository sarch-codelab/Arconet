import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { decideQr, describeQrDevice, issueQr, matchesQrSecret, qrHash, qrOriginAllowed, readQr, redeemQr, QR_TTL_SECONDS } from "../lib/qr-login";
const token = "a".repeat(43), browser = "b".repeat(43);
const id = "e36cf235-82b4-4b6c-a5a5-089d67975658";
function fixture(overrides = {}, { active = true, source = true, twoFactorEnabled = false } = {}) {
  let record = { id, tokenHash: qrHash(token), browserHash: qrHash(browser), estado: "approved", expiresAt: new Date(Date.now() + 120000), usuarioId: "user", sourceSessionId: "phone", ...overrides };
  const user = { id: "user", activo: active, twoFactorEnabled, rol: "ventas" };
  const db = {
    accesoQr: {
      findUnique: vi.fn(async () => record ? { ...record } : null),
      create: vi.fn(async ({ data }) => { record = { ...data, estado: "pending" }; return record; }),
      deleteMany: vi.fn(async () => ({ count: 0 })),
      updateMany: vi.fn(async ({ where, data }) => {
        if (record?.estado !== where.estado || record.expiresAt <= new Date()) return { count: 0 };
        Object.assign(record, data); return { count: 1 };
      }),
    },
    usuario: { findUnique: vi.fn(async () => user) },
    sesionUsuario: { findFirst: vi.fn(async () => source ? { id: "phone-record" } : null) },
    $transaction: fn => fn(db),
  };
  return { db, get: () => record };
}
afterEach(() => vi.unstubAllEnvs());

describe("desafíos QR", () => {
  it("genera secretos distintos, persiste solo huellas y caduca en 120 segundos", async () => {
    const { db } = fixture(); const start = Date.now(); const r = await issueQr(db, "Mozilla Windows Chrome/140");
    expect(r.token).not.toBe(r.browserSecret);
    expect(matchesQrSecret(r.token, r.tokenHash)).toBe(true);
    expect(matchesQrSecret(r.browserSecret, r.browserHash)).toBe(true);
    const saved = db.accesoQr.create.mock.calls[0][0].data;
    expect(saved).not.toHaveProperty("token"); expect(saved).not.toHaveProperty("browserSecret");
    expect(r.codigo).toMatch(/^\d{6}$/);
    expect(r.expiresAt.getTime() - start).toBeGreaterThanOrEqual(QR_TTL_SECONDS * 1000);
    expect(r.expiresAt.getTime() - start).toBeLessThan(121000);
    expect(db.accesoQr.deleteMany).toHaveBeenCalledOnce();
  });
  it.each([null, "", "x", "a".repeat(42), "a".repeat(44), "!".repeat(43)])("rechaza secretos inválidos: %s", value => {
    expect(matchesQrSecret(value, qrHash(token))).toBe(false);
  });
  it("no intercambia el secreto público del QR por el secreto HttpOnly del navegador", async () => {
    const { db } = fixture();
    await expect(readQr(db, id, token)).resolves.toHaveProperty("id", id);
    await expect(readQr(db, id, token, true)).rejects.toHaveProperty("status", 410);
    await expect(readQr(db, id, browser)).rejects.toHaveProperty("status", 410);
    await expect(readQr(db, "invalid", token)).rejects.toHaveProperty("status", 410);
  });
  it("rechaza un QR vencido incluso con todos los secretos correctos", async () => {
    const { db } = fixture({ expiresAt: new Date(Date.now() - 1) });
    await expect(readQr(db, id, token)).rejects.toHaveProperty("status", 410);
    await expect(redeemQr(db, id, browser)).rejects.toHaveProperty("status", 410);
  });
  it.each([null, {}, { sub: "user" }, { sub: "user", sessionId: "phone", tipo: "cliente" }])("solo una sesión administrativa revocable puede aprobar", async session => {
    const { db, get } = fixture({ estado: "pending" });
    await expect(decideQr(db, get(), session, true)).rejects.toHaveProperty("status", 401);
    expect(db.accesoQr.updateMany).not.toHaveBeenCalled();
  });
  it("registrar aprobación no crea sesión y no permite cambiar una decisión", async () => {
    const { db, get } = fixture({ estado: "pending" });
    await decideQr(db, get(), { sub: "user", sessionId: "phone" }, true, true);
    expect(get()).toMatchObject({ estado: "approved", sourceSessionId: "phone", twoFactorVerified: true });
    await expect(decideQr(db, get(), { sub: "user", sessionId: "phone" }, false)).rejects.toHaveProperty("status", 410);
  });
  it.each(["pending", "rejected"])("no autoriza si el estado es %s", async estado => {
    const { db } = fixture({ estado });
    expect(await redeemQr(db, id, browser)).toEqual({ status: estado });
    expect(db.usuario.findUnique).not.toHaveBeenCalled();
  });
  it.each([{ source: false }, { active: false }, { twoFactorEnabled: true }])("revalida sesión, cuenta y segundo factor al canjear: %j", async options => {
    const { db } = fixture({}, options);
    await expect(redeemQr(db, id, browser)).rejects.toHaveProperty("status", 401);
    expect(db.accesoQr.updateMany).not.toHaveBeenCalled();
  });
  it("solo permite un canje, aun con dos solicitudes concurrentes", async () => {
    const { db } = fixture();
    const results = await Promise.allSettled([redeemQr(db, id, browser), redeemQr(db, id, browser)]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
    await expect(redeemQr(db, id, browser)).rejects.toHaveProperty("status", 410);
    expect(db.sesionUsuario.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ revokedAt: null, usuario: { activo: true } }) }));
  });
  it("admite 2FA solo después de verificarla al aprobar", async () => {
    const { db } = fixture({ twoFactorVerified: true }, { twoFactorEnabled: true });
    expect((await redeemQr(db, id, browser)).status).toBe("approved");
  });
});

describe("protección de origen y presentación del acceso QR", () => {
  const request = (origin, site) => new Request("https://arconethn.com/api/auth/qr", { headers: { ...(origin ? { origin } : {}), ...(site ? { "sec-fetch-site": site } : {}) } });
  it("rechaza CSRF, origen ausente y otros dominios en producción", () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("APP_ORIGIN", "https://arconethn.com");
    expect(qrOriginAllowed(request("https://arconethn.com"))).toBe(true);
    expect(qrOriginAllowed(request("https://otro.test"))).toBe(false);
    expect(qrOriginAllowed(request())).toBe(false);
    expect(qrOriginAllowed(request("https://arconethn.com", "cross-site"))).toBe(false);
  });
  it("presenta un dispositivo legible sin mostrar el user-agent arbitrario", () => {
    expect(describeQrDevice("Windows Chrome/140 Edg/140")).toBe("Edge · Windows");
    expect(describeQrDevice("iPhone Safari/605")).toBe("Safari · iPhone / iPad");
    expect(describeQrDevice("<script>malicioso</script>")).toBe("Navegador · otro dispositivo");
  });
  it("conserva el disparador QR y sustituye las credenciales dentro de la tarjeta", () => {
    const s = readFileSync("app/admin/login-view.js", "utf8");
    expect(s.indexOf("<QrLogin onOpenChange=")).toBeGreaterThan(s.indexOf("</form>"));
    expect(s.indexOf("<QrLogin onOpenChange=")).toBeLessThan(s.indexOf("styles.loginFooter"));
    expect(s).toContain("authenticate(email, password, verificationCode)");
    expect(s).toContain("onOpenChange={changeQrMode}");
    expect(s).toContain("inert={qrOpen ? true : undefined}");
  });
  it("genera el QR localmente, no devuelve secretos ni sesiones de producción en JSON", () => {
    const route = readFileSync("app/api/auth/qr/route.js", "utf8");
    expect(route).toContain("url.hash ="); expect(route).toContain("QRCode.toDataURL");
    expect(route).not.toContain("url.searchParams");
    expect(route).toContain('isLocalPreviewAuthEnabled() ? { localPreviewToken: token } : {}');
    expect(route).toContain("verifyTotp(decryptTotpSecret");
    expect(route).toContain("sessionCookieOptions(QR_TTL_SECONDS)");
  });
});
