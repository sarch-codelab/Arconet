// Las filas de tarjetas de /catalogo NO se deslizan con el mouse: solo se
// mueven con sus flechas ‹ ›. Cada fila usa `overflow-x: hidden`, que sigue
// creando un contenedor con scroll (su contenido es más ancho que la caja),
// así que JavaScript puede fijar `scrollLeft`, pero no muestra la barra ni
// permite el desplazamiento horizontal directo con rueda, trackpad o arrastre.
// El navegador aún puede revelar enlaces al recibir el foco por teclado.
//
// En vez de sumar desplazamientos con `scrollBy`, las flechas calculan el
// índice de tarjeta y llaman a `scrollTo` con un múltiplo exacto del paso.
// Es instantáneo a propósito: el scroll suave en un contenedor `hidden` puede
// quedarse a mitad de camino y dejar la primera tarjeta recortada.
//
// No se intercepta ningún evento (`wheel`, `touch`, `pointer`): el scroll
// vertical de la página sigue funcionando con normalidad sobre el bloque.
export function desplazarFila(ref, direccion) {
  const fila = ref?.current;
  if (!fila) return;
  const tarjeta = fila.firstElementChild;
  // El gap cambia con el ancho de pantalla (12 px en escritorio, 8 px en
  // móvil para las marcas, 14 px en relacionados). Se lee del estilo calculado
  // para no desalinear las tarjetas con un valor fijo.
  const gap = Number.parseFloat(getComputedStyle(fila).columnGap);
  const espacio = Number.isFinite(gap) ? gap : 0;
  const paso = tarjeta
    ? tarjeta.getBoundingClientRect().width + espacio
    : fila.clientWidth * 0.8;
  if (paso <= 0) return;
  const maximo = Math.max(0, fila.scrollWidth - fila.clientWidth);
  const actual = fila.scrollLeft;
  const destino = direccion > 0
    ? Math.min(maximo, Math.ceil((actual + 1) / paso) * paso)
    : Math.max(0, Math.floor((actual - 1) / paso) * paso);
  fila.scrollTo({ left: destino, behavior: "instant" });
}
