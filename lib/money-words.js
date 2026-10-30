import { roundMoney } from "./ventas-form";
const units = [
  "CERO",
  "UNO",
  "DOS",
  "TRES",
  "CUATRO",
  "CINCO",
  "SEIS",
  "SIETE",
  "OCHO",
  "NUEVE",
  "DIEZ",
  "ONCE",
  "DOCE",
  "TRECE",
  "CATORCE",
  "QUINCE",
  "DIECISÉIS",
  "DIECISIETE",
  "DIECIOCHO",
  "DIECINUEVE",
  "VEINTE",
  "VEINTIUNO",
  "VEINTIDÓS",
  "VEINTITRÉS",
  "VEINTICUATRO",
  "VEINTICINCO",
  "VEINTISÉIS",
  "VEINTISIETE",
  "VEINTIOCHO",
  "VEINTINUEVE",
];
const tens = [
  "",
  "",
  "",
  "TREINTA",
  "CUARENTA",
  "CINCUENTA",
  "SESENTA",
  "SETENTA",
  "OCHENTA",
  "NOVENTA",
];
const hundreds = [
  "",
  "CIENTO",
  "DOSCIENTOS",
  "TRESCIENTOS",
  "CUATROCIENTOS",
  "QUINIENTOS",
  "SEISCIENTOS",
  "SETECIENTOS",
  "OCHOCIENTOS",
  "NOVECIENTOS",
];
const apocope = (text) =>
  text.replace(/VEINTIUNO$/, "VEINTIÚN").replace(/UNO$/, "UN");
function integer(n) {
  if (n < 30) return units[n];
  if (n < 100)
    return tens[Math.floor(n / 10)] + (n % 10 ? ` Y ${units[n % 10]}` : "");
  if (n === 100) return "CIEN";
  if (n < 1000)
    return (
      hundreds[Math.floor(n / 100)] + (n % 100 ? ` ${integer(n % 100)}` : "")
    );
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    return (
      (thousands === 1 ? "MIL" : `${apocope(integer(thousands))} MIL`) +
      (n % 1000 ? ` ${integer(n % 1000)}` : "")
    );
  }
  const millions = Math.floor(n / 1000000);
  return (
    (millions === 1 ? "UN MILLÓN" : `${apocope(integer(millions))} MILLONES`) +
    (n % 1000000 ? ` ${integer(n % 1000000)}` : "")
  );
}
export function moneyWords(value) {
  const amount = roundMoney(value);
  if (!Number.isFinite(amount) || amount < 0 || amount > 9999999999.99)
    return "";
  const cents = Math.round(amount * 100);
  return `${integer(Math.floor(cents / 100))} CON ${String(cents % 100).padStart(2, "0")}/100`;
}
