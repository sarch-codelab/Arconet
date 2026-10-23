CREATE TABLE "SolicitudInterna" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "prioridad" TEXT NOT NULL DEFAULT 'normal',
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "solicitanteCorreo" TEXT NOT NULL,
    "solicitanteNombre" TEXT NOT NULL,
    "solicitanteRol" TEXT NOT NULL,
    "responsableCorreo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SolicitudInterna_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SolicitudInterna_area_estado_createdAt_idx" ON "SolicitudInterna"("area", "estado", "createdAt");
CREATE INDEX "SolicitudInterna_solicitanteCorreo_createdAt_idx" ON "SolicitudInterna"("solicitanteCorreo", "createdAt");
CREATE INDEX "SolicitudInterna_responsableCorreo_idx" ON "SolicitudInterna"("responsableCorreo");

CREATE TABLE "ComentarioSolicitud" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "autorCorreo" TEXT NOT NULL,
    "autorNombre" TEXT NOT NULL,
    "autorRol" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ComentarioSolicitud_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ComentarioSolicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInterna"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ComentarioSolicitud_solicitudId_createdAt_idx" ON "ComentarioSolicitud"("solicitudId", "createdAt");

CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'solicitud',
    "solicitudId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Notificacion_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInterna"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Notificacion_recipient_readAt_createdAt_idx" ON "Notificacion"("recipient", "readAt", "createdAt");
CREATE INDEX "Notificacion_solicitudId_idx" ON "Notificacion"("solicitudId");

UPDATE "Rol"
SET "permisos" = ARRAY(SELECT DISTINCT unnest("permisos" || ARRAY['solicitudes:read','solicitudes:write']))
WHERE "slug" IN ('gerente', 'ventas', 'bodega', 'tecnico');

INSERT INTO "Rol" ("id", "nombre", "slug", "descripcion", "permisos", "estado", "createdAt", "updatedAt")
VALUES ('rol-mantenimiento', 'Mantenimiento', 'mantenimiento', 'Recibe, evalúa y atiende solicitudes de mantenimiento.', ARRAY['solicitudes:read','solicitudes:write','mi-perfil:read','mi-perfil:write'], 'activo', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET
  "nombre" = EXCLUDED."nombre",
  "descripcion" = EXCLUDED."descripcion",
  "permisos" = ARRAY(SELECT DISTINCT unnest("Rol"."permisos" || EXCLUDED."permisos")),
  "estado" = 'activo',
  "updatedAt" = CURRENT_TIMESTAMP;
