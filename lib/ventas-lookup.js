import { requireSession, getPermisos } from "./dal";
import { prisma } from "./prisma";
import { lookupTerms } from "./ventas-form";

const COMMERCIAL_PERMISSIONS = ["ordenes:read", "ordenes:write", "facturacion:read", "facturacion:write"];
const LOOKUP_PERMISSIONS = {
  clientes: [...COMMERCIAL_PERMISSIONS, "clientes:read"],
  productos: [...COMMERCIAL_PERMISSIONS, "productos:read", "precios:read"],
};
const HEADERS = { "Cache-Control": "private, no-store", Vary: "Cookie, x-arconet-preview-session" };
const json = (body, status = 200) => Response.json(body, { status, headers: HEADERS });

// Referencias para preparar documentos, NO acceso al CRUD de clientes o
// inventario. Se comprueban los permisos efectivos en cada petición; ni el
// rol enviado por el navegador ni una sesión de cliente conceden acceso.
export async function salesLookup(request, kind) {
  try {
    const guard = await requireSession();
    if (guard.response) return json({ error: "No autenticado." }, 401);
    if (!guard.session || guard.session.tipo === "cliente") return json({ error: "No autenticado." }, 401);
    const permissions = await getPermisos(guard.session);
    if (!LOOKUP_PERMISSIONS[kind]?.some(permission => permissions.includes(permission))) {
      return json({ error: "No autorizado." }, 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim() || null;
    if (id && id.length > 1000) return json({ error: "Referencia inválida." }, 400);
    const terms = id ? [] : lookupTerms(searchParams.get("q"));
    const limit = id ? 1 : Math.min(20, Math.max(1, Math.trunc(Number(searchParams.get("take"))) || 12));
    let rows;
    if (kind === "clientes") {
      // SQL parametrizado: sin extensiones de PostgreSQL ni interpolación de
      // texto SQL. Cada término coincide en nombre o identificación guardada.
      // La segunda comparación permite escribir un RTN sin guiones/espacios.
      rows = await prisma.$queryRaw`
        SELECT c.id, c.nombre, c.rtn, c.telefono, c.correo, c.estado
        FROM "Cliente" c
        WHERE (${id}::text IS NULL OR c.id = ${id})
          AND NOT EXISTS (
            SELECT 1 FROM unnest(${terms}::text[]) AS term(value)
            WHERE strpos(lower(translate(c.nombre, 'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç', 'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc')), term.value) = 0
              AND strpos(lower(translate(coalesce(c.rtn, ''), 'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç', 'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc')), term.value) = 0
              AND NOT (
                term.value ~ '^[a-z0-9 ./-]+$'
                AND length(regexp_replace(term.value, '[^a-z0-9]', '', 'g')) > 0
                AND strpos(regexp_replace(lower(coalesce(c.rtn, '')), '[^a-z0-9]', '', 'g'), regexp_replace(term.value, '[^a-z0-9]', '', 'g')) > 0
              )
          )
        ORDER BY c.nombre, c.id LIMIT ${limit + 1}
      `;
    } else {
      rows = await prisma.$queryRaw`
        SELECT p.id, p.nombre, p.sku, p.unidad, p.estado, p.archivado,
               p.precio, p."precioDescuento", p."precioMayorista"
        FROM "Producto" p
        WHERE ((${id}::text IS NOT NULL AND p.id = ${id})
          OR (${id}::text IS NULL AND p.estado = 'activo' AND p.archivado = false))
          AND NOT EXISTS (
            SELECT 1 FROM unnest(${terms}::text[]) AS term(value)
            WHERE strpos(lower(translate(p.nombre, 'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇáàäâãåéèëêíìïîóòöôõúùüûñç', 'AAAAAAEEEEIIIIOOOOOUUUUNCaaaaaaeeeeiiiiooooouuuunc')), term.value) = 0
              AND strpos(lower(p.sku), term.value) = 0
              AND strpos(lower(coalesce(p."codigoBarras", '')), term.value) = 0
          )
        ORDER BY p.nombre, p.id LIMIT ${limit + 1}
      `;
    }
    // Lista blanca también al serializar: jamás costos, existencias, auditoría,
    // cuentas del portal, fotografías ni direcciones completas en el lookup.
    const items = rows.slice(0, limit).map(row => kind === "clientes" ? {
      id: row.id, nombre: row.nombre, rtn: row.rtn, telefono: row.telefono, correo: row.correo, estado: row.estado,
    } : {
      id: row.id, nombre: row.nombre, sku: row.sku, unidad: row.unidad, estado: row.estado, archivado: row.archivado,
      precio: Number(row.precio),
      precioDescuento: row.precioDescuento == null ? null : Number(row.precioDescuento),
      precioMayorista: row.precioMayorista == null ? null : Number(row.precioMayorista),
    });
    return json({ items, hasMore: rows.length > limit });
  } catch (error) {
    console.error(`GET /api/ventas/${kind}`, error?.message);
    return json({ error: "No se pudo realizar la búsqueda. Intenta de nuevo." }, 503);
  }
}
