import next from "eslint-config-next";

// eslint-config-next v16 exporta un arreglo de configs flat:
// [0] = "next" (core-web-vitals), [1] = "next/typescript", [2] = plugin react-hooks.
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".local/**",
      "ops/backups/**",
      "prisma/migrations/**",
      // Cliente generado por Prisma: no es código propio, no debe ensuciar el lint.
      "generated/**",
    ],
  },
  ...next,
  {
    // Impedir que vuelva un ReferenceError por un manejador sin importar.
    files: ["app/admin/**/*.js"],
    rules: { "no-undef": "error" },
  },
  {
    rules: {
      // Proyecto en JS; los avisos de tipos estrictos no aplican.
      "@typescript-eslint/no-explicit-any": "off",
      // Deuda conocida, degradada a aviso para que `npm run lint` sirva de
      // puerta de calidad sin bloquear el CI por patrones preexistentes:
      //  - <img> dinámicos (logos de producto subidos por usuarios).
      //  - setState dentro de efectos de sincronización (tema, escáner).
      //  - react-hooks v6 (React Compiler) marca refs/memo manuales ya probados.
      "@next/next/no-img-element": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
];

export default eslintConfig;
