import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { correo: "Gerente@Arconet.test" },
  findMany: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("../lib/dal", () => ({
  requireSession: vi.fn(async () => mocks.session
    ? { session: mocks.session, response: null }
    : { response: Response.json({ error: "No autenticado." }, { status: 401 }) }),
}));
vi.mock("../lib/prisma", () => ({
  prisma: {
    notificacion: { findMany: mocks.findMany, updateMany: mocks.updateMany },
  },
}));

import { GET, PATCH } from "../app/api/notificaciones/route";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session = { correo: "Gerente@Arconet.test" };
  mocks.findMany.mockResolvedValue([]);
  mocks.updateMany.mockResolvedValue({ count: 1 });
});

describe("entrega de alertas en la campana", () => {
  it("consulta las alertas del correo autenticado sin distinguir mayúsculas", async () => {
    mocks.findMany.mockResolvedValue([{ id: "n-stock", type: "stock", title: "Stock bajo", readAt: null }]);
    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.objectContaining({ id: "n-stock", read: false })]);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { recipient: { equals: "Gerente@Arconet.test", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("solo marca como leídas las notificaciones del destinatario autenticado", async () => {
    const request = new Request("https://arconet.test/api/notificaciones", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "n-stock" }),
    });
    expect((await PATCH(request)).status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        id: "n-stock",
        recipient: { equals: "Gerente@Arconet.test", mode: "insensitive" },
      },
      data: { readAt: expect.any(Date) },
    });
  });

  it("sin sesión no consulta ni modifica alertas", async () => {
    mocks.session = null;
    expect((await GET()).status).toBe(401);
    expect(mocks.findMany).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
