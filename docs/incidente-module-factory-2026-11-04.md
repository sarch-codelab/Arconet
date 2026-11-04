# «Module factory is not available» — 4 de noviembre de 2026

## Mensaje reportado

```
Error: Module 71645 was instantiated because it was required from module 56420,
but the module factory is not available.
    at W (++turbopack-2c3mg3r-05n1w.js:1:7473)
    …
[arconet] error en la vista: Error: Module 71645 …
```

## Qué significa

No es un error de la aplicación ni una respuesta del servidor. Es el **runtime
de Turbopack** en el navegador: un chunk pidió instanciar el módulo `71645`,
que otro chunk (`56420`) declara necesitar, pero ninguna fábrica de módulo
registrada con ese identificador está disponible en esa pestaña. Es decir, el
runtime cargado y los chunks descargados pertenecen a **grafos de módulos
distintos**. Webpack no produce este mensaje: su equivalente sería un
`ChunkLoadError`.

## Por qué ocurrió aquí

La traza lo ubica sin ambigüedad en un **runtime de Turbopack**
(`turbopack-*.js`). En este repositorio Turbopack solo se usa en desarrollo:

| Camino | Bundler | Dónde |
| --- | --- | --- |
| `npm run build` | **Webpack** (`next build --webpack`) | `deploy.ps1` y CI |
| `npm run dev`, `npm run dev:local`, vistas previas | Turbopack (`next dev`) | desarrollo |

Evidencia medida en esta sesión:

- Build de producción con el script oficial: `.next/static/chunks/webpack-745be3ab71471625.js`
  y **cero** archivos con «turbopack» en `.next/static`; el HTML prerenderizado
  carga `/_next/static/chunks/webpack-….js`.
- Servidor `next dev`: los chunks del cliente se sirven como
  `/_next/static/chunks/turbopack-_06rkbud3pyrlm._.js` y
  `/_next/static/chunks/_1anvha4rlo79g._.js`, el mismo tipo de nombre que
  aparece en la traza (`05ag8rqhwn73b.js`, `turbopack-2c3mg3r-05n1w.js`).

Conclusión: el error se produjo en una **sesión de desarrollo o vista previa**
(servidor `next dev`), no en el sitio compilado con `npm run build`. Si alguna
vez apareciera en el dominio público, significaría que se promovió un build
hecho con Turbopack (por ejemplo, `npx next build` sin `--webpack`), no el
oficial.

## Mecanismo

En desarrollo el grafo de módulos se recompila continuamente y los
identificadores numéricos cambian. Una pestaña abierta conserva el runtime y
los `import()` ya evaluados; si mientras tanto el servidor se reinicia, se
borra `.next` o cambian archivos, la siguiente importación diferida puede pedir
un chunk del grafo nuevo desde un runtime del grafo anterior. React y el
bundler **cachean la promesa rechazada** de `React.lazy`, así que la vista sigue
fallando hasta recargar; por eso los límites de error del proyecto ofrecen
«Recargar página» en lugar de reintentar el componente.

Turbopack tiene además defectos conocidos que producen este mismo mensaje por
registro de fábricas entre chunks:

- [vercel/next.js#98099](https://github.com/vercel/next.js/issues/98099) —
  registro «first-wins» cuando un id de módulo se emite con cuerpos distintos
  en chunks distintos.
- [vercel/next.js#99789](https://github.com/vercel/next.js/issues/99789) —
  módulos ausentes en `next dev` 16.4.0 (Pages Router).
- [vercel/next.js#86132](https://github.com/vercel/next.js/issues/86132) —
  variante en el servidor de producción con Turbopack.

La versión instalada es Next **16.4.3** (fijada en `package-lock.json`), que
incluye la corrección de la regresión de desarrollo de 16.4.1.

## Reproducción intentada

Con el servidor `next dev` (Turbopack) y una ruta temporal con `import()`
diferido, pestaña abierta en Chromium:

1. Reiniciar el servidor y borrar `.next` → la pestaña se recarga sola y la
   importación funciona (no se reproduce).
2. Borrar `.next` con el servidor en marcha → la pestaña vuelve a navegar sola
   y se recupera (no se reproduce).

Es decir, el fallo no es determinista con el código actual: corresponde a la
ventana entre grafos (o a un defecto del propio Turbopack) y no a una ruta,
componente o dato concretos. Los identificadores `71645`/`56420` solo se pueden
resolver con los artefactos de esa compilación, que no se conservaron.

## Cambios de esta revisión

- **`deploy.ps1`**: `Assert-Healthy` ahora rechaza el candidato si el HTML
  servido no carga un runtime `/_next/static/chunks/webpack-….js` o si
  menciona Turbopack. Un build accidental con Turbopack ya no llega a los
  usuarios; además activa el rollback existente.
- **CI**: nuevo paso «Verificar bundler de producción» que falla si
  `.next/static` contiene archivos de Turbopack o si falta el runtime de
  Webpack.
- **`npm run dev:webpack`**: desarrollo con Webpack (verificado: sirve 200),
  como salida si Turbopack vuelve a fallar en una máquina concreta. El
  desarrollo normal sigue en Turbopack.
- **`tests/production-bundler.test.js`**: cubre el nuevo script y las dos
  guardas.

## Qué hacer si vuelve a aparecer

1. Pulsar **«Recargar página»** en el aviso (no «Reintentar»): el `import()`
   rechazado no se recupera sin recargar.
2. En desarrollo, tras reiniciar el servidor o cambiar artefactos, recargar la
   pestaña; si se repite, usar `npm run dev:webpack`.
3. En el sitio público, comprobar que el HTML servido referencia
   `webpack-….js` y que el candidato se compiló con `npm run build`. Si no,
   revisar `deploy.log` y volver a promover; la guarda del despliegue debería
   haberlo detenido.

## Límites

No se identificó el módulo `71645` ni el momento exacto del incidente: la traza
minificada no lo permite y no se dispone de los artefactos ni de los logs de esa
sesión. No se probó una sesión administrativa real con PostgreSQL; la
verificación fue con el servidor de desarrollo, la ruta temporal y el build de
producción local.
