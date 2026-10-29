import { defineConfig } from "vitest/config";
import { transformWithEsbuild } from "vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Los componentes de Next usan JSX en archivos .js. Las regresiones de
  // renderizado deben ejecutar el componente real, no solo sus helpers.
  plugins: [{
    name: "next-app-jsx",
    enforce: "pre",
    transform(source, id) {
      const filename = id.split("?")[0];
      const appDirectory = fileURLToPath(new URL("./app/", import.meta.url));
      if (filename.startsWith(appDirectory) && filename.endsWith(".js")) {
        return transformWithEsbuild(source, filename, { loader: "jsx", jsx: "automatic" });
      }
    },
  }],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    globals: false,
  },
});
