import { apiFetch } from "@/lib/api-fetch";
export async function purchaseRequest(url, options = {}) {
  const response = await apiFetch(url, {
    cache: "no-store",
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "No se pudo completar la operación.");
  return data;
}
export function purchaseMoney(value) {
  return `L ${Number(value || 0).toLocaleString("es-HN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
