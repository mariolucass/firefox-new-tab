import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Os mesmos aliases do tsconfig.json. Sem eles o Vitest não resolve
// "@shared/...", "@features/..." etc. e nenhum teste chega a rodar.
const src = (path: string) => fileURLToPath(new URL(`./src/${path}`, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@app": src("app"),
      "@views": src("views"),
      "@widgets": src("widgets"),
      "@features": src("features"),
      "@shared": src("shared"),
      "@": src(""),
    },
  },
  test: {
    globals: true,
  },
});
