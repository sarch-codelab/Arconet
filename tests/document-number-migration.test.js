import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const migration = readFileSync("prisma/migrations/20261102120000_numeros_documentos_legibles/migration.sql", "utf8");

describe("numeración interna de cotizaciones y facturas", () => {
  it("expone un número único sin confundirlo con el correlativo fiscal", () => {
    const orden = schema.split("model Orden {")[1].split("model OrdenItem {")[0];
    const fiscal = schema.split("model DocumentoFiscal {")[1].split("model DocumentoFiscalItem {")[0];
    expect(orden).toContain("numero");
    expect(orden).toContain("@unique");
    expect(fiscal).toContain("numero");
    expect(fiscal).toContain("@unique");
    expect(fiscal).toContain("correlativo");
    expect(migration).not.toContain('SET "correlativo"');
  });

  it("inicia cot-N y fac-N en cero con secuencias independientes", () => {
    expect(migration).toContain('"documento_cotizacion_seq"');
    expect(migration).toContain('"documento_factura_seq"');
    expect(migration.match(/MINVALUE 0 START WITH 0 INCREMENT BY 1 NO CYCLE/g)).toHaveLength(2);
    expect(migration).toContain("'cot-'");
    expect(migration).toContain("'fac-'");
    expect(migration).toContain('ELSIF NEW."tipo" = \'factura\' THEN');
    expect(migration).not.toContain('WHERE "tipo" = \'venta\'');
  });

  it("rellena los históricos y deja las secuencias en el siguiente valor libre", () => {
    expect(migration.match(/ROW_NUMBER\(\) OVER/g)).toHaveLength(2);
    expect(migration.match(/SELECT setval\(/g)).toHaveLength(2);
    expect(migration).toContain('CREATE UNIQUE INDEX "Orden_numero_key"');
    expect(migration).toContain('CREATE UNIQUE INDEX "DocumentoFiscal_numero_key"');
  });

  it("numera en el servidor cada alta nueva sin reescribir números al editar", () => {
    expect(migration).toContain('IF NEW."numero" IS NULL THEN');
    expect(migration).toContain('CREATE TRIGGER "Orden_numero_documento_before_insert"');
    expect(migration).toContain('CREATE TRIGGER "DocumentoFiscal_numero_documento_before_insert"');
    expect(migration.match(/BEFORE INSERT ON/g)).toHaveLength(2);
    expect(migration).not.toContain("BEFORE UPDATE");
  });
});
