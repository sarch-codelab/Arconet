import { sessionCookieOptions } from "./session-cookie";
import { CLIENT_SESSION_COOKIE, createToken, verifyToken, readRequestSessionToken } from "./session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function createClientSession(client, remember = true) {
  const maxAgeSeconds = remember ? DEFAULT_MAX_AGE_SECONDS : 60 * 60 * 8;
  const { token } = await createToken(
    {
      id: client.clienteId,
      clienteId: client.clienteId,
      tipo: "cliente",
      nombre: client.nombre,
      correo: client.correo,
      rol: "cliente",
    },
    maxAgeSeconds,
  );
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, token, sessionCookieOptions(maxAgeSeconds));
  return token;
}

export async function getClientSession() {
  const token = await readRequestSessionToken(CLIENT_SESSION_COOKIE);
  const session = await verifyToken(token);
  if (session?.tipo !== "cliente" || !session.clienteId) return null;
  return session;
}

export async function deleteClientSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.set(CLIENT_SESSION_COOKIE, "", sessionCookieOptions(0));
}
