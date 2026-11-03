import { readFileSync, statSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import PersonPhoto, { DEFAULT_PERSON_PHOTO } from "../app/components/person-photo";
import { Avatar } from "../app/admin/admin-ui";

const mocks = vi.hoisted(() => ({ guard: vi.fn(), find: vi.fn(), image: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { cliente: { findUnique: mocks.find } } }));
vi.mock("@/lib/portal-cliente", () => ({ requireClientSession: mocks.guard }));
vi.mock("@/lib/imagen-respuesta", () => ({ respuestaImagenConEtag: mocks.image }));
import { GET } from "../app/api/cliente-portal/foto/route";

const render = props => renderToStaticMarkup(createElement(PersonPhoto, props));
describe("foto predeterminada de personas", () => {
  it.each([null, undefined, ""])("usa la imagen predeterminada cuando foto=%s", src => {
    expect(render({ src })).toContain(`src="${DEFAULT_PERSON_PHOTO}"`);
  });
  it("conserva una foto personal", () => {
    expect(render({ src: "/media/usuarios/personal.webp", alt: "Ana" })).toContain('src="/media/usuarios/personal.webp"');
    expect(render({ src: "/media/usuarios/personal.webp", alt: "Ana" })).toContain('alt="Ana"');
  });
  it("incluye el recurso optimizado sin depender de servicios externos", () => {
    expect(statSync(`public${DEFAULT_PERSON_PHOTO}`).size).toBeLessThan(32 * 1024);
  });
  it("aplica el predeterminado a personas, no a productos ni categorías", () => {
    expect(renderToStaticMarkup(createElement(Avatar, { name: "Persona" }))).toContain(DEFAULT_PERSON_PHOTO);
    expect(renderToStaticMarkup(createElement(Avatar, { name: "Producto", shape: "square" }))).not.toContain(DEFAULT_PERSON_PHOTO);
  });
  it("permite quitar la foto sin guardar la ruta predeterminada en la cuenta", () => {
    const profile = readFileSync("app/admin/perfil-section.js", "utf8");
    expect(profile).toContain('onClick={() => setPhotoPreview("")}');
    expect(profile).toContain('photoPreview !== null ? { foto: photoPreview } : {}');
    expect(profile).not.toContain(DEFAULT_PERSON_PHOTO);
  });
});
describe("foto privada del cliente del portal", () => {
  beforeEach(() => vi.resetAllMocks());
  it("requiere sesión y no consulta fotos sin autorización", async () => {
    mocks.guard.mockResolvedValue({ response: new Response(null, { status: 401 }) });
    expect((await GET(new Request("https://arconethn.com/api/cliente-portal/foto"))).status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it("solo lee el cliente de la sesión, aunque la URL traiga otro identificador", async () => {
    mocks.guard.mockResolvedValue({ session: { clienteId: "propio" } });
    mocks.find.mockResolvedValue({ foto: "/media/clientes/personal.webp" });
    mocks.image.mockReturnValue(new Response(null, { status: 200 }));
    const req = new Request("https://arconethn.com/api/cliente-portal/foto?id=ajeno");
    await GET(req);
    expect(mocks.find).toHaveBeenCalledWith({ where: { id: "propio" }, select: { foto: true } });
    expect(mocks.image).toHaveBeenCalledWith("/media/clientes/personal.webp", req);
  });
  it("delega la ausencia de imagen para que la vista muestre la predeterminada", async () => {
    mocks.guard.mockResolvedValue({ session: { clienteId: "propio" } });
    mocks.find.mockResolvedValue({ foto: null });
    mocks.image.mockReturnValue(new Response(null, { status: 404 }));
    expect((await GET(new Request("https://arconethn.com/api/cliente-portal/foto"))).status).toBe(404);
  });
});
