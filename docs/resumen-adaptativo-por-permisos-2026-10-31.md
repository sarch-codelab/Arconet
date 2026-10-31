# Resumen adaptativo por permisos — 31 de octubre de 2026

## Objetivo y resultado

El Resumen deja de calcular sus cifras a partir de las listas parciales cargadas en el navegador y deja de mostrar tarjetas de áreas ajenas con «Sin permiso de consulta». Se construye con los **permisos efectivos de la cuenta**, no con nombres de roles ni con un diseño reservado al administrador.

Cualquier rol con lectura de un área conocida puede abrir su resumen operativo. Esto **no concede `reportes:read`** ni acceso a otros módulos. Los roles sin lecturas, inactivos o inexistentes conservan únicamente Mi perfil. Se preservan los destinos iniciales existentes de los roles que entraban directamente a su módulo.

## Autorización y datos

- Nuevo **GET `/api/resumen`** autenticado. Relee los permisos del rol en cada consulta y no admite permisos por query/body. Respuesta no cacheable y DTO explícito, sin costos, CAI, correos, contraseñas ni sesiones.
- Cada bloque sólo consulta los modelos autorizados. Personal reciente requiere Trabajadores: Ver; sucursales sin ese permiso no incluyen nombres ni cantidades de personal.
- **Los importes consolidados requieren Reportes y la lectura del área correspondiente.** Sin Reportes se calculan indicadores operativos, no se consultan SUM monetarios ni se ocultan importes ya descargados mediante CSS.
- La agregación usa una transacción **RepeatableRead y de sólo lectura**. No depende de los primeros 100 registros de las listas ni escribe documentos, stock, permisos o configuraciones.
- Bodega conserva su componente/endpoint de inventario: existencias separadas por unidad, alertas, bodegas, movimientos y recepción según sus accesos. No se suman metros y piezas ni se valora stock a precio de venta.
- Las órdenes internas conservan el alcance existente de autor, responsable y áreas asignadas, incluidas las políticas de gestión ya existentes. El listado y el resumen comparten la construcción del filtro; Reportes no amplía por sí mismo ese alcance.
- Se cierra una vía alternativa en `/api/reportes`: Reportes por sí solo no permite consultar áreas no autorizadas. Exportaciones de stock sin permiso de costo omiten costo/valorización también en CSV/XLS, sin simularlos como cero. No se endureció GET productos.

## Ventas: significado de las cifras

1. Se incluyen facturas fiscales y ventas comerciales vigentes. Se excluyen ventas canceladas/rechazadas y documentos fiscales anulados.
2. Cuando ambas fuentes son visibles, un histórico vinculado a una **factura activa** no vuelve a sumarse. Si sólo se autoriza la fuente comercial, no se consulta ni se deduce información fiscal oculta.
3. El importe comercial resta su descuento una sola vez. El fiscal usa su total registrado, que ya contiene descuento/ISV; notas de crédito restan y notas de débito suman, sin convertirse en ventas adicionales.
4. Las cotizaciones tienen su contador propio y nunca se suman al total vendido.
5. Facturas y compras se agrupan por su **moneda registrada**, sin conversión ni suma entre HNL y USD. Históricos comerciales/pagos continúan en HNL, como su modelo comercial actual. Los centavos se conservan con aritmética entera y formato decimal exacto.
6. «Ventas registradas» **no equivale a cobros** ni certifica autorización fiscal. Los documentos sin CAI/número se identifican como pendientes/sin validez fiscal.
7. «Cobros comerciales confirmados» sólo refleja pagos confirmados de órdenes de venta vigentes. No se inventan cobros o saldos de facturas independientes, que no tienen ese vínculo de pagos en el modelo actual.
8. El rol exclusivamente fiscal no recibe un segundo contador idéntico de ventas ni etiquetas que prometan cotizaciones/históricos ocultos.

Las compras confirmadas excluyen borradores, canceladas y cotizaciones a proveedores; no se presentan como pagos efectuados. Los reportes comerciales existentes mantienen su alcance: no se añadió una nueva exportación fiscal en esta entrega.

## Interfaz

- Tarjetas, títulos, filtros y accesos sólo de las áreas disponibles. Sin huecos por tarjetas no autorizadas; las tarjetas únicas se expanden.
- Clientes/catálogo para Ventas, indicadores operativos para Técnico, abastecimiento para compradores, Personal/Sucursales separados y accesos propios para perfiles sin indicadores (p. ej. Ajustes).
- Botón Actualizar, fecha de actualización y nueva consulta al regresar. Un fallo muestra error y reintento, no ceros falsos ni datos anteriores presentados como actuales.
- Navegación con el controlador existente del panel. Los enlaces SPA del resumen evitan disparar además la captura global de enlaces, manteniendo una sola transición.
- Tema personal claro/oscuro y logo blanco en oscuro conservados. Sin cambios de impresión ni animaciones de la portada.

## Validación exclusivamente local

- **770 tests / 44 archivos: PASS.** Incluyen autorización, consultas no ejecutadas sin permiso, DTO, renderizado real, precisión decimal, notas/monedas, enlaces y reportes/exportaciones.
- ESLint completo: **0 errores / 58 advertencias** existentes.
- Build Next: **PASS**. En este entorno la generación Prisma usa el override local de descarga `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true`; no se confunde con validación nativa. Aviso controlado del catálogo al compilar con la base detenida, sin bloquear el build.
- **112 vistas de cuenta/tamaño/tema** (14 cuentas × 4 tamaños × 2 temas, 320–1440 px) y **31 interacciones** en sus filtros/enlaces: sin errores JS ni overflow. Incluye los seis roles estándar (Administrador, Gerente, Ventas, Técnico, Bodega, Mantenimiento), además de roles personalizados de lectura por área. Dos casos adicionales de rol inactivo/inexistente permanecen en Mi perfil.
- Smoke del panel: **36 entradas / 134 interacciones**, Administración y Ventas en móvil/escritorio, sin errores observados. Se esperó la finalización de transiciones antes de continuar con filtros que pueden navegar a otra sección.
- **13 comprobaciones integrales de API** y **4 de comportamiento UI**: permisos revocados/cambiados con la misma sesión, error/reintento, actualización de cifras y regreso sin recarga del documento principal.
- Dataset auxiliar: **112 documentos fiscales**, notas/anulados, vínculo comercial, más de 100 facturas, HNL/USD, cotizaciones de gran importe que no se suman, pagos confirmados/pendientes/anulados y solicitudes propias/asignadas/de área/ajenas. Registros de QA exclusivamente locales, sin CAI ni numeración fiscal inventada; no son emisiones reales de producción.
- Resultado conocido del dataset: **HNL 13,171.05 y USD 20.00 separados**, 111 ventas vigentes, 108 facturas; sólo HNL 35.00 en cobros comerciales confirmados. La anulación simulada del vínculo fiscal reintroduce correctamente su histórico sin duplicación.

## Limpieza y límites

Se retiraron todos los registros auxiliares, 13 usuarios, 10 roles de QA y 14 logs propios. **Las 24 tablas auditadas coinciden en conteo y SHA-256 con el baseline anterior a fixtures**, reconfirmado tras la navegación final. No se resembraron ni borraron datos ajenos.

No se inició sesión ni se hicieron operaciones comerciales en producción; no hubo despliegue manual. No se modificaron esquema ni migraciones ni se concedieron permisos nuevos en los roles guardados. La publicación en `main` se entrega mediante commit/push/PR/CI/fusión; que el servidor termine de recogerla por su poller requiere verificación independiente. Capturas, sesiones, configuración y herramientas privadas permanecen fuera de Git.
