import { readDockMenu } from "@/lib/dock-menu-service";
import { visibleDockMenu } from "@/lib/dock-menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { menu } = await readDockMenu();
    return Response.json({ menu: visibleDockMenu(menu) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET menú público", error?.message);
    return Response.json({ error: "No se pudo cargar el menú." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
