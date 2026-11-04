// Nombres de superficie CSS Modules, no cabeceras/cuerpos ni contenedores plurales.
// Next conserva el nombre local tanto en desarrollo (__card) como en producción (_card).
export function isCardClass(token) {
  const name = token.split(/__|_/).at(-1);
  return name === 'card' || name === 'metric' || name === 'quoteInner' || /Card$/.test(name);
}
export function isGlowCard(element) {
  if (element.namespaceURI !== 'http://www.w3.org/1999/xhtml') return false;
  if (/^(IMG|INPUT|TEXTAREA|SELECT|OPTION|TABLE|TBODY|THEAD|TR|TD|TH|CANVAS|VIDEO|IFRAME|BR|HR)$/.test(element.tagName)) return false;
  if (element.closest('[data-border-glow="off"]')) return false;
  if (element.dataset.borderGlowManaged === 'component') return false;
  return element.hasAttribute('data-border-glow') || element.hasAttribute('data-card-reveal') ||
    [...element.classList].some(isCardClass);
}
