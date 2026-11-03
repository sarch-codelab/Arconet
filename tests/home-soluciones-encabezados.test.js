import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const home = readFileSync("app/home-experience.js", "utf8");
const solutions = home.match(/const SOLUTIONS = \[[\s\S]*?\n\];/)?.[0] || "";

const headings = [...solutions.matchAll(
  /stageEyebrow: "([^"]+)",\s*stageTitle: "([^"]+)",\s*stageAccent: "([^"]+)",/g
)].map((match) => match.slice(1));

describe("encabezados propios para cada solución", () => {
  it("conserva el primero y define textos distintos para 02, 03 y 04", () => {
    expect(headings).toEqual([
      ["Arconet · tecnología que impulsa", "Conexiones que", "mueven Honduras."],
      ["Arconet · conectividad que acerca", "Redes que llegan", "a cada hogar."],
      ["Arconet · infraestructura confiable", "Orden que impulsa", "redes más sólidas."],
      ["Arconet · respaldo que acompaña", "Experiencia que", "conecta contigo."],
    ]);
    expect(new Set(headings.map((heading) => heading.join(" "))).size).toBe(4);
  });

  it("muestra solo el encabezado de la diapositiva activa", () => {
    expect(home).toContain("hidden={activeSlide !== index}");
    expect(home).toContain("{solution.stageEyebrow}");
    expect(home).toContain("{solution.stageTitle}");
    expect(home).toContain("{solution.stageAccent}");
  });

  it("mantiene el estilo en cursiva y el revelado tipográfico", () => {
    expect(home).toContain("<h2 data-split>{solution.stageTitle} <span>{solution.stageAccent}</span></h2>");
  });
});
