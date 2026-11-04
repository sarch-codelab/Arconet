# Orbe visual de IA

## Integración actual

- El proyecto existente usa Next App Router, React 19 y CSS Modules; no tenía Tailwind ni shadcn. Sus estilos globales están en `app/globals.css`, con estilos locales junto a cada vista.
- Se habilita TypeScript de forma incremental con `tsconfig.json`, conservando `@/*`, los archivos JavaScript y `checkJs: false`. Se excluye del chequeo el antiguo script `prisma/seed.ts`, que sigue ejecutándose mediante `tsx` como antes. No se omiten errores de tipos de los componentes nuevos.
- El componente reutilizable se encuentra en `components/ui/gradient-orb.tsx`, compatible con el alias `@/components/ui/gradient-orb` de la propuesta. Crear esta carpeta conserva la convención esperada por componentes shadcn externos, sin mover los componentes existentes de `app/components` ni `app/admin`.
- `components/ui/gradient-orb-demo.tsx` es el ejemplo de pantalla completa; no añade una ruta pública.
- Renderizador directo de `three` y `THREE.Timer`; tipos y compilador en dependencias de desarrollo. El orbe ya no importa React Three Fiber, cuyo store creaba un `THREE.Clock` obsoleto. No se modifica `node_modules` ni se silencian avisos. La dependencia Fiber existente se conserva sin cargarla en este componente.
- El shader no requiere fotos ni acceso al micrófono. El chat usa NVIDIA desde el servidor; véase `docs/ia-nvidia.md`.

## Ubicación y comportamiento

`app/ai-orb.js` expone un orbe decorativo reutilizable. Aparece dentro de la píldora «IA» y en la bienvenida de su sección administrativa (160 px), centrado sobre la firma «Monica IA» en Orbitron. La versión pequeña de la píldora usa el respaldo CSS para no crear un contexto WebGL adicional. Ya no se monta en el layout público, no hay orbe flotante ni chat en el inicio. El botón de tema y las animaciones de portada no cambian.

## Adaptaciones del código recibido

- Conserva el triángulo de pantalla completa, simplex noise, mezcla azul/morado/naranja, rotación YIQ y pulso.
- Corrige dos `smoothstep` con límites invertidos (su resultado no está definido por GLSL) y usa mezcla de alfa premultiplicada acorde a la salida del shader.
- Fondo transparente solo en el widget; el componente independiente conserva el fondo negro configurable.
- Carga dinámica sin SSR, diferida hasta un momento ocioso. Three no se incluye en el chunk principal de la página.
- Resolución limitada a DPR 1–1.5; render programado aproximadamente a 30 fps, sin antialias adicional. Movimiento reducido: aproximadamente 12 fps y evolución más lenta, sin ocultar el orbe.
- Se detiene la programación de fotogramas cuando la pestaña está oculta, con limpieza al desmontar. El tiempo se acota al recuperar visibilidad, evitando saltos grandes.
- Respaldo CSS cuando WebGL2 no está disponible, durante la carga, ante pérdida de contexto o error de renderizado. No se cambia la CSP del sitio.

## Configuración reutilizable

```tsx
import { GradientOrb } from "@/components/ui/gradient-orb";

// El padre debe tener ancho y alto explícitos.
<GradientOrb config={{ background: "transparent", hue: 0,
  rotationSpeed: 0.3, noiseScale: 0.65, innerRadius: 0.1 }} />
```

## Tailwind y shadcn, si se incorporan más adelante

No son necesarios para este shader y no se han instalado para evitar cambiar la cascada y el reset del sitio por un único elemento visual. Si se necesita el resto del ecosistema:

1. Instalar `npm install -D tailwindcss @tailwindcss/postcss postcss`.
2. Añadir `postcss.config.mjs` con `export default { plugins: { "@tailwindcss/postcss": {} } };`.
3. Incorporar las capas de tema/utilidades al CSS global. Para conservar el reset existente, **no importar Preflight**:

   ```css
   @layer theme, base, components, utilities;
   @import "tailwindcss/theme.css" layer(theme);
   @import "tailwindcss/utilities.css" layer(utilities);
   ```

4. Ejecutar `npx shadcn@latest init` después de configurar Tailwind. Revisar los cambios sugeridos a `app/globals.css` antes de aceptarlos: no sobrescribir los tokens actuales del sitio. En `components.json`, apuntar `aliases.ui` a `@/components/ui` y el CSS a `app/globals.css`.
5. Revisar escritorio/móvil y ambos temas, especialmente la compatibilidad entre variables shadcn y los tokens existentes.

La configuración y los tipos de TypeScript ya están instalados en esta integración; para comprobarlos puede ejecutarse `npx tsc --noEmit` una vez generados los tipos de Next mediante el arranque o la compilación.

## Validación

ESLint, chequeo TypeScript, suite completa y compilación de producción. Chromium: 1440/390 px, claro/oscuro y movimiento normal/reducido; comprobación por diferencias de píxeles del orbe animado, alineación encima del botón, funcionamiento del tema, texto animado de portada visible tras entrar en pantalla y ausencia de desbordamiento. También se comprueba la pausa/reanudación del tiempo del shader al ocultar la pestaña, pérdida de contexto y respaldo sin WebGL2. Las capturas y resultados quedan en `.local/visual`, fuera de Git. No se ha probado en un teléfono físico ni se ha desplegado en producción.

## Corrección de avisos de consola (2026-11-03)

- Se mantiene el modelo NVIDIA del commit `695a657`: `nvidia/nemotron-3.5-bolt-e4b`; no se cambia la integración ni sus credenciales.
- `THREE.Timer` conectado a la visibilidad del documento sustituye el reloj interno de Fiber. Se conservan shaders, pausa en segundo plano, movimiento reducido, redimensionamiento y respaldo CSS. Se liberan temporizador, observadores, eventos, geometría, material y renderer al desmontar.
- El chunk `1hje94y5uda9d.css` reproducido en el build contiene los estilos de `not-found-experience.module.css`. Se importa también desde el layout raíz para que Next lo emita como `rel=stylesheet`, sin un preload huérfano. Sus selectores siguen aislados por CSS Modules; no se desactivan advertencias ni se cambia el chunking global.
- Validación sobre build de producción: 1440/390 px, claro/oscuro, movimiento normal/reducido; orbe animado, navegación de ida/vuelta, pérdida de contexto, sin overflow ni los dos avisos reportados tras esperar más de ocho segundos. Los tests de API usan proveedor simulado; estos avisos del navegador no prueban un fallo de NVIDIA.
