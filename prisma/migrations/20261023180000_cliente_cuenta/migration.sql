CREATE TABLE "ClienteCuenta" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteCuenta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClienteCuenta_clienteId_key" ON "ClienteCuenta"("clienteId");
CREATE UNIQUE INDEX "ClienteCuenta_correo_key" ON "ClienteCuenta"("correo");

ALTER TABLE "ClienteCuenta"
ADD CONSTRAINT "ClienteCuenta_clienteId_fkey"
FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "ClienteCuenta_activo_idx" ON "ClienteCuenta"("activo");
