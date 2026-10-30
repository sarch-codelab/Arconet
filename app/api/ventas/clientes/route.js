import { salesLookup } from "@/lib/ventas-lookup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request) {
  return salesLookup(request, "clientes");
}
