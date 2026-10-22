-- Categorías administrables del catálogo.
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "foto" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Categoria_nombre_key" ON "Categoria"("nombre");
CREATE UNIQUE INDEX "Categoria_slug_key" ON "Categoria"("slug");
CREATE INDEX "Categoria_orden_idx" ON "Categoria"("orden");
CREATE INDEX "Categoria_estado_idx" ON "Categoria"("estado");

INSERT INTO "Categoria" ("id", "nombre", "slug", "descripcion", "foto", "orden", "estado", "updatedAt")
VALUES
    ('cat-preconectorizado', 'Soluciones de Preconectorizado', 'soluciones-de-preconectorizado', 'Cables, pigtails y patch cords terminados en fábrica para instalar más rápido y con menos pérdidas.', '/catalogo/sol-fibra.jpg', 1, 'activo', CURRENT_TIMESTAMP),
    ('cat-herrajes', 'Herrajes', 'herrajes', 'Soportes, abrazaderas y tensores para fijar cable y equipos con seguridad en poste, fachada o pared.', '/catalogo/infraestructura.jpg', 2, 'activo', CURRENT_TIMESTAMP),
    ('cat-gabinetes', 'Gabinetes y Racks', 'gabinetes-y-racks', 'El lugar donde vive tu equipo: ordenado, ventilado y listo para crecer contigo.', '/catalogo/prod-gabinete.jpg', 3, 'activo', CURRENT_TIMESTAMP),
    ('cat-cajas', 'Cajas de Distribución y Emplazamiento', 'cajas-de-distribucion-y-emplazamiento', 'Cajas de empalme, terminales y NAPs para organizar la distribución y proteger los empalmes en campo.', '/catalogo/sol-fibra.jpg', 4, 'activo', CURRENT_TIMESTAMP),
    ('cat-activas', 'Soluciones activas y Accesorios FTTH', 'soluciones-activas-y-accesorios-ftth', 'Equipos activos y accesorios para redes FTTH, CATV y enlaces ópticos, desde la cabecera hasta el cliente.', '/catalogo/infraestructura.jpg', 5, 'activo', CURRENT_TIMESTAMP),
    ('cat-herramientas', 'Herramientas y kits', 'herramientas-y-kits', 'Kits y herramientas de campo para pelar, limpiar, cortar y terminar fibra sin improvisar.', '/catalogo/prod-herramientas.jpg', 6, 'activo', CURRENT_TIMESTAMP),
    ('cat-escaleras', 'Escaleras', 'escaleras', 'Escaleras y accesorios de altura para llegar a postes, bandejas y gabinetes con seguridad.', '/catalogo/ingeniero-casco-redes.png', 7, 'activo', CURRENT_TIMESTAMP),
    ('cat-odf', 'Optical Distribution Frame - ODF', 'optical-distribution-frame-odf', 'Bandejas y marcos ODF para ordenar, proteger y administrar terminaciones de fibra en sala técnica.', '/catalogo/prod-gabinete.png', 8, 'activo', CURRENT_TIMESTAMP),
    ('cat-medicion', 'Instrumentos de medición óptica', 'instrumentos-de-medicion-optica', 'Instrumentos para instalar, ajustar y diagnosticar fibra sin depender de la improvisación.', '/catalogo/prod-otdr.jpg', 9, 'activo', CURRENT_TIMESTAMP),
    ('cat-pasivos', 'Componentes pasivos', 'componentes-pasivos', 'Splitters, conectores, adaptadores y cable para armar la red óptica sin componentes activos.', '/catalogo/hero-fiber.jpg', 10, 'activo', CURRENT_TIMESTAMP),
    ('cat-microcables', 'Microcables y Microproductos', 'microcables-y-microproductos', 'Microcables, microductos y accesorios compactos para instalaciones FTTH de alta densidad.', '/catalogo/prod-adss.jpg', 11, 'activo', CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;
