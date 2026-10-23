CREATE TABLE "AreaSolicitud" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "roles" TEXT[] NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AreaSolicitud_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AreaSolicitud_slug_key" ON "AreaSolicitud"("slug");
CREATE INDEX "AreaSolicitud_activa_nombre_idx" ON "AreaSolicitud"("activa", "nombre");

INSERT INTO "AreaSolicitud" ("id", "nombre", "slug", "roles", "activa", "createdAt", "updatedAt")
VALUES
  ('area-bodega', 'Bodega', 'bodega', ARRAY['bodega', 'gerente', 'administrador'], TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('area-mantenimiento', 'Mantenimiento', 'mantenimiento', ARRAY['mantenimiento', 'tecnico', 'gerente', 'administrador'], TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('area-atencion', 'Atención al cliente', 'atencion', ARRAY['ventas', 'gerente', 'administrador'], TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
