-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "etiquetas" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "segmento" TEXT;

-- AlterTable
ALTER TABLE "ClienteCuenta" ADD COLUMN     "aprobadoAt" TIMESTAMP(3),
ADD COLUMN     "aprobadoPor" TEXT,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'pendiente',
ADD COLUMN     "verificadoAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Orden" ADD COLUMN     "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "fechaVencimiento" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SolicitudInterna" ADD COLUMN     "cerradaAt" TIMESTAMP(3),
ADD COLUMN     "fechaLimite" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "bloqueadoHasta" TIMESTAMP(3),
ADD COLUMN     "consentimientoAt" TIMESTAMP(3),
ADD COLUMN     "intentosFallidos" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ultimoAccesoAt" TIMESTAMP(3),
ADD COLUMN     "verificadoAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Bodega" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "sucursalId" TEXT,
    "direccion" TEXT,
    "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bodega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductoStock" (
    "id" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "bodegaId" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductoStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MovimientoKardex" (
    "id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "productoId" TEXT NOT NULL,
    "bodegaId" TEXT NOT NULL,
    "bodegaDestinoId" TEXT,
    "cantidad" INTEGER NOT NULL,
    "saldoAnterior" INTEGER NOT NULL,
    "saldoDespues" INTEGER NOT NULL,
    "costoUnitario" DECIMAL(12,2),
    "referencia" TEXT,
    "motivo" TEXT,
    "actor" TEXT,
    "ordenCompraId" TEXT,
    "ordenId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MovimientoKardex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proveedor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rtn" TEXT,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "notas" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompra" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "proveedorId" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'borrador',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEsperada" TIMESTAMP(3),
    "fechaRecepcion" TIMESTAMP(3),
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notas" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdenCompra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenCompraItem" (
    "id" TEXT NOT NULL,
    "ordenCompraId" TEXT NOT NULL,
    "productoId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "cantidadRecibida" INTEGER NOT NULL DEFAULT 0,
    "costoUnitario" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrdenCompraItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" TEXT NOT NULL DEFAULT 'efectivo',
    "referencia" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'confirmado',
    "registradoPor" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdenEvento" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "deEstado" TEXT,
    "aEstado" TEXT,
    "mensaje" TEXT,
    "actor" TEXT,

    CONSTRAINT "OrdenEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'entrega',
    "estado" TEXT NOT NULL DEFAULT 'programada',
    "fechaProgramada" TIMESTAMP(3),
    "fechaReal" TIMESTAMP(3),
    "transportista" TEXT,
    "guia" TEXT,
    "notas" TEXT,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devolucion" (
    "id" TEXT NOT NULL,
    "ordenId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "motivo" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "registradoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Devolucion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DevolucionItem" (
    "id" TEXT NOT NULL,
    "devolucionId" TEXT NOT NULL,
    "ordenItemId" TEXT,
    "nombre" TEXT NOT NULL,
    "cantidad" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DevolucionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFiscal" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "cai" TEXT,
    "serie" TEXT,
    "correlativo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clienteId" TEXT NOT NULL,
    "ordenId" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'emitido',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuesto" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "moneda" TEXT NOT NULL DEFAULT 'HNL',
    "referenciaId" TEXT,
    "pdfHash" TEXT,
    "emitidoPor" TEXT,
    "motivoAnulacion" TEXT,
    "anuladoPor" TEXT,
    "anuladoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentoFiscal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentoFiscalItem" (
    "id" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(12,3) NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "descuento" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "impuestoPorcentaje" DECIMAL(5,2) NOT NULL DEFAULT 15,
    "subtotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "DocumentoFiscalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudAdjunto" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "autorCorreo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudAdjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitudEvento" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL,
    "de" TEXT,
    "a" TEXT,
    "mensaje" TEXT,
    "actorCorreo" TEXT NOT NULL,
    "actorNombre" TEXT,

    CONSTRAINT "SolicitudEvento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenAcceso" (
    "id" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "codigoHash" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "expiraAt" TIMESTAMP(3) NOT NULL,
    "usadoAt" TIMESTAMP(3),
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bodega_codigo_key" ON "Bodega"("codigo");

-- CreateIndex
CREATE INDEX "Bodega_estado_idx" ON "Bodega"("estado");

-- CreateIndex
CREATE INDEX "Bodega_sucursalId_idx" ON "Bodega"("sucursalId");

-- CreateIndex
CREATE INDEX "ProductoStock_bodegaId_idx" ON "ProductoStock"("bodegaId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductoStock_productoId_bodegaId_key" ON "ProductoStock"("productoId", "bodegaId");

-- CreateIndex
CREATE INDEX "MovimientoKardex_productoId_fecha_idx" ON "MovimientoKardex"("productoId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoKardex_bodegaId_fecha_idx" ON "MovimientoKardex"("bodegaId", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoKardex_tipo_fecha_idx" ON "MovimientoKardex"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "MovimientoKardex_ordenCompraId_idx" ON "MovimientoKardex"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Proveedor_estado_idx" ON "Proveedor"("estado");

-- CreateIndex
CREATE INDEX "Proveedor_nombre_idx" ON "Proveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "OrdenCompra_numero_key" ON "OrdenCompra"("numero");

-- CreateIndex
CREATE INDEX "OrdenCompra_proveedorId_idx" ON "OrdenCompra"("proveedorId");

-- CreateIndex
CREATE INDEX "OrdenCompra_estado_idx" ON "OrdenCompra"("estado");

-- CreateIndex
CREATE INDEX "OrdenCompra_fecha_idx" ON "OrdenCompra"("fecha");

-- CreateIndex
CREATE INDEX "OrdenCompraItem_ordenCompraId_idx" ON "OrdenCompraItem"("ordenCompraId");

-- CreateIndex
CREATE INDEX "Pago_ordenId_estado_idx" ON "Pago"("ordenId", "estado");

-- CreateIndex
CREATE INDEX "Pago_fecha_idx" ON "Pago"("fecha");

-- CreateIndex
CREATE INDEX "OrdenEvento_ordenId_fecha_idx" ON "OrdenEvento"("ordenId", "fecha");

-- CreateIndex
CREATE INDEX "Entrega_ordenId_estado_idx" ON "Entrega"("ordenId", "estado");

-- CreateIndex
CREATE INDEX "Devolucion_ordenId_estado_idx" ON "Devolucion"("ordenId", "estado");

-- CreateIndex
CREATE INDEX "DevolucionItem_devolucionId_idx" ON "DevolucionItem"("devolucionId");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_tipo_estado_idx" ON "DocumentoFiscal"("tipo", "estado");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_clienteId_idx" ON "DocumentoFiscal"("clienteId");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_fecha_idx" ON "DocumentoFiscal"("fecha");

-- CreateIndex
CREATE INDEX "DocumentoFiscal_ordenId_idx" ON "DocumentoFiscal"("ordenId");

-- CreateIndex
CREATE INDEX "DocumentoFiscalItem_documentoId_idx" ON "DocumentoFiscalItem"("documentoId");

-- CreateIndex
CREATE INDEX "SolicitudAdjunto_solicitudId_idx" ON "SolicitudAdjunto"("solicitudId");

-- CreateIndex
CREATE INDEX "SolicitudEvento_solicitudId_fecha_idx" ON "SolicitudEvento"("solicitudId", "fecha");

-- CreateIndex
CREATE INDEX "TokenAcceso_correo_tipo_usadoAt_idx" ON "TokenAcceso"("correo", "tipo", "usadoAt");

-- CreateIndex
CREATE INDEX "TokenAcceso_expiraAt_idx" ON "TokenAcceso"("expiraAt");

-- CreateIndex
CREATE INDEX "ClienteCuenta_estado_idx" ON "ClienteCuenta"("estado");

-- CreateIndex
CREATE INDEX "Orden_fechaVencimiento_idx" ON "Orden"("fechaVencimiento");

-- CreateIndex
CREATE INDEX "SolicitudInterna_fechaLimite_idx" ON "SolicitudInterna"("fechaLimite");

-- AddForeignKey
ALTER TABLE "Bodega" ADD CONSTRAINT "Bodega_sucursalId_fkey" FOREIGN KEY ("sucursalId") REFERENCES "Sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoStock" ADD CONSTRAINT "ProductoStock_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductoStock" ADD CONSTRAINT "ProductoStock_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MovimientoKardex" ADD CONSTRAINT "MovimientoKardex_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompra" ADD CONSTRAINT "OrdenCompra_proveedorId_fkey" FOREIGN KEY ("proveedorId") REFERENCES "Proveedor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_ordenCompraId_fkey" FOREIGN KEY ("ordenCompraId") REFERENCES "OrdenCompra"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenCompraItem" ADD CONSTRAINT "OrdenCompraItem_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdenEvento" ADD CONSTRAINT "OrdenEvento_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucion" ADD CONSTRAINT "Devolucion_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DevolucionItem" ADD CONSTRAINT "DevolucionItem_devolucionId_fkey" FOREIGN KEY ("devolucionId") REFERENCES "Devolucion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscal" ADD CONSTRAINT "DocumentoFiscal_ordenId_fkey" FOREIGN KEY ("ordenId") REFERENCES "Orden"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentoFiscalItem" ADD CONSTRAINT "DocumentoFiscalItem_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "DocumentoFiscal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudAdjunto" ADD CONSTRAINT "SolicitudAdjunto_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInterna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudEvento" ADD CONSTRAINT "SolicitudEvento_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudInterna"("id") ON DELETE CASCADE ON UPDATE CASCADE;

