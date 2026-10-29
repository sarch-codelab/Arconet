// Correo configurado en el servidor. Los Client Components reciben su
// snapshot mediante ContactProvider, sin leer el entorno del navegador.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "contacto@arconethn.com";
export const CONTACT_PHONE = "+504 2237-0000";
export const CONTACT_PHONE_HREF = "tel:+50422370000";
