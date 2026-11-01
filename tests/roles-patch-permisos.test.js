import { beforeEach, describe, expect, it, vi } from "vitest";

// Regresión del incidente real: un editor sin todos los permisos abría el rol
// Bodega y, al guardar, el rol se quedaba sin los permisos que ese editor no
// podía otorgar. El servidor debe conservarlos.

const estado = {
  permisosEditor: [],
  rol: null,
  actualizado: null,
};

const prismaMock = {
  rol: {
    findUnique: vi.fn(async () => estado.rol),
    update: vi.fn(async ({ data }) => {
      estado.actualizado = data;
      return { ...estado.rol, ...data };
    }),
  },
  trabajador: { count: vi.fn(async () => 0) },
  usuario: { count: vi.fn(async () => 0) },
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/dal", () => ({
  requirePermission: async () => ({ session: { rol: "gerente", correo: "g@arconet.local" }, permisos: estado.permisosEditor, response: null }),
}));
vi.mock("@/lib/logs", () => ({ writeLog: vi.fn(async () => {}) }));

const { PATCH } = await import("../app/api/roles/[id]/route");

const patch = (body) =>
  PATCH(
    new Request("http://local/api/roles/rol-bodega", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "rol-bodega" }) },
  );

beforeEach(() => {
  estado.permisosEditor = ["roles:read", "roles:write", "productos:read", "productos:write"];
  estado.actualizado = null;
  prismaMock.rol.findUnique.mockClear();
  prismaMock.rol.update.mockClear();
  estado.rol = {
    id: "rol-bodega",
    slug: "bodega",
    nombre: "Bodega",
    permisos: [
      "productos:read",
      "productos:write",
      "inventario:read",
      "inventario:write",
      "inventario:delete",
      "compras:read",
      "compras:write",
      "compras:receive",
      "solicitudes:read",
    ],
  };
});

describe("PATCH /api/roles/[id]: un editor no borra permisos que no puede otorgar", () => {
  it("conserva inventario:* y compras:* aunque el payload no los envíe", async () => {
    const res = await patch({ permisos: ["productos:read", "productos:write"] });
    expect(res.status).toBe(200);

    const guardados = estado.actualizado.permisos;
    expect(guardados).toContain("inventario:read");
    expect(guardados).toContain("inventario:write");
    expect(guardados).toContain("compras:receive");
    expect(guardados).toHaveLength(9);
  });

  it("sí permite quitar los permisos que el editor tiene", async () => {
    const res = await patch({ permisos: ["productos:read"] });
    expect(res.status).toBe(200);

    // productos:write se puede otorgar, así que también se puede quitar.
    expect(estado.actualizado.permisos).not.toContain("productos:write");
    expect(estado.actualizado.permisos).toContain("inventario:read");
  });

  it("sigue rechazando otorgar un permiso que el editor no tiene", async () => {
    const res = await patch({ permisos: ["productos:read", "ajustes:write"] });
    expect(res.status).toBe(403);
    expect(estado.actualizado).toBeNull();
  });

  it("quien tiene todos los permisos puede reescribir la lista sin que le sumen nada", async () => {
    // Editor con permiso sobre todo lo que el rol tiene ahora.
    estado.permisosEditor = [...estado.rol.permisos, "roles:write"];

    const res = await patch({ permisos: ["productos:read", "productos:write"] });
    expect(res.status).toBe(200);
    // Nada que conservar: se guarda exactamente lo enviado.
    expect(estado.actualizado.permisos).toEqual(["productos:read", "productos:write"]);
  });
});
