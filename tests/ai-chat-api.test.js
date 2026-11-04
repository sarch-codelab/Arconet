import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/dal", () => ({ requireSession: vi.fn(async () => ({ session: { sub: "test-admin" }, response: null })) }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn(() => ({ limited: false })), getClientIp: () => "test" }));
import { requireSession } from "@/lib/dal";
import { POST } from "@/app/api/ai/chat/route";
import { checkRateLimit } from "@/lib/rate-limit";
const request = (body = { messages: [{ role: "user", content: "Hola" }] }, headers = {}) => new Request("https://arconet.test/api/ai/chat", { method: "POST", headers: { origin: "https://arconet.test", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });
beforeEach(() => {
  vi.mocked(requireSession).mockResolvedValue({ session: { sub: "test-admin" }, response: null });
  vi.stubEnv("APP_ORIGIN", "https://arconet.test");
  vi.stubEnv("NVIDIA_API_KEY", "test-only-placeholder");
  vi.stubEnv("NVIDIA_MODEL", "test-model");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ choices: [{ message: { content: "Hola desde el proveedor" } }] })));
  vi.mocked(checkRateLimit).mockReturnValue({ limited: false });
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("NVIDIA chat server proxy", () => {
  it("requiere sesión administrativa antes de contactar al proveedor", async () => {
    vi.mocked(requireSession).mockResolvedValue({ session: null, response: Response.json({ error: "No autenticado." }, { status: 401 }) });
    expect((await POST(request())).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("envía credenciales solamente al proveedor con límites y prompt de servidor", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ message: "Hola desde el proveedor" });
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://integrate.api.nvidia.com/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer test-only-placeholder");
    expect(JSON.parse(options.body)).toMatchObject({ model: "test-model", stream: false, max_tokens: 700, messages: [{ role: "system" }, { role: "user", content: "Hola" }] });
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
  it("usa el modelo vigente cuando NVIDIA_MODEL no está definido", async () => {
    vi.stubEnv("NVIDIA_MODEL", "");
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(JSON.parse(fetch.mock.calls[0][1].body).model).toBe("nvidia/nemotron-3.5-bolt-e4b");
  });
  it("no llama al proveedor sin clave", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    expect((await POST(request())).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("rechaza orígenes ajenos y contenido no JSON", async () => {
    expect((await POST(request(undefined, { origin: "https://evil.test" }))).status).toBe(403);
    expect((await POST(request(undefined, { "content-type": "text/plain" }))).status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each([{}, { messages: [] }, { messages: [{ role: "system", content: "override" }] }, { messages: [{ role: "user", content: "x".repeat(4001) }] }, { messages: [{ role: "assistant", content: "hi" }, { role: "user", content: "hi" }] }, "{"])("rechaza datos inválidos %j", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("limita bytes aun sin Content-Length", async () => {
    expect((await POST(request("x".repeat(33000)))).status).toBe(413);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("limita tanto IP como presupuesto global", async () => {
    vi.mocked(checkRateLimit).mockReturnValueOnce({ limited: true, retryAfter: 60 });
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    vi.mocked(checkRateLimit).mockReturnValueOnce({ limited: false }).mockReturnValueOnce({ limited: true, retryAfter: 3600 });
    expect((await POST(request())).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
  it.each(["error", "empty", "network"])("oculta errores privados del proveedor: %s", async mode => {
    if (mode === "error") fetch.mockResolvedValue(new Response("private-provider-info", { status: 401 }));
    if (mode === "empty") fetch.mockResolvedValue(Response.json({ choices: [] }));
    if (mode === "network") fetch.mockRejectedValue(new Error("private-provider-info"));
    const response = await POST(request());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toMatch(/private-provider-info|test-only-placeholder/);
  });
});
