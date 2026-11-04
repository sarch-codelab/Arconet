import { requireSession } from "@/lib/dal";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
const reply = (body, status = 200, headers = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", ...headers },
});
const system = "Te llamas Monica IA y eres la asistente de Arconet. Responde en español de forma breve y útil sobre redes, fibra óptica y servicios tecnológicos. No inventes precios, inventario, políticas, contactos ni datos de la empresa. Si no tienes datos confirmados, indícalo y recomienda consultar el catálogo o la sección Contacto del sitio. No solicites contraseñas, claves API ni datos sensibles. No puedes acceder a cuentas, pedidos ni ejecutar acciones.";

export async function POST(request) {
  const guard = await requireSession();
  if (guard.response) return guard.response;
  const origin = request.headers.get("origin");
  // Comparar orígenes, no la variable literal: una barra final o :443 son
  // configuraciones equivalentes. No confiar en Host/X-Forwarded-Host enviados.
  let expected;
  try {
    const configured = process.env.APP_ORIGIN?.trim();
    if (!configured && process.env.NODE_ENV === "production") throw new Error("Missing origin");
    const url = new URL(configured || request.url);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid origin");
    expected = url.origin;
  } catch {
    return reply({ code: "ai_origin_configuration", error: "El origen del asistente no está configurado correctamente. Revisa APP_ORIGIN en el servidor." }, 503);
  }
  if (!origin || origin !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    return reply({ code: "ai_origin_forbidden", error: "Origen no permitido para el asistente. Abre el dominio oficial; si ya estás en él, revisa APP_ORIGIN en el servidor." }, 403);
  }
  if (!request.headers.get("content-type")?.startsWith("application/json")) return reply({ error: "Se requiere JSON." }, 415);
  const rate = checkRateLimit(`ai:ip:${getClientIp(request)}`, { max: 10, windowMs: 60_000 });
  if (rate.limited) return reply({ error: "Demasiados mensajes. Espera un minuto." }, 429, { "Retry-After": String(rate.retryAfter) });
  if (!process.env.NVIDIA_API_KEY) return reply({ error: "El asistente todavía no está configurado." }, 503);
  let body;
  try {
    // Límite real también para solicitudes sin Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return reply({ error: "Falta el mensaje." }, 400);
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 32_768) { await reader.cancel(); return reply({ error: "Conversación demasiado larga." }, 413); }
      chunks.push(Buffer.from(value));
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch { return reply({ error: "JSON inválido." }, 400); }
  const messages = body?.messages;
  if (!Array.isArray(messages) || !messages.length || messages.length > 12 || messages.at(-1)?.role !== "user" ||
    messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? "user" : "assistant") || typeof m.content !== "string" || !m.content.trim() || m.content.length > 4000) ||
    messages.reduce((n, m) => n + m.content.length, 0) > 16_000) {
    return reply({ error: "Conversación inválida o demasiado larga." }, 400);
  }
  // Tope global de gasto por instancia, además del límite por IP.
  const budget = checkRateLimit("ai:budget", { max: 100, windowMs: 3_600_000 });
  if (budget.limited) return reply({ error: "El asistente alcanzó su límite temporal. Inténtalo más tarde." }, 429, { "Retry-After": String(budget.retryAfter) });
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST", cache: "no-store",
      headers: { Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`, "Content-Type": "application/json" },
      // El modelo anterior (meta/llama-3.1-8b-instruct) está retirado desde
      // 2026-08-26 y devuelve 410. Este es el vigente probado en producción.
      body: JSON.stringify({ model: process.env.NVIDIA_MODEL || "nvidia/nemotron-3.5-bolt-e4b", messages: [{ role: "system", content: system }, ...messages], max_tokens: 700, temperature: 0.4, stream: false }),
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });
    if (!response.ok) return reply({ error: "NVIDIA no está disponible en este momento. Inténtalo más tarde." }, 502);
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return reply({ error: "No se recibió una respuesta válida de NVIDIA." }, 502);
    return reply({ message: content.slice(0, 4000) });
  } catch { return reply({ error: "No se pudo conectar con NVIDIA. Vuelve a intentarlo." }, 502); }
}
