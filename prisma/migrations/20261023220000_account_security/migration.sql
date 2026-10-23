ALTER TABLE "Usuario"
ADD COLUMN "twoFactorSecret" TEXT,
ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE "SesionUsuario" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "SesionUsuario_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "SesionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SesionUsuario_sessionId_key" ON "SesionUsuario"("sessionId");
CREATE INDEX "SesionUsuario_usuarioId_revokedAt_expiresAt_idx" ON "SesionUsuario"("usuarioId", "revokedAt", "expiresAt");
