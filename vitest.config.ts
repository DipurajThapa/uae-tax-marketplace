import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    // Integration tests share one database: run files sequentially.
    fileParallelism: false,
    setupFiles: ["tests/setup-env.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    coverage: { provider: "v8", include: ["src/lib/**"], reporter: ["text-summary"] },
  },
});
