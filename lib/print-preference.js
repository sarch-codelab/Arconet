import { isPrintPaper } from "./print-paper.js";

const STORAGE_KEY = "arconet-print-paper";
let memoryPaper = "auto";

export function getPrintPaperPreference() {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isPrintPaper(saved)) memoryPaper = saved;
  } catch { /* Navegación privada/iframe: usar la preferencia en memoria. */ }
  return memoryPaper;
}

export function rememberPrintPaperPreference(paper) {
  if (!isPrintPaper(paper)) return;
  memoryPaper = paper;
  try { window.localStorage.setItem(STORAGE_KEY, paper); } catch { /* Memoria. */ }
}
