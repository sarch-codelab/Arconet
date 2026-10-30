import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), getPermisos: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/dal", () => ({ requireSession: mocks.requireSession, getPermisos: mocks.getPermisos }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.query } }));
import { GET as clients } from "../app/api/ventas/clientes/route";
import { GET as products } from "../app/api/ventas/productos/route";

const request = (kind, params = {}) => new Request(`https://arconet.test/api/ventas/${kind}?${new URLSearchParams(params)}`);
const customer = { id: "c-qa", nombre: "José García", rtn: "0801-1990-123456", telefono: "9000-0001", correo: "qa@example.invalid", estado: "activo" };
const product = { id: "p-qa", nombre: "Módulo óptico", sku: "QA-01", unidad: "Pieza", estado: "activo", archivado: false, precio: "100.50", precioDescuento: "90.00", precioMayorista: null };
const routes = [["clientes", clients, customer], ["productos", products, product]];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireSession.mockResolvedValue({ session: { rol: "comercial", correo: "staff@example.invalid" } });
  mocks.getPermisos.mockResolvedValue(["ordenes:write"]);
  mocks.query.mockResolvedValue([]);
});

describe.each(routes)("referencias comerciales: %s", (kind, route, row) => {
  it("exige una sesión antes de consultar permisos o datos", async () => {
    mocks.requireSession.mockResolvedValue({ response: Response.json({ error: "No autenticado" }, { status: 401 }) });
    const response = await route(request(kind));
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.getPermisos).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("una sesión del portal no puede enumerar otros clientes/productos", async () => {
    mocks.requireSession.mockResolvedValue({ session: { tipo: "cliente", rol: "administrador", clienteId: "c-1" } });
    expect((await route(request(kind))).status).toBe(401);
    expect(mocks.getPermisos).not.toHaveBeenCalled();
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it.each(["ordenes:read", "ordenes:write", "facturacion:read", "facturacion:write"])("%s permite la referencia mínima sin permisos de CRUD administrativo", async permission => {
    mocks.getPermisos.mockResolvedValue([permission]);
    mocks.query.mockResolvedValue([row]);
    const response = await route(request(kind));
    expect(response.status).toBe(200);
    expect((await response.json()).items).toHaveLength(1);
    expect(mocks.getPermisos).toHaveBeenCalledWith(expect.objectContaining({ rol: "comercial" }));
  });

  it.each([[], ["reportes:read"], ["clientes:write"], ["productos:write"], ["inventario:read"], ["precios:write"]].map(permissions => [permissions]))("no concede lectura por permisos ajenos: %j", async permissions => {
    mocks.getPermisos.mockResolvedValue(permissions);
    expect((await route(request(kind))).status).toBe(403);
    expect(mocks.query).not.toHaveBeenCalled();
  });

  it("consulta permisos efectivos cada vez, no la lista en la sesión", async () => {
    mocks.requireSession.mockResolvedValue({ session: { rol: "comercial", permisos: ["ordenes:write"] } });
    expect((await route(request(kind))).status).toBe(200);
    mocks.getPermisos.mockResolvedValue([]);
    expect((await route(request(kind))).status).toBe(403);
    expect(mocks.getPermisos).toHaveBeenCalledTimes(2);
    expect(mocks.query).toHaveBeenCalledOnce();
  });

  it("pagina con un límite pequeño, sin descargar todos los registros", async () => {
    mocks.query.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ ...row, id: `qa-${i}` })));
    const response = await route(request(kind, { take: "50000" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ hasMore: true, items: expect.any(Array) });
    expect(mocks.query.mock.calls[0].at(-1)).toBe(21);
  });

  it("el valor por defecto devuelve 12 resultados y avisa si hay más", async () => {
    mocks.query.mockResolvedValue(Array.from({ length: 13 }, (_, i) => ({ ...row, id: `qa-${i}` })));
    const response = await route(request(kind));
    const data = await response.json();
    expect(data.items).toHaveLength(12); expect(data.hasMore).toBe(true);
    expect(mocks.query.mock.calls[0].at(-1)).toBe(13);
  });

  it.each([["-1", 2], ["1.8", 2], ["abc", 13]])("acota un take no confiable %s", async (take, limitPlusOne) => {
    await route(request(kind, { take }));
    expect(mocks.query.mock.calls[0].at(-1)).toBe(limitPlusOne);
  });

  it("resuelve una selección por ID aunque no esté en la primera página", async () => {
    mocks.query.mockResolvedValue([row]);
    const response = await route(request(kind, { id: row.id, q: "ignorado", take: "50000" }));
    expect((await response.json()).items[0].id).toBe(row.id);
    const args = mocks.query.mock.calls[0];
    expect(args).toContain(row.id); expect(args).toContainEqual([]); expect(args.at(-1)).toBe(2);
  });

  it("usa parámetros, términos normalizados y búsqueda literal, no SQL concatenado", async () => {
    const query = "JOSÉ García %_ ' OR 1=1 --";
    await route(request(kind, { q: query }));
    const [strings, ...values] = mocks.query.mock.calls[0];
    expect(strings.join("?")).not.toContain(query);
    expect(strings.join("?")).toContain("unnest(");
    expect(strings.join("?")).toContain("strpos(");
    expect(values).toContainEqual(["jose", "garcia", "%_", "'", "or", "1=1", "--"]);
  });

  it("protege también la serialización y el caché privado", async () => {
    mocks.query.mockResolvedValue([{ ...row, costo: 777, stock: 999, direccion: "Dirección privada", foto: "privada", cuenta: { passwordHash: "privado" }, preciosUpdatedBy: "privado" }]);
    const response = await route(request(kind));
    const body = await response.json();
    for (const field of ["costo", "stock", "direccion", "foto", "cuenta", "preciosUpdatedBy"]) expect(body.items[0]).not.toHaveProperty(field);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("Vary")).toMatch(/Cookie/);
  });

  it("devuelve un error recuperable sin detalles de base de datos", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.query.mockRejectedValue(new Error("detalle privado de PostgreSQL"));
    try {
      const response = await route(request(kind));
      expect(response.status).toBe(503);
      expect(await response.text()).not.toContain("PostgreSQL");
    } finally { log.mockRestore(); }
  });
});

it.each([["clientes:read", 200, 403], ["productos:read", 403, 200], ["precios:read", 403, 200]])("%s no amplía la otra sección", async (permission, clientStatus, productStatus) => {
  mocks.getPermisos.mockResolvedValue([permission]);
  expect((await clients(request("clientes"))).status).toBe(clientStatus);
  expect((await products(request("productos"))).status).toBe(productStatus);
});

it("los tres precios son números y el opcional vacío sigue siendo null", async () => {
  mocks.query.mockResolvedValue([product]);
  expect((await (await products(request("productos"))).json()).items[0]).toEqual({ ...product, precio: 100.5, precioDescuento: 90 });
});

it("las consultas excluyen bajas para búsquedas nuevas pero resuelven el producto histórico por ID", async () => {
  await products(request("productos"));
  const sql = mocks.query.mock.calls[0][0].join("?");
  expect(sql).toContain("p.estado = 'activo' AND p.archivado = false");
  expect(sql).toContain("IS NOT NULL AND p.id =");
});
