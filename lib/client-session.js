import { CLIENT_SESSION_COOKIE, createToken, verifyToken } from "./session";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function cookieOptions(maxAgeSeconds) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

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
  cookieStore.set(CLIENT_SESSION_COOKIE, token, cookieOptions(maxAgeSeconds));
}

export async function getClientSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const token = cookieStore.get(CLIENT_SESSION_COOKIE)?.value;
  const session = await verifyToken(token);
  if (session?.tipo !== "cliente" || !session.clienteId) return null;
  return session;
}

export async function deleteClientSession() {
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  cookieStore.delete(CLIENT_SESSION_COOKIE);
}
