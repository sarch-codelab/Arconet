-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "nivel" TEXT NOT NULL DEFAULT 'info',
    "categoria" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "detalle" TEXT,
    "actor" TEXT,
    "ruta" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Log_categoria_idx" ON "Log"("categoria");

-- CreateIndex
CREATE INDEX "Log_nivel_idx" ON "Log"("nivel");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");
