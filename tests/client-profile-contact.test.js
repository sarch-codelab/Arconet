import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(), update: vi.fn(), getClientSession: vi.fn(), requireClientSession: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  clienteCuenta: { findUnique: mocks.findUnique }, cliente: { update: mocks.update },
} }));
vi.mock("@/lib/client-session", () => ({ getClientSession: mocks.getClientSession, deleteClientSession: vi.fn() }));
vi.mock("@/lib/portal-cliente", () => ({ requireClientSession: mocks.requireClientSession }));
vi.mock("@/lib/logs", () => ({ writeLog: vi.fn() }));

import { GET } from "../app/api/cliente-auth/session/route";
import { PATCH } from "../app/api/cliente-portal/perfil/route";

const cliente = { id: "c-1", nombre: "Empresa", contacto: "María", correo: "maria@example.com", estado: "activo" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.getClientSession.mockResolvedValue({ clienteId: "c-1" });
  mocks.requireClientSession.mockResolvedValue({ session: { clienteId: "c-1", correo: cliente.correo } });
  mocks.findUnique.mockResolvedValue({ activo: true, verificadoAt: new Date(), cliente });
  mocks.update.mockResolvedValue(cliente);
});

describe("contacto del perfil de cliente", () => {
  it("la sesión devuelve contacto por separado del nombre comercial", async () => {
    expect(await (await GET()).json()).toMatchObject({ nombre: "María", empresa: "Empresa", contacto: "María" });
  });
  it("guardar el perfil conserva el contacto para la siguiente edición", async () => {
    const response = await PATCH(new Request("http://localhost/api/cliente-portal/perfil", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contacto: "María" }),
    }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ nombre: "María", empresa: "Empresa", contacto: "María" });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "c-1" }, data: { contacto: "María" } }));
  });
  it("la sesión sin contacto no lo sustituye silenciosamente por el nombre comercial", async () => {
    mocks.findUnique.mockResolvedValue({ activo: true, cliente: { ...cliente, contacto: null } });
    expect(await (await GET()).json()).toMatchObject({ nombre: "Empresa", contacto: "" });
  });
});
