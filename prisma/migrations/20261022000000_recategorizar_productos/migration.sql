-- Renombra las categorías existentes al nuevo catálogo de Arconet.
UPDATE "Producto" SET "categoria" = 'Componentes pasivos' WHERE "categoria" = 'Fibra óptica';
UPDATE "Producto" SET "categoria" = 'Soluciones activas y Accesorios FTTH' WHERE "categoria" = 'CATV y satélite';
UPDATE "Producto" SET "categoria" = 'Gabinetes y Racks' WHERE "categoria" = 'Infraestructura';
UPDATE "Producto" SET "categoria" = 'Instrumentos de medición óptica' WHERE "categoria" = 'Medición y señal';
UPDATE "Producto" SET "categoria" = 'Herramientas y kits' WHERE "categoria" = 'Accesorios';
