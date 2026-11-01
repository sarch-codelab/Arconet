import { describe, expect, it } from "vitest";

// El proyecto corre en entorno node (sin jsdom), así que se usa un DOM mínimo
// en memoria con la misma forma que espera la lógica de división: nodos de
// texto (3), de elemento (1) y fragmentos.
class NodoTexto {
  constructor(texto) {
    this.nodeType = 3;
    this.textContent = texto;
  }
}

class NodoElemento {
  constructor(tagName) {
    this.nodeType = 1;
    this.tagName = tagName;
    this.childNodes = [];
    this.className = "";
    this.style = { props: {}, setProperty: (k, v) => (this.style.props[k] = v) };
  }
  appendChild(hijo) {
    this.childNodes.push(hijo);
    return hijo;
  }
  get textContent() {
    return this.childNodes.map((h) => h.textContent).join("");
  }
  set textContent(valor) {
    this.childNodes = [new NodoTexto(valor)];
  }
}

class Fragmento {
  constructor() {
    this.nodeType = 11;
    this.childNodes = [];
  }
  appendChild(hijo) {
    this.childNodes.push(hijo);
    return hijo;
  }
  get textContent() {
    return this.childNodes.map((h) => h.textContent).join("");
  }
}

const styles = { palabra: "p", palabraInterior: "pi" };

// Réplica de la lógica de home-experience.js.
function dividir(titulo) {
  let indice = 0;
  const envolver = (padre) => {
    const hijos = [...padre.childNodes];
    hijos.forEach((nodo) => {
      if (nodo.nodeType === 1) {
        if (nodo.tagName === "BR") return;
        envolver(nodo);
        return;
      }
      if (nodo.nodeType !== 3) return;
      const trozos = (nodo.textContent || "").split(/(\s+)/);
      if (!trozos.some((t) => t.trim())) return;

      const fragmento = new Fragmento();
      trozos.forEach((trozo) => {
        if (!trozo) return;
        if (!trozo.trim()) {
          fragmento.appendChild(new NodoTexto(" "));
          return;
        }
        const exterior = new NodoElemento("SPAN");
        exterior.className = styles.palabra;
        const interior = new NodoElemento("SPAN");
        interior.className = styles.palabraInterior;
        interior.textContent = trozo;
        interior.style.setProperty("--retraso", `${Math.min(indice * 45, 620)}ms`);
        exterior.appendChild(interior);
        fragmento.appendChild(exterior);
        indice += 1;
      });
      const pos = padre.childNodes.indexOf(nodo);
      padre.childNodes.splice(pos, 1, ...fragmento.childNodes);
    });
  };
  envolver(titulo);
  return indice;
}

function h2(...hijos) {
  const el = new NodoElemento("H2");
  hijos.forEach((h) => el.appendChild(h));
  return el;
}

function contador(raiz, clase) {
  let n = 0;
  const recorrer = (nodo) => {
    if (nodo.className === clase) n += 1;
    (nodo.childNodes || []).forEach(recorrer);
  };
  recorrer(raiz);
  return n;
}

function buscar(raiz, tag) {
  if (raiz.tagName === tag) return raiz;
  for (const hijo of raiz.childNodes || []) {
    const r = buscar(hijo, tag);
    if (r) return r;
  }
  return null;
}

const plano = (texto) => texto.replace(/\s+/g, " ").trim();

describe("división en palabras: conserva la estructura", () => {
  it("mantiene el <em> de la segunda línea", () => {
    const em = new NodoElemento("EM");
    em.textContent = "Quién te acompaña, también.";
    const titulo = h2(new NodoTexto("La tecnología es importante."), new NodoElemento("BR"), em);

    dividir(titulo);

    const emFinal = buscar(titulo, "EM");
    expect(emFinal).not.toBeNull();
    expect(plano(emFinal.textContent)).toBe("Quién te acompaña, también.");
  });

  it("mantiene el <br> que separa las dos líneas", () => {
    const titulo = h2(new NodoTexto("Calidad y garantía"), new NodoElemento("BR"), new NodoTexto("en la que puedes confiar."));
    dividir(titulo);
    expect(buscar(titulo, "BR")).not.toBeNull();
  });

  it("el texto visible no cambia", () => {
    const original = "Más que una distribuidora. Un aliado para tu red.";
    const titulo = h2(new NodoTexto(original));
    dividir(titulo);
    expect(plano(titulo.textContent)).toBe(original);
  });

  it("envuelve cada palabra para poder animarla", () => {
    const titulo = h2(new NodoTexto("Un aliado para tu red."));
    const total = dividir(titulo);
    expect(total).toBe(5);
    expect(contador(titulo, "p")).toBe(5);
    expect(contador(titulo, "pi")).toBe(5);
  });

  it("conserva los <span> internos", () => {
    const span = new NodoElemento("SPAN");
    span.textContent = "en movimiento.";
    const titulo = h2(new NodoTexto("Soluciones "), span);
    dividir(titulo);
    expect(buscar(titulo, "SPAN")).not.toBeNull();
    expect(plano(titulo.textContent)).toBe("Soluciones en movimiento.");
  });

  it("el retraso nunca supera el tope de 620ms", () => {
    const palabras = Array.from({ length: 40 }, (_, i) => `p${i}`).join(" ");
    const titulo = h2(new NodoTexto(palabras));
    dividir(titulo);

    let ultimo = null;
    const recorrer = (nodo) => {
      if (nodo.className === "pi") ultimo = nodo;
      (nodo.childNodes || []).forEach(recorrer);
    };
    recorrer(titulo);
    expect(ultimo.style.props["--retraso"]).toBe("620ms");
  });
});
