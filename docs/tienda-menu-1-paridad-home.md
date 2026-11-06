# Menú 1 de `/tienda` con la misma apariencia que el home

## Qué se reportó

> «El menú de navegación 1 de tienda no se parece al de home, tanto la versión
> de teléfono y en PC».

Se pidió además fusionar el arreglo a `main` al terminar.

## Qué es cada menú

- **Menú 1**: la cabecera que va *dentro* del hero (pestaña de papel con el logo
  a la izquierda, navegación centrada sobre la foto, pestaña de papel con la
  píldora a la derecha). En el home es `.cardHeader` de
  `app/page.module.css`; en la tienda es `.heroHeader` de
  `app/tienda/catalogo-experience.module.css`.
- **Menú 2**: el `NavDock` compartido que aparece al hacer scroll. **No se
  modificó**; conserva `variant="scroll"`, `visible={scrolledPastHero}`,
  `STORE_NAVIGATION`, `topbarRef` y `cartAction`.

## Diferencias que había (PC y teléfono)

| | Home (menú 1) | `/tienda` antes |
| --- | --- | --- |
| Enlaces | `NAVIGATION` compartida (Inicio, Soluciones, Tienda, La empresa, Nosotros, Contacto) | lista local de 4 (Inicio, Soluciones, La empresa, Contacto) |
| Soluciones | botón `cardMegaTrigger` + panel con 4 grupos | enlace simple con chevron CSS |
| Alto de la cabecera / pestañas / nav | `clamp(72px, 4.3vw, 92px)` | `72px` fijo |
| Logo | `232px`, `sizes="(max-width: 760px) 130px, 232px"` | `176px`, `sizes="(max-width: 1040px) 114px, 176px"` |
| Tipografía y separación de la nav | `clamp(13.5px, 0.95vw, 18px)` / `clamp(16px, 2.4vw, 46px)` | `13.5px` / `clamp(18px, 2vw, 32px)` |
| Píldora | `clamp(13px, 0.9vw, 17px)`, icono `clamp(30px, 2vw, 40px)` | `12px`, icono fijo `28px` |
| Móvil ≤760px | rejilla `auto 1fr auto`, **hamburguesa de 44px centrada**, logo `130px`, a 340px `92px` | pestañas absolutas, `MobileSiteMenu` metido en la pestaña derecha, logo `128px`, a 380px `104px` |
| Panel móvil | Tienda destacada, Login/Admin, grupos de Soluciones, tema, legales | panel desplegable del `MobileSiteMenu` con 6 enlaces |
| Acción derecha | `Acceder` → Login/Admin | `Carrito` |

Además, `MobileSiteMenu` aparecía ya desde `1080px` mientras el home mantiene
la navegación completa hasta `760px`, así que en tablet los dos menús tampoco
coincidían.

## Qué se hizo

1. `app/tienda/catalogo-experience.js`
   - El menú 1 usa **`STORE_NAVIGATION`** (la misma `NAVIGATION` del home con
     las anclas convertidas a `/#...`). Se eliminó la lista local de enlaces;
     la constante `SECCIONES` solo guarda los ids que observa el
     `IntersectionObserver` para el enlace activo.
   - `Soluciones` es un botón con `aria-expanded` que abre un panel con los 4
     grupos, igual que en el home.
   - Se sustituyó `MobileSiteMenu` por la **hamburguesa centrada** de 44px y un
     panel móvil en `createPortal` con Tienda, Login/Admin, Soluciones, cambio
     de tema y enlaces legales. Va en portal porque `.catalog` tiene
     `overflow: clip` y `.heroCard` tiene `overflow: hidden`.
   - Cierre con `Escape`, clic fuera del desplegable, bloqueo de scroll y foco
     devuelto al botón, como en el home.
   - Se conserva la píldora **Carrito** con su badge y `onClick={openCart}`.

2. `app/tienda/catalogo-experience.module.css`
   - Se copiaron los valores del menú 1 del home: alto fluido en los 4 bloques,
     pestañas con `30px` de recorte, logo de `232px`, `gap` y tipografía con
     `clamp()`, píldora y pestaña de acción con las mismas medidas.
   - Rejilla móvil `auto 1fr auto`, 56px de alto, logo `130px` (y `92px` a
     `340px`), hamburguesa centrada, navegación oculta.
   - Estilos nuevos para el desplegable de Soluciones y el panel móvil, con
     variante de modo oscuro. Con `prefers-reduced-motion: reduce` las
     animaciones siguen activas con `heroFadeVisible` (solo opacidad, sin
     desplazamiento ni escala) y terminan visibles; el bloque se colocó al
     final para no alterar el bloque existente de las tarjetas.

3. `tests/tienda-menu-1-paridad-home.test.js` (nuevo) compara las reglas CSS
   del home y de la tienda, y fija la paridad en PC, en teléfono y a 340px.
   `tests/tienda-navegacion-scroll.test.js` se actualizó: ya no exige
   `MobileSiteMenu` y comprueba el nuevo menú del hero sin relajar el contrato
   del menú 2.

## Única diferencia deliberada

La píldora derecha dice **Carrito** en `/tienda` y **Acceder** en el home. Es
la acción propia de la tienda y está también en el `NavDock`; quitarla dejaría
la vista sin acceso directo al carrito. Forma, tamaño, tipografía, icono,
contraste y badge son idénticos. Login/Admin sí están presentes en el panel
móvil de la tienda, igual que en el home.

## Verificación

- `npm run lint`: 0 errores.
- `npm test`: 143 archivos / **1591 pruebas** en verde.
- `DATABASE_URL=… NEXT_DEPLOYMENT_ID=test-deploy-123 npm run build`: correcto,
  `node ops/verify-static-assets.mjs`: 16 HTML y 49 assets correctos.
- Con `next start` local, `/`, `/tienda`, `/contacto`, `/admin`,
  `/tienda/categoria/componentes-pasivos` y `/ayuda` devuelven 200 sin
  `?dpl=`; ambas cabeceras incluyen Inicio, Soluciones, Tienda, La empresa,
  Nosotros, Contacto y el botón «Abrir menú»; `/tienda` conserva Carrito.
  El CSS compilado contiene `height:clamp(72px,4.3vw,92px)`, `width:232px`,
  la hamburguesa de 44px, la rejilla `auto 1fr auto` y los anchos móviles de
  130px y 92px. Los 191 chunks JS locales responden 200 con MIME JavaScript.
- No se pudo hacer una comprobación **visual en navegador**: en este entorno
  no hay Chromium/Brave/Firefox ni jsdom/happy-dom. Las animaciones nuevas
  (`heroMenuIn`, `heroMegaIn`) solo animan opacidad; conviene revisarlas con
  `prefers-reduced-motion` y sin preferencia, y hacer
  `Ctrl+Mayús+R` después del despliegue para descartar CSS en caché.
