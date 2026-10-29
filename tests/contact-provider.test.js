import { afterEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { ContactProvider, useContact } from "../app/contact-provider";

function ContactProbe() {
  const { email, phone, phoneHref } = useContact();
  return createElement("div", null,
    createElement("a", { href: `mailto:${email}` }, email),
    createElement("a", { href: phoneHref }, phone),
  );
}
function renderContact(contact) {
  return renderToString(createElement(ContactProvider, { contact }, createElement(ContactProbe)));
}
afterEach(() => vi.unstubAllEnvs());

describe("snapshot de contacto", () => {
  it("mantiene el mismo texto inicial aunque cambie el entorno del cliente", () => {
    const snapshot = { email: "contacto@arconet.local", phone: "+504 0000-0000", phoneHref: "tel:+50400000000" };
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", snapshot.email);
    const serverHtml = renderContact(snapshot);
    vi.stubEnv("NEXT_PUBLIC_CONTACT_EMAIL", "contacto@arconethn.com");
    const clientHtml = renderContact(snapshot);
    expect(clientHtml).toBe(serverHtml);
    expect(clientHtml).toContain('href="mailto:contacto@arconet.local"');
    expect(clientHtml).not.toContain("contacto@arconethn.com");
  });

  it("no mezcla la configuración de dos árboles de renderizado", () => {
    const local = renderContact({ email: "local@example.test", phone: "1", phoneHref: "tel:1" });
    const production = renderContact({ email: "produccion@example.test", phone: "2", phoneHref: "tel:2" });
    expect(local).toContain("local@example.test");
    expect(production).toContain("produccion@example.test");
    expect(production).not.toContain("local@example.test");
  });

  it("exige el provider para no introducir un fallback distinto al HTML", () => {
    expect(() => renderToString(createElement(ContactProbe))).toThrow("ContactProvider");
  });
});
