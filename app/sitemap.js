const baseUrl = process.env.APP_ORIGIN || "https://arconethn.com";

import { FAMILIES } from "./catalogo/catalogo-data";
import { prisma } from "../lib/prisma";

// Se regenera cada hora (ISR) para reflejar productos y categorías nuevos.
export const revalidate = 3600;

// Evita que un problema de base de datos bloquee la generación del sitemap.
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado")), ms)),
  ]);
}

async function loadDynamicEntries() {
  try {
    const [categorias, productos] = await withTimeout(
      Promise.all([
        prisma.categoria.findMany({
          where: { estado: "activo" },
          select: { slug: true, updatedAt: true },
        }),
        prisma.producto.findMany({
          where: { estado: "activo", archivado: false },
          select: { id: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
          take: 5000,
        }),
      ]),
      8000
    );

    const categoryEntries = categorias.map((categoria) => ({
      url: `${baseUrl}/catalogo/categoria/${categoria.slug}`,
      lastModified: categoria.updatedAt,
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    const productEntries = productos.map((producto) => ({
      url: `${baseUrl}/catalogo/producto/${producto.id}`,
      lastModified: producto.updatedAt,
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    return [...categoryEntries, ...productEntries];
  } catch (error) {
    console.error("sitemap: no se pudieron cargar categorías/productos.", error?.message);
    return [];
  }
}

export default async function sitemap() {
  const now = new Date();

  const familyEntries = FAMILIES.map((family) => ({
    url: `${baseUrl}/catalogo/${family.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const dynamicEntries = await loadDynamicEntries();

  return [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${baseUrl}/catalogo`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...familyEntries,
    ...dynamicEntries,
    {
      url: `${baseUrl}/contacto`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/ayuda`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terminos`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacidad`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
