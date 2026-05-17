import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Plain .mjs avoids esbuild transpiling `vitest.config.ts` (fixes "service was stopped" on some setups). */
export default defineConfig({
  root: path.resolve(__dirname),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  ssr: {
    external: ["@supabase/supabase-js", "@supabase/ssr"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    pool: "vmThreads",
    poolOptions: {
      vmThreads: {
        singleThread: true,
      },
    },
    fileParallelism: false,
    deps: {
      optimizer: {
        ssr: {
          enabled: false,
        },
      },
    },
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "text"],
      include: [
        "src/lib/analytics/rulesEngine.ts",
        "src/lib/analytics/trainingLoad.ts",
        "src/lib/analytics/intensityDistribution.ts",
        "src/lib/analytics/strength-generator.ts",
        "src/lib/parsers/csv-parser.ts",
      ],
    },
  },
});
