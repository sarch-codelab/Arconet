// Recompone las ilustraciones de línea a formato apaisado para las tarjetas.
//
// Las imágenes originales son verticales (2:3) y las tarjetas apaisadas (1.55:1),
// así que al recortar se perdían trozos del objeto. Este script:
//   1. detecta el objeto comparando cada píxel con el fondo local de su fila;
//   2. reconstruye la placa de fondo sin el objeto (degradado limpio);
//   3. vuelve a colocar el objeto recortado, con alfa suave en los bordes para
//      conservar la sombra de contacto, centrado en un lienzo apaisado.

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ANCHO = 1200;
const ALTO = 800; // 1.5:1, cerca del 1.55 de la tarjeta
const UMBRAL_OBJETO = 56; // diferencia mínima para considerarlo objeto
const UMBRAL_ALFA = 26; // transición suave de la sombra
const OCUPACION = 0.72; // fracción del lienzo que puede ocupar el objeto

const mediana = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function procesar(entrada, salida) {
  const base = sharp(entrada).rotate();
  const { data, info } = await base
    .clone()
    .resize(300, null, { fit: "inside" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const W = info.width;
  const H = info.height;
  const C = info.channels;
  const at = (x, y) => (y * W + x) * C;

  // ---- 1. Fondo local por fila (los bordes de cada fila son fondo) ----
  const borde = Math.max(3, Math.round(W * 0.05));
  const fondoFila = [];
  for (let y = 0; y < H; y++) {
    const muestra = [[], [], []];
    for (let x = 0; x < borde; x++) {
      for (let k = 0; k < 3; k++) {
        muestra[k].push(data[at(x, y) + k]);
        muestra[k].push(data[at(W - 1 - x, y) + k]);
      }
    }
    fondoFila.push(muestra.map(mediana));
  }

  // ---- 2. Máscara de objeto ----
  const alfa = new Float32Array(W * H);
  let minX = W, maxX = -1, minY = H, maxY = -1;
  for (let y = 0; y < H; y++) {
    const bg = fondoFila[y];
    for (let x = 0; x < W; x++) {
      const i = at(x, y);
      const d =
        Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      // Rampa suave: por debajo del umbral alfa es 0 (fondo puro), entre los
      // dos umbrales se desvanece, y por encima es opaco.
      const a = Math.max(0, Math.min(1, (d - UMBRAL_ALFA) / (UMBRAL_OBJETO + 30 - UMBRAL_ALFA)));
      alfa[y * W + x] = a;
      if (d > UMBRAL_OBJETO) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("no se detectó objeto en " + entrada);

  // ---- 3. Fondo: degradado 2D interpolado de las cuatro esquinas ----
  // Desenfocar la imagen entera dejaba las manchas de la sombra original. Un
  // degradado vertical plano tampoco servía: el fondo de las ilustraciones es
  // diagonal. Interpolar bilinealmente las cuatro esquinas (fondo puro en
  // todas) reproduce el campo de color exacto y no arrastra nada del objeto.
  const esquina = (x, y) => {
    let sx = [0, 0, 0], n = 0;
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        const xx = x < 0 ? Math.abs(x) + dx : W - 1 - Math.abs(x) - dx;
        const yy = y < 0 ? Math.abs(y) + dy : H - 1 - Math.abs(y) - dy;
        const i = at(Math.min(W - 1, xx), Math.min(H - 1, yy));
        sx[0] += data[i]; sx[1] += data[i + 1]; sx[2] += data[i + 2]; n++;
      }
    }
    return sx.map((v) => v / n);
  };
  const c00 = esquina(0, 0); // 1 = arriba-izquierda
  const c10 = esquina(1, 0); // arriba-derecha
  const c01 = esquina(0, 1); // abajo-izquierda
  const c11 = esquina(1, 1); // abajo-derecha

  const placa = Buffer.alloc(W * H * C);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const i = (y * W + x) * C;
      for (let k = 0; k < 3; k++) {
        const arr = c00[k] * (1 - u) + c10[k] * u;
        const aba = c01[k] * (1 - u) + c11[k] * u;
        placa[i + k] = Math.round(arr * (1 - v) + aba * v);
      }
    }
  }
  const placaBuf = await sharp(placa, { raw: { width: W, height: H, channels: C } })
    .resize(ANCHO, ALTO, { fit: "cover", position: "centre" })
    .png()
    .toBuffer();

  // ---- 4. Recorte del objeto con alfa ----
  const margen = Math.round(Math.max(maxX - minX, maxY - minY) * 0.06);
  const cx0 = Math.max(0, minX - margen);
  const cy0 = Math.max(0, minY - margen);
  const cx1 = Math.min(W - 1, maxX + margen);
  const cy1 = Math.min(H - 1, maxY + margen);
  const cw = cx1 - cx0 + 1;
  const ch = cy1 - cy0 + 1;

  const objeto = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const si = at(x + cx0, y + cy0);
      const di = (y * cw + x) * 4;
      objeto[di] = data[si];
      objeto[di + 1] = data[si + 1];
      objeto[di + 2] = data[si + 2];
      objeto[di + 3] = Math.round(alfa[(y + cy0) * W + (x + cx0)] * 255);
    }
  }
  const objetoBuf = await sharp(objeto, { raw: { width: cw, height: ch, channels: 4 } })
    .png()
    .toBuffer();

  // ---- 5. Lienzo apaisado: placa de fondo + objeto encima ----
  const destino = placaBuf;

  const escala = Math.min((ANCHO * OCUPACION) / cw, (ALTO * OCUPACION) / ch);
  const ow = Math.round(cw * escala);
  const oh = Math.round(ch * escala);
  const redimensionado = await sharp(objetoBuf)
    .resize(ow, oh, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(destino)
    .composite([
      {
        input: redimensionado,
        left: Math.round((ANCHO - ow) / 2),
        // ligeramente por debajo del centro, como en la referencia
        top: Math.round((ALTO - oh) / 2 + ALTO * 0.03),
      },
    ])
    .webp({ quality: 82, effort: 6 })
    .toFile(salida);

  console.log(
    `  ${path.basename(entrada).padEnd(22)} objeto ${Math.round((cw / W) * 100)}%x${Math.round(
      (ch / H) * 100
    )}% -> ${ow}x${oh}`
  );
}

(async () => {
  const dir = "public/catalogo/lineas";
  const dest = path.join(dir, "cards");
  fs.mkdirSync(dest, { recursive: true });
  const archivos = fs.readdirSync(dir).filter((f) => /\.webp$/i.test(f) && fs.statSync(path.join(dir, f)).isFile());
  for (const f of archivos) {
    await procesar(path.join(dir, f), path.join(dest, f));
  }
  console.log("listo:", archivos.length, "imágenes");
})();
