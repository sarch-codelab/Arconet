CREATE TABLE "AccesoQr" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "dispositivo" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pending',
    "usuarioId" TEXT,
    "sourceSessionId" TEXT,
    "twoFactorVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AccesoQr_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AccesoQr_expiresAt_idx" ON "AccesoQr"("expiresAt");
