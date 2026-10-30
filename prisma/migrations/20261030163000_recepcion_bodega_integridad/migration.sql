ALTER TABLE "RecepcionCompra" ADD CONSTRAINT "RecepcionCompra_bodegaId_fkey" FOREIGN KEY ("bodegaId") REFERENCES "Bodega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
