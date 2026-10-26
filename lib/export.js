// Utilidades de exportación a CSV (UTF-8 con BOM para Excel en español).
// XLSX no requiere librerías: la planilla de Excel abre HTML/XML de Excel,
// así que emitimos SpreadsheetML simple sin dependencias adicionales.

function escapeCsv(value) {
  if (value == null) return "";
  const text = String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers, rows) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) lines.push(row.map(escapeCsv).join(","));
  // BOM para que Excel detecte UTF-8 y acentos.
  return `﻿${lines.join("\r\n")}`;
}

export function csvResponse(filename, headers, rows) {
  return new Response(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function excelSerial(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const epoch = Date.UTC(1899, 11, 30);
  return Math.floor((d.getTime() - epoch) / 86_400_000);
}

/**
 * Planilla SpreadsheetML (Excel 2003 XML) sin dependencias.
 * `rows` acepta strings, números o Date (Excel serial).
 */
export function xlsxBinaryXml(sheetName, headers, rows) {
  const cell = (value, isHeader = false) => {
    const style = isHeader ? ' ss:StyleID="header"' : "";
    if (value instanceof Date) return `<Cell${style}><Data ss:Type="Number">${excelSerial(value)}</Data></Cell>`;
    if (typeof value === "number" && Number.isFinite(value)) return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
    return `<Cell${style}><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
  };
  const headerRow = `<Row>${headers.map((h) => cell(h, true)).join("")}</Row>`;
  const body = rows.map((row) => `<Row>${row.map((v) => cell(v)).join("")}</Row>`).join("");
  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="header"><Font ss:Bold="1"/></Style>
 </Styles>
 <Worksheet ss:Name="${escapeXml(sheetName)}">
  <Table>${headerRow}${body}</Table>
 </Worksheet>
</Workbook>`;
}

export function xlsxResponse(filename, sheetName, headers, rows) {
  return new Response(xlsxBinaryXml(sheetName, headers, rows), {
    headers: {
      "Content-Type": "application/vnd.ms-excel",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
