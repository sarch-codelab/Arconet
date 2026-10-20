import { getSession } from "./session";

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "No autenticado." }, { status: 401 }),
    };
  }
  return { session, response: null };
}
