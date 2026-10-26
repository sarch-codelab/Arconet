<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Animation requirements

- Before changing page animations, read and follow this section. The homepage animations in `app/page.module.css` must remain functional in Brave and other supported browsers, including when `prefers-reduced-motion` is set to `reduce`.
- Do not put required homepage animations exclusively behind `@media (prefers-reduced-motion: no-preference)`. If reduced motion is handled, keep the requested effects working and make sure content never stays hidden when an animation or animation event does not run.
- After changing animations, verify both `prefers-reduced-motion: reduce` and `no-preference` in a browser. Confirm the relevant elements have a non-`none` computed `animation-name`, become visible, and that the page has no horizontal overflow. Also run `npm run build`.
- Do not assume a successful build proves browser animations work. If Brave is available, verify the homepage at `http://localhost:3000/` in Brave as well.

## Aviso conocido de dependencias: `eslint@10` + `eslint-plugin-react`

`npm install` muestra un warning de peer dependency:

```
npm warn ERESOLVE overriding peer dependency
npm warn peer eslint@"^3 || ... || ^9.7" from eslint-plugin-react@7.37.5
```

`eslint-plugin-react` (dependencia transitiva de `eslint-config-next`) todavía
no publica ninguna versión que declare soporte para `eslint@10`: la última
publicada es 7.37.5 y su peer sigue siendo `^9.7` como máximo. Por eso **no se
cambian versiones**: bajar `eslint` a 9 rompería el resto, y no existe todavía
una combinación publicada compatible. `npm run lint` funciona igual con la
versión actual (verificado en verde). Cuando `eslint-plugin-react` publique una
versión con peer `^10`, se actualiza y se quita este aviso.
