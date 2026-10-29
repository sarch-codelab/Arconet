// Clipboard API puede estar disponible pero prohibida por el iframe padre.
// No propagar NotAllowedError ni anunciar éxito sin haber copiado realmente.
export async function copyText(text) {
  if (typeof text !== "string" || typeof document === "undefined") return false;

  let clipboardAllowed = true;
  try {
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature) clipboardAllowed = policy.allowsFeature("clipboard-write");
  } catch {
    // No todos los navegadores implementan la consulta de Permissions Policy.
  }

  if (clipboardAllowed) {
    try {
      if (typeof window !== "undefined" && window.isSecureContext &&
          typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Si falla por permisos, intentar la alternativa dentro de la acción
      // del usuario. El rechazo de la API nunca queda como Promise sin manejar.
    }
  }

  let area;
  let previousFocus;
  let selection;
  const ranges = [];
  try {
    previousFocus = document.activeElement;
    try {
      selection = document.getSelection?.();
      for (let i = 0; i < (selection?.rangeCount || 0); i++) {
        ranges.push(selection.getRangeAt(i).cloneRange());
      }
    } catch {
      selection = undefined;
    }
    area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.focus({ preventScroll: true });
    area.select();
    area.setSelectionRange(0, text.length);
    return document.execCommand?.("copy") === true;
  } catch {
    return false;
  } finally {
    try { area?.remove(); } catch { /* El nodo puede haber desaparecido. */ }
    try {
      previousFocus?.focus({ preventScroll: true });
      if (selection && ranges.length) {
        selection.removeAllRanges();
        for (const range of ranges) selection.addRange(range);
      }
    } catch {
      // La selección anterior puede haber desaparecido al cerrar un modal.
    }
  }
}
