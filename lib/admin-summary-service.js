import { summaryScope, summaryLinks, summarizeSalesAggregates, summaryCurrency, moneyCents, centsMoney } from "./summary-policy";
import { solicitudesReadWhere } from "./solicitudes-internas";

const LIVE_SALE = { tipo: "venta", estado: { notIn: ["cancelada", "rechazada"] } };
const count = rows => (rows || []).reduce((sum, row) => sum + Number(row._count?._all || 0), 0);
const stateCount = (rows, states) => count((rows || []).filter(row => states.includes(row.estado)));
const stateCounts = model => model.groupBy({ by: ["estado"], _count: { _all: true } });
const countCard = (id, label, value, detail) => ({ id, label, value, format: "count", detail });
const moneyCard = (id, label, value, currency, detail) => ({ id, label, value, currency, format: "money", detail });

// El resumen se calcula completo en el servidor, no sobre las primeras 100
// filas que el panel cargó para sus listas. La misma instantánea de lectura
// evita contar dos veces un histórico mientras se vincula su factura.
export async function getAdminSummary(db, session, permisos) {
  const scope = summaryScope(permisos);
  if (!scope.allowed) throw Object.assign(new Error("No autorizado."), { status: 403 });
  return db.$transaction(async tx => {
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const jobs = {};
    if (scope.workers) {
      jobs.workers = stateCounts(tx.trabajador);
      jobs.recentWorkers = tx.trabajador.findMany({
        where: { ingreso: { not: null } }, orderBy: { ingreso: "desc" }, take: 5,
        select: { id: true, nombre: true, puesto: true, ingreso: true },
      });
    }
    if (scope.branches) {
      jobs.branches = stateCounts(tx.sucursal);
      jobs.branchList = tx.sucursal.findMany({ orderBy: { nombre: "asc" }, take: 6, select: { id: true, nombre: true, estado: true } });
      if (scope.workers) jobs.branchWorkers = tx.trabajador.groupBy({ by: ["sucursalId"], _count: { _all: true } });
    }
    if (scope.customers) jobs.customers = stateCounts(tx.cliente);
    if (scope.products && !scope.inventory) jobs.products = tx.producto.groupBy({ where: { archivado: false }, by: ["estado"], _count: { _all: true } });
    if (scope.prices) jobs.prices = tx.producto.aggregate({ where: { archivado: false, estado: "activo" }, _count: { _all: true, precioDescuento: true, precioMayorista: true } });
    if (scope.categories) jobs.categories = stateCounts(tx.categoria);
    if (scope.roles) jobs.roles = stateCounts(tx.rol);
    if (scope.commercial) {
      jobs.quotes = tx.orden.groupBy({ where: { tipo: "cotizacion" }, by: ["estado"], _count: { _all: true } });
      if (scope.reports) {
        // No consultar ni deducir facturas ocultas cuando falta lectura fiscal.
        jobs.legacy = scope.fiscal ? tx.$queryRaw`
          SELECT COUNT(*)::int AS count, COALESCE(SUM(GREATEST(0, o.monto - o.descuento)), 0)::text AS amount
          FROM "Orden" o WHERE o.tipo = 'venta' AND o.estado NOT IN ('cancelada', 'rechazada')
            AND NOT EXISTS (SELECT 1 FROM "DocumentoFiscal" f WHERE f."ordenId" = o.id AND f.tipo = 'factura' AND f.estado <> 'anulado')
        ` : tx.$queryRaw`
          SELECT COUNT(*)::int AS count, COALESCE(SUM(GREATEST(0, o.monto - o.descuento)), 0)::text AS amount
          FROM "Orden" o WHERE o.tipo = 'venta' AND o.estado NOT IN ('cancelada', 'rechazada')
        `;
        jobs.payments = tx.pago.aggregate({ where: { estado: "confirmado", orden: LIVE_SALE }, _sum: { monto: true } });
      } else {
        jobs.legacyCount = tx.orden.count({ where: { ...LIVE_SALE, ...(scope.fiscal ? { documentos: { none: { tipo: "factura", estado: { not: "anulado" } } } } : {}) } });
      }
    }
    if (scope.fiscal) {
      jobs.fiscal = tx.documentoFiscal.groupBy({
        by: scope.reports ? ["tipo", "estado", "moneda"] : ["tipo", "estado"],
        _count: { _all: true }, ...(scope.reports ? { _sum: { total: true } } : {}),
      });
      jobs.pendingCai = tx.documentoFiscal.count({ where: { tipo: "factura", estado: { not: "anulado" }, OR: [{ cai: null }, { cai: "" }, { correlativo: null }, { correlativo: "" }] } });
    }
    if (scope.purchases) {
      jobs.purchases = tx.ordenCompra.groupBy({
        by: scope.reports ? ["tipo", "estado", "moneda"] : ["tipo", "estado"],
        _count: { _all: true }, ...(scope.reports ? { _sum: { total: true } } : {}),
      });
      jobs.providers = tx.proveedor.count({ where: { estado: "activo" } });
    }
    if (scope.requests) jobs.requests = (async () => {
      const areas = await tx.areaSolicitud.findMany({ where: { roles: { has: session.rol } }, select: { slug: true } });
      const where = solicitudesReadWhere(session, areas.map(area => area.slug));
      const [states, overdue] = await Promise.all([
        tx.solicitudInterna.groupBy({ where, by: ["estado"], _count: { _all: true } }),
        tx.solicitudInterna.count({ where: { AND: [where, { estado: { notIn: ["completada", "rechazada"] }, fechaLimite: { lt: new Date() } }] } }),
      ]);
      return { states, overdue, all: Object.keys(where).length === 0 };
    })();
    if (scope.logs) jobs.errors = tx.log.count({ where: { nivel: "error", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } });

    const values = Object.fromEntries(await Promise.all(Object.entries(jobs).map(async ([key, value]) => [key, await value])));
    return buildAdminSummary(scope, values);
  }, { isolationLevel: "RepeatableRead", maxWait: 5000, timeout: 20000 });
}

// Sólo números/DTO explícitos. No se devuelve el resultado bruto de Prisma,
// costos, rangos CAI, correos, sesiones ni campos de módulos no autorizados.
export function buildAdminSummary(scope, data) {
  const groups = [];
  const add = (id, title, cards, target) => { if (cards.length) groups.push({ id, title, cards, target }); };
  if (scope.commercial || scope.fiscal) {
    const legacy = scope.commercial ? scope.reports ? data.legacy[0] : { count: data.legacyCount } : undefined;
    const sales = summarizeSalesAggregates({ legacy, fiscal: data.fiscal, financial: scope.reports });
    const cards = [];
    const detail = scope.commercial && scope.fiscal
      ? "Facturas e históricos sin duplicar; descuentos y notas aplicados. Incluye el ISV registrado, no equivale a cobros."
      : scope.fiscal ? "Sólo documentos fiscales: facturas y notas vigentes, con el ISV registrado. No equivale a cobros."
        : "Sólo ventas comerciales vigentes, netas de descuento. No incluye documentos fiscales ni equivale a cobros.";
    if (scope.reports) for (const [index, total] of sales.amounts.entries()) cards.push(moneyCard(
      `sales-total-${index}`, `Ventas registradas · ${total.currency}`, total.amount, total.currency,
      detail,
    ));
    if (scope.commercial) cards.push(countCard("sales-count", scope.fiscal ? "Ventas vigentes" : "Ventas comerciales vigentes", sales.sales, scope.fiscal ? "Las notas de crédito/débito no se cuentan como ventas nuevas." : "Históricos no cancelados ni rechazados; no incluye cotizaciones ni documentos fiscales."));
    if (scope.fiscal) {
      cards.push(countCard("fiscal-count", "Facturas emitidas", sales.invoices, `${sales.cancelled} anuladas excluidas · ${sales.credits} notas de crédito · ${sales.debits} notas de débito.`));
      if (data.pendingCai) cards.push({ ...countCard("pending-cai", "Pendientes de CAI/número", data.pendingCai, "Registros sin autorización completa: no tienen validez fiscal."), tone: "warning" });
    }
    if (scope.commercial) {
      cards.push(countCard("quotes", "Cotizaciones registradas", count(data.quotes), `${stateCount(data.quotes, ["pendiente"])} pendientes · no se suman como ventas.`));
      if (scope.reports) cards.push(moneyCard("commercial-payments", "Cobros comerciales confirmados", centsMoney(moneyCents(data.payments?._sum?.monto)), "HNL", "Sólo pagos confirmados de órdenes comerciales. No se infieren cobros de facturas independientes."));
    }
    add("ventas", scope.commercial && scope.fiscal ? "Ventas y cotizaciones" : scope.fiscal ? "Facturación fiscal" : "Documentos comerciales", cards, "ventas");
  }
  if (scope.customers) add("clientes", "Clientes", [countCard("customers", "Clientes registrados", count(data.customers), `${stateCount(data.customers, ["prospecto"])} prospectos · ${stateCount(data.customers, ["activo"])} activos.`)], "clientes");
  const catalogCards = [];
  if (scope.products && !scope.inventory) catalogCards.push(countCard("products", "Productos en catálogo", count(data.products), `${stateCount(data.products, ["activo"])} activos · no incluye bajas definitivas.`));
  if (scope.prices) catalogCards.push(countCard("prices", "Productos activos con tarifas", Number(data.prices._count._all), `${Number(data.prices._count.precioDescuento)} con descuento · ${Number(data.prices._count.precioMayorista)} con mayorista. No son costos de compra.`));
  add("catalogo", "Catálogo y tarifas", catalogCards, scope.products ? "productos" : "ventas");
  if (scope.purchases) {
    const purchases = data.purchases.filter(row => row.tipo === "compra");
    const quoted = data.purchases.filter(row => row.tipo === "cotizacion" && !["cancelada", "convertida"].includes(row.estado));
    const cards = [
      countCard("purchases", "Compras registradas", count(purchases), `${stateCount(purchases, ["borrador"])} borradores · ${stateCount(purchases, ["enviada", "parcial"])} por recibir.`),
      countCard("supplier-quotes", "Cotizaciones a proveedores", count(quoted), "Separadas de cotizaciones a clientes y de compras confirmadas."),
      countCard("providers", "Proveedores activos", data.providers, "Consulta de abastecimiento autorizada."),
    ];
    if (scope.reports) {
      const amounts = new Map();
      for (const row of purchases.filter(row => ["enviada", "parcial", "recibida"].includes(row.estado))) {
        const currency = summaryCurrency(row.moneda);
        amounts.set(currency, (amounts.get(currency) || 0n) + moneyCents(row._sum?.total));
      }
      if (!amounts.size) amounts.set("HNL", 0n);
      for (const [index, [currency, amount]] of [...amounts].sort(([a], [b]) => a.localeCompare(b)).entries()) cards.push(moneyCard(`purchase-total-${index}`, `Compras confirmadas · ${currency}`, centsMoney(amount), currency, "Enviadas, parciales o recibidas; excluye borradores, cotizaciones y canceladas. No equivale a pagos."));
    }
    add("compras", "Abastecimiento", cards, "compras");
  }
  if (scope.requests) add("solicitudes", "Órdenes internas de tu alcance", [
    countCard("requests-open", "Órdenes en curso", stateCount(data.requests.states, ["pendiente", "en_revision", "aprobada", "en_proceso"]), data.requests.all ? "Órdenes del sistema según el acceso de gestión autorizado." : "Sólo las tuyas, asignadas o de tus áreas; según la política vigente de acceso."),
    { ...countCard("requests-overdue", "Fuera de plazo", data.requests.overdue, "Excluye completadas y rechazadas."), ...(data.requests.overdue ? { tone: "warning" } : {}) },
  ], "solicitudes");
  if (scope.workers) add("personal", "Personal", [countCard("workers", "Trabajadores registrados", count(data.workers), `${stateCount(data.workers, ["activo"])} activos.`)], "trabajadores");
  if (scope.branches) add("sucursales", "Sucursales", [countCard("branches", "Sucursales registradas", count(data.branches), `${stateCount(data.branches, ["activo"])} activas.`)], "sucursales");
  const adminCards = [];
  if (scope.categories) adminCards.push(countCard("categories", "Categorías", count(data.categories), `${stateCount(data.categories, ["activo"])} activas.`));
  if (scope.roles) adminCards.push(countCard("roles", "Roles configurados", count(data.roles), `${stateCount(data.roles, ["activo"])} activos. No concede privilegios nuevos.`));
  if (scope.logs) adminCards.push(countCard("errors", "Errores registrados · 24 h", data.errors, "Bitácora global, sólo con su permiso específico."));
  add("administracion", "Administración y control", adminCards, scope.roles ? "roles" : scope.categories ? "categorias" : "logs");
  return {
    generatedAt: new Date().toISOString(), inventory: scope.inventory, groups, links: summaryLinks(scope),
    ...(scope.workers ? { recentWorkers: data.recentWorkers.map(worker => ({ id: worker.id, nombre: worker.nombre, puesto: worker.puesto, ingreso: worker.ingreso ? new Date(worker.ingreso).toISOString().slice(0, 10) : null })) } : {}),
    ...(scope.branches ? { branches: data.branchList.map(branch => ({ id: branch.id, nombre: branch.nombre, estado: branch.estado, ...(scope.workers ? { workers: Number(data.branchWorkers.find(row => row.sucursalId === branch.id)?._count?._all || 0) } : {}) })), branchCount: count(data.branches) } : {}),
  };
}
