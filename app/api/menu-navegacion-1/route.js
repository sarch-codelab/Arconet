import { readDockMenu } from "@/lib/dock-menu-service";
import { HERO_MENU_KEY } from "@/lib/dock-menu";
import { visibleDockMenu } from "@/lib/dock-menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { menu } = await readDockMenu(undefined, HERO_MENU_KEY);
    return Response.json({ menu: visibleDockMenu(menu) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET menú 1 público", error?.message);
    return Response.json({ error: "No se pudo cargar el menú." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
