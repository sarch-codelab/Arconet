// No reintentar escrituras automáticamente: una respuesta perdida puede
// corresponder a una operación ya guardada en el servidor.
export async function loadClientPortal(fetcher, signal) {
  const sessionResponse = await fetcher("/api/cliente-auth/session", { cache: "no-store", signal });
  if (sessionResponse.status === 401) return { unauthenticated: true };
  const session = await sessionResponse.json().catch(() => null);
  if (!sessionResponse.ok) throw new Error(session?.error || "No se pudo verificar la cuenta.");
  if (!session?.clienteId) throw new Error("No se pudo verificar la cuenta.");

  const ordersResponse = await fetcher("/api/ordenes", { cache: "no-store", signal });
  if (ordersResponse.status === 401) return { unauthenticated: true };
  const orders = await ordersResponse.json().catch(() => null);
  if (!ordersResponse.ok) throw new Error(orders?.error || "No se pudieron cargar tus solicitudes.");
  if (!Array.isArray(orders)) throw new Error("La respuesta de solicitudes no es válida. Intenta nuevamente.");
  return { session, orders };
}
