import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("../lib/prisma", () => ({ prisma: { sucursal: { findMany: mocks.findMany } } }));
import { GET } from "../app/api/sedes-publicas/route";
import { Sedes } from "../app/footer";

beforeEach(() => vi.resetAllMocks());

describe("sedes públicas del footer", () => {
  it("consulta solo sedes activas y devuelve exclusivamente nombre y ciudad con su identificador", async () => {
    mocks.findMany.mockResolvedValue([{ id: "b1", nombre: "Sucursal Centro", ciudad: "Comayagua", responsable: "Privado", telefono: "Privado", codigo: "Interno" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.findMany).toHaveBeenCalledWith({ where: { estado: "activo" }, select: { id: true, nombre: true, ciudad: true }, orderBy: [{ nombre: "asc" }, { id: "asc" }] });
    expect(await response.json()).toEqual({ sedes: [{ id: "b1", nombre: "Sucursal Centro", ciudad: "Comayagua" }] });
  });
  it("distingue una lista vacía de un error de base de datos", async () => {
    mocks.findMany.mockResolvedValueOnce([]).mockRejectedValueOnce(new Error("desconectada"));
    expect(await (await GET()).json()).toEqual({ sedes: [] });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "No se pudieron cargar las sedes." });
    spy.mockRestore();
  });
  it("muestra nombres de sedes, vacío y error sin inventar ubicaciones", () => {
    const markup = (estado, sedes = []) => renderToStaticMarkup(createElement(Sedes, { estado, sedes }));
    expect(markup("cargando")).toContain("Cargando sedes");
    expect(markup("error")).toContain("No se pudieron cargar las sedes");
    expect(markup("listo")).toContain("No hay sedes activas");
    const result = markup("listo", [{ id: "1", nombre: "Centro", ciudad: "Comayagua" }, { id: "2", nombre: "Norte", ciudad: "Comayagua" }]);
    expect(result).toContain("Centro · Comayagua");
    expect(result).toContain("Norte · Comayagua");
    expect(result).not.toContain("Tegucigalpa");
  });
});
